import {
  useCallback, useEffect, useRef, useState,
} from "react";
import {
  ReactFlow, ReactFlowProvider, Background, BackgroundVariant,
  useNodesState, useEdgesState, useReactFlow,
  Handle, Position,
  type Node, type Edge, type NodeProps, type NodeTypes,
} from "@xyflow/react";
import { parse } from "../../lib/parsers";
import type { MindmapModel, MindmapNode, MindmapShape } from "../../lib/parsers";
import { serialize } from "../../lib/serializers";

// ---------------------------------------------------------------------------
// Tree layout
// ---------------------------------------------------------------------------

const H_SPACE = 200;
const V_SPACE = 60;

interface FlatNode {
  id: string;
  label: string;
  shape: MindmapShape;
  parentId?: string;
}

function flattenTree(node: MindmapNode, parent?: string): FlatNode[] {
  const result: FlatNode[] = [{ id: node.id, label: node.label, shape: node.shape, parentId: parent }];
  for (const child of node.children) {
    result.push(...flattenTree(child, node.id));
  }
  return result;
}

function treeLayout(root: MindmapNode, existing: Record<string, { x: number; y: number }> = {}): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};

  function subtreeHeight(node: MindmapNode): number {
    if (node.children.length === 0) return 1;
    return node.children.reduce((sum, c) => sum + subtreeHeight(c), 0);
  }

  function layout(node: MindmapNode, x: number, yStart: number, depth: number) {
    const height = subtreeHeight(node);
    const yCenter = yStart + (height * V_SPACE) / 2 - V_SPACE / 2;

    if (existing[node.id]) {
      positions[node.id] = existing[node.id];
    } else {
      positions[node.id] = { x: depth * H_SPACE, y: yCenter };
    }

    let childY = yStart;
    for (const child of node.children) {
      const childH = subtreeHeight(child);
      layout(child, x + H_SPACE, childY, depth + 1);
      childY += childH * V_SPACE;
    }
  }

  layout(root, 0, 0, 0);
  return positions;
}

function rebuildTree(nodes: Node[], edges: Edge[], rootId: string): MindmapNode {
  const childMap = new Map<string, string[]>();
  for (const e of edges) {
    const list = childMap.get(e.source) ?? [];
    list.push(e.target);
    childMap.set(e.source, list);
  }
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  function build(id: string): MindmapNode {
    const n = nodeMap.get(id);
    const data = n?.data as MindmapNodeData | undefined;
    return {
      id,
      label: data?.label ?? id,
      shape: data?.shape ?? "default",
      children: (childMap.get(id) ?? []).map(build),
    };
  }

  return build(rootId);
}

// ---------------------------------------------------------------------------
// Custom node
// ---------------------------------------------------------------------------

type MindmapNodeData = {
  label: string;
  shape: MindmapShape;
  isRoot: boolean;
};

function MindmapNodeComponent({ data, selected, id }: NodeProps) {
  const d = data as MindmapNodeData;
  const { deleteElements } = useReactFlow();
  const ring = selected ? "ring-2 ring-[var(--accent)]" : "";

  const shapeClass =
    d.shape === "circle" ? "rounded-full w-20 h-20" :
    d.shape === "rounded" ? "rounded-xl" :
    d.shape === "hexagon" ? "rounded-lg" :
    d.shape === "cloud" ? "rounded-2xl" :
    "rounded-sm";

  const bg = d.isRoot ? "bg-[var(--accent)] text-[var(--bg-primary)]" : "bg-[var(--bg-surface)] text-[var(--text-primary)]";

  return (
    <div className="relative group">
      <Handle type="target" position={Position.Left} className="!bg-[var(--accent)] !w-2 !h-2" />

      <div className={`flex items-center justify-center px-3 py-2 text-xs border border-[var(--border)] min-w-[60px] select-none ${shapeClass} ${bg} ${ring}`}>
        {d.label}
      </div>

      {selected && !d.isRoot && (
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-1.5 py-0.5 z-10">
          <button
            className="text-[10px] text-red-400 hover:text-red-300 px-1"
            onClick={() => deleteElements({ nodes: [{ id }] })}
          >x</button>
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!bg-[var(--accent)] !w-2 !h-2" />
    </div>
  );
}

const NODE_TYPES: NodeTypes = { mindmapNode: MindmapNodeComponent };

// ---------------------------------------------------------------------------
// Inner canvas
// ---------------------------------------------------------------------------

type SyncState = "idle" | "pending" | "syncing";

function MindmapCanvasInner({ source, onSourceChange }: { source: string; onSourceChange: (s: string) => void }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [rootId, setRootId] = useState<string>("mm-0");
  const [syncState, setSyncState] = useState<SyncState>("idle");

  const suppressSyncRef = useRef(false);
  const ownUpdateRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const nodePositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  // source → canvas
  useEffect(() => {
    if (ownUpdateRef.current) { ownUpdateRef.current = false; return; }
    const model = parse(source);
    if (model.type !== "mindmap") return;
    const mm = model as MindmapModel;
    setRootId(mm.root.id);

    const flat = flattenTree(mm.root);
    const positions = treeLayout(mm.root, nodePositionsRef.current);

    const flowNodes: Node[] = flat.map((f) => ({
      id: f.id,
      type: "mindmapNode",
      position: positions[f.id] ?? { x: 0, y: 0 },
      data: { label: f.label, shape: f.shape, isRoot: !f.parentId } satisfies MindmapNodeData,
    }));

    const flowEdges: Edge[] = flat
      .filter((f) => f.parentId)
      .map((f) => ({
        id: `${f.parentId}->${f.id}`,
        source: f.parentId!,
        target: f.id,
        style: { stroke: "var(--text-muted)" },
      }));

    suppressSyncRef.current = true;
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [source]); // eslint-disable-line react-hooks/exhaustive-deps

  // canvas → source
  useEffect(() => {
    if (suppressSyncRef.current) { suppressSyncRef.current = false; return; }
    setSyncState("pending");
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      setSyncState("syncing");
      const tree = rebuildTree(nodes, edges, rootId);
      const model: MindmapModel = { type: "mindmap", root: tree, rawLines: [] };
      ownUpdateRef.current = true;
      onSourceChange(serialize(model));
      setTimeout(() => setSyncState("idle"), 400);
    }, 1500);
    return () => clearTimeout(syncTimerRef.current);
  }, [nodes, edges, rootId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  function syncNow() {
    clearTimeout(syncTimerRef.current);
    setSyncState("syncing");
    const tree = rebuildTree(nodes, edges, rootId);
    const model: MindmapModel = { type: "mindmap", root: tree, rawLines: [] };
    ownUpdateRef.current = true;
    onSourceChange(serialize(model));
    setTimeout(() => setSyncState("idle"), 400);
  }

  return (
    <div className="relative flex flex-col h-full min-h-0">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-[var(--bg-secondary)] border-b border-[var(--border)] shrink-0">
        <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Mindmap</span>
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

export default function MindmapCanvas({ source, onSourceChange }: { source: string; onSourceChange: (s: string) => void }) {
  return (
    <ReactFlowProvider>
      <MindmapCanvasInner source={source} onSourceChange={onSourceChange} />
    </ReactFlowProvider>
  );
}
