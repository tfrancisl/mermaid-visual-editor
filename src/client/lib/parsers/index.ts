// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type NodeShape =
  | "rect" | "rounded" | "diamond" | "circle"
  | "stadium" | "subroutine" | "cylinder" | "asymmetric";

export interface GraphNode {
  id: string;
  label: string;
  shape: NodeShape;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  style: "arrow" | "dotted" | "thick" | "open";
}

export interface GraphModel {
  type: "flowchart" | "graph";
  direction?: "TB" | "TD" | "BT" | "RL" | "LR";
  nodes: GraphNode[];
  edges: GraphEdge[];
  rawLines: string[];
}

export interface SequenceParticipant {
  id: string;
  alias?: string;
  kind: "participant" | "actor";
}

export interface SequenceMessage {
  from: string;
  to: string;
  arrow: string;
  text: string;
}

export interface SequenceModel {
  type: "sequenceDiagram";
  participants: SequenceParticipant[];
  messages: SequenceMessage[];
  rawLines: string[];
}

export interface GanttTask {
  label: string;
  status?: "done" | "active" | "crit" | "milestone";
  id?: string;
  start?: string;
  duration?: string;
}

export interface GanttSection {
  name: string;
  tasks: GanttTask[];
}

export interface GanttModel {
  type: "gantt";
  title?: string;
  dateFormat?: string;
  sections: GanttSection[];
  rawLines: string[];
}

export interface PieSlice {
  label: string;
  value: number;
}

export interface PieModel {
  type: "pie";
  title?: string;
  showData: boolean;
  slices: PieSlice[];
  rawLines: string[];
}

// ---------------------------------------------------------------------------
// Class diagram types
// ---------------------------------------------------------------------------

export type ClassVisibility = "+" | "-" | "#" | "~" | "";

export interface ClassMember {
  visibility: ClassVisibility;
  name: string;
  type: string;
}

export interface ClassMethod {
  visibility: ClassVisibility;
  name: string;
  params: string;
  returnType: string;
}

export interface ClassNode {
  id: string;
  label?: string;
  annotation?: string;
  members: ClassMember[];
  methods: ClassMethod[];
}

export type ClassRelationType =
  | "inheritance"   // <|--
  | "composition"   // *--
  | "aggregation"   // o--
  | "association"   // <--  or -->
  | "dependency"    // <..  or ..>
  | "realization";  // <|..

export interface ClassRelation {
  id: string;
  source: string;
  target: string;
  type: ClassRelationType;
  label?: string;
  sourceCardinality?: string;
  targetCardinality?: string;
}

export interface ClassModel {
  type: "classDiagram";
  classes: ClassNode[];
  relations: ClassRelation[];
  rawLines: string[];
}

// ---------------------------------------------------------------------------
// State diagram types
// ---------------------------------------------------------------------------

export interface StateNode {
  id: string;
  label?: string;
  kind: "normal" | "start" | "end" | "choice" | "fork" | "join";
}

