import type { GanttModel } from "../parsers/types";

export function serializeGantt(model: GanttModel): string {
  const lines = ["gantt"];
  if (model.title) lines.push(`    title ${model.title}`);
  if (model.dateFormat) lines.push(`    dateFormat ${model.dateFormat}`);
  for (const section of model.sections) {
    if (section.name) lines.push(`    section ${section.name}`);
    for (const task of section.tasks) {
      const parts: string[] = [];
      if (task.status) parts.push(task.status);
      if (task.id) parts.push(task.id);
      if (task.start) parts.push(task.start);
      if (task.duration) parts.push(task.duration);
      lines.push(`        ${task.label} :${parts.join(", ")}`);
    }
  }
  return lines.join("\n");
}
