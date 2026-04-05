import { useState, useCallback, useRef, useEffect } from "react";
import type { CursorPosition } from "../components/Editor";
import type { ParseError } from "../components/Preview";
import { detectDiagramType } from "../lib/parsers";
import { saveMmdFile } from "../lib/fileOps";
import { basename } from "../lib/fileOps";
import { getTemplate } from "../lib/templates";

// ---------------------------------------------------------------------------
// Tab model
// ---------------------------------------------------------------------------

export interface Tab {
  id: string;
  filePath: string | null;
  watchedPath: string | null;
  source: string;
  unsaved: boolean;
}

export function makeTab(source: string, filePath: string | null = null, watchedPath: string | null = null): Tab {
  return { id: crypto.randomUUID(), filePath, watchedPath, source, unsaved: false };
}

export const DEFAULT_SOURCE = getTemplate("flowchart");

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTabManager() {
  const [tabs, setTabs] = useState<Tab[]>(() => [makeTab(DEFAULT_SOURCE)]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);
  const [cursor, setCursor] = useState<CursorPosition>({ line: 1, col: 1 });
  const [parseError, setParseError] = useState<ParseError | null>(null);

  // Stable refs for keyboard handler
  const tabsRef = useRef(tabs);
  const activeTabIdRef = useRef(activeTabId);
  useEffect(() => { tabsRef.current = tabs; }, [tabs]);
  useEffect(() => { activeTabIdRef.current = activeTabId; }, [activeTabId]);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const diagramType = detectDiagramType(activeTab.source);
  const displayName = activeTab.filePath ? basename(activeTab.filePath) : "untitled.mmd";

  function patchTab(id: string, patch: Partial<Tab>) {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function activateTab(id: string) {
    setActiveTabId(id);
    setCursor({ line: 1, col: 1 });
    setParseError(null);
  }

  async function closeTab(id: string) {
    const tab = tabsRef.current.find((t) => t.id === id);
    if (!tab) return;

    // Autosave if the tab has a known file path
    if (tab.unsaved && tab.filePath) {
      await saveMmdFile(tab.filePath, tab.source).catch(() => {});
    }

    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) {
        // Always keep at least one tab
        const fresh = makeTab(DEFAULT_SOURCE);
        setActiveTabId(fresh.id);
        return [fresh];
      }
      if (activeTabIdRef.current === id) {
        const idx = prev.findIndex((t) => t.id === id);
        const fallback = next[Math.max(0, idx - 1)];
        setActiveTabId(fallback.id);
      }
      return next;
    });
  }

  function openNewTab(source: string, filePath: string | null = null) {
    const tab = makeTab(source, filePath);
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
    setCursor({ line: 1, col: 1 });
    return tab;
  }

  const handleSourceChange = useCallback((value: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabIdRef.current ? { ...t, source: value, unsaved: true } : t))
    );
  }, []);

  return {
    tabs, setTabs,
    activeTabId, setActiveTabId,
    activeTab, diagramType, displayName,
    cursor, setCursor,
    parseError, setParseError,
    tabsRef, activeTabIdRef,
    patchTab, activateTab, closeTab, openNewTab,
    handleSourceChange,
  };
}
