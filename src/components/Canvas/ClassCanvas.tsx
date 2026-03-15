import {
  useCallback, useEffect, useRef, useState,
} from "react";
import {
  ReactFlow, ReactFlowProvider, Background, BackgroundVariant,
  useNodesState, useEdgesState, addEdge, useReactFlow,
  Handle, Position,
  type Node, type Edge, type OnConnect, type NodeProps, type NodeTypes,
  type EdgeProps, BaseEdge, getStraightPath,
} from "@xyflow/react";
import { parse } from "../../lib/parsers";
import type { ClassModel, ClassNode, ClassMember, ClassMethod, ClassRelationType } from "../../lib/parsers";
import { serialize } from "../../lib/serializers";
import { computeLayout } from "../../lib/layout";

// ---------------------------------------------------------------------------
// Custom UML class node
// ---------------------------------------------------------------------------

type ClassNodeData = {
  classId: string;
  label: string;
  annotation?: string;
  members: ClassMember[];
  methods: ClassMethod[];
};

function formatMember(m: ClassMember): string {
  return `${m.visibility}${m.type}${m.type ? " " : ""}${m.name}`;
}

function formatMethod(m: ClassMethod): string {
  return `${m.visibility}${m.name}(${m.params})${m.returnType ? ": " + m.returnType : ""}`;
}

function UMLClassNode({ data, selected, id }: NodeProps) {
  const d = data as ClassNodeData;
  const { deleteElements } = useReactFlow();
  const ring = selected ? "ring-2 ring-[var(--accent)]" : "";

  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!bg-[var(--accent)] !w-2 !h-2" />

      <div className={`bg-[var(--bg-surface)] border border-[var(--border)] rounded min-w-[140px] text-xs ${ring}`}>
        {/* Name compartment */}
        <div className="px-3 py-1.5 text-center font-semibold text-[var(--text-primary)] border-b border-[var(--border)]">
          {d.annotation && <div className="text-[10px] text-[var(--text-muted)] italic">&laquo;{d.annotation}&raquo;</div>}
          {d.label || d.classId}
        </div>

        {/* Attributes compartment */}
        <div className="px-2 py-1 border-b border-[var(--border)] min-h-[20px]">
          {d.members.map((m, i) => (
            <div key={i} className="text-[11px] text-[var(--text-primary)] leading-tight font-mono truncate">
              {formatMember(m)}
            </div>
          ))}
        </div>

        {/* Methods compartment */}
        <div className="px-2 py-1 min-h-[20px]">
          {d.methods.map((m, i) => (
            <div key={i} className="text-[11px] text-[var(--text-primary)] leading-tight font-mono truncate">
              {formatMethod(m)}
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 flex gap-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-1.5 py-0.5 z-10">
          <button
            className="text-[10px] text-red-400 hover:text-red-300 px-1"
            onClick={() => deleteElements({ nodes: [{ id }] })}
            title="Delete"
          >x</button>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-[var(--accent)] !w-2 !h-2" />
    </div>
  );
}

const NODE_TYPES: NodeTypes = { umlClass: UMLClassNode };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function modelToFlow(model: ClassModel, existing: Record<string, { x: number; y: number }> = {}) {
  // Reuse the flowchart layout engine (nodes/edges mapped to GraphNode/GraphEdge shape)
  const graphNodes = model.classes.map((c) => ({ id: c.id, label: c.label || c.id, shape: "rect" as const }));
  const graphEdges = model.relations.map((r) => ({ id: r.id, source: r.source, target: r.target, style: "arrow" as const }));
  const positions = computeLayout(graphNodes, graphEdges, existing);

  const nodes: Node[] = model.classes.map((c) => ({
    id: c.id,
    type: "umlClass",
    position: positions[c.id] ?? { x: 0, y: 0 },
    data: {
      classId: c.id,
      label: c.label || c.id,
      annotation: c.annotation,
      members: c.members,
      methods: c.methods,
    } satisfies ClassNodeData,
  }));

  const edges: Edge[] = model.relations.map((r) => ({
    id: r.id,
    source: r.source,
    target: r.target,
    label: r.label,
    data: { relType: r.type },
    style: { stroke: "var(--text-muted)", strokeDasharray: r.type === "dependency" || r.type === "realization" ? "5 3" : undefined },
    labelStyle: { fill: "var(--text-primary)", fontSize: 11 },
    labelBgStyle: { fill: "var(--bg-surface)" },
    markerEnd: r.type === "inheritance" || r.type === "realization" ? "url(#triangle)" : undefined,
  }));

  return { nodes, edges };
}

function flowToModel(nodes: Node[], edges: Edge[]): ClassModel {
  const classes: ClassNode[] = nodes.map((n) => {
    const d = n.data as ClassNodeData;
    return {
      id: d.classId,
      label: d.label !== d.classId ? d.label : undefined,
      annotation: d.annotation,
      members: d.members,
      methods: d.methods,
    };
  });

  const relations = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: ((e.data as { relType?: ClassRelationType })?.relType ?? "association") as ClassRelationType,
    label: e.label ? String(e.label) : undefined,
  }));

  return { type: "classDiagram", classes, relations, rawLines: [] };
}

