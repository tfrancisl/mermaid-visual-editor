import { useEffect, useRef, useState } from "react";
import { parse } from "../../lib/parsers";
import type { GanttModel, GanttSection, GanttTask } from "../../lib/parsers";
import { serialize } from "../../lib/serializers";

const STATUSES = ["", "done", "active", "crit", "milestone"] as const;

interface Props {
  source: string;
  onSourceChange: (s: string) => void;
}

export default function GanttEditor({ source, onSourceChange }: Props) {
  const [title, setTitle] = useState("");
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");
  const [sections, setSections] = useState<GanttSection[]>([]);
  const [expandedTask, setExpandedTask] = useState<string | null>(null); // "sIdx-tIdx"
  const ownUpdateRef = useRef(false);

  useEffect(() => {
    if (ownUpdateRef.current) { ownUpdateRef.current = false; return; }
    const model = parse(source) as GanttModel;
    if (model.type !== "gantt") return;
    setTitle(model.title ?? "");
    setDateFormat(model.dateFormat ?? "YYYY-MM-DD");
    setSections(model.sections);
  }, [source]);

  function push(t: string, df: string, s: GanttSection[]) {
    const model: GanttModel = { type: "gantt", title: t || undefined, dateFormat: df || undefined, sections: s, rawLines: [] };
    ownUpdateRef.current = true;
    onSourceChange(serialize(model));
  }

  function updateTitle(v: string) { setTitle(v); push(v, dateFormat, sections); }
  function updateDateFormat(v: string) { setDateFormat(v); push(title, v, sections); }

  function updateSections(s: GanttSection[]) { setSections(s); push(title, dateFormat, s); }

  function addSection() {
    updateSections([...sections, { name: `Section ${sections.length + 1}`, tasks: [] }]);
  }

  function updateSectionName(si: number, name: string) {
    updateSections(sections.map((s, i) => i === si ? { ...s, name } : s));
  }

  function removeSection(si: number) {
    updateSections(sections.filter((_, i) => i !== si));
  }

  function addTask(si: number) {
    const next = sections.map((s, i) => i === si
      ? { ...s, tasks: [...s.tasks, { label: "New task", duration: "1d" }] }
      : s);
    updateSections(next);
  }

  function updateTask(si: number, ti: number, patch: Partial<GanttTask>) {
    const next = sections.map((s, i) => i === si
      ? { ...s, tasks: s.tasks.map((t, j) => j === ti ? { ...t, ...patch } : t) }
      : s);
    updateSections(next);
  }

  function removeTask(si: number, ti: number) {
    const next = sections.map((s, i) => i === si
      ? { ...s, tasks: s.tasks.filter((_, j) => j !== ti) }
      : s);
    updateSections(next);
  }

  function moveTask(si: number, ti: number, dir: -1 | 1) {
    const tj = ti + dir;
    const s = sections[si];
    if (!s || tj < 0 || tj >= s.tasks.length) return;
    const tasks = [...s.tasks];
    [tasks[ti], tasks[tj]] = [tasks[tj], tasks[ti]];
    updateSections(sections.map((sec, i) => i === si ? { ...sec, tasks } : sec));
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-5 text-xs text-[var(--text-primary)]">
      {/* Header fields */}
      <section className="flex flex-col gap-2">
        <Field label="Title" value={title} onChange={updateTitle} />
        <Field label="Date format" value={dateFormat} onChange={updateDateFormat} mono />
      </section>

      {/* Sections */}
      {sections.map((sec, si) => (
        <section key={si} className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <input
              className="flex-1 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm font-medium text-[var(--text-primary)] py-0.5"
              value={sec.name}
              onChange={(e) => updateSectionName(si, e.target.value)}
              placeholder="Section name"
            />
            <button onClick={() => removeSection(si)} className="text-[var(--text-muted)] hover:text-red-400 text-base leading-none">×</button>
          </div>

          <div className="flex flex-col gap-1 ml-2">
            {sec.tasks.map((task, ti) => {
              const key = `${si}-${ti}`;
              return (
                <div key={ti} className="border border-[var(--border)] rounded overflow-hidden">
                  <div
                    className="flex items-center gap-2 px-2 py-1.5 bg-[var(--bg-surface)] cursor-pointer hover:bg-[var(--bg-primary)]"
                    onClick={() => setExpandedTask(expandedTask === key ? null : key)}
                  >
                    <div className="flex gap-0.5 flex-col mr-1">
                      <button onClick={(e) => { e.stopPropagation(); moveTask(si, ti, -1); }} className="text-[8px] leading-none text-[var(--text-muted)] hover:text-[var(--text-primary)]">▲</button>
                      <button onClick={(e) => { e.stopPropagation(); moveTask(si, ti, 1); }} className="text-[8px] leading-none text-[var(--text-muted)] hover:text-[var(--text-primary)]">▼</button>
                    </div>
                    <span className="flex-1 truncate">{task.label}</span>
                    {task.status && <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-primary)] px-1 rounded">{task.status}</span>}
                    <button onClick={(e) => { e.stopPropagation(); removeTask(si, ti); }} className="text-[var(--text-muted)] hover:text-red-400">×</button>
                  </div>
                  {expandedTask === key && (
                    <div className="grid grid-cols-2 gap-2 p-2 bg-[var(--bg-primary)] border-t border-[var(--border)]">
                      <label className="col-span-2 flex flex-col gap-1">
                        <span className="text-[10px] text-[var(--text-muted)]">Label</span>
                        <input className="field-input" value={task.label} onChange={(e) => updateTask(si, ti, { label: e.target.value })} />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-[10px] text-[var(--text-muted)]">Status</span>
                        <select className="field-select" value={task.status ?? ""} onChange={(e) => updateTask(si, ti, { status: (e.target.value || undefined) as GanttTask["status"] })}>
                          {STATUSES.map((s) => <option key={s} value={s}>{s || "(none)"}</option>)}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-[10px] text-[var(--text-muted)]">Duration</span>
                        <input className="field-input font-mono" value={task.duration ?? ""} onChange={(e) => updateTask(si, ti, { duration: e.target.value })} placeholder="7d" />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-[10px] text-[var(--text-muted)]">Start date</span>
                        <input className="field-input font-mono" value={task.start ?? ""} onChange={(e) => updateTask(si, ti, { start: e.target.value })} placeholder="2024-01-01" />
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={() => addTask(si)} className="text-[var(--accent)] hover:underline text-left mt-0.5">+ Add task</button>
          </div>
        </section>
      ))}

      <button onClick={addSection} className="text-[var(--accent)] hover:underline text-left">+ Add section</button>
    </div>
  );
}

function Field({ label, value, onChange, mono }: { label: string; value: string; onChange: (v: string) => void; mono?: boolean }) {
  return (
    <label className="flex items-center gap-3">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] w-20 shrink-0">{label}</span>
      <input
        className={`flex-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--accent)] text-[var(--text-primary)] ${mono ? "font-mono" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
