import type { JourneyModel, JourneySection } from "./types";

export function parseJourney(source: string): JourneyModel {
  const lines = source.split("\n");
  let title: string | undefined;
  const sections: JourneySection[] = [];
  let cur: JourneySection | null = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%")) continue;
    if (line.startsWith("title ")) { title = line.slice(6).trim(); continue; }
    if (line.startsWith("section ")) {
      cur = { name: line.slice(8).trim(), tasks: [] };
      sections.push(cur);
      continue;
    }
    if (!cur) { cur = { name: "", tasks: [] }; sections.push(cur); }

    // Task: Name: score: Actor1, Actor2
    const tm = line.match(/^(.+?):\s*(\d+)\s*(?::\s*(.+))?$/);
    if (tm) {
      cur.tasks.push({
        name: tm[1].trim(),
        score: Number(tm[2]),
        actors: tm[3] ? tm[3].split(",").map((a) => a.trim()) : [],
      });
    }
  }

  return { type: "journey", title, sections, rawLines: lines };
}
