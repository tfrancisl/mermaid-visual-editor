import { useEffect } from "react";
import type { PaneVisibility } from "./usePaneVisibility";

interface KeyboardShortcutHandlers {
  openNewTab: (source: string) => void;
  handleOpen: () => void;
  handleSave: () => void;
  handleSaveAs: () => void;
  closeTab: (id: string) => void;
  togglePane: (key: keyof PaneVisibility) => void;
  setActiveTabId: (id: string) => void;
  setShowShortcuts: React.Dispatch<React.SetStateAction<boolean>>;
  tabsRef: React.RefObject<{ id: string }[]>;
  activeTabIdRef: React.RefObject<string>;
  defaultSource: string;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  useEffect(() => {
    const {
      openNewTab, handleOpen, handleSave, handleSaveAs,
      closeTab, togglePane, setActiveTabId, setShowShortcuts,
      tabsRef, activeTabIdRef, defaultSource,
    } = handlers;

    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in a plain input/select (except Monaco, which handles its own events)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      const mod = e.metaKey || e.ctrlKey;

      if (mod && !e.shiftKey && e.key === "n") {
        e.preventDefault();
        openNewTab(defaultSource);
        return;
      }
      if (mod && !e.shiftKey && e.key === "o") {
        e.preventDefault();
        handleOpen();
        return;
      }
      if (mod && !e.shiftKey && e.key === "s") {
        e.preventDefault();
        handleSave();
        return;
      }
      if (mod && e.shiftKey && e.key === "S") {
        e.preventDefault();
        handleSaveAs();
        return;
      }
      if (mod && !e.shiftKey && e.key === "w") {
        e.preventDefault();
        closeTab(activeTabIdRef.current!);
        return;
      }
      if (mod && !e.shiftKey && e.key === "Tab") {
        e.preventDefault();
        const t = tabsRef.current!;
        const idx = t.findIndex((x) => x.id === activeTabIdRef.current);
        setActiveTabId(t[(idx + 1) % t.length].id);
        return;
      }
      if (mod && e.shiftKey && e.key === "Tab") {
        e.preventDefault();
        const t = tabsRef.current!;
        const idx = t.findIndex((x) => x.id === activeTabIdRef.current);
        setActiveTabId(t[(idx - 1 + t.length) % t.length].id);
        return;
      }
      if (mod && !e.shiftKey && e.key === "1") {
        e.preventDefault();
        togglePane("visual");
        return;
      }
      if (mod && !e.shiftKey && e.key === "2") {
        e.preventDefault();
        togglePane("source");
        return;
      }
      if (mod && !e.shiftKey && e.key === "3") {
        e.preventDefault();
        togglePane("preview");
        return;
      }
      if (e.key === "?" && !mod && !e.altKey) {
        if (e.target instanceof Element && e.target.closest(".monaco-editor")) return;
        setShowShortcuts((s) => !s);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
