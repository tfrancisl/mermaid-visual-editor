import type { XYChartModel, XYSeries } from "./types";

export function parseXYChart(source: string): XYChartModel {
  const lines = source.split("\n");
  let title: string | undefined;
  let xLabels: string[] = [];
  let yLabel: string | undefined;
  let yMin: number | undefined, yMax: number | undefined;
  const series: XYSeries[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%")) continue;

    const tm = line.match(/^title\s+"(.+)"$/);
    if (tm) { title = tm[1]; continue; }

    const xm = line.match(/^x-axis\s+\[(.+)\]$/);
    if (xm) { xLabels = xm[1].split(",").map((s) => s.trim()); continue; }

    const ym = line.match(/^y-axis\s+"(.+?)"\s+(\d+)\s*-->\s*(\d+)$/);
    if (ym) { yLabel = ym[1]; yMin = Number(ym[2]); yMax = Number(ym[3]); continue; }

    // bar or line: bar [1, 2, 3]
    const sm = line.match(/^(bar|line)\s+\[(.+)\]$/);
    if (sm) {
      series.push({
        kind: sm[1] as "bar" | "line",
        data: sm[2].split(",").map((s) => Number(s.trim())),
      });
    }
  }

  return { type: "xychart-beta", title, xLabels, yLabel, yMin, yMax, series, rawLines: lines };
}
