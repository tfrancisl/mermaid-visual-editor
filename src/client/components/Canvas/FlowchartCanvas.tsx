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
import type { GraphModel, GraphNode } from "../../lib/parsers";
import { serialize } from "../../lib/serializers";
import { computeLayout } from "../../lib/layout";

// ---------------------------------------------------------------------------
// Custom node types
// ---------------------------------------------------------------------------

type MermaidData = { label: string; shape: GraphNode["shape"] };

function NodeBody({ shape, label, selected, onDoubleClick }: {
  shape: GraphNode["shape"];
  label: string;
  selected: boolean;
  onDoubleClick: () => void;
}) {
  const ring = selected ? "ring-2 ring-[var(--accent)]" : "";

  if (shape === "diamond") {
    return (
      <div
        className={`flex items-center justify-center ${ring}`}
        style={{ width: 90, height: 90, transform: "rotate(45deg)", background: "var(--bg-surface)", border: "2px solid var(--border)" }}
        onDoubleClick={onDoubleClick}
      >
        <span style={{ transform: "rotate(-45deg)" }} className="text-xs text-[var(--text-primary)] px-1 text-center leading-tight select-none">
          {label}
        </span>
      </div>
    );
  }

  const base = "flex items-center justify-center px-3 py-2 text-xs text-[var(--text-primary)] select-none cursor-default bg-[var(--bg-surface)] border border-[var(--border)]";
  const radius =
    shape === "rounded" || shape === "stadium" ? "rounded-full" :
    shape === "circle" ? "rounded-full w-16 h-16" :
    "rounded-sm";

  return (
    <div className={`${base} ${radius} ${ring} min-w-[80px]`} onDoubleClick={onDoubleClick}>
      {label}
    </div>
  );
}

function MermaidNode({ data, selected, id }: NodeProps) {
  const d = data as MermaidData;
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(d.label);
  const { updateNodeData, deleteElements } = useReactFlow();

  // Sync label if it changes externally
  useEffect(() => { setVal(d.label); }, [d.label]);

  function commit() {
    setEditing(false);
    updateNodeData(id, { ...d, label: val });
  }

  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!bg-[var(--accent)] !w-2 !h-2" />

      {editing ? (
        <input
          className="text-xs px-2 py-1 rounded bg-[var(--bg-surface)] border border-[var(--accent)] text-[var(--text-primary)] outline-none w-24 text-center"
          value={val}
          autoFocus
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setVal(d.label); setEditing(false); }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <NodeBody shape={d.shape} label={d.label} selected={selected ?? false} onDoubleClick={() => setEditing(true)} />
      )}

      {/* Floating action bar (visible when selected) */}
      {selected && !editing && (
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 flex gap-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-1.5 py-0.5 z-10 whitespace-nowrap">
          <button
            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] px-1"
            onClick={() => setEditing(true)}
            title="Edit label"
          >✎</button>
          <span className="text-[var(--border)]">│</span>
          <button
            className="text-[10px] text-red-400 hover:text-red-300 px-1"
            onClick={() => deleteElements({ nodes: [{ id }] })}
            title="Delete"
          >×</button>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-[var(--accent)] !w-2 !h-2" />
    </div>
  );
}

const NODE_TYPES: NodeTypes = { mermaid: MermaidNode };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shapeForNode(_shape: GraphNode["shape"]) {
  return "mermaid"; // single type handles all shapes via data.shape
}

function modelToFlow(model: GraphModel, existingPositions: Record<string, { x: number; y: number }> = {}) {
  const positions = computeLayout(model.nodes, model.edges, existingPositions);
  const nodes: Node[] = model.nodes.map((n) => ({
    id: n.id,
    type: shapeForNode(n.shape),
    position: positions[n.id] ?? { x: 0, y: 0 },
    data: { label: n.label, shape: n.shape } satisfies MermaidData,
  }));
  const edges: Edge[] = model.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: e.style === "dotted",
    style: { stroke: "var(--text-muted)" },
    labelStyle: { fill: "var(--text-primary)", fontSize: 11 },
    labelBgStyle: { fill: "var(--bg-surface)" },
  }));
  return { nodes, edges };
}

function flowToModel(
  nodes: Node[],
  edges: Edge[],
  direction: GraphModel["direction"]
): GraphModel {
  return {
    type: "flowchart",
    direction,
    nodes: nodes.map((n) => ({
      id: n.id,
      label: String((n.data as MermaidData).label),
      shape: (n.data as MermaidData).shape ?? "rect",
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label ? String(e.label) : undefined,
      style: e.animated ? "dotted" : "arrow",
    })),
    rawLines: [],
  };
}

// ---------------------------------------------------------------------------
// Inner canvas (must be inside ReactFlowProvider)
// ---------------------------------------------------------------------------

type Tool = "select" | "addNode" | "addEdge";
type SyncState = "idle" | "pending" | "syncing";

