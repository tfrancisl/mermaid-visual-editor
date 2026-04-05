export * from "./types";

import type { DiagramModel } from "./types";
import { parseFlowchart } from "./flowchart";
import { parseSequence } from "./sequence";
import { parseGantt } from "./gantt";
import { parsePie } from "./pie";
import { parseClass } from "./classDiagram";
import { parseState } from "./state";
import { parseER } from "./er";
import { parseMindmap } from "./mindmap";
import { parseBlock } from "./block";
import { parseJourney } from "./journey";
import { parseTimeline } from "./timeline";
import { parseQuadrant } from "./quadrant";
import { parseXYChart } from "./xychart";
import { parseGitGraph } from "./gitgraph";
import { parseRequirement } from "./requirement";

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
