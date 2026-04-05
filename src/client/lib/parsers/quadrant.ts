import type { QuadrantModel, QuadrantPoint } from "./types";

export function parseQuadrant(source: string): QuadrantModel {
  const lines = source.split("\n");
  let title: string | undefined;
  let xAxisLeft: string | undefined, xAxisRight: string | undefined;
  let yAxisBottom: string | undefined, yAxisTop: string | undefined;
  let quadrant1: string | undefined, quadrant2: string | undefined;
  let quadrant3: string | undefined, quadrant4: string | undefined;
  const points: QuadrantPoint[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%")) continue;

    if (line.startsWith("title ")) { title = line.slice(6).trim(); continue; }

    const xm = line.match(/^x-axis\s+"?(.+?)"?\s*-->\s*"?(.+?)"?\s*$/);
    if (xm) { xAxisLeft = xm[1]; xAxisRight = xm[2]; continue; }

    const ym = line.match(/^y-axis\s+"?(.+?)"?\s*-->\s*"?(.+?)"?\s*$/);
    if (ym) { yAxisBottom = ym[1]; yAxisTop = ym[2]; continue; }

    if (line.startsWith("quadrant-1 ")) { quadrant1 = line.slice(11).trim(); continue; }
    if (line.startsWith("quadrant-2 ")) { quadrant2 = line.slice(11).trim(); continue; }
    if (line.startsWith("quadrant-3 ")) { quadrant3 = line.slice(11).trim(); continue; }
    if (line.startsWith("quadrant-4 ")) { quadrant4 = line.slice(11).trim(); continue; }

    // Point: Label: [x, y]
    const pm = line.match(/^(.+?):\s*\[\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\]$/);
    if (pm) {
      points.push({ label: pm[1].trim(), x: Number(pm[2]), y: Number(pm[3]) });
    }
  }

  return {
    type: "quadrantChart", title,
    xAxisLeft, xAxisRight, yAxisBottom, yAxisTop,
    quadrant1, quadrant2, quadrant3, quadrant4,
    points, rawLines: lines,
  };
}