export interface StateTransition {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface StateModel {
  type: "stateDiagram-v2";
  states: StateNode[];
  transitions: StateTransition[];
  hasCompositeStates?: boolean;
  rawLines: string[];
}

// ---------------------------------------------------------------------------
// ER diagram types
// ---------------------------------------------------------------------------

export interface ERAttribute {
  type: string;
  name: string;
  key: "PK" | "FK" | "UK" | "";
  comment?: string;
}

export interface EREntity {
  name: string;
  attributes: ERAttribute[];
}

export type ERCardinality = "||" | "|{" | "o|" | "o{";

export interface ERRelation {
  id: string;
  entityA: string;
  entityB: string;
  cardA: ERCardinality;
  cardB: ERCardinality;
  label: string;
  identifying?: boolean;
}

export interface ERModel {
  type: "erDiagram";
  entities: EREntity[];
  relations: ERRelation[];
  rawLines: string[];
}

// ---------------------------------------------------------------------------
// Mindmap types
// ---------------------------------------------------------------------------

export type MindmapShape = "rect" | "rounded" | "circle" | "bang" | "cloud" | "hexagon" | "default";

export interface MindmapNode {
  id: string;
  label: string;
  shape: MindmapShape;
  children: MindmapNode[];
}

export interface MindmapModel {
  type: "mindmap";
  root: MindmapNode;
  rawLines: string[];
}

// ---------------------------------------------------------------------------
// Block-beta types
// ---------------------------------------------------------------------------

export interface BlockItem {
  id: string;
  label: string;
  span: number;
  children: BlockItem[];
}

export interface BlockArrow {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface BlockModel {
  type: "block-beta";
  columns: number;
  blocks: BlockItem[];
  arrows: BlockArrow[];
  rawLines: string[];
}

// ---------------------------------------------------------------------------
// Journey types
// ---------------------------------------------------------------------------

export interface JourneyTask {
  name: string;
  score: number;
  actors: string[];
}

export interface JourneySection {
  name: string;
  tasks: JourneyTask[];
}

export interface JourneyModel {
  type: "journey";
  title?: string;
  sections: JourneySection[];
  rawLines: string[];
}

// ---------------------------------------------------------------------------
// Timeline types
// ---------------------------------------------------------------------------

export interface TimelinePeriod {
  time: string;
  events: string[];
}

export interface TimelineModel {
  type: "timeline";
  title?: string;
  periods: TimelinePeriod[];
  rawLines: string[];
}

// ---------------------------------------------------------------------------
// Quadrant chart types
// ---------------------------------------------------------------------------

export interface QuadrantPoint {
  label: string;
  x: number;
  y: number;
}

export interface QuadrantModel {
  type: "quadrantChart";
  title?: string;
  xAxisLeft?: string;
  xAxisRight?: string;
  yAxisBottom?: string;
  yAxisTop?: string;
  quadrant1?: string;
  quadrant2?: string;
  quadrant3?: string;
  quadrant4?: string;
  points: QuadrantPoint[];
  rawLines: string[];
}

// ---------------------------------------------------------------------------
// XY chart types
// ---------------------------------------------------------------------------

export interface XYSeries {
  kind: "bar" | "line";
  data: number[];
}

export interface XYChartModel {
  type: "xychart-beta";
  title?: string;
  xLabels: string[];
  yLabel?: string;
  yMin?: number;
  yMax?: number;
  series: XYSeries[];
  rawLines: string[];
}

// ---------------------------------------------------------------------------
// Git graph types
// ---------------------------------------------------------------------------

export interface GitCommand {
  action: "commit" | "branch" | "checkout" | "merge" | "cherry-pick";
  id?: string;
  value?: string;
  tag?: string;
}

export interface GitGraphModel {
  type: "gitGraph";
  commands: GitCommand[];
  rawLines: string[];
}

// ---------------------------------------------------------------------------
// Requirement diagram types
// ---------------------------------------------------------------------------

export interface Requirement {
  kind: string;
  name: string;
  id: string;
  text: string;
  risk: "Low" | "Medium" | "High";
  verifyMethod: "Analysis" | "Inspection" | "Test" | "Demonstration";
}

export interface ReqElement {
  name: string;
  type: string;
  docRef?: string;
}

export interface ReqRelation {
  source: string;
  target: string;
  type: "contains" | "copies" | "derives" | "satisfies" | "verifies" | "refines" | "traces";
}

export interface RequirementModel {
  type: "requirementDiagram";
  requirements: Requirement[];
  elements: ReqElement[];
  relations: ReqRelation[];
  rawLines: string[];
}

export interface RawModel {
  type: string;
  rawLines: string[];
}

export type DiagramModel = GraphModel | SequenceModel | GanttModel | PieModel | ClassModel | StateModel | ERModel | MindmapModel | BlockModel | JourneyModel | TimelineModel | QuadrantModel | XYChartModel | GitGraphModel | RequirementModel | RawModel;

// ---------------------------------------------------------------------------
// Diagram type detection
// ---------------------------------------------------------------------------

export function detectDiagramType(source: string): string {
  const first = source.trim().split("\n")[0].trim();
  const m = first.match(
    /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie|gitGraph|mindmap|timeline|quadrantChart|xychart-beta|block-beta|requirementDiagram|journey|C4\w+)/
  );
  return m ? m[1] : "unknown";
}

// ---------------------------------------------------------------------------
// Top-level parse dispatcher
// ---------------------------------------------------------------------------

export function parse(source: string): DiagramModel {
  const type = detectDiagramType(source);
  switch (type) {
    case "flowchart":
    case "graph":
      return parseFlowchart(source);
    case "sequenceDiagram":
      return parseSequence(source);
    case "gantt":
      return parseGantt(source);
    case "pie":
      return parsePie(source);
    case "classDiagram":
      return parseClass(source);
    case "stateDiagram-v2":
      return parseState(source);
    case "erDiagram":
      return parseER(source);
    case "mindmap":
      return parseMindmap(source);
    case "block-beta":
      return parseBlock(source);
    case "journey":
      return parseJourney(source);
    case "timeline":
      return parseTimeline(source);
    case "quadrantChart":
      return parseQuadrant(source);
    case "xychart-beta":
      return parseXYChart(source);
    case "gitGraph":
      return parseGitGraph(source);
    case "requirementDiagram":
      return parseRequirement(source);
    default:
      return { type, rawLines: source.split("\n") };
  }
}

// ---------------------------------------------------------------------------
// Flowchart parser
// ---------------------------------------------------------------------------

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

function parseFlowchart(source: string): GraphModel {
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

// ---------------------------------------------------------------------------
// Sequence diagram parser
// ---------------------------------------------------------------------------

function parseSequence(source: string): SequenceModel {
  const lines = source.split("\n");
  const participants: SequenceParticipant[] = [];
  const messages: SequenceMessage[] = [];
  const seen = new Set<string>();

  const addParticipant = (id: string, kind: "participant" | "actor" = "participant") => {
    if (!seen.has(id)) { seen.add(id); participants.push({ id, kind }); }
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%")) continue;

    const pm = line.match(/^(participant|actor)\s+(\S+)(?:\s+as\s+(.+))?$/);
    if (pm) {
      const id = pm[2];
      seen.add(id);
      participants.push({ id, alias: pm[3]?.trim(), kind: pm[1] as "participant" | "actor" });
      continue;
    }

    // Messages: A->>B: text  or  A -->> B: text
    const mm = line.match(/^(\w+)\s*(--?>>?|--?[xo)])\s*(\w+)\s*:\s*(.*)$/);
    if (mm) {
      addParticipant(mm[1]);
      addParticipant(mm[3]);
      messages.push({ from: mm[1], to: mm[3], arrow: mm[2], text: mm[4].trim() });
    }
  }

  return { type: "sequenceDiagram", participants, messages, rawLines: lines };
}

// ---------------------------------------------------------------------------
// Gantt parser
// ---------------------------------------------------------------------------

function parseGantt(source: string): GanttModel {
  const lines = source.split("\n");
  let title: string | undefined;
  let dateFormat: string | undefined;
  const sections: GanttSection[] = [];
  let cur: GanttSection | null = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%")) continue;
    if (line.startsWith("title ")) { title = line.slice(6).trim(); continue; }
    if (line.startsWith("dateFormat ")) { dateFormat = line.slice(11).trim(); continue; }
    if (line.startsWith("axisFormat ") || line.startsWith("excludes ") || line.startsWith("todayMarker ")) continue;
    if (line.startsWith("section ")) {
      cur = { name: line.slice(8).trim(), tasks: [] };
      sections.push(cur);
      continue;
    }
    if (!cur) { cur = { name: "", tasks: [] }; sections.push(cur); }

    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const label = line.slice(0, colon).trim();
    const parts = line.slice(colon + 1).split(",").map((p) => p.trim());
    const task: GanttTask = { label };
    for (const p of parts) {
      if (["done", "active", "crit", "milestone"].includes(p))
        task.status = p as GanttTask["status"];
      else if (/^\d{4}-\d{2}-\d{2}/.test(p) && !task.start) task.start = p;
      else if (/^\d+[dwhm]$/.test(p)) task.duration = p;
      else if (p && !task.id) task.id = p;
    }
    cur.tasks.push(task);
  }

