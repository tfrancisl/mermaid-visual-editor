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
import type { ERModel, EREntity, ERAttribute, ERCardinality } from "../../lib/parsers";
import { serialize } from "../../lib/serializers";
import { computeLayout } from "../../lib/layout";

// ---------------------------------------------------------------------------
// Custom ER entity node
// ---------------------------------------------------------------------------

type ERNodeData = {
  entityName: string;
  attributes: ERAttribute[];
};

type EREdgeData = {
  cardA: ERCardinality;
  cardB: ERCardinality;
  identifying: boolean;
  label: string;
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
    data: {
      cardA: r.cardA,
      cardB: r.cardB,
      identifying: r.identifying ?? true,
      label: r.label,
    } satisfies EREdgeData,
    sourceLabel: cardLabel(r.cardA),
    targetLabel: cardLabel(r.cardB),
    style: {
      stroke: "var(--text-muted)",
      strokeDasharray: (r.identifying === false) ? "5 3" : undefined,
    },
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

  const relations = edges.map((e) => {
    const d = (e.data ?? {}) as Partial<EREdgeData>;
    return {
      id: e.id,
      entityA: e.source,
      entityB: e.target,
      cardA: d.cardA ?? "||" as ERCardinality,
      cardB: d.cardB ?? "||" as ERCardinality,
      identifying: d.identifying ?? true,
      label: d.label ?? String(e.label ?? "relates"),
    };
  });

  return { type: "erDiagram", entities, relations, rawLines: [] };
}

// ---------------------------------------------------------------------------
// Entity edit popover
// ---------------------------------------------------------------------------

type EREntityEditPopoverProps = {
  entityName: string;
  attributes: ERAttribute[];
  position: { x: number; y: number };
  onClose: (updated: { entityName: string; attributes: ERAttribute[] } | null) => void;
};

