/**
 * Server API client. Replaces Tauri IPC calls.
 *
 * When the server is not available (static-hosted mode), callers
 * fall back to browser-only behaviour.
 */

let serverAvailable: boolean | null = null;

export async function hasServer(): Promise<boolean> {
  if (serverAvailable !== null) return serverAvailable;
  try {
    const res = await fetch("/api/health", { method: "GET" });
    serverAvailable = res.ok;
  } catch {
    serverAvailable = false;
  }
  return serverAvailable;
}

export async function exportDiagram(
  source: string,
  format: string,
): Promise<Blob> {
  const res = await fetch("/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source, format }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Export failed (${res.status})`);
  }
  return res.blob();
}

export async function saveFile(
  path: string,
  content: string,
): Promise<void> {
  const res = await fetch("/api/file/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, content }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Save failed (${res.status})`);
  }
}

export async function readFile(path: string): Promise<string> {
  const res = await fetch(`/api/file/read?path=${encodeURIComponent(path)}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Read failed (${res.status})`);
  }
  return res.text();
}

export interface SessionFile {
  path: string;
  content: string;
}

export async function getSession(): Promise<{ files: SessionFile[] }> {
  const res = await fetch("/api/session");
  if (!res.ok) {
    return { files: [] };
  }
  return res.json();
}

/** Reset cached server availability (for testing). */
export function _resetCache() {
  serverAvailable = null;
}
