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

export interface ParseError {
  message: string;  // clean human-readable, HTML stripped
  line: number;     // 1-indexed, fallback to 1
  column: number;   // 1-indexed, fallback to 1
}

interface PreviewState {
  svg: string | null;
  error: ParseError | null;
}

interface PreviewProps {
  source: string;
  onSvgChange?: (svg: string) => void;
  onError?: (error: ParseError | null) => void;
  onJumpToLine?: (line: number) => void;
}

function extractLineCol(msg: string): { line: number; column: number } {
  const lineMatch = msg.match(/\bon\s+line\s+(\d+)/i);
  if (lineMatch) return { line: parseInt(lineMatch[1], 10), column: 1 };
  const lineColMatch = msg.match(/line\s+(\d+)[,\s]+col(?:umn)?\s+(\d+)/i);
  if (lineColMatch) return { line: parseInt(lineColMatch[1], 10), column: parseInt(lineColMatch[2], 10) };
  return { line: 1, column: 1 };
}

export default function Preview({ source, onSvgChange, onError, onJumpToLine }: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<PreviewState>({ svg: null, error: null });
  const [zoom, setZoom] = useState(100);

  // Debounced render: wait 300ms after source stops changing
  useEffect(() => {
    const trimmed = source.trim();
    if (!trimmed) {
      setState({ svg: null, error: null });
      onError?.(null);
      return;
    }

    const timer = setTimeout(async () => {
      const id = `mermaid-preview-${++idCounter}`;
      try {
        const { svg } = await mermaid.render(id, trimmed);
        setState({ svg, error: null });
        onSvgChange?.(svg);
        onError?.(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Strip the HTML Mermaid sometimes embeds in error messages
        const clean = msg.replace(/<[^>]+>/g, "").trim();
        const { line, column } = extractLineCol(clean);
        const parseError: ParseError = { message: clean, line, column };
        setState((prev) => ({ svg: prev.svg, error: parseError }));
        onError?.(parseError);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [source, onSvgChange, onError]);

  // Inject SVG into DOM
  useEffect(() => {
    if (containerRef.current && state.svg) {
      containerRef.current.innerHTML = state.svg;
    }
  }, [state.svg]);

  function adjustZoom(delta: number) {
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));
  }

  function fitZoom() {
    setZoom(100);
  }

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      {/* Error banner — shown above SVG area when there's an error */}
      {state.error && (
        <ErrorBanner error={state.error} onJumpToLine={onJumpToLine} />
      )}

      {/* SVG canvas */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        {!state.svg && !state.error && <EmptyState />}
        {state.error && !state.svg && <EmptyState />}
        {state.svg && (
          <div
            ref={containerRef}
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
            className="[&>svg]:max-w-full transition-transform duration-100"
          />
        )}
      </div>

      {/* Zoom controls — only shown when there's an SVG to zoom */}
      {state.svg && (
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

function ErrorBanner({ error, onJumpToLine }: { error: ParseError; onJumpToLine?: (line: number) => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-secondary)] border-b border-[var(--border)] shrink-0 text-xs">
      <span className="text-red-400 font-semibold shrink-0">Parse error</span>
      <span className="text-[var(--text-muted)] truncate flex-1">{error.message}</span>
      <button
        onClick={() => onJumpToLine?.(error.line)}
        className="text-[var(--accent)] hover:underline shrink-0 whitespace-nowrap"
      >
        Line {error.line}
      </button>
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
