import { useState } from "react";

export interface PaneVisibility {
  visual: boolean;
  source: boolean;
  preview: boolean;
}

const PANE_STORAGE_KEY = "pane-visibility";

function loadPaneVisibility(): PaneVisibility {
  try {
    const raw = localStorage.getItem(PANE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { visual: !!parsed.visual, source: !!parsed.source, preview: !!parsed.preview };
    }
  } catch { /* ignore */ }
  return { visual: true, source: true, preview: false };
}

function savePaneVisibility(v: PaneVisibility) {
  localStorage.setItem(PANE_STORAGE_KEY, JSON.stringify(v));
}

export function usePaneVisibility() {
  const [panes, setPanes] = useState<PaneVisibility>(loadPaneVisibility);

  function togglePane(key: keyof PaneVisibility) {
    setPanes((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Don't allow all panes to be hidden — keep at least one
      if (!next.visual && !next.source && !next.preview) return prev;
      savePaneVisibility(next);
      return next;
    });
  }

  return { panes, togglePane };
}
