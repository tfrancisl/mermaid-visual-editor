import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { DIAGRAM_TYPES, TEMPLATE_LIBRARY } from "../../lib/templates";

interface DiagramTypePickerProps {
  currentType?: string;
  /** Called when the user selects a template id (or type id for single-template types). Parent decides replace-vs-new-tab. */
  onSelect: (id: string) => void;
  onClose: () => void;
  /** Pixel rect of the trigger element, used to anchor the popup. */
  anchorRect?: DOMRect;
}

export default function DiagramTypePicker({
  currentType,
  onSelect,
  onClose,
  anchorRect,
}: DiagramTypePickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  // Close on click-outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const escHandler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [onClose]);

  // Lazy thumbnail generation when step 2 is opened
  useEffect(() => {
    if (step !== 2 || !selectedType) return;
    let cancelled = false;
    let counter = 0;
    const templates = TEMPLATE_LIBRARY.filter(t => t.diagramType === selectedType);

    templates.forEach(async (tmpl) => {
      const id = `thumb-${tmpl.id}-${++counter}-${Date.now()}`;
      try {
        const { svg } = await mermaid.render(id, tmpl.source);
        if (!cancelled) {
          setThumbnails(prev => ({ ...prev, [tmpl.id]: svg }));
        }
      } catch {
        // Leave absent — text fallback shown
      } finally {
        document.getElementById(id)?.remove(); // cleanup detached render nodes
      }
    });

    return () => { cancelled = true; };
  }, [step, selectedType]);

  function handleTypeClick(typeId: string) {
    const templates = TEMPLATE_LIBRARY.filter(t => t.diagramType === typeId);
    if (templates.length <= 1) {
      // Auto-select the single template (or fall back to type id)
      onSelect(templates[0]?.id ?? typeId);
      onClose();
    } else {
      setSelectedType(typeId);
      setStep(2);
    }
  }

  const popupWidth = step === 1 ? 224 : 340;

  // Position above the anchor (status bar trigger) or below (toolbar trigger)
  const style: React.CSSProperties = anchorRect
    ? {
        position: "fixed",
        left: Math.max(8, Math.min(anchorRect.left, window.innerWidth - popupWidth - 8)),
        // If anchor is in the bottom 25% of the screen, open upward
        ...(anchorRect.top > window.innerHeight * 0.75
          ? { bottom: window.innerHeight - anchorRect.top + 4 }
          : { top: anchorRect.bottom + 4 }),
        zIndex: 50,
      }
    : { position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)", zIndex: 50 };

  const selectedTypeInfo = DIAGRAM_TYPES.find(dt => dt.id === selectedType);
  const stepTemplates = selectedType ? TEMPLATE_LIBRARY.filter(t => t.diagramType === selectedType) : [];

  if (step === 2) {
    return (
      <div
        ref={ref}
        style={{ ...style, maxHeight: 400, width: popupWidth }}
        className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded shadow-xl overflow-y-auto"
      >
        {/* Step 2 header */}
        <div className="flex items-center px-2 py-1.5 border-b border-[var(--border)] sticky top-0 bg-[var(--bg-secondary)]">
          <button
            onClick={() => { setStep(1); setSelectedType(null); setThumbnails({}); }}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] mr-2 text-xs"
          >
            &larr; Back
          </button>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            {selectedTypeInfo?.label ?? selectedType}
          </span>
        </div>

        {/* Template grid */}
        <div className="grid grid-cols-2 gap-2 p-2">
          {stepTemplates.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => { onSelect(tmpl.id); onClose(); }}
              className="flex flex-col text-left hover:bg-[var(--bg-surface)] rounded p-1 transition-colors"
            >
              {/* Thumbnail container */}
              <div
                className="w-full overflow-hidden bg-[var(--bg-surface)] border border-[var(--border)] rounded mb-1"
                style={{ height: 80 }}
              >
                {thumbnails[tmpl.id] ? (
                  <div
                    className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full pointer-events-none"
                    dangerouslySetInnerHTML={{ __html: thumbnails[tmpl.id] }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-[var(--text-muted)] italic">
                    {tmpl.name}
                  </div>
                )}
              </div>
              <span className="text-xs text-[var(--text-primary)] leading-tight">{tmpl.name}</span>
              <span className="text-[10px] text-[var(--text-muted)] leading-tight mt-0.5">{tmpl.description}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 1: diagram type list
  return (
    <div
      ref={ref}
      style={{ ...style, maxHeight: 360, width: popupWidth }}
      className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded shadow-xl py-1 overflow-y-auto"
    >
      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border)] mb-1">
        Diagram type
      </div>
      {DIAGRAM_TYPES.map((dt) => (
        <button
          key={dt.id}
          onClick={() => handleTypeClick(dt.id)}
          className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors ${
            dt.id === currentType
              ? "text-[var(--accent)] bg-[var(--bg-surface)]"
              : "text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
          }`}
        >
          <span>{dt.label}</span>
          {dt.id === currentType && <span className="text-[10px] opacity-70">&#x2713;</span>}
        </button>
      ))}
    </div>
  );
}
