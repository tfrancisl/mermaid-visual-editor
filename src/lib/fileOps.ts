/**
 * File I/O operations.
 *
 * Uses Tauri dialog + fs plugins when running as a desktop app.
 * Falls back to browser File API / anchor download for `bun run dev` without Tauri.
 */

import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

export interface OpenResult {
  path: string;
  content: string;
}

export async function openMmdFile(): Promise<OpenResult | null> {
  if (!isTauri) return openFileBrowser();

  const result = await open({
    filters: [{ name: "Mermaid Diagrams", extensions: ["mmd", "md", "txt"] }],
    multiple: false,
  });

  if (!result || Array.isArray(result)) return null;

  const content = await readTextFile(result);
  return { path: result, content };
}

export async function saveMmdFile(path: string, content: string): Promise<void> {
  if (!isTauri) {
    downloadText(content, basename(path));
    return;
  }
  await writeTextFile(path, content);
}

/** Opens a "save as" dialog and writes the file. Returns the chosen path, or null if cancelled. */
export async function saveMmdFileAs(content: string, suggestedName = "diagram.mmd"): Promise<string | null> {
  if (!isTauri) {
    downloadText(content, suggestedName);
    return null;
  }

  const path = await save({
    filters: [{ name: "Mermaid Diagrams", extensions: ["mmd"] }],
    defaultPath: suggestedName,
  });

  if (!path) return null;

  await writeTextFile(path, content);
  return path;
}

// ---------------------------------------------------------------------------
// Browser fallbacks (for `bun run dev` without Tauri)
// ---------------------------------------------------------------------------

function openFileBrowser(): Promise<OpenResult | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".mmd,.md,.txt";

    // Resolve null if dialog is dismissed without selecting a file
    window.addEventListener(
      "focus",
      () => setTimeout(() => { if (!input.files?.length) resolve(null); }, 400),
      { once: true }
    );

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = () => resolve({ path: file.name, content: reader.result as string });
      reader.readAsText(file);
    });

    input.click();
  });
}

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function basename(path: string): string {
  return path.split(/[/\\]/).pop() ?? path;
}
