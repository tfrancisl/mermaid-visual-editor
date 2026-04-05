import type { PieModel, PieSlice } from "./types";

export function parsePie(source: string): PieModel {
  const lines = source.split("\n");
  let title: string | undefined;
  let showData = false;
  const slices: PieSlice[] = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("%%")) continue;
    if (t.startsWith("pie")) { showData = t.includes("showData"); continue; }
    if (t.startsWith("title ")) { title = t.slice(6).trim(); continue; }
    const m = t.match(/^"([^"]+)"\s*:\s*(\d+(?:\.\d+)?)/);
    if (m) slices.push({ label: m[1], value: Number(m[2]) });
  }

  return { type: "pie", title, showData, slices, rawLines: lines };
}
