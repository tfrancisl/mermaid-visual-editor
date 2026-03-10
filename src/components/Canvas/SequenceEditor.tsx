import { useEffect, useRef, useState } from "react";
import { parse } from "../../lib/parsers";
import type { SequenceModel, SequenceParticipant, SequenceMessage } from "../../lib/parsers";
import { serialize } from "../../lib/serializers";

const ARROWS = ["->>", "-->>", "->", "-->", "-x", "--x", "-o", "--o"];

interface Props {
  source: string;
  onSourceChange: (s: string) => void;
}

export default function SequenceEditor({ source, onSourceChange }: Props) {
  const [participants, setParticipants] = useState<SequenceParticipant[]>([]);
  const [messages, setMessages] = useState<SequenceMessage[]>([]);
  const [expandedMsg, setExpandedMsg] = useState<number | null>(null);
  const ownUpdateRef = useRef(false);

  useEffect(() => {
    if (ownUpdateRef.current) { ownUpdateRef.current = false; return; }
    const model = parse(source) as SequenceModel;
    if (model.type !== "sequenceDiagram") return;
    setParticipants(model.participants);
    setMessages(model.messages);
  }, [source]);

  function push(p: SequenceParticipant[], m: SequenceMessage[]) {
    const model: SequenceModel = { type: "sequenceDiagram", participants: p, messages: m, rawLines: [] };
    ownUpdateRef.current = true;
    onSourceChange(serialize(model));
  }

  function updateParticipant(i: number, id: string) {
    const next = participants.map((p, idx) => idx === i ? { ...p, id } : p);
    setParticipants(next);
    push(next, messages);
  }

  function removeParticipant(i: number) {
    const next = participants.filter((_, idx) => idx !== i);
    setParticipants(next);
    push(next, messages);
  }

  function addParticipant() {
    const next = [...participants, { id: `P${participants.length + 1}`, kind: "participant" as const }];
    setParticipants(next);
    push(next, messages);
  }

  function updateMessage(i: number, patch: Partial<SequenceMessage>) {
    const next = messages.map((m, idx) => idx === i ? { ...m, ...patch } : m);
    setMessages(next);
    push(participants, next);
  }

  function removeMessage(i: number) {
    const next = messages.filter((_, idx) => idx !== i);
    setMessages(next);
    push(participants, next);
  }

  function addMessage() {
    const from = participants[0]?.id ?? "A";
    const to = participants[1]?.id ?? "B";
    const next = [...messages, { from, to, arrow: "->>", text: "message" }];
    setMessages(next);
    push(participants, next);
  }

  function moveMessage(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= messages.length) return;
    const next = [...messages];
    [next[i], next[j]] = [next[j], next[i]];
    setMessages(next);
    push(participants, next);
  }

  const pIds = participants.map((p) => p.id);

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-6 text-xs text-[var(--text-primary)]">
      {/* Participants */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Participants</span>
          <button onClick={addParticipant} className="text-[var(--accent)] hover:underline">+ Add</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {participants.map((p, i) => (
            <div key={i} className="flex items-center gap-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded px-2 py-1">
              <input
                className="bg-transparent outline-none w-20 text-[var(--text-primary)]"
                value={p.id}
                onChange={(e) => updateParticipant(i, e.target.value)}
              />
              <button onClick={() => removeParticipant(i)} className="text-[var(--text-muted)] hover:text-red-400 ml-1">×</button>
            </div>
          ))}
        </div>
      </section>

      {/* Messages */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Messages</span>
          <button onClick={addMessage} className="text-[var(--accent)] hover:underline">+ Add</button>
        </div>
        <div className="flex flex-col gap-1">
          {messages.map((m, i) => (
            <div key={i} className="border border-[var(--border)] rounded overflow-hidden">
              {/* Collapsed row */}
              <div className="flex items-center gap-2 px-2 py-1.5 bg-[var(--bg-surface)] cursor-pointer hover:bg-[var(--bg-primary)]"
                onClick={() => setExpandedMsg(expandedMsg === i ? null : i)}>
                <div className="flex gap-0.5 flex-col mr-1">
                  <button onClick={(e) => { e.stopPropagation(); moveMessage(i, -1); }} className="text-[8px] leading-none text-[var(--text-muted)] hover:text-[var(--text-primary)]">▲</button>
                  <button onClick={(e) => { e.stopPropagation(); moveMessage(i, 1); }} className="text-[8px] leading-none text-[var(--text-muted)] hover:text-[var(--text-primary)]">▼</button>
                </div>
                <span className="text-[var(--accent)] w-8 shrink-0">{m.from}</span>
                <span className="font-mono text-[var(--text-muted)] w-8 shrink-0">{m.arrow}</span>
                <span className="text-[var(--accent)] w-8 shrink-0">{m.to}</span>
                <span className="text-[var(--text-muted)] truncate flex-1">{m.text}</span>
                <button onClick={(e) => { e.stopPropagation(); removeMessage(i); }} className="text-[var(--text-muted)] hover:text-red-400 shrink-0">×</button>
              </div>

              {/* Expanded edit form */}
              {expandedMsg === i && (
                <div className="grid grid-cols-2 gap-2 p-2 bg-[var(--bg-primary)] border-t border-[var(--border)]">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-[var(--text-muted)]">From</span>
                    <select className="bg-[var(--bg-surface)] border border-[var(--border)] rounded px-1 py-0.5 text-xs text-[var(--text-primary)]"
                      value={m.from} onChange={(e) => updateMessage(i, { from: e.target.value })}>
                      {pIds.map((id) => <option key={id}>{id}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-[var(--text-muted)]">To</span>
                    <select className="bg-[var(--bg-surface)] border border-[var(--border)] rounded px-1 py-0.5 text-xs text-[var(--text-primary)]"
                      value={m.to} onChange={(e) => updateMessage(i, { to: e.target.value })}>
                      {pIds.map((id) => <option key={id}>{id}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-[var(--text-muted)]">Arrow</span>
                    <select className="bg-[var(--bg-surface)] border border-[var(--border)] rounded px-1 py-0.5 text-xs font-mono text-[var(--text-primary)]"
                      value={m.arrow} onChange={(e) => updateMessage(i, { arrow: e.target.value })}>
                      {ARROWS.map((a) => <option key={a}>{a}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-[var(--text-muted)]">Label</span>
                    <input className="bg-[var(--bg-surface)] border border-[var(--border)] rounded px-1 py-0.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                      value={m.text} onChange={(e) => updateMessage(i, { text: e.target.value })} />
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
