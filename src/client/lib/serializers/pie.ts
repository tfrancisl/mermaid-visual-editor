import type { PieModel } from "../parsers/types";

export function serializePie(model: PieModel): string {
  const lines = [`pie${model.showData ? " showData" : ""}`];
  if (model.title) lines.push(`    title ${model.title}`);
  for (const s of model.slices) lines.push(`    "${s.label}" : ${s.value}`);
  return lines.join("\n");
}
