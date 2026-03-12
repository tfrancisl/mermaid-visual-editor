import { useState, useCallback, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import mermaid from "mermaid";
import Editor, { type CursorPosition } from "./components/Editor";
import Canvas from "./components/Canvas";
import Resizable from "./components/Resizable";
import DiagramTypePicker from "./components/DiagramTypePicker";
import { detectDiagramType } from "./lib/parsers";
import { openMmdFile, saveMmdFile, saveMmdFileAs, basename } from "./lib/fileOps";
import { getTemplate } from "./lib/templates";

// Initialize mermaid for on-demand SVG export
mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
});

// ---------------------------------------------------------------------------
// Tab model
// ---------------------------------------------------------------------------

interface Tab {
  id: string;
  filePath: string | null;
  source: string;
  unsaved: boolean;
}

function makeTab(source: string, filePath: string | null = null): Tab {
  return { id: crypto.randomUUID(), filePath, source, unsaved: false };
}

const DEFAULT_SOURCE = getTemplate("flowchart");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExportFormat = "png" | "pdf";

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

let exportIdCounter = 0;

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>(() => [makeTab(DEFAULT_SOURCE)]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);
  const [cursor, setCursor] = useState<CursorPosition>({ line: 1, col: 1 });
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Diagram type picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"new-tab" | "switch">("new-tab");
  const [pickerAnchor, setPickerAnchor] = useState<DOMRect | undefined>();

  // Shortcuts overlay
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Stable refs for keyboard handler
  const tabsRef = useRef(tabs);
  const activeTabIdRef = useRef(activeTabId);
  useEffect(() => { tabsRef.current = tabs; }, [tabs]);
  useEffect(() => { activeTabIdRef.current = activeTabId; }, [activeTabId]);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const diagramType = detectDiagramType(activeTab.source);
  const displayName = activeTab.filePath ? basename(activeTab.filePath) : "untitled.mmd";

  // ---------------------------------------------------------------------------
  // Tab management
  // ---------------------------------------------------------------------------

  function patchTab(id: string, patch: Partial<Tab>) {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function activateTab(id: string) {
    setActiveTabId(id);
    setCursor({ line: 1, col: 1 });
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

  // ---------------------------------------------------------------------------
  // File operations
  // ---------------------------------------------------------------------------

  async function handleOpen() {
    const result = await openMmdFile();
    if (!result) return;
    openNewTab(result.content, result.path);
  }

  async function handleSave() {
    const tab = tabsRef.current.find((t) => t.id === activeTabIdRef.current) ?? tabsRef.current[0];
    if (!tab.filePath) { await handleSaveAs(); return; }
    await saveMmdFile(tab.filePath, tab.source);
    patchTab(tab.id, { unsaved: false });
  }

  async function handleSaveAs() {
    const tab = tabsRef.current.find((t) => t.id === activeTabIdRef.current) ?? tabsRef.current[0];
    const path = await saveMmdFileAs(tab.source, tab.filePath ? basename(tab.filePath) : "diagram.mmd");
    if (path) patchTab(tab.id, { filePath: path, unsaved: false });
  }

  // ---------------------------------------------------------------------------
  // Source changes
  // ---------------------------------------------------------------------------

  const handleSourceChange = useCallback((value: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabIdRef.current ? { ...t, source: value, unsaved: true } : t))
    );
  }, []);

  // ---------------------------------------------------------------------------
  // Diagram type picker
  // ---------------------------------------------------------------------------

  function openPickerForNewTab(e: React.MouseEvent) {
    setPickerMode("new-tab");
    setPickerAnchor((e.currentTarget as HTMLElement).getBoundingClientRect());
    setPickerOpen(true);
  }

  function openPickerForSwitch(e: React.MouseEvent) {
    setPickerMode("switch");
    setPickerAnchor((e.currentTarget as HTMLElement).getBoundingClientRect());
    setPickerOpen(true);
  }

  function handleTypeSelected(type: string) {
    const source = getTemplate(type);
    const tab = tabsRef.current.find((t) => t.id === activeTabIdRef.current) ?? tabsRef.current[0];
    const isFreshUntitled = !tab.filePath && !tab.unsaved;
    const isEmpty = tab.source.trim() === "";

    if (pickerMode === "new-tab") {
      openNewTab(source);
    } else {
      // "switch" mode: replace if untitled+fresh or empty, else open new tab
      if (isFreshUntitled || isEmpty) {
        patchTab(tab.id, { source, unsaved: false });
      } else {
        openNewTab(source);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  async function handleExportSVG() {
    const trimmed = activeTab.source.trim();
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
      const b64 = await invoke<string>("export_diagram", {
        source: activeTab.source,
        format,
      });
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const mime = format === "png" ? "image/png" : "application/pdf";
      downloadBlob(new Blob([bytes], { type: mime }), displayName.replace(/\.\w+$/, "") + "." + format);
    } catch (err) {
      setExportError(String(err));
    } finally {
      setExportingFormat(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in a plain input/select (except Monaco, which handles its own events)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      const mod = e.metaKey || e.ctrlKey;

      if (mod && !e.shiftKey && e.key === "n") {
        e.preventDefault();
        openNewTab(DEFAULT_SOURCE);
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
        closeTab(activeTabIdRef.current);
        return;
      }
      if (mod && !e.shiftKey && e.key === "Tab") {
        e.preventDefault();
        const t = tabsRef.current;
        const idx = t.findIndex((x) => x.id === activeTabIdRef.current);
        setActiveTabId(t[(idx + 1) % t.length].id);
        return;
      }
      if (mod && e.shiftKey && e.key === "Tab") {
        e.preventDefault();
        const t = tabsRef.current;
        const idx = t.findIndex((x) => x.id === activeTabIdRef.current);
        setActiveTabId(t[(idx - 1 + t.length) % t.length].id);
        return;
      }
      if (e.key === "?" && !mod && !e.altKey) {
        if (e.target instanceof Element && e.target.closest(".monaco-editor")) return;
        setShowShortcuts((s) => !s);
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Toolbar
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onExportSVG={handleExportSVG}
        onExportBinary={handleExportBinary}
        exportingFormat={exportingFormat}
        exportError={exportError}
        onClearExportError={() => setExportError(null)}
      />
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onActivate={activateTab}
        onClose={closeTab}
        onNewTab={openPickerForNewTab}
      />

      <main className="flex flex-1 min-h-0 overflow-hidden">
        <Resizable defaultRatio={0.6} storageKey="split" className="flex-1">
          <Canvas source={activeTab.source} onSourceChange={handleSourceChange} />
          <SourcePane key={activeTab.id} source={activeTab.source} onChange={handleSourceChange} onCursorChange={setCursor} />
        </Resizable>
      </main>

      <StatusBar
        cursor={cursor}
        diagramType={diagramType}
        unsaved={activeTab.unsaved}
        onTypeClick={openPickerForSwitch}
        onShortcutsClick={() => setShowShortcuts((s) => !s)}
      />

      {pickerOpen && (
        <DiagramTypePicker
          currentType={diagramType}
          anchorRect={pickerAnchor}
          onSelect={handleTypeSelected}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {showShortcuts && <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Source editor pane (right side)
// ---------------------------------------------------------------------------

function SourcePane({ source, onChange, onCursorChange }: {
  source: string; onChange: (v: string) => void; onCursorChange: (p: CursorPosition) => void;
}) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center px-3 py-1.5 bg-[var(--bg-secondary)] border-b border-[var(--border)] shrink-0">
        <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Source</span>
      </div>
      <div className="flex-1 min-h-0">
        <Editor value={source} onChange={onChange} onCursorChange={onCursorChange} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

function Toolbar({
  onOpen, onSave, onSaveAs,
  onExportSVG, onExportBinary, exportingFormat, exportError, onClearExportError,
}: {
  onOpen: () => void; onSave: () => void; onSaveAs: () => void;
  onExportSVG: () => void; onExportBinary: (f: ExportFormat) => void;
  exportingFormat: ExportFormat | null; exportError: string | null;
  onClearExportError: () => void;
}) {
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <header className="flex items-center gap-1 px-2 py-1.5 bg-[var(--bg-secondary)] border-b border-[var(--border)] shrink-0 relative z-10">
      <TBtn onClick={onOpen}    label="Open..."    kbd="Ctrl+O" />
      <TBtn onClick={onSave}    label="Save"     kbd="Ctrl+S" />
      <TBtn onClick={onSaveAs}  label="Save As..." kbd="Ctrl+Shift+S" />
      <Divider />

      <div className="relative">
        <TBtn onClick={() => { setExportOpen((o) => !o); onClearExportError(); }} label="Export &#x25BE;" />
        {exportOpen && (
          <>
            <div className="fixed inset-0" onClick={() => setExportOpen(false)} />
            <div className="absolute left-0 top-full mt-1 w-52 bg-[var(--bg-secondary)] border border-[var(--border)] rounded shadow-lg py-1 z-20">
              {exportError && (
                <div className="px-3 py-1.5 text-[10px] text-red-400 border-b border-[var(--border)] mb-1 break-words">
                  {exportError}
                </div>
              )}
              <ExportItem label="SVG" sublabel="instant" spinning={false}
                onClick={() => { onExportSVG(); setExportOpen(false); }} />
              <ExportItem label="PNG" sublabel="via mmdc" spinning={exportingFormat === "png"}
                onClick={() => { onExportBinary("png"); setExportOpen(false); }} />
              <ExportItem label="PDF" sublabel="via mmdc" spinning={exportingFormat === "pdf"}
                onClick={() => { onExportBinary("pdf"); setExportOpen(false); }} />
            </div>
          </>
        )}
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Tab bar
// ---------------------------------------------------------------------------

function TabBar({ tabs, activeTabId, onActivate, onClose, onNewTab }: {
  tabs: Tab[]; activeTabId: string;
  onActivate: (id: string) => void; onClose: (id: string) => void;
  onNewTab: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="flex items-end px-1 bg-[var(--bg-secondary)] border-b border-[var(--border)] shrink-0 overflow-x-auto">
      {tabs.map((tab) => {
        const name = tab.filePath ? basename(tab.filePath) : "untitled.mmd";
        const active = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => onActivate(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs shrink-0 cursor-pointer border-t border-l border-r rounded-t select-none transition-colors ${
              active
                ? "bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-primary)]"
                : "bg-transparent border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
            }`}
          >
            {tab.unsaved && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />}
            <span>{name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
              className="opacity-50 hover:opacity-100 hover:text-red-400 transition-opacity ml-0.5"
            >&times;</button>
          </div>
        );
      })}

      {/* New tab button - opens type picker */}
      <button
        onClick={onNewTab}
        className="px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-t transition-colors shrink-0 self-end mb-px"
        title="New tab - choose diagram type (Ctrl+N for flowchart)"
      >+</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status bar
// ---------------------------------------------------------------------------

function StatusBar({ cursor, diagramType, unsaved, onTypeClick, onShortcutsClick }: {
  cursor: CursorPosition; diagramType: string; unsaved: boolean;
  onTypeClick: (e: React.MouseEvent) => void; onShortcutsClick: () => void;
}) {
  return (
    <footer className="flex items-center gap-3 px-3 py-1 bg-[var(--bg-secondary)] border-t border-[var(--border)] shrink-0">
      <span className="text-xs text-[var(--text-primary)]">Ln {cursor.line}, Col {cursor.col}</span>
      <Sep />
      <button
        onClick={onTypeClick}
        className="text-xs text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors flex items-center gap-1"
        title="Switch diagram type"
      >
        &#x2B21; {diagramType} &#x25BE;
      </button>
      <Sep />
      <span className={`text-xs ${unsaved ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>
        {unsaved ? "&#x25CF; unsaved" : "saved"}
      </span>
      <button
        onClick={onShortcutsClick}
        className="ml-auto text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        title="Keyboard shortcuts (?)"
      >?</button>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Shortcuts overlay
// ---------------------------------------------------------------------------

const SHORTCUTS = [
  { group: "File", items: [
    { key: "Ctrl N",       desc: "New flowchart tab" },
    { key: "Ctrl O",       desc: "Open file" },
    { key: "Ctrl S",       desc: "Save" },
    { key: "Ctrl Shift S", desc: "Save As" },
    { key: "Ctrl W",       desc: "Close tab" },
  ]},
  { group: "Navigation", items: [
    { key: "Ctrl Tab",       desc: "Next tab" },
    { key: "Ctrl Shift Tab", desc: "Previous tab" },
  ]},
  { group: "Canvas", items: [
    { key: "Ctrl Enter", desc: "Sync canvas now" },
    { key: "Esc",        desc: "Return to Select tool" },
    { key: "Bksp / Del", desc: "Delete selected node / edge" },
  ]},
  { group: "Other", items: [
    { key: "?",         desc: "Toggle this panel" },
  ]},
];

function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed bottom-8 right-4 w-72 bg-[var(--bg-secondary)] border border-[var(--border)] rounded shadow-xl z-50 text-xs">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <span className="font-semibold text-[var(--text-primary)]">Keyboard Shortcuts</span>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">&times;</button>
      </div>
      <div className="p-3 flex flex-col gap-3 max-h-80 overflow-y-auto">
        {SHORTCUTS.map((group) => (
          <div key={group.group}>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-1">{group.group}</div>
            {group.items.map(({ key, desc }) => (
              <div key={key} className="flex items-center justify-between py-0.5">
                <span className="text-[var(--text-muted)]">{desc}</span>
                <kbd className="font-mono text-[10px] bg-[var(--bg-surface)] border border-[var(--border)] rounded px-1.5 py-0.5 text-[var(--text-primary)]">{key}</kbd>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tiny UI atoms
// ---------------------------------------------------------------------------

function TBtn({ onClick, label, kbd }: { onClick: () => void; label: string; kbd?: string }) {
  return (
    <button onClick={onClick} title={kbd}
      className="px-2.5 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded transition-colors">
      {label}
    </button>
  );
}

function ExportItem({ label, sublabel, spinning, onClick }: {
  label: string; sublabel: string; spinning: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-[var(--bg-surface)] text-[var(--text-primary)] transition-colors">
      <span>{label}</span>
      <span className={`text-[10px] ${spinning ? "text-[var(--accent)] animate-pulse" : "text-[var(--text-muted)]"}`}>
        {spinning ? "generating..." : sublabel}
      </span>
    </button>
  );
}

function Divider() { return <div className="w-px h-4 bg-[var(--border)] mx-1" />; }
function Sep() { return <span className="text-[var(--border)] text-xs">&#x2502;</span>; }
