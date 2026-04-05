import type { SequenceModel, SequenceParticipant } from "./types";

export function parseSequence(source: string): SequenceModel {
  const lines = source.split("\n");
  const participants: SequenceParticipant[] = [];
  const messages: SequenceModel["messages"] = [];
  const seen = new Set<string>();

  const addParticipant = (id: string, kind: "participant" | "actor" = "participant") => {
    if (!seen.has(id)) { seen.add(id); participants.push({ id, kind }); }
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%")) continue;

    const pm = line.match(/^(participant|actor)\s+(\S+)(?:\s+as\s+(.+))?$/);
    if (pm) {
      const id = pm[2];
      seen.add(id);
      participants.push({ id, alias: pm[3]?.trim(), kind: pm[1] as "participant" | "actor" });
      continue;
    }

    // Messages: A->>B: text  or  A -->> B: text
    const mm = line.match(/^(\w+)\s*(--?>>?|--?[xo)])\s*(\w+)\s*:\s*(.*)$/);
    if (mm) {
      addParticipant(mm[1]);
      addParticipant(mm[3]);
      messages.push({ from: mm[1], to: mm[3], arrow: mm[2], text: mm[4].trim() });
    }
  }

  return { type: "sequenceDiagram", participants, messages, rawLines: lines };
}
