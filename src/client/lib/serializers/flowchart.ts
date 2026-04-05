import type { GraphModel, GraphNode, GraphEdge } from "../parsers/types";

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

export function serializeFlowchart(model: GraphModel): string {
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
