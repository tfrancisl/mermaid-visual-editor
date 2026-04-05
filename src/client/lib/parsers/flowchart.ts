import type { GraphModel, GraphNode, GraphEdge, NodeShape } from "./types";

const NODE_SPEC_PATTERNS: [RegExp, NodeShape][] = [
  [/^(\w+)\[\[(.+)\]\]$/, "subroutine"],
  [/^(\w+)\(\((.+)\)\)$/, "circle"],
  [/^(\w+)\(\[(.+)\]\)$/, "stadium"],
  [/^(\w+)\[\((.+)\)\]$/, "cylinder"],
  [/^(\w+)\[(.+)\]$/, "rect"],
  [/^(\w+)\((.+)\)$/, "rounded"],
  [/^(\w+)\{(.+)\}$/, "diamond"],
  [/^(\w+)>(.+)\]$/, "asymmetric"],
];

function parseNodeSpec(spec: string): GraphNode | null {
  const s = spec.trim();
  for (const [re, shape] of NODE_SPEC_PATTERNS) {
    const m = s.match(re);
    if (m) return { id: m[1], label: m[2].trim().replace(/^"|"$/g, ""), shape };
  }
  const idOnly = s.match(/^(\w+)$/);
  if (idOnly) return { id: idOnly[1], label: idOnly[1], shape: "rect" };
  return null;
}

function upsertNode(spec: string, nodes: Map<string, GraphNode>): string | null {
  const parsed = parseNodeSpec(spec);
  if (!parsed) return null;
  // Only overwrite if new spec has a real label (not just the ID)
  if (!nodes.has(parsed.id) || parsed.label !== parsed.id) {
    nodes.set(parsed.id, parsed);
  }
  return parsed.id;
}

function tokenToStyle(token: string): GraphEdge["style"] {
  if (token.includes(".")) return "dotted";
  if (token.startsWith("=")) return "thick";
  if (token === "---" || token.endsWith("o") || token.endsWith("x")) return "open";
  return "arrow";
}

// Matches: source_spec  EDGE_TOKEN  [|label|]  target_spec
const EDGE_RE = /^(.+?)\s+(--?>|===?>?|(?:\.-)+>?|--[ox]|---)\s*(?:\|([^|]*)\|)?\s*(.+?)\s*$/;

export function parseFlowchart(source: string): GraphModel {
  const lines = source.split("\n");
  const first = lines[0].trim();
  const dirM = first.match(/\b(TB|TD|BT|RL|LR)\b/);
  const direction = (dirM?.[1] ?? "TD") as GraphModel["direction"];
  const type = first.startsWith("graph") ? "graph" : "flowchart";

  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const seenEdgeIds = new Set<string>();
  let subgraphDepth = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%")) continue;
    if (line.startsWith("subgraph")) { subgraphDepth++; continue; }
    if (line === "end" && subgraphDepth > 0) { subgraphDepth--; continue; }

    const em = line.match(EDGE_RE);
    if (em) {
      const [, srcSpec, token, label, tgtSpec] = em;
      const srcId = upsertNode(srcSpec, nodes);
      const tgtId = upsertNode(tgtSpec, nodes);
      if (srcId && tgtId) {
        let id = `${srcId}->${tgtId}`;
        let n = 0;
        while (seenEdgeIds.has(id)) id = `${srcId}->${tgtId}-${++n}`;
        seenEdgeIds.add(id);
        edges.push({ id, source: srcId, target: tgtId, label: label?.trim() || undefined, style: tokenToStyle(token) });
      }
    } else {
      const standalone = parseNodeSpec(line);
      if (standalone && !nodes.has(standalone.id)) nodes.set(standalone.id, standalone);
    }
  }

  return { type, direction, nodes: [...nodes.values()], edges, rawLines: lines };
}