  return { type: "gantt", title, dateFormat, sections, rawLines: lines };
}

// ---------------------------------------------------------------------------
// Pie parser
// ---------------------------------------------------------------------------

function parsePie(source: string): PieModel {
  const lines = source.split("\n");
  let title: string | undefined;
  let showData = false;
  const slices: PieSlice[] = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("%%")) continue;
    if (t.startsWith("pie")) { showData = t.includes("showData"); continue; }
    if (t.startsWith("title ")) { title = t.slice(6).trim(); continue; }
    const m = t.match(/^"([^"]+)"\s*:\s*(\d+(?:\.\d+)?)/);
    if (m) slices.push({ label: m[1], value: Number(m[2]) });
  }

  return { type: "pie", title, showData, slices, rawLines: lines };
}

// ---------------------------------------------------------------------------
// Class diagram parser
// ---------------------------------------------------------------------------

const CLASS_RELATION_RE = /^(\w+)\s+(?:"([^"]+)"\s+)?(<\|--|<\|\.\.|\*--|\*\.\.|o--|o\.\.|<--|<\.\.|--|\.\.)\s+(?:"([^"]+)"\s+)?(\w+)\s*(?::\s*(.+))?$/;
const CLASS_RELATION_RE2 = /^(\w+)\s+(?:"([^"]+)"\s+)?(--\|>|\.\.\|>|--\*|\.\.\*|--o|\.\.o|-->|\.\.>|--|\.\.)(?:\s+"([^"]+)")?\s+(\w+)\s*(?::\s*(.+))?$/;

function classRelType(arrow: string): ClassRelationType {
  if (arrow.includes("<|") || arrow.includes("|>")) return arrow.includes("..") ? "realization" : "inheritance";
  if (arrow.includes("*")) return "composition";
  if (arrow.includes("o")) return "aggregation";
  if (arrow.includes("..")) return "dependency";
  return "association";
}

function parseClassMember(line: string): { member?: ClassMember; method?: ClassMethod } {
  const t = line.trim();
  const vis = ("+-#~".includes(t[0]) ? t[0] : "") as ClassVisibility;
  const rest = vis ? t.slice(1).trim() : t;

  // Method: name(params) returnType  or  name(params)
  const mm = rest.match(/^(\w+)\(([^)]*)\)\s*(.*)$/);
  if (mm) {
    return { method: { visibility: vis, name: mm[1], params: mm[2].trim(), returnType: mm[3].trim() } };
  }

  // Member: Type name  or  name
  const parts = rest.split(/\s+/);
  if (parts.length >= 2) {
    return { member: { visibility: vis, type: parts[0], name: parts.slice(1).join(" ") } };
  }
  return { member: { visibility: vis, type: "", name: rest } };
}

