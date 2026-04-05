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