function EREntityEditPopover({ entityName, attributes, position, onClose }: EREntityEditPopoverProps) {
  const [name, setName] = useState(entityName);
  const [attrs, setAttrs] = useState<ERAttribute[]>(() =>
    attributes.map((a) => ({ ...a }))
  );
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose({ entityName: name, attributes: attrs });
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as unknown as globalThis.Node)) {
        onClose({ entityName: name, attributes: attrs });
      }
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, attrs]);

  function addAttr() {
    setAttrs((prev) => [...prev, { type: "string", name: "field", key: "" }]);
  }

  function removeAttr(i: number) {
    setAttrs((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateAttr(i: number, field: keyof ERAttribute, value: string) {
    setAttrs((prev) => prev.map((a, idx) =>
      idx === i ? { ...a, [field]: value } : a
    ));
  }

  return (
    <div
      ref={popoverRef}
      style={{ position: "fixed", left: position.x, top: position.y, zIndex: 50 }}
      className="bg-[var(--bg-surface)] border border-[var(--border)] rounded shadow-lg p-3 min-w-[280px]"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[var(--text-primary)]">Edit Entity</span>
        <button
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          onClick={() => onClose({ entityName: name, attributes: attrs })}
        >Done</button>
      </div>

      <div className="mb-2">
        <label className="block text-[10px] text-[var(--text-muted)] mb-1">Entity Name</label>
        <input
          className="field-input w-full text-xs"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
        />
      </div>

      <div className="mb-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[var(--text-muted)]">Attributes</span>
          <button
            className="text-[10px] text-[var(--accent)] hover:underline"
            onClick={addAttr}
          >+ Add Attribute</button>
        </div>
        {attrs.map((a, i) => (
          <div key={i} className="flex items-center gap-1 mb-1">
            <input
              className="field-input text-[10px] w-16"
              value={a.type}
              placeholder="type"
              onChange={(e) => updateAttr(i, "type", e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
            <input
              className="field-input text-[10px] flex-1"
              value={a.name}
              placeholder="name"
              onChange={(e) => updateAttr(i, "name", e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
            <select
              className="field-select text-[10px] w-12"
              value={a.key}
              onChange={(e) => updateAttr(i, "key", e.target.value as ERAttribute["key"])}
            >
              <option value="">—</option>
              <option value="PK">PK</option>
              <option value="FK">FK</option>
              <option value="UK">UK</option>
            </select>
            <button
              className="text-[10px] text-red-400 hover:text-red-300 px-1"
              onClick={() => removeAttr(i)}
            >x</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edge inspector popover
// ---------------------------------------------------------------------------

type EREdgeInspectorProps = {
  cardA: ERCardinality;
  cardB: ERCardinality;
  identifying: boolean;
  label: string;
  position: { x: number; y: number };
  onClose: (updated: { cardA: ERCardinality; cardB: ERCardinality; identifying: boolean; label: string } | null) => void;
};

const CARD_OPTIONS: { value: ERCardinality; label: string }[] = [
  { value: "||", label: "Exactly one (||)" },
  { value: "o|", label: "Zero or one (o|)" },
  { value: "|{", label: "One or more (|{)" },
  { value: "o{", label: "Zero or more (o{)" },
];

function EREdgeInspector({ cardA, cardB, identifying, label, position, onClose }: EREdgeInspectorProps) {
  const [localCardA, setLocalCardA] = useState<ERCardinality>(cardA);
  const [localCardB, setLocalCardB] = useState<ERCardinality>(cardB);
  const [localIdentifying, setLocalIdentifying] = useState(identifying);
  const [localLabel, setLocalLabel] = useState(label);
  const inspectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose({ cardA: localCardA, cardB: localCardB, identifying: localIdentifying, label: localLabel });
      }
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (inspectorRef.current && !inspectorRef.current.contains(e.target as unknown as globalThis.Node)) {
        onClose({ cardA: localCardA, cardB: localCardB, identifying: localIdentifying, label: localLabel });
      }
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localCardA, localCardB, localIdentifying, localLabel]);

  return (
    <div
      ref={inspectorRef}
      style={{ position: "fixed", left: position.x, top: position.y, zIndex: 50 }}
      className="bg-[var(--bg-surface)] border border-[var(--border)] rounded shadow-lg p-3 min-w-[260px]"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[var(--text-primary)]">Edit Relationship</span>
        <button
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          onClick={() => onClose({ cardA: localCardA, cardB: localCardB, identifying: localIdentifying, label: localLabel })}
        >Done</button>
      </div>

      <div className="mb-2">
        <label className="block text-[10px] text-[var(--text-muted)] mb-1">Source cardinality (A)</label>
        <select
          className="field-select w-full text-xs"
          value={localCardA}
          onChange={(e) => setLocalCardA(e.target.value as ERCardinality)}
        >
          {CARD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="mb-2">
        <label className="block text-[10px] text-[var(--text-muted)] mb-1">Target cardinality (B)</label>
        <select
          className="field-select w-full text-xs"
          value={localCardB}
          onChange={(e) => setLocalCardB(e.target.value as ERCardinality)}
        >
          {CARD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="mb-2">
        <label className="block text-[10px] text-[var(--text-muted)] mb-1">Label</label>
        <input
          className="field-input w-full text-xs"
          value={localLabel}
          onChange={(e) => setLocalLabel(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="er-identifying"
          checked={localIdentifying}
          onChange={(e) => setLocalIdentifying(e.target.checked)}
        />
        <label htmlFor="er-identifying" className="text-[10px] text-[var(--text-muted)] cursor-pointer">
          Identifying relationship
        </label>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner canvas
// ---------------------------------------------------------------------------

type SyncState = "idle" | "pending" | "syncing";

function ERCanvasInner({ source, onSourceChange }: { source: string; onSourceChange: (s: string) => void }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editClickPos, setEditClickPos] = useState<{ x: number; y: number } | null>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [edgeClickPos, setEdgeClickPos] = useState<{ x: number; y: number } | null>(null);

  const suppressSyncRef = useRef(false);
  const ownUpdateRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const nodePositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  const { getViewport, flowToScreenPosition } = useReactFlow();

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
      data: {
        cardA: "||" as ERCardinality,
        cardB: "||" as ERCardinality,
        identifying: true,
        label: "relates",
      } satisfies EREdgeData,
      style: { stroke: "var(--text-muted)" },
      labelStyle: { fill: "var(--text-primary)", fontSize: 11 },
      labelBgStyle: { fill: "var(--bg-surface)" },
    }, eds)),
    [setEdges]
  );

  function addNewEntity() {
    const count = nodes.filter((n) => (n.data as ERNodeData).entityName?.startsWith("Entity")).length;
    const id = `Entity${count + 1}`;
    const { x, y, zoom } = getViewport();
    const position = {
      x: (-x + window.innerWidth / 2) / zoom,
      y: (-y + window.innerHeight / 2) / zoom,
    };
    setNodes((ns) => [...ns, {
      id,
      type: "erEntity",
      position,
      data: { entityName: id, attributes: [] } satisfies ERNodeData,
    }]);
  }

  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    const screenPos = flowToScreenPosition(node.position);
    setEditClickPos({ x: screenPos.x, y: screenPos.y });
    setEditingNodeId(node.id);
  }, [flowToScreenPosition]);

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

  return (
    <div className="relative flex flex-col h-full min-h-0">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-[var(--bg-secondary)] border-b border-[var(--border)] shrink-0">
        <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">ER Diagram</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={addNewEntity}
            className="text-xs text-[var(--accent)] hover:underline"
          >+ Add Entity</button>
          {syncState === "pending" && (
            <button onClick={syncNow} className="text-xs text-[var(--accent)] hover:underline">Sync now</button>
          )}
          {syncState === "syncing" && (
            <span className="text-xs text-[var(--text-muted)] animate-pulse">syncing</span>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={onNodeDoubleClick}
          onEdgeClick={onEdgeClick}
          nodeTypes={NODE_TYPES}
          deleteKeyCode={["Backspace", "Delete"]}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          style={{ background: "var(--bg-primary)" }}
        >
          <Background variant={BackgroundVariant.Dots} color="var(--border)" gap={20} size={1} />
        </ReactFlow>

        {editingNodeId && (() => {
          const node = nodes.find((n) => n.id === editingNodeId);
          if (!node) return null;
          const d = node.data as ERNodeData;
          return (
            <EREntityEditPopover
              entityName={d.entityName}
              attributes={d.attributes}
              position={editClickPos!}
              onClose={(updated) => {
                if (updated) {
                  setNodes((ns) => ns.map((n) =>
                    n.id === editingNodeId
                      ? { ...n, id: updated.entityName, data: { ...n.data, entityName: updated.entityName, attributes: updated.attributes } }
                      : n
                  ));
                  // Also update edges that reference the old entity name
                  if (updated.entityName !== editingNodeId) {
                    setEdges((es) => es.map((e) => ({
                      ...e,
                      source: e.source === editingNodeId ? updated.entityName : e.source,
                      target: e.target === editingNodeId ? updated.entityName : e.target,
                    })));
                  }
                }
                setEditingNodeId(null);
              }}
            />
          );
        })()}

        {editingEdgeId && (() => {
          const edge = edges.find((e) => e.id === editingEdgeId);
          if (!edge) return null;
          const d = (edge.data ?? {}) as Partial<EREdgeData>;
          return (
            <EREdgeInspector
              cardA={d.cardA ?? "||"}
              cardB={d.cardB ?? "||"}
              identifying={d.identifying ?? true}
              label={d.label ?? String(edge.label ?? "")}
              position={edgeClickPos!}
              onClose={(updated) => {
                if (updated) {
                  setEdges((es) => es.map((e) =>
                    e.id === editingEdgeId
                      ? {
                          ...e,
                          label: updated.label,
                          data: { cardA: updated.cardA, cardB: updated.cardB, identifying: updated.identifying, label: updated.label } satisfies EREdgeData,
                          sourceLabel: cardLabel(updated.cardA),
                          targetLabel: cardLabel(updated.cardB),
                          style: { ...e.style, strokeDasharray: updated.identifying ? undefined : "5 3" },
                        }
                      : e
                  ));
                }
                setEditingEdgeId(null);
              }}
            />
          );
        })()}
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