function parseClass(source: string): ClassModel {
  const lines = source.split("\n");
  const classMap = new Map<string, ClassNode>();
  const relations: ClassRelation[] = [];
  let currentClass: ClassNode | null = null;
  let braceDepth = 0;
  let seenEdge = 0;

  const ensureClass = (id: string): ClassNode => {
    if (!classMap.has(id)) classMap.set(id, { id, members: [], methods: [] });
    return classMap.get(id)!;
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%")) continue;

    // Inside a class block
    if (currentClass && braceDepth > 0) {
      if (line === "}") {
        braceDepth--;
        if (braceDepth === 0) currentClass = null;
        continue;
      }
      if (line.startsWith("<<") && line.endsWith(">>")) {
        currentClass.annotation = line.slice(2, -2).trim();
        continue;
      }
      const { member, method } = parseClassMember(line);
      if (method) currentClass.methods.push(method);
      else if (member) currentClass.members.push(member);
      continue;
    }

    // Class block start: class ClassName { or class ClassName
    const classM = line.match(/^class\s+(\w+)(?:\s*\{)?$/);
    if (classM) {
      currentClass = ensureClass(classM[1]);
      if (line.endsWith("{")) braceDepth = 1;
      continue;
    }

    // Class with label: class ClassName["Label"]
    const classLabelM = line.match(/^class\s+(\w+)\s*\["([^"]+)"\]\s*(?:\{)?$/);
    if (classLabelM) {
      currentClass = ensureClass(classLabelM[1]);
      currentClass.label = classLabelM[2];
      if (line.endsWith("{")) braceDepth = 1;
      continue;
    }

    // Annotation: <<annotation>> ClassName
    const annM = line.match(/^<<(\w+)>>\s+(\w+)$/);
    if (annM) {
      ensureClass(annM[2]).annotation = annM[1];
      continue;
    }

    // Relations (arrow left): src "srcCard" arrow "tgtCard" tgt : label
    // Groups: 1=source, 2=sourceCardinality?, 3=arrow, 4=targetCardinality?, 5=target, 6=label?
    const rm = line.match(CLASS_RELATION_RE);
    if (rm) {
      ensureClass(rm[1]);
      ensureClass(rm[5]);
      relations.push({
        id: `rel-${seenEdge++}`,
        source: rm[1],
        target: rm[5],
        type: classRelType(rm[3]),
        label: rm[6]?.trim(),
        sourceCardinality: rm[2] || undefined,
        targetCardinality: rm[4] || undefined,
      });
      continue;
    }

    // Relations (arrow right): src "srcCard" arrow "tgtCard" tgt : label
    // Groups: 1=source, 2=sourceCardinality?, 3=arrow, 4=targetCardinality?, 5=target, 6=label?
    const rm2 = line.match(CLASS_RELATION_RE2);
    if (rm2 && rm2[5]) {
      ensureClass(rm2[1]);
      ensureClass(rm2[5]);
      relations.push({
        id: `rel-${seenEdge++}`,
        source: rm2[1],
        target: rm2[5],
        type: classRelType(rm2[3]),
        label: rm2[6]?.trim(),
        sourceCardinality: rm2[2] || undefined,
        targetCardinality: rm2[4] || undefined,
      });
      continue;
    }

    // Inline member: ClassName : +method() void
    const inlineM = line.match(/^(\w+)\s*:\s*(.+)$/);
    if (inlineM) {
      const cls = ensureClass(inlineM[1]);
      const { member, method } = parseClassMember(inlineM[2]);
      if (method) cls.methods.push(method);
      else if (member) cls.members.push(member);
    }
  }

  return { type: "classDiagram", classes: [...classMap.values()], relations, rawLines: lines };
}

// ---------------------------------------------------------------------------
// State diagram parser
// ---------------------------------------------------------------------------

function parseState(source: string): StateModel {
  const lines = source.split("\n");
  const stateMap = new Map<string, StateNode>();
  const transitions: StateTransition[] = [];
  let transCount = 0;
  let hasCompositeStates = false;

  const ensureState = (id: string): StateNode => {
    if (id === "[*]") {
      // Start/end markers — create unique nodes per context
      if (!stateMap.has(id)) stateMap.set(id, { id, kind: "start" });
      return stateMap.get(id)!;
    }
    if (!stateMap.has(id)) stateMap.set(id, { id, kind: "normal" });
    return stateMap.get(id)!;
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%") || line === "end" || line === "{" || line === "}") continue;

    // Concurrency divider --
    if (line === "--") {
      hasCompositeStates = true;
      continue;
    }

    // State label: state "Label" as StateName
    const slm = line.match(/^state\s+"([^"]+)"\s+as\s+(\w+)$/);
    if (slm) {
      const node = ensureState(slm[2]);
      node.label = slm[1];
      continue;
    }

    // Nested state block: state "X" { or state X {
    const nestedM = line.match(/^state\s+(?:"[^"]+"|[\w-]+)\s*\{/);
    if (nestedM) {
      hasCompositeStates = true;
      continue;
    }

    // Choice/fork/join markers: state Name <<choice>>
    const choiceM = line.match(/^state\s+(\w+)\s+<<(choice|fork|join)>>$/);
    if (choiceM) {
      const node = ensureState(choiceM[1]);
      node.kind = choiceM[2] as "choice" | "fork" | "join";
      if (choiceM[2] === "fork" || choiceM[2] === "join") hasCompositeStates = true;
      continue;
    }

    // Composite state block: state "Label" { or state Name {
    if (line.match(/^state\s+(?:"[^"]+"|[\w-]+)\s*\{/)) {
      hasCompositeStates = true;
    }

    // Concurrency divider inside composite state
    if (line === "--") {
      hasCompositeStates = true;
    }

    // Skip other state declarations (e.g. "state Name {")
    if (line.startsWith("state ")) continue;

    // Transition: State1 --> State2 : label (supports [*] start/end markers)
    const tm = line.match(/^(\[\*\]|[\w-]+)\s*-->\s*(\[\*\]|[\w-]+)\s*(?::\s*(.+))?$/);
    if (tm) {
      const srcId = tm[1];
      const tgtId = tm[2];
      ensureState(srcId);
      const tgtNode = ensureState(tgtId);
      // If target is [*], mark as end
      if (tgtId === "[*]") tgtNode.kind = "end";
      transitions.push({
        id: `t-${transCount++}`,
        source: srcId,
        target: tgtId,
        label: tm[3]?.trim(),
      });
      continue;
    }
  }

  return { type: "stateDiagram-v2", states: [...stateMap.values()], transitions, hasCompositeStates: hasCompositeStates || undefined, rawLines: lines };
}

// ---------------------------------------------------------------------------
// ER diagram parser
// ---------------------------------------------------------------------------

function parseERCardinality(s: string): ERCardinality {
  switch (s) {
    case "||": return "||";
    case "o|": case "|o": return "o|";
    case "|{": case "}|": return "|{";
    case "o{": case "}o": return "o{";
    default: return "||";
  }
}

function parseER(source: string): ERModel {
  const lines = source.split("\n");
  const entityMap = new Map<string, EREntity>();
  const relations: ERRelation[] = [];
  let currentEntity: EREntity | null = null;
  let braceDepth = 0;
  let relCount = 0;

  const ensureEntity = (name: string): EREntity => {
    if (!entityMap.has(name)) entityMap.set(name, { name, attributes: [] });
    return entityMap.get(name)!;
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%")) continue;

    // Inside entity block
    if (currentEntity && braceDepth > 0) {
      if (line === "}") {
        braceDepth--;
        if (braceDepth === 0) currentEntity = null;
        continue;
      }
      // Attribute: type name PK|FK|UK "comment"
      const am = line.match(/^(\w+)\s+(\w+)\s*(?:(PK|FK|UK))?\s*(?:"([^"]*)")?$/);
      if (am) {
        currentEntity.attributes.push({
          type: am[1],
          name: am[2],
          key: (am[3] as ERAttribute["key"]) || "",
          comment: am[4],
        });
      }
      continue;
    }

    // Entity block start: ENTITY_NAME {
    const entityM = line.match(/^(\w+)\s*\{$/);
    if (entityM) {
      currentEntity = ensureEntity(entityM[1]);
      braceDepth = 1;
      continue;
    }

    // Relationship: ENTITY_A ||--o{ ENTITY_B : label  (-- identifying, .. non-identifying)
    const relM = line.match(/^(\w+)\s+(\|[|o{]|o[|{]|}\||}o)(--|\.\.)(\|[|o{]|o[|{]|}\||}o)\s+(\w+)\s*:\s*(.+)$/);
    if (relM) {
      ensureEntity(relM[1]);
      ensureEntity(relM[5]);
      relations.push({
        id: `er-${relCount++}`,
        entityA: relM[1],
        entityB: relM[5],
        cardA: parseERCardinality(relM[2]),
        cardB: parseERCardinality(relM[4]),
        identifying: relM[3] !== "..",
        label: relM[6].trim(),
      });
    }
  }

  return { type: "erDiagram", entities: [...entityMap.values()], relations, rawLines: lines };
}

// ---------------------------------------------------------------------------
// Mindmap parser
// ---------------------------------------------------------------------------

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

function parseMindmap(source: string): MindmapModel {
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

// ---------------------------------------------------------------------------
// Block-beta parser
// ---------------------------------------------------------------------------

function parseBlock(source: string): BlockModel {
  const lines = source.split("\n");
  let columns = 1;
  const blocks: BlockItem[] = [];
  const arrows: BlockArrow[] = [];
  let arrowCount = 0;
  const blockStack: BlockItem[][] = [blocks];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%")) continue;

    // columns N
    const colM = line.match(/^columns\s+(\d+)$/);
    if (colM) { columns = Number(colM[1]); continue; }

    // end of nested block
    if (line === "end") {
      if (blockStack.length > 1) blockStack.pop();
      continue;
    }

    // Arrow: id1 --> id2 or id1 --> "label" --> id2
    const arrowM = line.match(/^(\w+)\s*(-->|---)\s*(?:"([^"]+)"\s*-->?\s*)?(\w+)$/);
    if (arrowM) {
      arrows.push({ id: `ba-${arrowCount++}`, source: arrowM[1], target: arrowM[4], label: arrowM[3] });
      continue;
    }

    // Block with label and span: id["label"]:span  or  id["label"]
    const blockM = line.match(/^(\w+)(?:\["([^"]+)"\])?(?::(\d+))?$/);
    if (blockM) {
      const item: BlockItem = {
        id: blockM[1],
        label: blockM[2] || blockM[1],
        span: blockM[3] ? Number(blockM[3]) : 1,
        children: [],
      };
      blockStack[blockStack.length - 1].push(item);
      continue;
    }

    // Nested block start: block:id or block
    const nestedM = line.match(/^block(?::(\w+))?$/);
    if (nestedM) {
      const item: BlockItem = {
        id: nestedM[1] || `block-${i}`,
        label: nestedM[1] || "",
        span: 1,
        children: [],
      };
      blockStack[blockStack.length - 1].push(item);
      blockStack.push(item.children);
    }
  }

  return { type: "block-beta", columns, blocks, arrows, rawLines: lines };
}

// ---------------------------------------------------------------------------
// Journey parser
// ---------------------------------------------------------------------------

function parseJourney(source: string): JourneyModel {
  const lines = source.split("\n");
  let title: string | undefined;
  const sections: JourneySection[] = [];
  let cur: JourneySection | null = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%")) continue;
    if (line.startsWith("title ")) { title = line.slice(6).trim(); continue; }
    if (line.startsWith("section ")) {
      cur = { name: line.slice(8).trim(), tasks: [] };
      sections.push(cur);
      continue;
    }
    if (!cur) { cur = { name: "", tasks: [] }; sections.push(cur); }

    // Task: Name: score: Actor1, Actor2
    const tm = line.match(/^(.+?):\s*(\d+)\s*(?::\s*(.+))?$/);
    if (tm) {
      cur.tasks.push({
        name: tm[1].trim(),
        score: Number(tm[2]),
        actors: tm[3] ? tm[3].split(",").map((a) => a.trim()) : [],
      });
    }
  }

  return { type: "journey", title, sections, rawLines: lines };
}

// ---------------------------------------------------------------------------
// Timeline parser
// ---------------------------------------------------------------------------

function parseTimeline(source: string): TimelineModel {
  const lines = source.split("\n");
  let title: string | undefined;
  const periods: TimelinePeriod[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%")) continue;
    if (line.startsWith("title ")) { title = line.slice(6).trim(); continue; }
    if (line.startsWith("section ")) continue; // sections are optional grouping, skip

    // Period line: "2004 : Event" or continuation ": Event"
    const pm = line.match(/^(.+?)\s*:\s*(.+)$/);
    if (pm) {
      const time = pm[1].trim();
      const event = pm[2].trim();
      // Check if this is a continuation (same time period — starts with whitespace in original)
      if (periods.length > 0 && lines[i].match(/^\s{5,}/)) {
        // Continuation of previous period
        periods[periods.length - 1].events.push(event);
      } else {
        periods.push({ time, events: [event] });
      }
    }
  }

  return { type: "timeline", title, periods, rawLines: lines };
}

// ---------------------------------------------------------------------------
// Quadrant chart parser
// ---------------------------------------------------------------------------

function parseQuadrant(source: string): QuadrantModel {
  const lines = source.split("\n");
  let title: string | undefined;
  let xAxisLeft: string | undefined, xAxisRight: string | undefined;
  let yAxisBottom: string | undefined, yAxisTop: string | undefined;
  let quadrant1: string | undefined, quadrant2: string | undefined;
  let quadrant3: string | undefined, quadrant4: string | undefined;
  const points: QuadrantPoint[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%")) continue;

    if (line.startsWith("title ")) { title = line.slice(6).trim(); continue; }

    const xm = line.match(/^x-axis\s+"?(.+?)"?\s*-->\s*"?(.+?)"?\s*$/);
    if (xm) { xAxisLeft = xm[1]; xAxisRight = xm[2]; continue; }

    const ym = line.match(/^y-axis\s+"?(.+?)"?\s*-->\s*"?(.+?)"?\s*$/);
    if (ym) { yAxisBottom = ym[1]; yAxisTop = ym[2]; continue; }

    if (line.startsWith("quadrant-1 ")) { quadrant1 = line.slice(11).trim(); continue; }
    if (line.startsWith("quadrant-2 ")) { quadrant2 = line.slice(11).trim(); continue; }
    if (line.startsWith("quadrant-3 ")) { quadrant3 = line.slice(11).trim(); continue; }
    if (line.startsWith("quadrant-4 ")) { quadrant4 = line.slice(11).trim(); continue; }

    // Point: Label: [x, y]
    const pm = line.match(/^(.+?):\s*\[\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\]$/);
    if (pm) {
      points.push({ label: pm[1].trim(), x: Number(pm[2]), y: Number(pm[3]) });
    }
  }

  return {
    type: "quadrantChart", title,
    xAxisLeft, xAxisRight, yAxisBottom, yAxisTop,
    quadrant1, quadrant2, quadrant3, quadrant4,
    points, rawLines: lines,
  };
}

// ---------------------------------------------------------------------------
// XY chart parser
// ---------------------------------------------------------------------------

function parseXYChart(source: string): XYChartModel {
  const lines = source.split("\n");
  let title: string | undefined;
  let xLabels: string[] = [];
  let yLabel: string | undefined;
  let yMin: number | undefined, yMax: number | undefined;
  const series: XYSeries[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%")) continue;

    const tm = line.match(/^title\s+"(.+)"$/);
    if (tm) { title = tm[1]; continue; }

    const xm = line.match(/^x-axis\s+\[(.+)\]$/);
    if (xm) { xLabels = xm[1].split(",").map((s) => s.trim()); continue; }

    const ym = line.match(/^y-axis\s+"(.+?)"\s+(\d+)\s*-->\s*(\d+)$/);
    if (ym) { yLabel = ym[1]; yMin = Number(ym[2]); yMax = Number(ym[3]); continue; }

    // bar or line: bar [1, 2, 3]
    const sm = line.match(/^(bar|line)\s+\[(.+)\]$/);
    if (sm) {
      series.push({
        kind: sm[1] as "bar" | "line",
        data: sm[2].split(",").map((s) => Number(s.trim())),
      });
    }
  }

  return { type: "xychart-beta", title, xLabels, yLabel, yMin, yMax, series, rawLines: lines };
}

// ---------------------------------------------------------------------------
// Git graph parser
// ---------------------------------------------------------------------------

function parseGitGraph(source: string): GitGraphModel {
  const lines = source.split("\n");
  const commands: GitCommand[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%")) continue;

    if (line === "commit") { commands.push({ action: "commit" }); continue; }
    const cm = line.match(/^commit\s+(?:id:\s*"([^"]+)")?\s*(?:tag:\s*"([^"]+)")?/);
    if (cm) { commands.push({ action: "commit", id: cm[1], tag: cm[2] }); continue; }

    const bm = line.match(/^branch\s+(\S+)/);
    if (bm) { commands.push({ action: "branch", value: bm[1] }); continue; }

    const chm = line.match(/^checkout\s+(\S+)/);
    if (chm) { commands.push({ action: "checkout", value: chm[1] }); continue; }

    const mm = line.match(/^merge\s+(\S+)/);
    if (mm) { commands.push({ action: "merge", value: mm[1] }); continue; }

    const cp = line.match(/^cherry-pick\s+id:\s*"([^"]+)"/);
    if (cp) { commands.push({ action: "cherry-pick", id: cp[1] }); continue; }
  }

  return { type: "gitGraph", commands, rawLines: lines };
}

// ---------------------------------------------------------------------------
// Requirement diagram parser
// ---------------------------------------------------------------------------

function parseRequirement(source: string): RequirementModel {
  const lines = source.split("\n");
  const requirements: Requirement[] = [];
  const elements: ReqElement[] = [];
  const relations: ReqRelation[] = [];

  let blockType: "requirement" | "element" | null = null;
  let currentReq: Partial<Requirement> = {};
  let currentElem: Partial<ReqElement> = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%")) continue;

    // Requirement block start: requirementType "Name" {
    const reqM = line.match(/^(\w+(?:Requirement)?)\s+"([^"]+)"\s*\{$/);
    if (reqM && !line.startsWith("element")) {
      blockType = "requirement";
      currentReq = { kind: reqM[1], name: reqM[2], id: "", text: "", risk: "Low", verifyMethod: "Analysis" };
      continue;
    }

    // Element block start: element "Name" {
    const elemM = line.match(/^element\s+"([^"]+)"\s*\{$/);
    if (elemM) {
      blockType = "element";
      currentElem = { name: elemM[1], type: "" };
      continue;
    }

    if (line === "}") {
      if (blockType === "requirement" && currentReq.name) {
        requirements.push(currentReq as Requirement);
      } else if (blockType === "element" && currentElem.name) {
        elements.push(currentElem as ReqElement);
      }
      blockType = null;
      continue;
    }

    if (blockType === "requirement") {
      const idM = line.match(/^id:\s*"?([^"]+)"?$/);
      if (idM) { currentReq.id = idM[1].trim(); continue; }
      const textM = line.match(/^text:\s*"?([^"]+)"?$/);
      if (textM) { currentReq.text = textM[1].trim(); continue; }
      const riskM = line.match(/^risk:\s*(\w+)$/);
      if (riskM) { currentReq.risk = riskM[1] as Requirement["risk"]; continue; }
      const vmM = line.match(/^verifymethod:\s*(\w+)$/i);
      if (vmM) { currentReq.verifyMethod = vmM[1] as Requirement["verifyMethod"]; continue; }
    }

    if (blockType === "element") {
      const typeM = line.match(/^type:\s*"?([^"]+)"?$/);
      if (typeM) { currentElem.type = typeM[1].trim(); continue; }
      const drM = line.match(/^docRef:\s*"?([^"]+)"?$/);
      if (drM) { currentElem.docRef = drM[1].trim(); continue; }
    }

    // Relations: source - type -> target
    const relM = line.match(/^(\w+)\s*-\s*(contains|copies|derives|satisfies|verifies|refines|traces)\s*->\s*(\w+)$/);
    if (relM) {
      relations.push({
        source: relM[1],
        target: relM[3],
        type: relM[2] as ReqRelation["type"],
      });
    }
  }

  return { type: "requirementDiagram", requirements, elements, relations, rawLines: lines };
}
