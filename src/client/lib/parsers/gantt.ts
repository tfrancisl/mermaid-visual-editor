import type { GanttModel, GanttSection, GanttTask } from "./types";

export function parseGantt(source: string): GanttModel {
  const lines = source.split("\n");
  let title: string | undefined;
  let dateFormat: string | undefined;
  const sections: GanttSection[] = [];
  let cur: GanttSection | null = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%")) continue;
    if (line.startsWith("title ")) { title = line.slice(6).trim(); continue; }
    if (line.startsWith("dateFormat ")) { dateFormat = line.slice(11).trim(); continue; }
    if (line.startsWith("axisFormat ") || line.startsWith("excludes ") || line.startsWith("todayMarker ")) continue;
    if (line.startsWith("section ")) {
      cur = { name: line.slice(8).trim(), tasks: [] };
      sections.push(cur);
      continue;
    }
    if (!cur) { cur = { name: "", tasks: [] }; sections.push(cur); }

    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const label = line.slice(0, colon).trim();
    const parts = line.slice(colon + 1).split(",").map((p) => p.trim());
    const task: GanttTask = { label };
    for (const p of parts) {
      if (["done", "active", "crit", "milestone"].includes(p))
        task.status = p as GanttTask["status"];
      else if (/^\d{4}-\d{2}-\d{2}/.test(p) && !task.start) task.start = p;
      else if (/^\d+[dwhm]$/.test(p)) task.duration = p;
      else if (p && !task.id) task.id = p;
    }
    cur.tasks.push(task);
  }

  return { type: "gantt", title, dateFormat, sections, rawLines: lines };
}
