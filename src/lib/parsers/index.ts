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

export interface RawModel {
  type: string;
  rawLines: string[];
}

export type DiagramModel = GraphModel | SequenceModel | GanttModel | PieModel | RawModel;

// ---------------------------------------------------------------------------
// Diagram type detection
// ---------------------------------------------------------------------------

export function detectDiagramType(source: string): string {
  const first = source.trim().split("\n")[0].trim();
  const m = first.match(
    /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie|gitGraph|mindmap|timeline|quadrantChart|xychart-beta|requirementDiagram|journey|C4\w+)/
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
