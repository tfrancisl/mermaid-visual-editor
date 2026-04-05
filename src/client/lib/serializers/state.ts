import type { StateModel } from "../parsers/types";

export function serializeState(model: StateModel): string {
  const lines = ["stateDiagram-v2"];

  // Emit state labels
  for (const s of model.states) {
    if (s.label) {
      lines.push(`    state "${s.label}" as ${s.id}`);
    }
    if (s.kind === "choice" || s.kind === "fork" || s.kind === "join") {
      lines.push(`    state ${s.id} <<${s.kind}>>`);
    }
  }

  for (const t of model.transitions) {
    const label = t.label ? ` : ${t.label}` : "";
    lines.push(`    ${t.source} --> ${t.target}${label}`);
  }

  return lines.join("\n");
}
