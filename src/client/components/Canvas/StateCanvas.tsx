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
import type { StateModel, StateNode } from "../../lib/parsers";
import { serialize } from "../../lib/serializers";
import { computeLayout } from "../../lib/layout";

// ---------------------------------------------------------------------------
// Custom node types
// ---------------------------------------------------------------------------

type StateNodeData = {
  stateId: string;
  label: string;
  kind: StateNode["kind"];
};

function StartEndNode({ data, selected }: NodeProps) {
  const d = data as StateNodeData;
  const isEnd = d.kind === "end";
  const ring = selected ? "ring-2 ring-[var(--accent)]" : "";
  return (
    <div className={`relative ${ring} rounded-full`}>
      <Handle type="target" position={Position.Top} className="!bg-transparent !w-0 !h-0" />
      <div className={`w-6 h-6 rounded-full ${isEnd ? "border-2 border-[var(--text-muted)] flex items-center justify-center" : ""}`}
        style={{ background: "var(--text-muted)" }}>
        {isEnd && <div className="w-3 h-3 rounded-full bg-[var(--text-muted)]" />}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !w-0 !h-0" />
    </div>
  );
}

function NormalStateNode({ data, selected, id }: NodeProps) {
  const d = data as StateNodeData;
  const { deleteElements, setNodes: rfSetNodes } = useReactFlow();
  const ring = selected ? "ring-2 ring-[var(--accent)]" : "";
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState("");

  function commitEdit(label: string) {
    setEditing(false);
    rfSetNodes((ns) =>
      ns.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                label,
                // Only update stateId if it matched label (auto-generated name)
                stateId: (n.data as StateNodeData).stateId === (n.data as StateNodeData).label ? label : (n.data as StateNodeData).stateId,
              },
            }
          : n
      )
    );
  }

  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!bg-[var(--accent)] !w-2 !h-2" />
      <div className={`flex items-center justify-center px-4 py-2 text-xs text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg min-w-[80px] ${ring}`}>
        {editing ? (
          <input
            className="bg-transparent text-xs text-[var(--text-primary)] text-center outline-none border-b border-[var(--accent)] w-full"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={() => commitEdit(editLabel)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); }
              if (e.key === "Escape") { setEditing(false); }
            }}
            autoFocus
          />
        ) : (
          <span onDoubleClick={() => { setEditing(true); setEditLabel(d.label || d.stateId); }}>
            {d.label || d.stateId}
          </span>
        )}
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

function ChoiceNode({ selected }: NodeProps) {
  const ring = selected ? "ring-2 ring-[var(--accent)]" : "";
  return (
    <div className={`relative ${ring}`}>
      <Handle type="target" position={Position.Top} className="!bg-[var(--accent)] !w-2 !h-2" />
      <div className="w-8 h-8 rotate-45 bg-[var(--bg-surface)] border border-[var(--border)]" />
      <Handle type="source" position={Position.Bottom} className="!bg-[var(--accent)] !w-2 !h-2" />
    </div>
  );
}

function ForkJoinNode({ selected }: NodeProps) {
  const ring = selected ? "ring-2 ring-[var(--accent)]" : "";
  return (
    <div className={`relative ${ring}`}>
      <Handle type="target" position={Position.Top} className="!bg-[var(--accent)] !w-2 !h-2" />
      <div className="w-20 h-1.5 rounded bg-[var(--text-muted)]" />
      <Handle type="source" position={Position.Bottom} className="!bg-[var(--accent)] !w-2 !h-2" />
    </div>
  );
}

const NODE_TYPES: NodeTypes = {
  stateNormal: NormalStateNode,
  stateStartEnd: StartEndNode,
  stateChoice: ChoiceNode,
  stateForkJoin: ForkJoinNode,
};

