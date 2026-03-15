import type {
  DiagramModel, GraphModel, GraphNode, GraphEdge,
  SequenceModel, GanttModel, PieModel,
  ClassModel, ClassRelationType,
  StateModel, ERModel,
  MindmapModel, MindmapNode, MindmapShape,
  BlockModel, BlockItem,
} from "../parsers";

export function serialize(model: DiagramModel): string {
  switch (model.type) {
    case "flowchart":
    case "graph":
      return serializeFlowchart(model as GraphModel);
    case "sequenceDiagram":
      return serializeSequence(model as SequenceModel);
    case "gantt":
      return serializeGantt(model as GanttModel);
    case "pie":
      return serializePie(model as PieModel);
    case "classDiagram":
      return serializeClass(model as ClassModel);
    case "stateDiagram-v2":
      return serializeState(model as StateModel);
    case "erDiagram":
      return serializeER(model as ERModel);
    case "mindmap":
      return serializeMindmap(model as MindmapModel);
    case "block-beta":
      return serializeBlock(model as BlockModel);
    default:
      return (model as { rawLines: string[] }).rawLines.join("\n");
  }
}

// ---------------------------------------------------------------------------
// Flowchart
// ---------------------------------------------------------------------------

function nodeSpec(n: GraphNode): string {
  const l = `"${n.label}"`;
  switch (n.shape) {
    case "rounded":    return `${n.id}(${l})`;
    case "diamond":    return `${n.id}{${l}}`;
    case "circle":     return `${n.id}((${l}))`;
    case "subroutine": return `${n.id}[[${l}]]`;
    case "stadium":    return `${n.id}([${l}])`;
    case "cylinder":   return `${n.id}[(${l})]`;
    default:           return `${n.id}[${l}]`;
  }
}

function edgeArrow(e: GraphEdge): string {
  switch (e.style) {
    case "dotted": return "-..->";
    case "thick":  return "==>";
    case "open":   return "---";
    default:       return "-->";
  }
}