function FlowchartCanvasInner({ source, onSourceChange }: { source: string; onSourceChange: (s: string) => void }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [direction, setDirection] = useState<GraphModel["direction"]>("TD");
  const [tool, setTool] = useState<Tool>("select");
  const [syncState, setSyncState] = useState<SyncState>("idle");

  const suppressSyncRef = useRef(false);
  const ownUpdateRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const nodePositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  const { screenToFlowPosition } = useReactFlow();

  // ---- source → canvas ----
  useEffect(() => {
    if (ownUpdateRef.current) { ownUpdateRef.current = false; return; }
    const model = parse(source);
    if (model.type !== "flowchart" && model.type !== "graph") return;
    const gm = model as GraphModel;
    setDirection(gm.direction ?? "TD");
    const { nodes: n, edges: e } = modelToFlow(gm, nodePositionsRef.current);
    suppressSyncRef.current = true;
    setNodes(n);
    setEdges(e);
  }, [source]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- canvas → source (auto-sync 1.5 s) ----
  useEffect(() => {
    if (suppressSyncRef.current) { suppressSyncRef.current = false; return; }
    setSyncState("pending");
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      setSyncState("syncing");
      const newSource = serialize(flowToModel(nodes, edges, direction));
      ownUpdateRef.current = true;
      onSourceChange(newSource);
      setTimeout(() => setSyncState("idle"), 400);
    }, 1500);
    return () => clearTimeout(syncTimerRef.current);
  }, [nodes, edges, direction]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track positions for layout preservation
  useEffect(() => {
    nodePositionsRef.current = Object.fromEntries(nodes.map((n) => [n.id, n.position]));
  }, [nodes]);

  // Keyboard shortcuts: ⌘Enter → sync now, Escape → select tool
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        syncNow();
      } else if (e.key === "Escape") {
        setTool("select");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge({ ...connection, style: { stroke: "var(--text-muted)" } }, eds)),
    [setEdges]
  );

  // Add node on pane click when in addNode mode
  const onPaneClick = useCallback(
    (e: React.MouseEvent) => {
      if (tool !== "addNode") return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const id = `node-${Date.now()}`;
      setNodes((ns) => [
        ...ns,
        { id, type: "mermaid", position, data: { label: "New node", shape: "rect" } satisfies MermaidData },
      ]);
      setTool("select");
    },
    [tool, screenToFlowPosition, setNodes]
  );

  function syncNow() {
    clearTimeout(syncTimerRef.current);
    setSyncState("syncing");
    const newSource = serialize(flowToModel(nodes, edges, direction));
    ownUpdateRef.current = true;
    onSourceChange(newSource);
    setTimeout(() => setSyncState("idle"), 400);
  }

  const btnBase = "px-2.5 py-1 text-xs rounded transition-colors";
  const btnActive = `${btnBase} bg-[var(--accent)] text-[var(--bg-primary)]`;
  const btnIdle = `${btnBase} text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]`;

  return (
    <div className="relative flex flex-col h-full min-h-0">
      {/* Canvas toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-[var(--bg-secondary)] border-b border-[var(--border)] shrink-0">
        <button className={tool === "select" ? btnActive : btnIdle} onClick={() => setTool("select")} title="Select / move">↖</button>
        <button className={tool === "addNode" ? btnActive : btnIdle} onClick={() => setTool("addNode")} title="Add node — click canvas">⊕ Node</button>
        <button className={tool === "addEdge" ? btnActive : btnIdle} onClick={() => setTool("addEdge")} title="Add edge — drag between handles">⤳ Edge</button>

        <div className="ml-auto flex items-center gap-2">
          {syncState === "pending" && (
            <button onClick={syncNow} className="text-xs text-[var(--accent)] hover:underline">
              Sync now
            </button>
          )}
          {syncState === "syncing" && (
            <span className="text-xs text-[var(--text-muted)] animate-pulse">↻ syncing</span>
          )}
        </div>
      </div>

      {/* React Flow canvas */}
      <div className="flex-1 min-h-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onPaneClick={onPaneClick}
          nodeTypes={NODE_TYPES}
          deleteKeyCode={["Backspace", "Delete"]}
          connectOnClick={tool === "addEdge"}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          style={{ background: "var(--bg-primary)" }}
        >
          <Background variant={BackgroundVariant.Dots} color="var(--border)" gap={20} size={1} />
        </ReactFlow>
      </div>

      {/* Add-node hint */}
      {tool === "addNode" && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-3 py-1 pointer-events-none">
          Click anywhere on the canvas to place a node
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public component (wraps provider)
// ---------------------------------------------------------------------------

export default function FlowchartCanvas({ source, onSourceChange }: { source: string; onSourceChange: (s: string) => void }) {
  return (
    <ReactFlowProvider>
      <FlowchartCanvasInner source={source} onSourceChange={onSourceChange} />
    </ReactFlowProvider>
  );
}