function nodeTypeForKind(kind: StateNode["kind"]): string {
  switch (kind) {
    case "start":
    case "end": return "stateStartEnd";
    case "choice": return "stateChoice";
    case "fork":
    case "join": return "stateForkJoin";
    default: return "stateNormal";
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function modelToFlow(model: StateModel, existing: Record<string, { x: number; y: number }> = {}) {
  const graphNodes = model.states.map((s) => ({ id: s.id, label: s.label || s.id, shape: "rect" as const }));
  const graphEdges = model.transitions.map((t) => ({ id: t.id, source: t.source, target: t.target, style: "arrow" as const }));
  const positions = computeLayout(graphNodes, graphEdges, existing);

  const nodes: Node[] = model.states.map((s) => ({
    id: s.id,
    type: nodeTypeForKind(s.kind),
    position: positions[s.id] ?? { x: 0, y: 0 },
    data: { stateId: s.id, label: s.label || s.id, kind: s.kind } satisfies StateNodeData,
  }));

  const edges: Edge[] = model.transitions.map((t) => ({
    id: t.id,
    source: t.source,
    target: t.target,
    label: t.label,
    style: { stroke: "var(--text-muted)" },
    labelStyle: { fill: "var(--text-primary)", fontSize: 11 },
    labelBgStyle: { fill: "var(--bg-surface)" },
  }));

  return { nodes, edges };
}

function flowToModel(nodes: Node[], edges: Edge[]): StateModel {
  const states: StateNode[] = nodes.map((n) => {
    const d = n.data as StateNodeData;
    return {
      id: d.stateId,
      label: d.label !== d.stateId ? d.label : undefined,
      kind: d.kind,
    };
  });

  const transitions = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label ? String(e.label) : undefined,
  }));

  return { type: "stateDiagram-v2", states, transitions, rawLines: [] };
}

// ---------------------------------------------------------------------------
// Transition label editor popover
// ---------------------------------------------------------------------------

function TransitionLabelEditor({
  label,
  position,
  onClose,
}: {
  label: string;
  position: { x: number; y: number };
  onClose: (newLabel: string | null) => void;
}) {
  const [value, setValue] = useState(label);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = document.getElementById("tl-editor-popover");
      if (el && !el.contains(e.target as globalThis.Node)) {
        onClose(value);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [value, onClose]);

  return (
    <div
      id="tl-editor-popover"
      className="fixed z-50 bg-[var(--bg-secondary)] border border-[var(--border)] rounded shadow-lg px-2 py-1.5 flex items-center gap-1.5"
      style={{ left: position.x, top: position.y - 40 }}
    >
      <input
        className="field-input text-xs w-36"
        placeholder="Transition label…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { onClose(value); }
          if (e.key === "Escape") { onClose(null); }
        }}
        autoFocus
      />
      <button
        className="text-xs text-[var(--accent)] hover:underline"
        onClick={() => onClose(value)}
      >OK</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner canvas
// ---------------------------------------------------------------------------

type SyncState = "idle" | "pending" | "syncing";

