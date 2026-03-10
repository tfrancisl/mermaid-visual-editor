import type {
  DiagramModel, GraphModel, GraphNode, GraphEdge,
  SequenceModel, GanttModel, PieModel,
} from "./parsers";

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
    const label = edge.label ? `|"${edge.label}"| ` : " ";
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
