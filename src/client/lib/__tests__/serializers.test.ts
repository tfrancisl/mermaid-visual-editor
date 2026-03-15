import { describe, it, expect } from "vitest";
import { serialize } from "../serializers";
import type {
  GraphModel, SequenceModel, GanttModel, PieModel,
  ClassModel, StateModel, ERModel, MindmapModel, BlockModel,
} from "../parsers";

describe("serializeFlowchart", () => {
  it("serializes nodes and edges", () => {
    const model: GraphModel = {
      type: "flowchart",
      direction: "TD",
      nodes: [
        { id: "A", label: "Start", shape: "rect" },
        { id: "B", label: "End", shape: "rounded" },
      ],
      edges: [{ id: "A->B", source: "A", target: "B", style: "arrow" }],
      rawLines: [],
    };
    const out = serialize(model);
    expect(out).toContain("flowchart TD");
    expect(out).toContain('A["Start"]');
    expect(out).toContain('B("End")');
    expect(out).toContain("-->");
  });

  it("serializes edge labels", () => {
    const model: GraphModel = {
      type: "flowchart", direction: "TD",
      nodes: [
        { id: "A", label: "A", shape: "rect" },
        { id: "B", label: "B", shape: "rect" },
      ],
      edges: [{ id: "A->B", source: "A", target: "B", label: "yes", style: "arrow" }],
      rawLines: [],
    };
    const out = serialize(model);
    expect(out).toContain("|yes|");
  });

  it("serializes all edge styles", () => {
    const base = {
      type: "flowchart" as const, direction: "TD" as const,
      nodes: [
        { id: "A", label: "A", shape: "rect" as const },
        { id: "B", label: "B", shape: "rect" as const },
      ],
      rawLines: [],
    };
    expect(serialize({ ...base, edges: [{ id: "e", source: "A", target: "B", style: "dotted" as const }] })).toContain("-..->");
    expect(serialize({ ...base, edges: [{ id: "e", source: "A", target: "B", style: "thick" as const }] })).toContain("==>");
    expect(serialize({ ...base, edges: [{ id: "e", source: "A", target: "B", style: "open" as const }] })).toContain("---");
  });

  it("serializes isolated nodes", () => {
    const model: GraphModel = {
      type: "flowchart", direction: "TD",
      nodes: [{ id: "Lone", label: "Alone", shape: "diamond" }],
      edges: [],
      rawLines: [],
    };
    const out = serialize(model);
    expect(out).toContain('Lone{"Alone"}');
  });

  it("serializes all node shapes", () => {
    const shapes = ["rect", "rounded", "diamond", "circle", "stadium", "subroutine", "cylinder"] as const;
    for (const shape of shapes) {
      const model: GraphModel = {
        type: "flowchart", direction: "TD",
        nodes: [{ id: "X", label: "L", shape }],
        edges: [], rawLines: [],
      };
      const out = serialize(model);
      expect(out).toContain("X");
      expect(out).toContain("L");
    }
  });
});

describe("serializeSequence", () => {
  it("serializes participants and messages", () => {
    const model: SequenceModel = {
      type: "sequenceDiagram",
      participants: [
        { id: "Alice", kind: "participant" },
        { id: "Bob", alias: "Robert", kind: "actor" },
      ],
      messages: [{ from: "Alice", to: "Bob", arrow: "->>", text: "Hello" }],
      rawLines: [],
    };
    const out = serialize(model);
    expect(out).toContain("sequenceDiagram");
    expect(out).toContain("participant Alice");
    expect(out).toContain("actor Bob as Robert");
    expect(out).toContain("Alice->>Bob: Hello");
  });
});

describe("serializeGantt", () => {
  it("serializes title, dateFormat, sections, tasks", () => {
    const model: GanttModel = {
      type: "gantt",
      title: "Project",
      dateFormat: "YYYY-MM-DD",
      sections: [{
        name: "Phase 1",
        tasks: [{ label: "Task A", status: "done", start: "2024-01-01", duration: "7d" }],
      }],
      rawLines: [],
    };
    const out = serialize(model);
    expect(out).toContain("gantt");
    expect(out).toContain("title Project");
    expect(out).toContain("dateFormat YYYY-MM-DD");
    expect(out).toContain("section Phase 1");
    expect(out).toContain("Task A");
    expect(out).toContain("done");
    expect(out).toContain("7d");
  });
});

