import { useState } from "react";
import { exportDiagram } from "../lib/api";
import mermaid from "mermaid";

type ExportFormat = "png" | "pdf";

let exportIdCounter = 0;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function useExport(activeSource: string, displayName: string) {
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleExportSVG() {
    const trimmed = activeSource.trim();
    if (!trimmed) return;
    try {
      const { svg } = await mermaid.render(`export-svg-${++exportIdCounter}`, trimmed);
      downloadBlob(new Blob([svg], { type: "image/svg+xml" }), displayName.replace(/\.\w+$/, "") + ".svg");
    } catch {
      // Source is likely invalid — nothing to export
    }
  }

  async function handleExportBinary(format: ExportFormat) {
    setExportingFormat(format);
    setExportError(null);
    try {
      const blob = await exportDiagram(activeSource, format);
      downloadBlob(blob, displayName.replace(/\.\w+$/, "") + "." + format);
    } catch (err) {
      setExportError(String(err));
    } finally {
      setExportingFormat(null);
    }
  }

  return {
    exportingFormat,
    exportError,
    setExportError,
    handleExportSVG,
    handleExportBinary,
  };
}

export type { ExportFormat };
