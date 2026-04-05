import type {
  DiagramModel, GraphModel,
  SequenceModel, GanttModel, PieModel,
  ClassModel, StateModel, ERModel,
  MindmapModel, BlockModel,
} from "../parsers";

import { serializeFlowchart } from "./flowchart";
import { serializeSequence } from "./sequence";
import { serializeGantt } from "./gantt";
import { serializePie } from "./pie";
import { serializeClass } from "./classDiagram";
import { serializeState } from "./state";
import { serializeER } from "./er";
import { serializeMindmap } from "./mindmap";
import { serializeBlock } from "./block";

export function serialize(model: DiagramModel): string {
  switch (model.type) {
    case "flowchart":
    case "graph":
      return serializeFlowchart(model as GraphModel);
    case "sequenceDiagram":
      return serializeSequence(model as SequenceModel);
    case "gantt":
      return serializeGantt(model as GanttModel);
    case "pie":
      return serializePie(model as PieModel);
    case "classDiagram":
      return serializeClass(model as ClassModel);
    case "stateDiagram-v2":
      return serializeState(model as StateModel);
    case "erDiagram":
      return serializeER(model as ERModel);
    case "mindmap":
      return serializeMindmap(model as MindmapModel);
    case "block-beta":
      return serializeBlock(model as BlockModel);
    default:
      return (model as { rawLines: string[] }).rawLines.join("\n");
  }
}
