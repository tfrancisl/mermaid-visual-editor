# Developer Guide — Mermaid Visual Editor

> Onboarding reference for contributors. See `architecture.md` for design background.

---

## 1. Quick Start

**Prerequisites:** [Nix](https://nixos.org/) with flakes enabled. Nothing else needs to be installed globally.

```sh
# 1. Enter the dev shell (provides Rust, cargo-tauri, Node, bun, jj, WebKit2GTK, etc.)
nix develop

# 2. Install JS dependencies
bun install

# 3. Start the Tauri dev server (hot-reload frontend + live Rust rebuild on backend changes)
cargo tauri dev
```

The app window opens automatically. The Vite dev server runs at `http://localhost:5173`.

---

## 2. Project Structure

```
mermaid-visual-editor/
├── flake.nix                    # Nix dev shell — all tool dependencies declared here
├── package.json                 # JS dependencies (React, Monaco, React Flow, mermaid.js)
├── vite.config.ts               # Vite build config
├── tsconfig.json                # TypeScript config
├── index.html                   # HTML entry point
│
├── src/
│   ├── main.tsx                 # React entry — mounts <App />, imports React Flow CSS
│   ├── index.css                # Global styles (Tailwind + CSS variables + utility classes)
│   ├── App.tsx                  # Root component: tabs, panels, toolbar, status bar, shortcuts
│   │
│   ├── components/
│   │   ├── Editor/index.tsx     # Monaco Editor with custom Mermaid syntax + Catppuccin theme
│   │   ├── Preview/index.tsx    # Mermaid.js SVG renderer, debounced 300 ms
│   │   ├── Canvas/
│   │   │   ├── index.tsx        # Canvas dispatcher — routes to the correct editor by diagram type
│   │   │   ├── FlowchartCanvas.tsx  # React Flow visual editor for flowchart/graph
│   │   │   ├── SequenceEditor.tsx   # Form-based editor for sequence diagrams
│   │   │   ├── GanttEditor.tsx      # Form-based editor for Gantt charts
│   │   │   └── PieEditor.tsx        # Form-based editor for pie charts
│   │   ├── Resizable/index.tsx  # Draggable split-pane; persists ratio in localStorage
│   │   └── DiagramTypePicker/index.tsx  # Popover for switching diagram type
│   │
│   └── lib/
│       ├── buffer.ts            # ChangeBuffer — accumulates mutations, flushes on demand
│       ├── fileOps.ts           # open/save with Tauri dialog + browser fallback
│       ├── layout.ts            # BFS layered layout for flowchart nodes
│       ├── parsers/index.ts     # parse() + detectDiagramType() → DiagramModel union
│       ├── serializers/index.ts # serialize(DiagramModel) → Mermaid source string
│       └── templates.ts         # Starter diagram source per type
│
├── src-tauri/
│   ├── tauri.conf.json          # App config: window size, bundle ID, devUrl
│   ├── Cargo.toml               # Rust deps (tauri, base64, serde)
│   └── src/
│       ├── main.rs              # Binary entry point
│       └── lib.rs               # Tauri builder + IPC command handlers
│       capabilities/
│       └── default.json         # Tauri v2 permission declarations
│
└── docs/
    ├── architecture.md          # Design overview and buffered sync model
    ├── toolchain-decision.md    # ADR: why Tauri over Electron / web
    └── dev-guide.md             # This file
```

---

## 3. Architecture

### Panel Modes

The app has three panel modes toggled from the toolbar (or `⌘\``):

| Mode | Left pane | Right pane |
|------|-----------|------------|
| **Editor** | Monaco text editor | Mermaid.js live preview |
| **Canvas** | Visual editor (React Flow or form) | Monaco source (read/edit) |
| **Preview** | — | Full-screen Mermaid.js preview |

Both panes in Editor/Canvas are resizable via the `Resizable` splitter.

### Buffered Sync Model

**Text → Canvas** (debounced ~300 ms):
1. User edits in Monaco → `source` state updates in `App`
2. Canvas component receives new `source` prop
3. `parse(source)` → `DiagramModel` → React Flow nodes/edges (or form state)

**Canvas → Text** (auto-sync 1.5 s, or immediate with `⌘Enter`):
1. User drags/adds/deletes on canvas → nodes/edges state changes
2. `useEffect([nodes, edges])` debounces 1.5 s, then calls `serialize(model)`
3. `onSourceChange(newSource)` bubbles up to `App` → Monaco updates
4. `ownUpdateRef` prevents the resulting `source` prop change from triggering a re-parse

### Tauri IPC

Rust commands are invoked via `invoke("command_name", { ...args })` from the frontend. Current commands:

| Command | Args | Returns |
|---------|------|---------|
| `open_file` | `{ path }` | `string` (file contents) |
| `save_file` | `{ path, content }` | — |
| `export_diagram` | `{ source, format }` | `string` (base64 PNG or PDF) |

Permissions are declared in `src-tauri/capabilities/default.json`.

---

## 4. Adding a New Diagram Type

Follow these steps to add support for a new Mermaid diagram type (e.g. `classDiagram`):

1. **Register the type** — Add an entry to the `DIAGRAM_TYPES` array in `src/lib/templates.ts`:
   ```ts
   { id: "classDiagram", label: "Class", icon: "⬡" }
   ```

2. **Add a starter template** — Add a `case "classDiagram":` branch in `getTemplate()` in the same file returning valid Mermaid source.

3. **Add a parser** — In `src/lib/parsers/index.ts`, add a `parseClassDiagram(lines)` function and wire it into `parse()`. Export any new model type and add it to the `DiagramModel` union.

4. **Add a serializer** — In `src/lib/serializers/index.ts`, add a `serializeClassDiagram(model)` function and wire it into the `serialize()` dispatcher.

5. **Add a form/canvas editor** — Create `src/components/Canvas/ClassDiagramEditor.tsx`. The component receives `{ source, onSourceChange }`. Use the `ownUpdateRef` pattern (see §5) to avoid re-parse cycles.

6. **Register in the Canvas dispatcher** — In `src/components/Canvas/index.tsx`, add a branch:
   ```tsx
   if (diagramType === "classDiagram") return <ClassDiagramEditor ... />;
   ```

7. **Test round-trip** — Open the Canvas panel, make a change, and verify the Monaco source updates correctly after the 1.5 s debounce.

---

## 5. Canvas Sync Loop

The two refs that prevent infinite re-parse cycles:

### `suppressSyncRef`

Set to `true` immediately before `setNodes`/`setEdges` in the source→canvas direction. The canvas→source `useEffect` checks this ref on its first run after a prop update: if set, it clears it and returns early (skipping the debounce/serialize). This prevents a text edit from immediately triggering a re-serialize.

### `ownUpdateRef`

Set to `true` immediately before calling `onSourceChange(newSource)` in the canvas→source direction. The source→canvas `useEffect` checks this ref on its first run after `source` prop changes: if set, it clears it and returns early (skipping re-parse). This prevents a canvas edit from triggering a re-parse of the source it just generated.

**The invariant:** Every `setNodes`/`setEdges` that originates from a prop update must set `suppressSyncRef`. Every `onSourceChange` that originates from canvas interaction must set `ownUpdateRef`.

---

## 6. Keyboard Shortcuts

### How the stable-refs pattern works

`App.tsx` registers a single `keydown` listener in a `useEffect([], [])` (empty deps). To avoid stale closures, mutable state is accessed through refs that are kept in sync:

```ts
const tabsRef = useRef(tabs);
useEffect(() => { tabsRef.current = tabs; }, [tabs]);
```

The handler reads `tabsRef.current`, `activeTabIdRef.current`, etc. rather than closing over the state variables directly.

### Adding a new shortcut

1. Add the handler logic inside the `handler` function in the keyboard `useEffect` in `App.tsx`.
2. Use the `mod` variable (`e.metaKey || e.ctrlKey`) for cross-platform `⌘/Ctrl` shortcuts.
3. Call `e.preventDefault()` if the key combination has a browser default.
4. Add the shortcut to the `SHORTCUTS` constant (rendered in `ShortcutsOverlay`).

Canvas-specific shortcuts (e.g. `⌘Enter` to sync) belong in the canvas component's own `useEffect` handler, not in `App.tsx`.

---

## 7. Build & Release

```sh
# Production build (creates platform-native installer in src-tauri/target/release/bundle/)
cargo tauri build
```

**App icons:** Generate all required sizes from a single 1024×1024 PNG:
```sh
cargo tauri icon path/to/icon.png
```

**Export formats:**
- **SVG** — generated client-side from the live Mermaid.js render; instant, no external deps.
- **PNG / PDF** — invokes `mmdc` (Mermaid CLI) as a subprocess from Rust. `mmdc` must be on `$PATH` (provided automatically in the Nix dev shell; bundle it for distribution).

**Cross-platform CI:** Use the official `tauri-action` GitHub Action to build for Linux, macOS, and Windows in parallel.
