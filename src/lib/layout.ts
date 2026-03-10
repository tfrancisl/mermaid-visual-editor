import type { GraphNode, GraphEdge } from "./parsers";

export interface Position {
  x: number;
  y: number;
}

const NODE_W = 180;
const NODE_H = 50;
const H_GAP = 60;
const V_GAP = 80;

/**
 * Simple BFS layered layout. Preserves positions of nodes that already exist
 * (i.e. user-dragged positions). Only computes positions for new nodes.
 */
export function computeLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  existing: Record<string, Position> = {}
): Record<string, Position> {
  const result: Record<string, Position> = { ...existing };
  const toLayout = nodes.filter((n) => !result[n.id]);
  if (toLayout.length === 0) return result;

  const allIds = new Set(nodes.map((n) => n.id));
  const inDegree: Record<string, number> = {};
  const children: Record<string, string[]> = {};
  toLayout.forEach((n) => { inDegree[n.id] = 0; children[n.id] = []; });

  edges.forEach((e) => {
    if (!allIds.has(e.source) || !allIds.has(e.target)) return;
    if (inDegree[e.target] !== undefined) inDegree[e.target]++;
    if (children[e.source] !== undefined) children[e.source].push(e.target);
  });

  const layer: Record<string, number> = {};
  const visited = new Set<string>();
  const roots = toLayout.filter((n) => inDegree[n.id] === 0).map((n) => n.id);
  const queue = roots.length > 0 ? [...roots] : toLayout.slice(0, 1).map((n) => n.id);
  queue.forEach((id) => { layer[id] = 0; visited.add(id); });

  let i = 0;
  while (i < queue.length) {
    const id = queue[i++];
    for (const child of children[id] ?? []) {
      const next = (layer[id] ?? 0) + 1;
      if (layer[child] === undefined || layer[child] < next) layer[child] = next;
      if (!visited.has(child)) { visited.add(child); queue.push(child); }
    }
  }

  toLayout.forEach((n) => { if (layer[n.id] === undefined) layer[n.id] = 0; });

  const byLayer: Record<number, string[]> = {};
  Object.entries(layer).forEach(([id, l]) => {
    byLayer[l] = byLayer[l] ?? [];
    byLayer[l].push(id);
  });

  Object.entries(byLayer).forEach(([lStr, ids]) => {
    const l = Number(lStr);
    const totalW = ids.length * NODE_W + (ids.length - 1) * H_GAP;
    ids.forEach((id, idx) => {
      result[id] = {
        x: idx * (NODE_W + H_GAP) - totalW / 2 + NODE_W / 2,
        y: l * (NODE_H + V_GAP),
      };
    });
  });

  return result;
}
