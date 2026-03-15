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
import type { BlockModel, BlockItem, BlockArrow } from "../../lib/parsers";
import { serialize } from "../../lib/serializers";

// ---------------------------------------------------------------------------
// Grid layout for blocks
// ---------------------------------------------------------------------------

const CELL_W = 160;
const CELL_H = 60;
const GAP = 20;

function gridLayout(blocks: BlockItem[], columns: number, existing: Record<string, { x: number; y: number }> = {}): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  let col = 0;
  let row = 0;

  for (const b of blocks) {
    if (existing[b.id]) {
      positions[b.id] = existing[b.id];
    } else {
      positions[b.id] = { x: col * (CELL_W + GAP), y: row * (CELL_H + GAP) };
    }
    col += b.span;
    if (col >= columns) {
      col = 0;
      row++;
    }
  }

  return positions;
}

function flattenBlocks(blocks: BlockItem[]): BlockItem[] {
  const result: BlockItem[] = [];
  for (const b of blocks) {
    result.push(b);
    if (b.children.length > 0) {
      result.push(...flattenBlocks(b.children));
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Custom node
// ---------------------------------------------------------------------------

type BlockNodeData = {
  blockId: string;
  label: string;
  span: number;
};

function BlockNodeComponent({ data, selected, id }: NodeProps) {
  const d = data as BlockNodeData;
  const { deleteElements } = useReactFlow();
  const ring = selected ? "ring-2 ring-[var(--accent)]" : "";
  const width = d.span * CELL_W + (d.span - 1) * GAP;

  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!bg-[var(--accent)] !w-2 !h-2" />

      <div
        className={`flex items-center justify-center px-3 py-2 text-xs text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[var(--border)] rounded select-none ${ring}`}
        style={{ width, height: CELL_H }}
      >
        {d.label}
      </div>

      {selected && (
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-1.5 py-0.5 z-10">
          <button
            className="text-[10px] text-red-400 hover:text-red-300 px-1"
            onClick={() => deleteElements({ nodes: [{ id }] })}
          >x</button>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-[var(--accent)] !w-2 !h-2" />
    </div>
  );
}

const NODE_TYPES: NodeTypes = { blockNode: BlockNodeComponent };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function modelToFlow(model: BlockModel, existing: Record<string, { x: number; y: number }> = {}) {
  const flat = flattenBlocks(model.blocks);
  const positions = gridLayout(flat, model.columns, existing);

  const nodes: Node[] = flat.map((b) => ({
    id: b.id,
    type: "blockNode",
    position: positions[b.id] ?? { x: 0, y: 0 },
    data: { blockId: b.id, label: b.label, span: b.span } satisfies BlockNodeData,
  }));

  const edges: Edge[] = model.arrows.map((a) => ({
    id: a.id,
    source: a.source,
    target: a.target,
    label: a.label,
    style: { stroke: "var(--text-muted)" },
    labelStyle: { fill: "var(--text-primary)", fontSize: 11 },
    labelBgStyle: { fill: "var(--bg-surface)" },
  }));

  return { nodes, edges };
}

function flowToModel(nodes: Node[], edges: Edge[], columns: number): BlockModel {
  const blocks: BlockItem[] = nodes.map((n) => {
    const d = n.data as BlockNodeData;
    return { id: d.blockId, label: d.label, span: d.span, children: [] };
  });

  const arrows: BlockArrow[] = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label ? String(e.label) : undefined,
  }));

  return { type: "block-beta", columns, blocks, arrows, rawLines: [] };
}

// ---------------------------------------------------------------------------
// Inner canvas
// ---------------------------------------------------------------------------

type SyncState = "idle" | "pending" | "syncing";

function BlockCanvasInner({ source, onSourceChange }: { source: string; onSourceChange: (s: string) => void }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [columns, setColumns] = useState(1);
  const [syncState, setSyncState] = useState<SyncState>("idle");

  const suppressSyncRef = useRef(false);
  const ownUpdateRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const nodePositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    if (ownUpdateRef.current) { ownUpdateRef.current = false; return; }
    const model = parse(source);
    if (model.type !== "block-beta") return;
    const bm = model as BlockModel;
    setColumns(bm.columns);
    const { nodes: n, edges: e } = modelToFlow(bm, nodePositionsRef.current);
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
      const newSource = serialize(flowToModel(nodes, edges, columns));
      ownUpdateRef.current = true;
      onSourceChange(newSource);
      setTimeout(() => setSyncState("idle"), 400);
    }, 1500);
    return () => clearTimeout(syncTimerRef.current);
  }, [nodes, edges, columns]); // eslint-disable-line react-hooks/exhaustive-deps

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

  function syncNow() {
    clearTimeout(syncTimerRef.current);
    setSyncState("syncing");
    const newSource = serialize(flowToModel(nodes, edges, columns));
    ownUpdateRef.current = true;
    onSourceChange(newSource);
    setTimeout(() => setSyncState("idle"), 400);
  }

  return (
    <div className="relative flex flex-col h-full min-h-0">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-[var(--bg-secondary)] border-b border-[var(--border)] shrink-0">
        <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Block Diagram</span>
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

export default function BlockCanvas({ source, onSourceChange }: { source: string; onSourceChange: (s: string) => void }) {
  return (
    <ReactFlowProvider>
      <BlockCanvasInner source={source} onSourceChange={onSourceChange} />
    </ReactFlowProvider>
  );
}
