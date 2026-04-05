import type { SequenceModel } from "../parsers/types";

export function serializeSequence(model: SequenceModel): string {
  const lines = ["sequenceDiagram"];
  for (const p of model.participants) {
    lines.push(`    ${p.kind} ${p.id}${p.alias ? ` as ${p.alias}` : ""}`);
  }
  for (const m of model.messages) {
    lines.push(`    ${m.from}${m.arrow}${m.to}: ${m.text}`);
  }
  return lines.join("\n");
}
