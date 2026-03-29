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

// Types that have both a parser and a serializer
const roundTripTypes = [
  "flowchart",
  "graph",
  "sequenceDiagram",
  "gantt",
  "pie",
  "classDiagram",
  "stateDiagram-v2",
  "erDiagram",
  "mindmap",
  "block-beta",
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

// ---------------------------------------------------------------------------
// Targeted round-trip tests for parser/serializer fixes
// ---------------------------------------------------------------------------

describe("round-trip: ER identifying/non-identifying", () => {
  it("round-trips identifying relationship (--)", () => {
    const source = `erDiagram
    CUSTOMER ||--o{ ORDER : places`;
    const model1 = parse(source) as import("../parsers").ERModel;
    expect(model1.relations[0].identifying).toBe(true);
    const serialized = serialize(model1);
    expect(serialized).toContain("||--o{");
    const model2 = parse(serialized) as import("../parsers").ERModel;
    expect(model2.relations[0].identifying).toBe(true);
    expect(model2.relations[0].cardA).toBe("||");
    expect(model2.relations[0].cardB).toBe("o{");
  });

  it("round-trips non-identifying relationship (..)", () => {
    const source = `erDiagram
    CUSTOMER ||..o{ ORDER : places`;
    const model1 = parse(source) as import("../parsers").ERModel;
    expect(model1.relations[0].identifying).toBe(false);
    const serialized = serialize(model1);
    expect(serialized).toContain("||..o{");
    const model2 = parse(serialized) as import("../parsers").ERModel;
    expect(model2.relations[0].identifying).toBe(false);
  });

  it("round-trips all 4 canonical cardinality types", () => {
    const source = `erDiagram
    A ||--|| B : r1
    C |{--|{ D : r2
    E o|--o| F : r3
    G o{--o{ H : r4`;
    const model1 = parse(source) as import("../parsers").ERModel;
    const serialized = serialize(model1);
    const model2 = parse(serialized) as import("../parsers").ERModel;
    expect(stripRawLines(model2)).toEqual(stripRawLines(model1));
  });
});

describe("round-trip: class cardinality labels", () => {
  it("round-trips cardinality labels on class relations", () => {
    const source = `classDiagram
    A "1" <|-- "n" B : owns`;
    const model1 = parse(source) as import("../parsers").ClassModel;
    expect(model1.relations[0].sourceCardinality).toBe("1");
    expect(model1.relations[0].targetCardinality).toBe("n");
    const serialized = serialize(model1);
    expect(serialized).toContain('"1"');
    expect(serialized).toContain('"n"');
    const model2 = parse(serialized) as import("../parsers").ClassModel;
    expect(model2.relations[0].sourceCardinality).toBe("1");
    expect(model2.relations[0].targetCardinality).toBe("n");
    expect(model2.relations[0].label).toBe("owns");
  });

  it("round-trips class relations without cardinality unchanged", () => {
    const source = `classDiagram
    Animal <|-- Dog`;
    const model1 = parse(source) as import("../parsers").ClassModel;
    const serialized = serialize(model1);
    const model2 = parse(serialized) as import("../parsers").ClassModel;
    expect(stripRawLines(model2)).toEqual(stripRawLines(model1));
  });
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