describe("serializePie", () => {
  it("serializes with showData", () => {
    const model: PieModel = {
      type: "pie", title: "Share", showData: true,
      slices: [{ label: "A", value: 60 }, { label: "B", value: 40 }],
      rawLines: [],
    };
    const out = serialize(model);
    expect(out).toContain("pie showData");
    expect(out).toContain("title Share");
    expect(out).toContain('"A" : 60');
    expect(out).toContain('"B" : 40');
  });

  it("serializes without showData", () => {
    const model: PieModel = {
      type: "pie", showData: false, slices: [{ label: "X", value: 100 }], rawLines: [],
    };
    const out = serialize(model);
    expect(out).toMatch(/^pie\n/);
    expect(out).not.toContain("showData");
  });
});

describe("serializeClass", () => {
  it("serializes classes and relations", () => {
    const model: ClassModel = {
      type: "classDiagram",
      classes: [{
        id: "Animal",
        members: [{ visibility: "+", type: "String", name: "name" }],
        methods: [{ visibility: "+", name: "speak", params: "", returnType: "void" }],
      }],
      relations: [{ id: "r0", source: "Animal", target: "Dog", type: "inheritance" }],
      rawLines: [],
    };
    const out = serialize(model);
    expect(out).toContain("classDiagram");
    expect(out).toContain("class Animal {");
    expect(out).toContain("+String name");
    expect(out).toContain("+speak() void");
    expect(out).toContain("Animal <|-- Dog");
  });

  it("serializes annotations", () => {
    const model: ClassModel = {
      type: "classDiagram",
      classes: [{ id: "Svc", annotation: "interface", members: [], methods: [{ visibility: "+", name: "run", params: "", returnType: "" }] }],
      relations: [],
      rawLines: [],
    };
    const out = serialize(model);
    expect(out).toContain("<<interface>>");
  });
});

describe("serializeState", () => {
  it("serializes states and transitions", () => {
    const model: StateModel = {
      type: "stateDiagram-v2",
      states: [
        { id: "[*]", kind: "start" },
        { id: "Idle", kind: "normal", label: "Waiting" },
      ],
      transitions: [
        { id: "t0", source: "[*]", target: "Idle" },
        { id: "t1", source: "Idle", target: "[*]", label: "done" },
      ],
      rawLines: [],
    };
    const out = serialize(model);
    expect(out).toContain("stateDiagram-v2");
    expect(out).toContain('state "Waiting" as Idle');
    expect(out).toContain("[*] --> Idle");
    expect(out).toContain("Idle --> [*] : done");
  });
});

describe("serializeER", () => {
  it("serializes entities and relations", () => {
    const model: ERModel = {
      type: "erDiagram",
      entities: [{
        name: "USER",
        attributes: [{ type: "int", name: "id", key: "PK" }, { type: "string", name: "name", key: "" }],
      }],
      relations: [{ id: "er0", entityA: "USER", entityB: "ORDER", cardA: "||", cardB: "o{", label: "places" }],
      rawLines: [],
    };
    const out = serialize(model);
    expect(out).toContain("erDiagram");
    expect(out).toContain("USER ||--o{ ORDER : places");
    expect(out).toContain("int id PK");
    expect(out).toContain("string name");
  });
});

describe("serializeMindmap", () => {
  it("serializes tree with shapes", () => {
    const model: MindmapModel = {
      type: "mindmap",
      root: {
        id: "r", label: "Root", shape: "circle",
        children: [
          { id: "c1", label: "Child", shape: "rect", children: [] },
          { id: "c2", label: "Other", shape: "default", children: [] },
        ],
      },
      rawLines: [],
    };
    const out = serialize(model);
    expect(out).toContain("mindmap");
    expect(out).toContain("((Root))");
    expect(out).toContain("[Child]");
    expect(out).toContain("Other");
  });
});

describe("serializeBlock", () => {
  it("serializes columns, blocks, arrows", () => {
    const model: BlockModel = {
      type: "block-beta",
      columns: 3,
      blocks: [
        { id: "A", label: "Block A", span: 1, children: [] },
        { id: "B", label: "Block B", span: 2, children: [] },
      ],
      arrows: [{ id: "a0", source: "A", target: "B" }],
      rawLines: [],
    };
    const out = serialize(model);
    expect(out).toContain("block-beta");
    expect(out).toContain("columns 3");
    expect(out).toContain('A["Block A"]');
    expect(out).toContain('B["Block B"]:2');
    expect(out).toContain("A --> B");
  });
});

describe("serialize fallback", () => {
  it("joins rawLines for unsupported types", () => {
    const model = { type: "journey", rawLines: ["journey", "  title X"] };
    const out = serialize(model as any);
    expect(out).toBe("journey\n  title X");
  });
});
