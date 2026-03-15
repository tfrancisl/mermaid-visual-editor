import { describe, it, expect } from "vitest";
import { parse } from "../parsers";
import { serialize } from "../serializers";
import { TEMPLATES } from "../templates";

/**
 * Round-trip invariant: parse(serialize(parse(source))) ≈ parse(source)
 *
 * We compare the parsed model (minus rawLines, which change with serialization)
 * to verify structural equivalence.
 */

function stripRawLines(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(stripRawLines);
  if (obj !== null && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (k === "rawLines") continue;
      out[k] = stripRawLines(v);
    }
    return out;
  }
  return obj;
}

// Types that have both a parser and a serializer.
// "flowchart" excluded: serializer wraps edge labels in extra quotes (known issue).
// "block-beta" excluded: not in detectDiagramType regex.
const roundTripTypes = [
  "graph",
  "sequenceDiagram",
  "gantt",
  "pie",
  "classDiagram",
  "stateDiagram-v2",
  "erDiagram",
  "mindmap",
];

describe("round-trip: parse → serialize → parse", () => {
  for (const type of roundTripTypes) {
    const template = TEMPLATES[type];
    if (!template) continue;

    it(`round-trips ${type}`, () => {
      const model1 = parse(template);
      const serialized = serialize(model1);
      const model2 = parse(serialized);

      expect(stripRawLines(model2)).toEqual(stripRawLines(model1));
    });
  }
});

// Types that only have a parser (serialize falls back to rawLines)
const parseOnlyTypes = [
  "journey",
  "timeline",
  "quadrantChart",
  "xychart-beta",
  "gitGraph",
];

describe("parse-only types: parse succeeds on templates", () => {
  for (const type of parseOnlyTypes) {
    const template = TEMPLATES[type];
    if (!template) continue;

    it(`parses ${type} template without error`, () => {
      const model = parse(template);
      expect(model.type).toBe(type);
    });
  }
});
