import type { TimelineModel, TimelinePeriod } from "./types";

export function parseTimeline(source: string): TimelineModel {
  const lines = source.split("\n");
  let title: string | undefined;
  const periods: TimelinePeriod[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%")) continue;
    if (line.startsWith("title ")) { title = line.slice(6).trim(); continue; }
    if (line.startsWith("section ")) continue; // sections are optional grouping, skip

    // Period line: "2004 : Event" or continuation ": Event"
    const pm = line.match(/^(.+?)\s*:\s*(.+)$/);
    if (pm) {
      const time = pm[1].trim();
      const event = pm[2].trim();
      // Check if this is a continuation (same time period — starts with whitespace in original)
      if (periods.length > 0 && lines[i].match(/^\s{5,}/)) {
        // Continuation of previous period
        periods[periods.length - 1].events.push(event);
      } else {
        periods.push({ time, events: [event] });
      }
    }
  }

  return { type: "timeline", title, periods, rawLines: lines };
}
