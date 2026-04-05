import type { GitGraphModel, GitCommand } from "./types";

export function parseGitGraph(source: string): GitGraphModel {
  const lines = source.split("\n");
  const commands: GitCommand[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%")) continue;

    if (line === "commit") { commands.push({ action: "commit" }); continue; }
    const cm = line.match(/^commit\s+(?:id:\s*"([^"]+)")?\s*(?:tag:\s*"([^"]+)")?/);
    if (cm) { commands.push({ action: "commit", id: cm[1], tag: cm[2] }); continue; }

    const bm = line.match(/^branch\s+(\S+)/);
    if (bm) { commands.push({ action: "branch", value: bm[1] }); continue; }

    const chm = line.match(/^checkout\s+(\S+)/);
    if (chm) { commands.push({ action: "checkout", value: chm[1] }); continue; }

    const mm = line.match(/^merge\s+(\S+)/);
    if (mm) { commands.push({ action: "merge", value: mm[1] }); continue; }

    const cp = line.match(/^cherry-pick\s+id:\s*"([^"]+)"/);
    if (cp) { commands.push({ action: "cherry-pick", id: cp[1] }); continue; }
  }

  return { type: "gitGraph", commands, rawLines: lines };
}
