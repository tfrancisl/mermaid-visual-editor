import { describe, it, expect } from "vitest";
import { detectDiagramType, parse } from "../parsers";
import type {
  GraphModel, SequenceModel, GanttModel, PieModel,
  ClassModel, StateModel, ERModel, MindmapModel,
  BlockModel, JourneyModel, TimelineModel, QuadrantModel,
  XYChartModel, GitGraphModel, RequirementModel,
} from "../parsers";

// ---------------------------------------------------------------------------
// detectDiagramType
// ---------------------------------------------------------------------------

describe("detectDiagramType", () => {
  const cases: [string, string][] = [
    ["flowchart TD\n  A --> B", "flowchart"],
    ["graph LR\n  A --> B", "graph"],
    ["sequenceDiagram\n  Alice->>Bob: hi", "sequenceDiagram"],
    ["classDiagram\n  class Foo", "classDiagram"],
    ["stateDiagram-v2\n  [*] --> S1", "stateDiagram-v2"],
    ["erDiagram\n  A ||--o{ B : has", "erDiagram"],
    ["gantt\n  title X", "gantt"],
    ["pie\n  \"A\" : 1", "pie"],
    ["gitGraph\n  commit", "gitGraph"],
    ["mindmap\n  root", "mindmap"],
    ["timeline\n  2020 : X", "timeline"],
    ["quadrantChart\n  title X", "quadrantChart"],
    ["xychart-beta\n  title X", "xychart-beta"],
    ["journey\n  title X", "journey"],
    ["block-beta\n  columns 3", "block-beta"],
    ["requirementDiagram\n  requirement foo", "requirementDiagram"],
  ];

  for (const [source, expected] of cases) {
    it(`detects "${expected}"`, () => {
      expect(detectDiagramType(source)).toBe(expected);
    });
  }

  it("returns 'unknown' for unrecognized input", () => {
    expect(detectDiagramType("hello world")).toBe("unknown");
  });

  it("handles leading whitespace", () => {
    expect(detectDiagramType("  flowchart TD\n  A --> B")).toBe("flowchart");
  });

  it("handles comment-only input gracefully", () => {
    expect(detectDiagramType("%% just a comment")).toBe("unknown");
  });
});

// ---------------------------------------------------------------------------
// Flowchart parser
// ---------------------------------------------------------------------------

describe("parseFlowchart", () => {
  it("parses nodes and edges", () => {
    const model = parse("flowchart TD\n    A[Start] --> B{Decision?}\n    B -->|Yes| C[Do it]") as GraphModel;
    expect(model.type).toBe("flowchart");
    expect(model.direction).toBe("TD");
    expect(model.nodes).toHaveLength(3);
    expect(model.edges).toHaveLength(2);

    const a = model.nodes.find((n) => n.id === "A")!;
    expect(a.label).toBe("Start");
    expect(a.shape).toBe("rect");

    const b = model.nodes.find((n) => n.id === "B")!;
    expect(b.shape).toBe("diamond");

    expect(model.edges[0].source).toBe("A");
    expect(model.edges[0].target).toBe("B");
    expect(model.edges[1].label).toBe("Yes");
  });

  it("detects graph type and direction", () => {
    const model = parse("graph LR\n    X --> Y") as GraphModel;
    expect(model.type).toBe("graph");
    expect(model.direction).toBe("LR");
  });

  it("parses all node shapes", () => {
    const source = `flowchart TD
    A[Rect]
    B(Rounded)
    C{Diamond}
    D((Circle))
    E([Stadium])
    F[[Subroutine]]
    G[(Cylinder)]`;
    const model = parse(source) as GraphModel;
    const shapes = Object.fromEntries(model.nodes.map((n) => [n.id, n.shape]));
    expect(shapes).toEqual({
      A: "rect", B: "rounded", C: "diamond", D: "circle",
      E: "stadium", F: "subroutine", G: "cylinder",
    });
  });

  it("handles standalone nodes", () => {
    const model = parse("flowchart TD\n    A[Start]\n    B[End]") as GraphModel;
    expect(model.nodes).toHaveLength(2);
    expect(model.edges).toHaveLength(0);
  });

  it("skips comments", () => {
    const model = parse("flowchart TD\n    %% comment\n    A --> B") as GraphModel;
    expect(model.nodes).toHaveLength(2);
  });

  it("deduplicates edges with same source/target", () => {
    const model = parse("flowchart TD\n    A --> B\n    A --> B") as GraphModel;
    expect(model.edges).toHaveLength(2);
    expect(model.edges[0].id).toBe("A->B");
    expect(model.edges[1].id).toBe("A->B-1");
  });
});

