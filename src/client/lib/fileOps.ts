/**
 * File I/O operations.
 *
 * Uses server API when available for save-to-known-path.
 * Falls back to browser File API / anchor download otherwise.
 */

import { hasServer, saveFile } from "./api";

export interface OpenResult {
  path: string;
  content: string;
}

export async function openMmdFile(): Promise<OpenResult | null> {
  return openFileBrowser();
}

export async function saveMmdFile(path: string, content: string): Promise<void> {
  // If server is available and path looks like a real FS path, save via server
  if (path.includes("/") && await hasServer()) {
    await saveFile(path, content);
    return;
  }
  downloadText(content, basename(path));
}

/** Browser download fallback for "save as". Returns null (no path from browser download). */
export async function saveMmdFileAs(content: string, suggestedName = "diagram.mmd"): Promise<string | null> {
  downloadText(content, suggestedName);
  return null;
}

// ---------------------------------------------------------------------------
// Browser fallbacks
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
