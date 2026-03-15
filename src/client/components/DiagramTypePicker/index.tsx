import { useEffect, useRef } from "react";
import { DIAGRAM_TYPES } from "../../lib/templates";

interface DiagramTypePickerProps {
  currentType?: string;
  /** Called when the user selects a type. Parent decides replace-vs-new-tab. */
  onSelect: (type: string) => void;
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

  // Position above the anchor (status bar trigger) or below (toolbar trigger)
  const style: React.CSSProperties = anchorRect
    ? {
        position: "fixed",
        left: Math.max(8, Math.min(anchorRect.left, window.innerWidth - 260)),
        // If anchor is in the bottom 25% of the screen, open upward
        ...(anchorRect.top > window.innerHeight * 0.75
          ? { bottom: window.innerHeight - anchorRect.top + 4 }
          : { top: anchorRect.bottom + 4 }),
        zIndex: 50,
      }
    : { position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)", zIndex: 50 };

  return (
    <div
      ref={ref}
      style={{ ...style, maxHeight: 360 }}
      className="w-56 bg-[var(--bg-secondary)] border border-[var(--border)] rounded shadow-xl py-1 overflow-y-auto"
    >
      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border)] mb-1">
        Diagram type
      </div>
      {DIAGRAM_TYPES.map((dt) => (
        <button
          key={dt.id}
          onClick={() => { onSelect(dt.id); onClose(); }}
          className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors ${
            dt.id === currentType
              ? "text-[var(--accent)] bg-[var(--bg-surface)]"
              : "text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
          }`}
        >
          <span>{dt.label}</span>
          {dt.id === currentType && <span className="text-[10px] opacity-70">✓</span>}
        </button>
      ))}
    </div>
  );
}