// ---------------------------------------------------------------------------
// Inner canvas
// ---------------------------------------------------------------------------

type SyncState = "idle" | "pending" | "syncing";

function ClassCanvasInner({ source, onSourceChange }: { source: string; onSourceChange: (s: string) => void }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [syncState, setSyncState] = useState<SyncState>("idle");

  const suppressSyncRef = useRef(false);
  const ownUpdateRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const nodePositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  // source → canvas
  useEffect(() => {
    if (ownUpdateRef.current) { ownUpdateRef.current = false; return; }
    const model = parse(source);
    if (model.type !== "classDiagram") return;
    const cm = model as ClassModel;
    const { nodes: n, edges: e } = modelToFlow(cm, nodePositionsRef.current);
    suppressSyncRef.current = true;
    setNodes(n);
    setEdges(e);
  }, [source]); // eslint-disable-line react-hooks/exhaustive-deps

  // canvas → source (auto 1.5s)
  useEffect(() => {
    if (suppressSyncRef.current) { suppressSyncRef.current = false; return; }
    setSyncState("pending");
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      setSyncState("syncing");
      const newSource = serialize(flowToModel(nodes, edges));
      ownUpdateRef.current = true;
      onSourceChange(newSource);
      setTimeout(() => setSyncState("idle"), 400);
    }, 1500);
    return () => clearTimeout(syncTimerRef.current);
  }, [nodes, edges]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    nodePositionsRef.current = Object.fromEntries(nodes.map((n) => [n.id, n.position]));
  }, [nodes]);

  // Keyboard: Cmd+Enter to sync now
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        syncNow();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge({
      ...connection,
      data: { relType: "association" },
      style: { stroke: "var(--text-muted)" },
    }, eds)),
    [setEdges]
  );

  function syncNow() {
    clearTimeout(syncTimerRef.current);
    setSyncState("syncing");
    const newSource = serialize(flowToModel(nodes, edges));
    ownUpdateRef.current = true;
    onSourceChange(newSource);
    setTimeout(() => setSyncState("idle"), 400);
  }

  return (
    <div className="relative flex flex-col h-full min-h-0">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-[var(--bg-secondary)] border-b border-[var(--border)] shrink-0">
        <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Class Diagram</span>
        <div className="ml-auto flex items-center gap-2">
          {syncState === "pending" && (
            <button onClick={syncNow} className="text-xs text-[var(--accent)] hover:underline">Sync now</button>
          )}
          {syncState === "syncing" && (
            <span className="text-xs text-[var(--text-muted)] animate-pulse">syncing</span>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={NODE_TYPES}
          deleteKeyCode={["Backspace", "Delete"]}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          style={{ background: "var(--bg-primary)" }}
        >
          <Background variant={BackgroundVariant.Dots} color="var(--border)" gap={20} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

export default function ClassCanvas({ source, onSourceChange }: { source: string; onSourceChange: (s: string) => void }) {
  return (
    <ReactFlowProvider>
      <ClassCanvasInner source={source} onSourceChange={onSourceChange} />
    </ReactFlowProvider>
  );
}
