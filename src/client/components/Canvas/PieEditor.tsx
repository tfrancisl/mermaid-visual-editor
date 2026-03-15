import { useEffect, useRef, useState } from "react";
import { parse } from "../../lib/parsers";
import type { PieModel, PieSlice } from "../../lib/parsers";
import { serialize } from "../../lib/serializers";

interface Props {
  source: string;
  onSourceChange: (s: string) => void;
}

export default function PieEditor({ source, onSourceChange }: Props) {
  const [title, setTitle] = useState("");
  const [showData, setShowData] = useState(false);
  const [slices, setSlices] = useState<PieSlice[]>([]);
  const ownUpdateRef = useRef(false);

  useEffect(() => {
    if (ownUpdateRef.current) { ownUpdateRef.current = false; return; }
    const model = parse(source) as PieModel;
    if (model.type !== "pie") return;
    setTitle(model.title ?? "");
    setShowData(model.showData);
    setSlices(model.slices);
  }, [source]);

  function push(t: string, sd: boolean, s: PieSlice[]) {
    const model: PieModel = { type: "pie", title: t || undefined, showData: sd, slices: s, rawLines: [] };
    ownUpdateRef.current = true;
    onSourceChange(serialize(model));
  }

  function updateSlice(i: number, patch: Partial<PieSlice>) {
    const next = slices.map((s, idx) => idx === i ? { ...s, ...patch } : s);
    setSlices(next);
    push(title, showData, next);
  }

  function removeSlice(i: number) {
    const next = slices.filter((_, idx) => idx !== i);
    setSlices(next);
    push(title, showData, next);
  }

  function addSlice() {
    const next = [...slices, { label: `Slice ${slices.length + 1}`, value: 10 }];
    setSlices(next);
    push(title, showData, next);
  }

  const total = slices.reduce((s, sl) => s + sl.value, 0);

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-5 text-xs text-[var(--text-primary)]">
      {/* Header */}
      <section className="flex flex-col gap-3">
        <label className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] w-20 shrink-0">Title</span>
          <input
            className="flex-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--accent)] text-[var(--text-primary)]"
            value={title}
            onChange={(e) => { setTitle(e.target.value); push(e.target.value, showData, slices); }}
            placeholder="Pie chart title"
          />
        </label>
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] w-20 shrink-0">Show data</span>
          <input type="checkbox" checked={showData} onChange={(e) => { setShowData(e.target.checked); push(title, e.target.checked, slices); }} className="accent-[var(--accent)]" />
        </label>
      </section>

      {/* Slices */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Slices</span>
          <button onClick={addSlice} className="text-[var(--accent)] hover:underline">+ Add</button>
        </div>

        <div className="flex flex-col gap-1">
          {slices.map((sl, i) => (
            <div key={i} className="flex items-center gap-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded px-2 py-1.5">
              {/* Colour swatch — just a visual indicator based on index */}
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: `hsl(${(i * 60) % 360}, 70%, 60%)` }} />
              <input
                className="flex-1 bg-transparent outline-none text-[var(--text-primary)] min-w-0"
                value={sl.label}
                onChange={(e) => updateSlice(i, { label: e.target.value })}
                placeholder="Label"
              />
              <input
                type="number"
                className="w-16 bg-[var(--bg-primary)] border border-[var(--border)] rounded px-1 py-0.5 text-right text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                value={sl.value}
                min={0}
                onChange={(e) => updateSlice(i, { value: Number(e.target.value) })}
              />
              {total > 0 && (
                <span className="text-[var(--text-muted)] w-10 text-right shrink-0">
                  {Math.round((sl.value / total) * 100)}%
                </span>
              )}
              <button onClick={() => removeSlice(i)} className="text-[var(--text-muted)] hover:text-red-400 shrink-0">×</button>
            </div>
          ))}
        </div>

        {total > 0 && (
          <p className="text-[var(--text-muted)] mt-2 text-right">Total: {total}</p>
        )}
      </section>
    </div>
  );
}
