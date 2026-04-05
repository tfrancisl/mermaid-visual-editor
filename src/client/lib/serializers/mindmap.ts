import type { MindmapModel, MindmapNode, MindmapShape } from "../parsers/types";

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

export function serializeMindmap(model: MindmapModel): string {
  const lines = ["mindmap"];
  serializeMindmapNode(model.root, 4, lines);
  return lines.join("\n");
}
