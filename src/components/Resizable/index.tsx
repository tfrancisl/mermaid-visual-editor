import { useRef, useState, useCallback } from "react";

interface ResizableProps {
  /** Default split ratio (0–1, left panel fraction). */
  defaultRatio?: number;
  minRatio?: number;
  maxRatio?: number;
  /** Persist ratio in localStorage under this key. */
  storageKey?: string;
  children: [React.ReactNode, React.ReactNode];
  className?: string;
}

export default function Resizable({
  defaultRatio = 0.5,
  minRatio = 0.15,
  maxRatio = 0.85,
  storageKey,
  children,
  className,
}: ResizableProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [ratio, setRatio] = useState(() => {
    if (storageKey) {
      const v = localStorage.getItem(`split:${storageKey}`);
      if (v) return Math.max(minRatio, Math.min(maxRatio, Number(v)));
    }
    return defaultRatio;
  });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      const onMove = (ev: MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const r = Math.max(minRatio, Math.min(maxRatio, (ev.clientX - rect.left) / rect.width));
        setRatio(r);
        if (storageKey) localStorage.setItem(`split:${storageKey}`, String(r));
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [minRatio, maxRatio, storageKey]
  );

  return (
    <div ref={containerRef} className={`flex h-full min-h-0 overflow-hidden ${className ?? ""}`}>
      {/* Left panel */}
      <div style={{ width: `${ratio * 100}%` }} className="flex flex-col min-h-0 overflow-hidden shrink-0">
        {children[0]}
      </div>

      {/* Drag handle */}
      <div
        className="w-1 shrink-0 cursor-col-resize bg-[var(--border)] hover:bg-[var(--accent)] active:bg-[var(--accent)] transition-colors select-none"
        onMouseDown={handleMouseDown}
      />

      {/* Right panel */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
        {children[1]}
      </div>
    </div>
  );
}
