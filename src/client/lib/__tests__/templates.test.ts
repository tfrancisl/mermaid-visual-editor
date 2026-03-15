import { describe, it, expect } from "vitest";
import { getTemplate, TEMPLATES, DIAGRAM_TYPES } from "../templates";
import { parse, detectDiagramType } from "../parsers";

describe("getTemplate", () => {
  it("returns non-empty string for each known type", () => {
    for (const { id } of DIAGRAM_TYPES) {
      const tmpl = getTemplate(id);
      expect(tmpl.length).toBeGreaterThan(0);
    }
  });

  it("returns fallback for unknown type", () => {
    const tmpl = getTemplate("unknownType");
    expect(tmpl).toBe("unknownType\n");
  });
});

describe("templates parse without error", () => {
  for (const [type, source] of Object.entries(TEMPLATES)) {
    it(`template "${type}" parses and detects correctly`, () => {
      const detected = detectDiagramType(source);
      expect(detected).toBe(type);
      const model = parse(source);
      expect(model.type).toBe(type);
    });
  }
});