// ---------------------------------------------------------------------------
// Sequence parser
// ---------------------------------------------------------------------------

describe("parseSequence", () => {
  it("parses participants and messages", () => {
    const source = `sequenceDiagram
    participant Alice
    participant Bob
    Alice->>Bob: Hello
    Bob-->>Alice: Hi`;
    const model = parse(source) as SequenceModel;
    expect(model.type).toBe("sequenceDiagram");
    expect(model.participants).toHaveLength(2);
    expect(model.participants[0].id).toBe("Alice");
    expect(model.messages).toHaveLength(2);
    expect(model.messages[0]).toMatchObject({ from: "Alice", to: "Bob", text: "Hello" });
  });

  it("auto-creates participants from messages", () => {
    const source = `sequenceDiagram
    Alice->>Bob: Hello`;
    const model = parse(source) as SequenceModel;
    expect(model.participants).toHaveLength(2);
  });

  it("parses actor keyword", () => {
    const source = `sequenceDiagram
    actor User
    participant System
    User->>System: Request`;
    const model = parse(source) as SequenceModel;
    expect(model.participants[0].kind).toBe("actor");
    expect(model.participants[1].kind).toBe("participant");
  });
});

// ---------------------------------------------------------------------------
// Gantt parser
// ---------------------------------------------------------------------------

