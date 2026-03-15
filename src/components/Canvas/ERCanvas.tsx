import {
  useCallback, useEffect, useRef, useState,
} from "react";
import {
  ReactFlow, ReactFlowProvider, Background, BackgroundVariant,
  useNodesState, useEdgesState, addEdge, useReactFlow,
  Handle, Position,
  type Node, type Edge, type OnConnect, type NodeProps, type NodeTypes,
} from "@xyflow/react";
import { parse } from "../../lib/parsers";
import type { ERModel, EREntity, ERAttribute } from "../../lib/parsers";
import { serialize } from "../../lib/serializers";
import { computeLayout } from "../../lib/layout";

// ---------------------------------------------------------------------------
// Custom ER entity node
// ---------------------------------------------------------------------------

type ERNodeData = {
  entityName: string;
  attributes: ERAttribute[];
};

function EREntityNode({ data, selected, id }: NodeProps) {
  const d = data as ERNodeData;
  const { deleteElements } = useReactFlow();
  const ring = selected ? "ring-2 ring-[var(--accent)]" : "";

  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!bg-[var(--accent)] !w-2 !h-2" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-[var(--accent)] !w-2 !h-2" />

      <div className={`bg-[var(--bg-surface)] border border-[var(--border)] rounded min-w-[150px] text-xs ${ring}`}>
        {/* Entity name header */}
        <div className="px-3 py-1.5 text-center font-semibold text-[var(--text-primary)] border-b border-[var(--border)] bg-[var(--bg-secondary)]">
          {d.entityName}
        </div>

        {/* Attributes */}
        <div className="px-2 py-1">
          {d.attributes.length === 0 && (
            <div className="text-[10px] text-[var(--text-muted)] italic">no attributes</div>
          )}
          {d.attributes.map((a, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5 text-[11px] font-mono">
              {a.key && (
                <span className="text-[9px] text-[var(--accent)] font-semibold w-4 shrink-0">{a.key}</span>
              )}
              {!a.key && <span className="w-4 shrink-0" />}
              <span className="text-[var(--text-muted)]">{a.type}</span>
              <span className="text-[var(--text-primary)]">{a.name}</span>
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
      <Handle type="source" position={Position.Right} id="right" className="!bg-[var(--accent)] !w-2 !h-2" />
    </div>
  );
}

const NODE_TYPES: NodeTypes = { erEntity: EREntityNode };

// ---------------------------------------------------------------------------
// Cardinality label helpers
// ---------------------------------------------------------------------------

function cardLabel(c: string): string {
  switch (c) {
    case "||": return "1";
    case "|{": return "1..*";
    case "o|": return "0..1";
    case "o{": return "0..*";
    default: return c;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function modelToFlow(model: ERModel, existing: Record<string, { x: number; y: number }> = {}) {
  const graphNodes = model.entities.map((e) => ({ id: e.name, label: e.name, shape: "rect" as const }));
  const graphEdges = model.relations.map((r) => ({ id: r.id, source: r.entityA, target: r.entityB, style: "arrow" as const }));
  const positions = computeLayout(graphNodes, graphEdges, existing);

  const nodes: Node[] = model.entities.map((e) => ({
    id: e.name,
    type: "erEntity",
    position: positions[e.name] ?? { x: 0, y: 0 },
    data: { entityName: e.name, attributes: e.attributes } satisfies ERNodeData,
  }));

  const edges: Edge[] = model.relations.map((r) => ({
    id: r.id,
    source: r.entityA,
    target: r.entityB,
    label: r.label,
    sourceLabel: cardLabel(r.cardA),
    targetLabel: cardLabel(r.cardB),
    style: { stroke: "var(--text-muted)" },
    labelStyle: { fill: "var(--text-primary)", fontSize: 11 },
    labelBgStyle: { fill: "var(--bg-surface)" },
  }));

  return { nodes, edges };
}

function flowToModel(nodes: Node[], edges: Edge[]): ERModel {
  const entities: EREntity[] = nodes.map((n) => {
    const d = n.data as ERNodeData;
    return { name: d.entityName, attributes: d.attributes };
  });

  const relations = edges.map((e) => ({
    id: e.id,
    entityA: e.source,
    entityB: e.target,
    cardA: "||" as const,
    cardB: "|{" as const,
    label: e.label ? String(e.label) : "relates",
  }));

  return { type: "erDiagram", entities, relations, rawLines: [] };
}

// ---------------------------------------------------------------------------
// Inner canvas
// ---------------------------------------------------------------------------

type SyncState = "idle" | "pending" | "syncing";

function ERCanvasInner({ source, onSourceChange }: { source: string; onSourceChange: (s: string) => void }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [syncState, setSyncState] = useState<SyncState>("idle");

  const suppressSyncRef = useRef(false);
  const ownUpdateRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const nodePositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    if (ownUpdateRef.current) { ownUpdateRef.current = false; return; }
    const model = parse(source);
    if (model.type !== "erDiagram") return;
    const em = model as ERModel;
    const { nodes: n, edges: e } = modelToFlow(em, nodePositionsRef.current);
    suppressSyncRef.current = true;
    setNodes(n);
    setEdges(e);
  }, [source]); // eslint-disable-line react-hooks/exhaustive-deps

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
      label: "relates",
      style: { stroke: "var(--text-muted)" },
      labelStyle: { fill: "var(--text-primary)", fontSize: 11 },
      labelBgStyle: { fill: "var(--bg-surface)" },
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
        <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">ER Diagram</span>
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

export default function ERCanvas({ source, onSourceChange }: { source: string; onSourceChange: (s: string) => void }) {
  return (
    <ReactFlowProvider>
      <ERCanvasInner source={source} onSourceChange={onSourceChange} />
    </ReactFlowProvider>
  );
}
