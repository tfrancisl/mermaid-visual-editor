import { detectDiagramType } from "../../lib/parsers";
import FlowchartCanvas from "./FlowchartCanvas";
import SequenceEditor from "./SequenceEditor";
import GanttEditor from "./GanttEditor";
import PieEditor from "./PieEditor";

interface CanvasProps {
  source: string;
  onSourceChange: (s: string) => void;
}

export default function Canvas({ source, onSourceChange }: CanvasProps) {
  const type = detectDiagramType(source);

  if (type === "flowchart" || type === "graph") {
    return <FlowchartCanvas source={source} onSourceChange={onSourceChange} />;
  }
  if (type === "sequenceDiagram") {
    return <SequenceEditor source={source} onSourceChange={onSourceChange} />;
  }
  if (type === "gantt") {
    return <GanttEditor source={source} onSourceChange={onSourceChange} />;
  }
  if (type === "pie") {
    return <PieEditor source={source} onSourceChange={onSourceChange} />;
  }

  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 text-center p-6">
      <p className="text-sm font-medium text-[var(--text-muted)]">Visual editing not yet supported</p>
      <p className="text-xs text-[var(--text-muted)] max-w-xs opacity-60">
        <code className="font-mono">{type}</code> diagrams will get a visual editor in a future phase.
        Edit the source directly in Editor mode.
      </p>
    </div>
  );
}
