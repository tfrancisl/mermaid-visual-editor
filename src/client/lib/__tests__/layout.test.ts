import { describe, it, expect } from "vitest";
import { computeLayout } from "../layout";
import type { GraphNode, GraphEdge } from "../parsers";

const node = (id: string): GraphNode => ({ id, label: id, shape: "rect" });

describe("computeLayout", () => {
  it("assigns positions to all nodes", () => {
    const nodes = [node("A"), node("B"), node("C")];
    const edges: GraphEdge[] = [
      { id: "e1", source: "A", target: "B", style: "arrow" },
      { id: "e2", source: "B", target: "C", style: "arrow" },
    ];
    const pos = computeLayout(nodes, edges);
    expect(pos).toHaveProperty("A");
    expect(pos).toHaveProperty("B");
    expect(pos).toHaveProperty("C");
  });

  it("places nodes in BFS layers (root at y=0, children below)", () => {
    const nodes = [node("A"), node("B"), node("C")];
    const edges: GraphEdge[] = [
      { id: "e1", source: "A", target: "B", style: "arrow" },
      { id: "e2", source: "A", target: "C", style: "arrow" },
    ];
    const pos = computeLayout(nodes, edges);
    expect(pos.A.y).toBe(0);
    expect(pos.B.y).toBeGreaterThan(0);
    expect(pos.B.y).toBe(pos.C.y); // same layer
  });

  it("preserves existing positions", () => {
    const nodes = [node("A"), node("B")];
    const edges: GraphEdge[] = [{ id: "e1", source: "A", target: "B", style: "arrow" }];
    const existing = { A: { x: 999, y: 888 } };
    const pos = computeLayout(nodes, edges, existing);
    expect(pos.A).toEqual({ x: 999, y: 888 });
    expect(pos.B).toBeDefined();
    expect(pos.B).not.toEqual({ x: 999, y: 888 });
  });

  it("returns existing when all nodes already positioned", () => {
    const nodes = [node("A")];
    const existing = { A: { x: 1, y: 2 } };
    const pos = computeLayout(nodes, [], existing);
    expect(pos).toEqual(existing);
  });

  it("handles disconnected nodes", () => {
    const nodes = [node("A"), node("B"), node("C")];
    const edges: GraphEdge[] = []; // no edges
    const pos = computeLayout(nodes, edges);
    expect(Object.keys(pos)).toHaveLength(3);
    // All in layer 0 → same y
    expect(pos.A.y).toBe(pos.B.y);
  });

  it("handles diamond DAG (A→B, A→C, B→D, C→D)", () => {
    const nodes = [node("A"), node("B"), node("C"), node("D")];
    const edges: GraphEdge[] = [
      { id: "e1", source: "A", target: "B", style: "arrow" },
      { id: "e2", source: "A", target: "C", style: "arrow" },
      { id: "e3", source: "B", target: "D", style: "arrow" },
      { id: "e4", source: "C", target: "D", style: "arrow" },
    ];
    const pos = computeLayout(nodes, edges);
    expect(pos.A.y).toBeLessThan(pos.B.y);
    expect(pos.B.y).toBeLessThan(pos.D.y);
  });
});
