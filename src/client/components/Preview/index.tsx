import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
});

let idCounter = 0;

const MIN_ZOOM = 25;
const MAX_ZOOM = 200;
const ZOOM_STEP = 15;

interface PreviewProps {
  source: string;
  onSvgChange?: (svg: string) => void;
}

type State =
  | { kind: "empty" }
  | { kind: "ok"; svg: string }
  | { kind: "error"; message: string };

export default function Preview({ source, onSvgChange }: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>({ kind: "empty" });
  const [zoom, setZoom] = useState(100);

  // Debounced render: wait 300ms after source stops changing
  useEffect(() => {
    const trimmed = source.trim();
    if (!trimmed) {
      setState({ kind: "empty" });
      return;
    }

    const timer = setTimeout(async () => {
      const id = `mermaid-preview-${++idCounter}`;
      try {
        const { svg } = await mermaid.render(id, trimmed);
        setState({ kind: "ok", svg });
        onSvgChange?.(svg);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Strip the HTML Mermaid sometimes embeds in error messages
        const clean = msg.replace(/<[^>]+>/g, "").trim();
        setState({ kind: "error", message: clean });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [source, onSvgChange]);

  // Inject SVG into DOM
  useEffect(() => {
    if (containerRef.current && state.kind === "ok") {
      containerRef.current.innerHTML = state.svg;
    }
  }, [state]);

  function adjustZoom(delta: number) {
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));
  }

  function fitZoom() {
    setZoom(100);
  }

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      {/* SVG canvas */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        {state.kind === "empty" && <EmptyState />}
        {state.kind === "error" && <ErrorState message={state.message} />}
        {state.kind === "ok" && (
          <div
            ref={containerRef}
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
            className="[&>svg]:max-w-full transition-transform duration-100"
          />
        )}
      </div>

      {/* Zoom controls — only shown when there's something to zoom */}
      {state.kind === "ok" && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1">
          <ZoomButton onClick={() => adjustZoom(-ZOOM_STEP)} label="−" />
          <button
            onClick={fitZoom}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] w-12 text-center transition-colors"
            title="Reset zoom"
          >
            {zoom}%
          </button>
          <ZoomButton onClick={() => adjustZoom(ZOOM_STEP)} label="+" />
        </div>
      )}
    </div>
  );
}

function ZoomButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="w-5 h-5 flex items-center justify-center text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-surface)] transition-colors"
    >
      {label}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="text-center text-[var(--text-muted)] select-none">
      <div className="text-3xl mb-3 opacity-20">◇</div>
      <p className="text-sm mb-2">Start typing a Mermaid diagram</p>
      <pre className="text-xs opacity-60 text-left inline-block">
        {`flowchart TD\n    A --> B`}
      </pre>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="w-full max-w-lg p-4">
      <p className="text-xs font-semibold text-red-400 mb-2">Parse error</p>
      <pre className="text-xs text-[var(--text-muted)] whitespace-pre-wrap break-words font-mono">
        {message}
      </pre>
    </div>
  );
}