describe("parseGantt", () => {
  it("parses title, format, sections, tasks", () => {
    const source = `gantt
    title My Project
    dateFormat YYYY-MM-DD
    section Planning
        Requirements :done, 2024-01-01, 7d
    section Dev
        Backend :active, 2024-01-08, 10d`;
    const model = parse(source) as GanttModel;
    expect(model.type).toBe("gantt");
    expect(model.title).toBe("My Project");
    expect(model.dateFormat).toBe("YYYY-MM-DD");
    expect(model.sections).toHaveLength(2);
    expect(model.sections[0].name).toBe("Planning");
    expect(model.sections[0].tasks[0].label).toBe("Requirements");
    expect(model.sections[0].tasks[0].status).toBe("done");
    expect(model.sections[0].tasks[0].start).toBe("2024-01-01");
    expect(model.sections[0].tasks[0].duration).toBe("7d");
  });

  it("creates unnamed section for tasks before any section", () => {
    const source = `gantt
    Task A :2024-01-01, 5d`;
    const model = parse(source) as GanttModel;
    expect(model.sections).toHaveLength(1);
    expect(model.sections[0].name).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Pie parser
// ---------------------------------------------------------------------------

describe("parsePie", () => {
  it("parses title, showData, and slices", () => {
    const source = `pie showData
    title Browser Share
    "Chrome" : 65
    "Firefox" : 4`;
    const model = parse(source) as PieModel;
    expect(model.type).toBe("pie");
    expect(model.showData).toBe(true);
    expect(model.title).toBe("Browser Share");
    expect(model.slices).toHaveLength(2);
    expect(model.slices[0]).toEqual({ label: "Chrome", value: 65 });
  });

  it("handles pie without showData", () => {
    const model = parse(`pie\n    "A" : 1`) as PieModel;
    expect(model.showData).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Class diagram parser
// ---------------------------------------------------------------------------

describe("parseClass", () => {
  it("parses classes with members and methods", () => {
    const source = `classDiagram
    class Animal {
        +String name
        +makeSound() void
    }`;
    const model = parse(source) as ClassModel;
    expect(model.type).toBe("classDiagram");
    expect(model.classes).toHaveLength(1);
    expect(model.classes[0].id).toBe("Animal");
    expect(model.classes[0].members).toHaveLength(1);
    expect(model.classes[0].members[0]).toMatchObject({ visibility: "+", type: "String", name: "name" });
    expect(model.classes[0].methods).toHaveLength(1);
    expect(model.classes[0].methods[0]).toMatchObject({ visibility: "+", name: "makeSound", returnType: "void" });
  });

  it("parses relations", () => {
    const source = `classDiagram
    Animal <|-- Dog
    Animal *-- Organ`;
    const model = parse(source) as ClassModel;
    expect(model.relations).toHaveLength(2);
    expect(model.relations[0].type).toBe("inheritance");
    expect(model.relations[1].type).toBe("composition");
  });

  it("parses annotations", () => {
    const source = `classDiagram
    class Service {
        <<interface>>
        +serve() void
    }`;
    const model = parse(source) as ClassModel;
    expect(model.classes[0].annotation).toBe("interface");
  });
});

// ---------------------------------------------------------------------------
// State diagram parser
// ---------------------------------------------------------------------------

describe("parseState", () => {
  it("parses states and transitions with [*] markers", () => {
    const source = `stateDiagram-v2
    [*] --> Idle
    Idle --> Processing : start
    Processing --> [*]`;
    const model = parse(source) as StateModel;
    expect(model.type).toBe("stateDiagram-v2");
    expect(model.states.length).toBeGreaterThanOrEqual(2);
    expect(model.transitions).toHaveLength(3);
    expect(model.transitions[1].label).toBe("start");
  });

  it("marks [*] target as end", () => {
    const source = `stateDiagram-v2
    Done --> [*]`;
    const model = parse(source) as StateModel;
    const endState = model.states.find((s) => s.id === "[*]");
    expect(endState?.kind).toBe("end");
  });

  it("parses state labels", () => {
    const source = `stateDiagram-v2
    state "Waiting" as Idle
    Idle --> Processing`;
    const model = parse(source) as StateModel;
    const idle = model.states.find((s) => s.id === "Idle");
    expect(idle?.label).toBe("Waiting");
  });

  it("parses choice/fork/join markers", () => {
    const source = `stateDiagram-v2
    state check <<choice>>
    Idle --> check`;
    const model = parse(source) as StateModel;
    const checkState = model.states.find((s) => s.id === "check");
    expect(checkState?.kind).toBe("choice");
  });

  it("parses transition labels", () => {
    const source = `stateDiagram-v2
    A --> B : go
    B --> C`;
    const model = parse(source) as StateModel;
    expect(model.transitions).toHaveLength(2);
    expect(model.transitions[0].label).toBe("go");
    expect(model.transitions[1].label).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// ER diagram parser
// ---------------------------------------------------------------------------

describe("parseER", () => {
  it("parses entities and relations", () => {
    const source = `erDiagram
    CUSTOMER ||--o{ ORDER : places
    CUSTOMER {
        string name
        string email PK
    }`;
    const model = parse(source) as ERModel;
    expect(model.type).toBe("erDiagram");
    expect(model.relations).toHaveLength(1);
    expect(model.relations[0].label).toBe("places");
    expect(model.entities.length).toBeGreaterThanOrEqual(1);
    const cust = model.entities.find((e) => e.name === "CUSTOMER")!;
    expect(cust.attributes).toHaveLength(2);
    expect(cust.attributes[1].key).toBe("PK");
  });

  it("parseERCardinality maps all 8 symbols correctly", () => {
    // Test via parse() — each symbol in a real ER diagram
    // Left-side symbols
    const srcLl = parse("erDiagram\n    A ||--|| B : r") as ERModel;
    expect(srcLl.relations[0].cardA).toBe("||");
    expect(srcLl.relations[0].cardB).toBe("||");

    const srcOl = parse("erDiagram\n    A o|--o| B : r") as ERModel;
    expect(srcOl.relations[0].cardA).toBe("o|");
    expect(srcOl.relations[0].cardB).toBe("o|");

    const srcLb = parse("erDiagram\n    A |{--|{ B : r") as ERModel;
    expect(srcLb.relations[0].cardA).toBe("|{");
    expect(srcLb.relations[0].cardB).toBe("|{");

    const srcOb = parse("erDiagram\n    A o{--o{ B : r") as ERModel;
    expect(srcOb.relations[0].cardA).toBe("o{");
    expect(srcOb.relations[0].cardB).toBe("o{");

    // Right-side (normalized) symbols
    const srcRl = parse("erDiagram\n    A }|--}| B : r") as ERModel;
    expect(srcRl.relations[0].cardA).toBe("|{");
    expect(srcRl.relations[0].cardB).toBe("|{");

    const srcRo = parse("erDiagram\n    A }o--}o B : r") as ERModel;
    expect(srcRo.relations[0].cardA).toBe("o{");
    expect(srcRo.relations[0].cardB).toBe("o{");

    // |o normalizes to o|
    const srcIo = parse("erDiagram\n    A |o--|o B : r") as ERModel;
    expect(srcIo.relations[0].cardA).toBe("o|");
    expect(srcIo.relations[0].cardB).toBe("o|");
  });

  it("parses identifying relationships (--)", () => {
    const model = parse("erDiagram\n    A ||--o{ B : has") as ERModel;
    expect(model.relations[0].identifying).toBe(true);
  });

  it("parses non-identifying relationships (..)", () => {
    const model = parse("erDiagram\n    A ||..o{ B : has") as ERModel;
    expect(model.relations[0].identifying).toBe(false);
  });

  it("defaults identifying to true for -- connector", () => {
    const model = parse("erDiagram\n    CUST ||--o{ ORDER : places") as ERModel;
    expect(model.relations[0].identifying).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Mindmap parser
// ---------------------------------------------------------------------------

describe("parseMindmap", () => {
  it("parses tree from indentation", () => {
    const source = `mindmap
    root((Project))
        Planning
            Requirements
        Development`;
    const model = parse(source) as MindmapModel;
    expect(model.type).toBe("mindmap");
    expect(model.root.label).toBe("Project");
    expect(model.root.shape).toBe("circle");
    expect(model.root.children).toHaveLength(2);
    expect(model.root.children[0].label).toBe("Planning");
    expect(model.root.children[0].children).toHaveLength(1);
  });

  it("detects shapes", () => {
    const source = `mindmap
    root
        [rect]
        (rounded)
        ))bang((
        )cloud(
        {{hexagon}}`;
    const model = parse(source) as MindmapModel;
    const shapes = model.root.children.map((c) => c.shape);
    expect(shapes).toEqual(["rect", "rounded", "bang", "cloud", "hexagon"]);
  });
});

// ---------------------------------------------------------------------------
// Block parser
// ---------------------------------------------------------------------------

describe("parseBlock", () => {
  it("parses columns and blocks", () => {
    const source = `block-beta
    columns 3
    A["Block A"]
    B["Block B"]:2`;
    const model = parse(source) as BlockModel;
    expect(model.type).toBe("block-beta");
    expect(model.columns).toBe(3);
    expect(model.blocks).toHaveLength(2);
    expect(model.blocks[1].span).toBe(2);
  });

  it("parses arrows", () => {
    const source = `block-beta
    A["A"]
    B["B"]
    A --> B`;
    const model = parse(source) as BlockModel;
    expect(model.arrows).toHaveLength(1);
    expect(model.arrows[0]).toMatchObject({ source: "A", target: "B" });
  });
});

// ---------------------------------------------------------------------------
// Journey parser
// ---------------------------------------------------------------------------

describe("parseJourney", () => {
  it("parses title, sections, tasks", () => {
    const source = `journey
    title My Day
    section Morning
        Wake up: 5: Me
        Breakfast: 4: Me, Family`;
    const model = parse(source) as JourneyModel;
    expect(model.type).toBe("journey");
    expect(model.title).toBe("My Day");
    expect(model.sections).toHaveLength(1);
    expect(model.sections[0].tasks).toHaveLength(2);
    expect(model.sections[0].tasks[0]).toMatchObject({ name: "Wake up", score: 5, actors: ["Me"] });
    expect(model.sections[0].tasks[1].actors).toEqual(["Me", "Family"]);
  });
});

// ---------------------------------------------------------------------------
// Timeline parser
// ---------------------------------------------------------------------------

describe("parseTimeline", () => {
  it("parses title and periods", () => {
    const source = `timeline
    title History
    2002 : LinkedIn
    2004 : Facebook`;
    const model = parse(source) as TimelineModel;
    expect(model.type).toBe("timeline");
    expect(model.title).toBe("History");
    expect(model.periods).toHaveLength(2);
    expect(model.periods[0]).toMatchObject({ time: "2002", events: ["LinkedIn"] });
  });
});

// ---------------------------------------------------------------------------
// Quadrant chart parser
// ---------------------------------------------------------------------------

describe("parseQuadrant", () => {
  it("parses axes, quadrants, and points", () => {
    const source = `quadrantChart
    title Priority Matrix
    x-axis Low Effort --> High Effort
    y-axis Low Impact --> High Impact
    quadrant-1 Quick wins
    Feature A: [0.2, 0.8]`;
    const model = parse(source) as QuadrantModel;
    expect(model.type).toBe("quadrantChart");
    expect(model.title).toBe("Priority Matrix");
    expect(model.xAxisLeft).toBe("Low Effort");
    expect(model.xAxisRight).toBe("High Effort");
    expect(model.quadrant1).toBe("Quick wins");
    expect(model.points).toHaveLength(1);
    expect(model.points[0]).toMatchObject({ label: "Feature A", x: 0.2, y: 0.8 });
  });
});

// ---------------------------------------------------------------------------
// XY chart parser
// ---------------------------------------------------------------------------

describe("parseXYChart", () => {
  it("parses title, axes, and series", () => {
    const source = `xychart-beta
    title "Revenue"
    x-axis [Jan, Feb, Mar]
    y-axis "Revenue ($K)" 0 --> 100
    bar [30, 45, 60]
    line [30, 45, 60]`;
    const model = parse(source) as XYChartModel;
    expect(model.type).toBe("xychart-beta");
    expect(model.title).toBe("Revenue");
    expect(model.xLabels).toEqual(["Jan", "Feb", "Mar"]);
    expect(model.yLabel).toBe("Revenue ($K)");
    expect(model.yMin).toBe(0);
    expect(model.yMax).toBe(100);
    expect(model.series).toHaveLength(2);
    expect(model.series[0]).toMatchObject({ kind: "bar", data: [30, 45, 60] });
  });
});

// ---------------------------------------------------------------------------
// Git graph parser
// ---------------------------------------------------------------------------

describe("parseGitGraph", () => {
  it("parses commit, branch, checkout, merge", () => {
    const source = `gitGraph
    commit
    commit id: "abc"
    branch develop
    checkout develop
    commit
    checkout main
    merge develop`;
    const model = parse(source) as GitGraphModel;
    expect(model.type).toBe("gitGraph");
    expect(model.commands).toHaveLength(7);
    expect(model.commands[0]).toMatchObject({ action: "commit" });
    expect(model.commands[1]).toMatchObject({ action: "commit", id: "abc" });
    expect(model.commands[2]).toMatchObject({ action: "branch", value: "develop" });
    expect(model.commands[3]).toMatchObject({ action: "checkout", value: "develop" });
    expect(model.commands[6]).toMatchObject({ action: "merge", value: "develop" });
  });
});

// ---------------------------------------------------------------------------
// Requirement diagram parser
// ---------------------------------------------------------------------------

describe("parseRequirement", () => {
  it("parses requirements, elements, and relations", () => {
    const source = `requirementDiagram
    requirement "Test Req" {
        id: REQ-001
        text: Must do X
        risk: High
        verifymethod: Test
    }
    element "Test Element" {
        type: Simulation
    }
    TestElement - satisfies -> TestReq`;
    const model = parse(source) as RequirementModel;
    expect(model.type).toBe("requirementDiagram");
    expect(model.requirements).toHaveLength(1);
    expect(model.requirements[0]).toMatchObject({ name: "Test Req", id: "REQ-001", risk: "High" });
    expect(model.elements).toHaveLength(1);
    expect(model.elements[0]).toMatchObject({ name: "Test Element", type: "Simulation" });
    expect(model.relations).toHaveLength(1);
    expect(model.relations[0].type).toBe("satisfies");
  });
});

// ---------------------------------------------------------------------------
// State diagram: composite state detection
// ---------------------------------------------------------------------------

describe("parseState composite detection", () => {
  it("sets hasCompositeStates: true for nested state blocks", () => {
    const source = `stateDiagram-v2
    state "X" {
        A --> B
    }`;
    const model = parse(source) as StateModel;
    expect(model.hasCompositeStates).toBe(true);
  });

  it("sets hasCompositeStates: false (or undefined) for simple diagrams", () => {
    const source = `stateDiagram-v2
    A --> B`;
    const model = parse(source) as StateModel;
    expect(model.hasCompositeStates).toBeFalsy();
  });

  it("sets hasCompositeStates: true when -- concurrency divider is present", () => {
    const source = `stateDiagram-v2
    state Active {
        Scanning
        --
        Processing
    }`;
    const model = parse(source) as StateModel;
    expect(model.hasCompositeStates).toBe(true);
  });

  it("sets hasCompositeStates: true for fork/join pseudo states", () => {
    const source = `stateDiagram-v2
    state fork_state <<fork>>
    [*] --> fork_state`;
    const model = parse(source) as StateModel;
    expect(model.hasCompositeStates).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Class diagram: cardinality parsing
// ---------------------------------------------------------------------------

describe("parseClass cardinality", () => {
  it("parses cardinality labels on relations", () => {
    const source = `classDiagram
    A "1" <|-- "n" B`;
    const model = parse(source) as ClassModel;
    expect(model.relations).toHaveLength(1);
    expect(model.relations[0].sourceCardinality).toBe("1");
    expect(model.relations[0].targetCardinality).toBe("n");
  });

  it("parses cardinality with asterisk", () => {
    const source = `classDiagram
    A "1" --> "*" B : owns`;
    const model = parse(source) as ClassModel;
    expect(model.relations).toHaveLength(1);
    expect(model.relations[0].sourceCardinality).toBe("1");
    expect(model.relations[0].targetCardinality).toBe("*");
    expect(model.relations[0].label).toBe("owns");
  });

  it("produces undefined cardinalities when not specified", () => {
    const source = `classDiagram
    A <|-- B`;
    const model = parse(source) as ClassModel;
    expect(model.relations[0].sourceCardinality).toBeUndefined();
    expect(model.relations[0].targetCardinality).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Unknown / RawModel fallback
// ---------------------------------------------------------------------------

describe("parse unknown type", () => {
  it("returns RawModel for unknown diagram types", () => {
    const source = "unknownDiagram\n  foo\n  bar";
    const model = parse(source);
    expect(model.type).toBe("unknown");
    expect(model.rawLines).toEqual(["unknownDiagram", "  foo", "  bar"]);
  });
});