function serializeFlowchart(model: GraphModel): string {
  const lines: string[] = [`${model.type} ${model.direction ?? "TD"}`];
  const nodeMap = new Map(model.nodes.map((n) => [n.id, n]));
  const edgeSourceIds = new Set(model.edges.flatMap((e) => [e.source, e.target]));

  for (const edge of model.edges) {
    const src = nodeMap.get(edge.source) ?? { id: edge.source, label: edge.source, shape: "rect" as const };
    const tgt = nodeMap.get(edge.target) ?? { id: edge.target, label: edge.target, shape: "rect" as const };
    const arrow = edgeArrow(edge);
    const label = edge.label ? `|${edge.label}| ` : " ";
    lines.push(`    ${nodeSpec(src)} ${arrow}${label}${nodeSpec(tgt)}`);
  }

  // Isolated nodes (not referenced by any edge)
  for (const node of model.nodes) {
    if (!edgeSourceIds.has(node.id)) lines.push(`    ${nodeSpec(node)}`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Sequence
// ---------------------------------------------------------------------------

function serializeSequence(model: SequenceModel): string {
  const lines = ["sequenceDiagram"];
  for (const p of model.participants) {
    lines.push(`    ${p.kind} ${p.id}${p.alias ? ` as ${p.alias}` : ""}`);
  }
  for (const m of model.messages) {
    lines.push(`    ${m.from}${m.arrow}${m.to}: ${m.text}`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Gantt
// ---------------------------------------------------------------------------

function serializeGantt(model: GanttModel): string {
  const lines = ["gantt"];
  if (model.title) lines.push(`    title ${model.title}`);
  if (model.dateFormat) lines.push(`    dateFormat ${model.dateFormat}`);
  for (const section of model.sections) {
    if (section.name) lines.push(`    section ${section.name}`);
    for (const task of section.tasks) {
      const parts: string[] = [];
      if (task.status) parts.push(task.status);
      if (task.id) parts.push(task.id);
      if (task.start) parts.push(task.start);
      if (task.duration) parts.push(task.duration);
      lines.push(`        ${task.label} :${parts.join(", ")}`);
    }
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Pie
// ---------------------------------------------------------------------------

function serializePie(model: PieModel): string {
  const lines = [`pie${model.showData ? " showData" : ""}`];
  if (model.title) lines.push(`    title ${model.title}`);
  for (const s of model.slices) lines.push(`    "${s.label}" : ${s.value}`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Class diagram
// ---------------------------------------------------------------------------

function classRelArrow(type: ClassRelationType): string {
  switch (type) {
    case "inheritance":  return "<|--";
    case "composition":  return "*--";
    case "aggregation":  return "o--";
    case "dependency":   return "<..";
    case "realization":  return "<|..";
    default:             return "<--";
  }
}

function serializeClass(model: ClassModel): string {
  const lines = ["classDiagram"];

  for (const cls of model.classes) {
    if (cls.members.length === 0 && cls.methods.length === 0 && !cls.annotation) continue;
    lines.push(`    class ${cls.id} {`);
    if (cls.annotation) lines.push(`        <<${cls.annotation}>>`);
    for (const m of cls.members) {
      lines.push(`        ${m.visibility}${m.type}${m.type ? " " : ""}${m.name}`);
    }
    for (const m of cls.methods) {
      lines.push(`        ${m.visibility}${m.name}(${m.params})${m.returnType ? " " + m.returnType : ""}`);
    }
    lines.push(`    }`);
  }

  for (const r of model.relations) {
    const label = r.label ? ` : ${r.label}` : "";
    lines.push(`    ${r.source} ${classRelArrow(r.type)} ${r.target}${label}`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// State diagram
// ---------------------------------------------------------------------------

function serializeState(model: StateModel): string {
  const lines = ["stateDiagram-v2"];

  // Emit state labels
  for (const s of model.states) {
    if (s.label) {
      lines.push(`    state "${s.label}" as ${s.id}`);
    }
    if (s.kind === "choice" || s.kind === "fork" || s.kind === "join") {
      lines.push(`    state ${s.id} <<${s.kind}>>`);
    }
  }

  for (const t of model.transitions) {
    const label = t.label ? ` : ${t.label}` : "";
    lines.push(`    ${t.source} --> ${t.target}${label}`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// ER diagram
// ---------------------------------------------------------------------------

function erCardStr(c: string): string {
  switch (c) {
    case "||": return "||";
    case "|{": return "|{";
    case "o|": return "o|";
    case "o{": return "o{";
    default:   return "||";
  }
}

function serializeER(model: ERModel): string {
  const lines = ["erDiagram"];

  for (const r of model.relations) {
    lines.push(`    ${r.entityA} ${erCardStr(r.cardA)}--${erCardStr(r.cardB)} ${r.entityB} : ${r.label}`);
  }

  for (const ent of model.entities) {
    if (ent.attributes.length === 0) continue;
    lines.push(`    ${ent.name} {`);
    for (const a of ent.attributes) {
      const parts = [a.type, a.name];
      if (a.key) parts.push(a.key);
      if (a.comment) parts.push(`"${a.comment}"`);
      lines.push(`        ${parts.join(" ")}`);
    }
    lines.push(`    }`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Mindmap
// ---------------------------------------------------------------------------

function shapeWrap(label: string, shape: MindmapShape): string {
  switch (shape) {
    case "circle":  return `((${label}))`;
    case "rounded": return `(${label})`;
    case "rect":    return `[${label}]`;
    case "bang":    return `))${label}((`;
    case "cloud":   return `)${label}(`;
    case "hexagon": return `{{${label}}}`;
    default:        return label;
  }
}

function serializeMindmapNode(node: MindmapNode, indent: number, lines: string[]) {
  lines.push(" ".repeat(indent) + shapeWrap(node.label, node.shape));
  for (const child of node.children) {
    serializeMindmapNode(child, indent + 4, lines);
  }
}

function serializeMindmap(model: MindmapModel): string {
  const lines = ["mindmap"];
  serializeMindmapNode(model.root, 4, lines);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Block-beta
// ---------------------------------------------------------------------------

function serializeBlock(model: BlockModel): string {
  const lines = ["block-beta"];
  if (model.columns > 1) lines.push(`    columns ${model.columns}`);

  for (const b of model.blocks) {
    serializeBlockItem(b, 4, lines);
  }

  for (const a of model.arrows) {
    const label = a.label ? ` "${a.label}" -->` : "";
    lines.push(`    ${a.source} -->${label} ${a.target}`);
  }

  return lines.join("\n");
}

function serializeBlockItem(item: BlockItem, indent: number, lines: string[]) {
  const pad = " ".repeat(indent);
  if (item.children.length > 0) {
    lines.push(`${pad}block:${item.id}`);
    for (const child of item.children) {
      serializeBlockItem(child, indent + 4, lines);
    }
    lines.push(`${pad}end`);
  } else {
    const spanStr = item.span > 1 ? `:${item.span}` : "";
    lines.push(`${pad}${item.id}["${item.label}"]${spanStr}`);
  }
}
