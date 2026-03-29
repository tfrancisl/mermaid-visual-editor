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
import type { ClassModel, ClassNode, ClassMember, ClassMethod, ClassRelationType, ClassVisibility } from "../../lib/parsers";
import { serialize } from "../../lib/serializers";
import { computeLayout } from "../../lib/layout";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ClassNodeData = {
  classId: string;
  label: string;
  annotation?: string;
  members: ClassMember[];
  methods: ClassMethod[];
};

type ClassEdgeData = {
  relType: ClassRelationType;
  sourceCardinality?: string;
  targetCardinality?: string;
  label?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMember(m: ClassMember): string {
  return `${m.visibility}${m.type}${m.type ? " " : ""}${m.name}`;
}

function formatMethod(m: ClassMethod): string {
  return `${m.visibility}${m.name}(${m.params})${m.returnType ? ": " + m.returnType : ""}`;
}

// ---------------------------------------------------------------------------
// Custom UML class node
// ---------------------------------------------------------------------------

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
// ClassEditPopover
// ---------------------------------------------------------------------------

const VISIBILITY_OPTIONS: ClassVisibility[] = ["+", "-", "#", "~", ""];
const VISIBILITY_LABELS: Record<string, string> = { "+": "+ public", "-": "- private", "#": "# protected", "~": "~ package", "": "none" };

interface ClassEditPopoverProps {
  classId: string;
  label: string;
  annotation?: string;
  members: ClassMember[];
  methods: ClassMethod[];
  position: { x: number; y: number };
  onClose: (updated: Partial<ClassNodeData> | null) => void;
}

function ClassEditPopover({ classId, label, annotation, members, methods, position, onClose }: ClassEditPopoverProps) {
  const [name, setName] = useState(label || classId);
  const [ann, setAnn] = useState(annotation ?? "");
  const [mems, setMems] = useState<ClassMember[]>(members.map(m => ({ ...m })));
  const [meths, setMeths] = useState<ClassMethod[]>(methods.map(m => ({ ...m })));

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose({ label: name, annotation: ann || undefined, members: mems, methods: meths, classId });
      }
    }
    function onMouse(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as globalThis.Node)) {
        onClose({ label: name, annotation: ann || undefined, members: mems, methods: meths, classId });
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onMouse);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onMouse);
    };
  }, [name, ann, mems, meths, onClose, classId]);

  function addMember() {
    setMems(prev => [...prev, { visibility: "+", type: "", name: "attr" }]);
  }

  function removeMember(i: number) {
    setMems(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateMember(i: number, patch: Partial<ClassMember>) {
    setMems(prev => prev.map((m, idx) => idx === i ? { ...m, ...patch } : m));
  }

  function addMethod() {
    setMeths(prev => [...prev, { visibility: "+", name: "method", params: "", returnType: "" }]);
  }

  function removeMethod(i: number) {
    setMeths(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateMethod(i: number, patch: Partial<ClassMethod>) {
    setMeths(prev => prev.map((m, idx) => idx === i ? { ...m, ...patch } : m));
  }

  const style: React.CSSProperties = {
    position: "fixed",
    left: Math.min(position.x, window.innerWidth - 340),
    top: Math.min(position.y, window.innerHeight - 450),
    zIndex: 50,
  };

  return (
    <div
      ref={ref}
      style={style}
      className="bg-[var(--bg-surface)] border border-[var(--border)] rounded shadow-lg p-3 min-w-[300px] max-h-[420px] overflow-y-auto text-xs"
    >
      <div className="font-semibold text-[var(--text-primary)] mb-2">Edit Class</div>

      {/* Name */}
      <div className="mb-2">
        <label className="block text-[var(--text-muted)] mb-0.5">Class Name</label>
        <input
          className="field-input w-full text-xs"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>

      {/* Annotation */}
      <div className="mb-2">
        <label className="block text-[var(--text-muted)] mb-0.5">Annotation (e.g. interface, abstract)</label>
        <input
          className="field-input w-full text-xs"
          value={ann}
          onChange={e => setAnn(e.target.value)}
          placeholder="interface"
        />
      </div>

      {/* Attributes */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-[var(--text-primary)]">Attributes</span>
          <button onClick={addMember} className="text-[var(--accent)] hover:underline text-[11px]">+ Add Attribute</button>
        </div>
        {mems.map((m, i) => (
          <div key={i} className="flex gap-1 items-center mb-1">
            <select
              className="field-select text-[11px] w-20 shrink-0"
              value={m.visibility}
              onChange={e => updateMember(i, { visibility: e.target.value as ClassVisibility })}
            >
              {VISIBILITY_OPTIONS.map(v => (
                <option key={v} value={v}>{VISIBILITY_LABELS[v]}</option>
              ))}
            </select>
            <input
              className="field-input text-[11px] w-16"
              placeholder="type"
              value={m.type}
              onChange={e => updateMember(i, { type: e.target.value })}
            />
            <input
              className="field-input text-[11px] flex-1"
              placeholder="name"
              value={m.name}
              onChange={e => updateMember(i, { name: e.target.value })}
            />
            <button onClick={() => removeMember(i)} className="text-red-400 hover:text-red-300 px-1">x</button>
          </div>
        ))}
      </div>

      {/* Methods */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-[var(--text-primary)]">Methods</span>
          <button onClick={addMethod} className="text-[var(--accent)] hover:underline text-[11px]">+ Add Method</button>
        </div>
        {meths.map((m, i) => (
          <div key={i} className="flex gap-1 items-center mb-1 flex-wrap">
            <select
              className="field-select text-[11px] w-20 shrink-0"
              value={m.visibility}
              onChange={e => updateMethod(i, { visibility: e.target.value as ClassVisibility })}
            >
              {VISIBILITY_OPTIONS.map(v => (
                <option key={v} value={v}>{VISIBILITY_LABELS[v]}</option>
              ))}
            </select>
            <input
              className="field-input text-[11px] w-20"
              placeholder="name"
              value={m.name}
              onChange={e => updateMethod(i, { name: e.target.value })}
            />
            <input
              className="field-input text-[11px] w-16"
              placeholder="params"
              value={m.params}
              onChange={e => updateMethod(i, { params: e.target.value })}
            />
            <input
              className="field-input text-[11px] w-16"
              placeholder="return"
              value={m.returnType}
              onChange={e => updateMethod(i, { returnType: e.target.value })}
            />
            <button onClick={() => removeMethod(i)} className="text-red-400 hover:text-red-300 px-1">x</button>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-[var(--border)]">
        <button
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          onClick={() => onClose(null)}
        >Cancel</button>
        <button
          className="text-xs text-[var(--accent)] hover:underline"
          onClick={() => onClose({ label: name, annotation: ann || undefined, members: mems, methods: meths, classId })}
        >Apply</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ClassEdgeInspector
// ---------------------------------------------------------------------------

const REL_TYPE_OPTIONS: { value: ClassRelationType; label: string }[] = [
  { value: "inheritance", label: "Inheritance (<|--)" },
  { value: "composition", label: "Composition (*--)" },
  { value: "aggregation", label: "Aggregation (o--)" },
  { value: "association", label: "Association (-->)" },
  { value: "dependency", label: "Dependency (..>)" },
  { value: "realization", label: "Realization (<|..)" },
];

interface ClassEdgeInspectorProps {
  relType: ClassRelationType;
  label?: string;
  sourceCardinality?: string;
  targetCardinality?: string;
  position: { x: number; y: number };
  onClose: (updated: ClassEdgeData | null) => void;
}

function ClassEdgeInspector({ relType, label, sourceCardinality, targetCardinality, position, onClose }: ClassEdgeInspectorProps) {
  const [rt, setRt] = useState<ClassRelationType>(relType);
  const [lbl, setLbl] = useState(label ?? "");
  const [srcCard, setSrcCard] = useState(sourceCardinality ?? "");
  const [tgtCard, setTgtCard] = useState(targetCardinality ?? "");

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose({ relType: rt, label: lbl || undefined, sourceCardinality: srcCard || undefined, targetCardinality: tgtCard || undefined });
      }
    }
    function onMouse(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as globalThis.Node)) {
        onClose({ relType: rt, label: lbl || undefined, sourceCardinality: srcCard || undefined, targetCardinality: tgtCard || undefined });
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onMouse);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onMouse);
    };
  }, [rt, lbl, srcCard, tgtCard, onClose]);

  const style: React.CSSProperties = {
    position: "fixed",
    left: Math.min(position.x, window.innerWidth - 300),
    top: Math.min(position.y, window.innerHeight - 300),
    zIndex: 50,
  };

  return (
    <div
      ref={ref}
      style={style}
      className="bg-[var(--bg-surface)] border border-[var(--border)] rounded shadow-lg p-3 min-w-[260px] text-xs"
    >
      <div className="font-semibold text-[var(--text-primary)] mb-2">Edit Relationship</div>

      <div className="mb-2">
        <label className="block text-[var(--text-muted)] mb-0.5">Relationship Type</label>
        <select
          className="field-select w-full text-xs"
          value={rt}
          onChange={e => setRt(e.target.value as ClassRelationType)}
        >
          {REL_TYPE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="mb-2">
        <label className="block text-[var(--text-muted)] mb-0.5">Source Cardinality</label>
        <input
          className="field-input w-full text-xs"
          placeholder='e.g. "1", "0..*"'
          value={srcCard}
          onChange={e => setSrcCard(e.target.value)}
        />
      </div>

      <div className="mb-2">
        <label className="block text-[var(--text-muted)] mb-0.5">Target Cardinality</label>
        <input
          className="field-input w-full text-xs"
          placeholder='e.g. "n", "1..*"'
          value={tgtCard}
          onChange={e => setTgtCard(e.target.value)}
        />
      </div>

      <div className="mb-2">
        <label className="block text-[var(--text-muted)] mb-0.5">Label (optional)</label>
        <input
          className="field-input w-full text-xs"
          placeholder="uses"
          value={lbl}
          onChange={e => setLbl(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-[var(--border)]">
        <button
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          onClick={() => onClose(null)}
        >Cancel</button>
        <button
          className="text-xs text-[var(--accent)] hover:underline"
          onClick={() => onClose({ relType: rt, label: lbl || undefined, sourceCardinality: srcCard || undefined, targetCardinality: tgtCard || undefined })}
        >Apply</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// modelToFlow / flowToModel
// ---------------------------------------------------------------------------

function modelToFlow(model: ClassModel, existing: Record<string, { x: number; y: number }> = {}) {
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
    data: {
      relType: r.type,
      sourceCardinality: r.sourceCardinality,
      targetCardinality: r.targetCardinality,
      label: r.label,
    } satisfies ClassEdgeData,
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

  const relations = edges.map((e) => {
    const d = (e.data ?? {}) as Partial<ClassEdgeData>;
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: (d.relType ?? "association") as ClassRelationType,
      label: d.label ?? (e.label ? String(e.label) : undefined),
      sourceCardinality: d.sourceCardinality,
      targetCardinality: d.targetCardinality,
    };
  });

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
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editClickPos, setEditClickPos] = useState<{ x: number; y: number } | null>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [edgeClickPos, setEdgeClickPos] = useState<{ x: number; y: number } | null>(null);

  const suppressSyncRef = useRef(false);
  const ownUpdateRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const nodePositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  const { getViewport } = useReactFlow();

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
      data: {
        relType: "association" as ClassRelationType,
        sourceCardinality: undefined,
        targetCardinality: undefined,
        label: undefined,
      } satisfies ClassEdgeData,
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

  function addNewClass() {
    const count = nodes.filter(n => (n.data as ClassNodeData).classId?.startsWith("Class")).length;
    const id = `Class${count + 1}`;
    const { x, y, zoom } = getViewport();
    const position = {
      x: (-x + window.innerWidth / 2) / zoom,
      y: (-y + window.innerHeight / 2) / zoom,
    };
    setNodes((ns) => [...ns, {
      id,
      type: "umlClass",
      position,
      data: {
        classId: id,
        label: id,
        members: [],
        methods: [],
      } satisfies ClassNodeData,
    }]);
  }

  function onNodeDoubleClick(event: React.MouseEvent, node: Node) {
    setEditingEdgeId(null);
    setEditClickPos({ x: event.clientX + 10, y: event.clientY + 10 });
    setEditingNodeId(node.id);
  }

  function onEdgeClick(event: React.MouseEvent, edge: Edge) {
    setEditingNodeId(null);
    setEdgeClickPos({ x: event.clientX + 10, y: event.clientY + 10 });
    setEditingEdgeId(edge.id);
  }

  return (
    <div className="relative flex flex-col h-full min-h-0">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-[var(--bg-secondary)] border-b border-[var(--border)] shrink-0">
        <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Class Diagram</span>
        <button
          onClick={addNewClass}
          className="text-xs text-[var(--accent)] hover:underline ml-2"
        >+ Add Class</button>
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
      </div>

      {/* Class edit popover */}
      {editingNodeId && (() => {
        const node = nodes.find(n => n.id === editingNodeId);
        if (!node) return null;
        const d = node.data as ClassNodeData;
        return (
          <ClassEditPopover
            classId={d.classId}
            label={d.label}
            annotation={d.annotation}
            members={d.members}
            methods={d.methods}
            position={editClickPos!}
            onClose={(updated) => {
              if (updated) {
                setNodes(ns => ns.map(n =>
                  n.id === editingNodeId
                    ? { ...n, data: { ...n.data, ...updated } }
                    : n
                ));
              }
              setEditingNodeId(null);
            }}
          />
        );
      })()}

      {/* Edge inspector popover */}
      {editingEdgeId && (() => {
        const edge = edges.find(e => e.id === editingEdgeId);
        if (!edge) return null;
        const d = (edge.data ?? {}) as Partial<ClassEdgeData>;
        return (
          <ClassEdgeInspector
            relType={d.relType ?? "association"}
            label={d.label}
            sourceCardinality={d.sourceCardinality}
            targetCardinality={d.targetCardinality}
            position={edgeClickPos!}
            onClose={(updated) => {
              if (updated) {
                setEdges(es => es.map(e =>
                  e.id === editingEdgeId
                    ? {
                        ...e,
                        label: updated.label,
                        data: updated satisfies ClassEdgeData,
                        style: {
                          stroke: "var(--text-muted)",
                          strokeDasharray: updated.relType === "dependency" || updated.relType === "realization" ? "5 3" : undefined,
                        },
                        markerEnd: updated.relType === "inheritance" || updated.relType === "realization" ? "url(#triangle)" : undefined,
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