function StateCanvasInner({ source, onSourceChange }: { source: string; onSourceChange: (s: string) => void }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [isComposite, setIsComposite] = useState(false);
  const [connectMode, setConnectMode] = useState(false);
  const [connectSource, setConnectSource] = useState<string | null>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [edgeClickPos, setEdgeClickPos] = useState<{ x: number; y: number } | null>(null);

  const suppressSyncRef = useRef(false);
  const ownUpdateRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const nodePositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  const { getViewport } = useReactFlow();

  useEffect(() => {
    if (ownUpdateRef.current) { ownUpdateRef.current = false; return; }
    const model = parse(source);
    if (model.type !== "stateDiagram-v2") return;
    const sm = model as StateModel;
    if (sm.hasCompositeStates) {
      setIsComposite(true);
      return;
    }
    setIsComposite(false);
    const { nodes: n, edges: e } = modelToFlow(sm, nodePositionsRef.current);
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
    (connection) => setEdges((eds) => addEdge({ ...connection, style: { stroke: "var(--text-muted)" } }, eds)),
    [setEdges]
  );

  function addNewState() {
    const count = nodes.filter((n) => (n.data as StateNodeData).kind === "normal").length;
    const id = `State${count + 1}`;
    const { x, y, zoom } = getViewport();
    const position = {
      x: (-x + window.innerWidth / 2) / zoom,
      y: (-y + window.innerHeight / 2) / zoom,
    };
    setNodes((ns) => [
      ...ns,
      {
        id,
        type: "stateNormal",
        position,
        data: { stateId: id, label: id, kind: "normal" as const } satisfies StateNodeData,
      },
    ]);
  }

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (!connectMode) return;
      if (!connectSource) {
        setConnectSource(node.id);
      } else {
        const id = `t-${Date.now()}`;
        setEdges((eds) => [
          ...eds,
          {
            id,
            source: connectSource,
            target: node.id,
            style: { stroke: "var(--text-muted)" },
            labelStyle: { fill: "var(--text-primary)", fontSize: 11 },
            labelBgStyle: { fill: "var(--bg-surface)" },
          },
        ]);
        setConnectSource(null);
        setConnectMode(false);
      }
    },
    [connectMode, connectSource, setEdges]
  );

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setEdgeClickPos({ x: event.clientX, y: event.clientY });
    setEditingEdgeId(edge.id);
  }, []);

  function syncNow() {
    clearTimeout(syncTimerRef.current);
    setSyncState("syncing");
    const newSource = serialize(flowToModel(nodes, edges));
    ownUpdateRef.current = true;
    onSourceChange(newSource);
    setTimeout(() => setSyncState("idle"), 400);
  }

  if (isComposite) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex items-center gap-1 px-2 py-1.5 bg-[var(--bg-secondary)] border-b border-[var(--border)] shrink-0">
          <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">State Diagram</span>
          <span className="ml-2 text-xs text-yellow-400">(read-only)</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-sm text-[var(--text-muted)] text-center max-w-md">
            This diagram uses composite state syntax (nested states, concurrency, or fork/join).
            Visual editing is not available — edit in the source editor.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full min-h-0">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-[var(--bg-secondary)] border-b border-[var(--border)] shrink-0">
        <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">State Diagram</span>
        <button
          onClick={addNewState}
          className="text-xs text-[var(--accent)] hover:underline ml-2"
        >+ Add State</button>
        <button
          onClick={() => { setConnectMode(!connectMode); setConnectSource(null); }}
          className={`text-xs hover:underline ${connectMode ? "text-yellow-400" : "text-[var(--accent)]"}`}
        >+ Add Transition{connectMode ? " (click source, then target)" : ""}</button>
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
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          nodeTypes={NODE_TYPES}
          deleteKeyCode={["Backspace", "Delete"]}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          style={{ background: "var(--bg-primary)", cursor: connectMode ? "crosshair" : undefined }}
        >
          <Background variant={BackgroundVariant.Dots} color="var(--border)" gap={20} size={1} />
        </ReactFlow>
      </div>

      {editingEdgeId && (() => {
        const edge = edges.find((e) => e.id === editingEdgeId);
        if (!edge) return null;
        return (
          <TransitionLabelEditor
            label={edge.label ? String(edge.label) : ""}
            position={edgeClickPos!}
            onClose={(newLabel) => {
              if (newLabel !== null) {
                setEdges((es) =>
                  es.map((e) =>
                    e.id === editingEdgeId ? { ...e, label: newLabel || undefined } : e
                  )
                );
              }
              setEditingEdgeId(null);
            }}
          />
        );
      })()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

export default function StateCanvas({ source, onSourceChange }: { source: string; onSourceChange: (s: string) => void }) {
  return (
    <ReactFlowProvider>
      <StateCanvasInner source={source} onSourceChange={onSourceChange} />
    </ReactFlowProvider>
  );
}
