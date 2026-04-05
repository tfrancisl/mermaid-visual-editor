import type { MindmapModel, MindmapNode, MindmapShape } from "./types";

function detectMindmapShape(raw: string): { label: string; shape: MindmapShape } {
  // Strip optional id prefix: "root((Label))" → "((Label))"
  const stripped = raw.replace(/^\w+(?=[\[\({\)>])/, "");

  // ((circle))
  let m = stripped.match(/^\(\((.+)\)\)$/);
  if (m) return { label: m[1], shape: "circle" };
  // (rounded)
  m = stripped.match(/^\((.+)\)$/);
  if (m) return { label: m[1], shape: "rounded" };
  // [rect]
  m = stripped.match(/^\[(.+)\]$/);
  if (m) return { label: m[1], shape: "rect" };
  // ))bang((
  m = stripped.match(/^\)\)(.+)\(\($/);
  if (m) return { label: m[1], shape: "bang" };
  // )cloud(
  m = stripped.match(/^\)(.+)\($/);
  if (m) return { label: m[1], shape: "cloud" };
  // {{hexagon}}
  m = stripped.match(/^\{\{(.+)\}\}$/);
  if (m) return { label: m[1], shape: "hexagon" };
  return { label: raw, shape: "default" };
}

export function parseMindmap(source: string): MindmapModel {
  const lines = source.split("\n");
  let nodeCount = 0;

  // Build tree from indentation
  const stack: { node: MindmapNode; indent: number }[] = [];
  let root: MindmapNode = { id: "mm-0", label: "Root", shape: "default", children: [] };

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim() || raw.trim().startsWith("%%")) continue;

    // Count leading whitespace (spaces)
    const indent = raw.search(/\S/);
    if (indent < 0) continue;

    const content = raw.trim();
    const { label, shape } = detectMindmapShape(content);
    const node: MindmapNode = { id: `mm-${++nodeCount}`, label, shape, children: [] };

    if (stack.length === 0) {
      // First content line is the root
      root = node;
      stack.push({ node: root, indent });
    } else {
      // Find parent: walk back stack until we find a node with smaller indent
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }
      stack[stack.length - 1].node.children.push(node);
      stack.push({ node, indent });
    }
  }

  return { type: "mindmap", root, rawLines: lines };
}
