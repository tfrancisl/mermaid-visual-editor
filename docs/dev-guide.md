# Developer Guide — Mermaid Visual Editor

> Onboarding reference for contributors. See `architecture.md` for design background.

---

## 1. Quick Start

**Prerequisites:** [Nix](https://nixos.org/) with flakes enabled. Nothing else needs to be installed globally.

```sh
# 1. Enter the dev shell (provides Rust, Node, bun, jj, mmdc)
nix develop

# 2. Install JS dependencies
bun install

# 3. Start the Vite frontend dev server (hot-reload, proxies /api and /ws to :3001)
bun run dev

# 4. In another terminal, start the Rust server
bun run dev:server
```

Open `http://localhost:5173` in your browser. The Vite dev server proxies API and WebSocket requests to the Rust server on port 3001.

---

## 2. Project Structure

```
mermaid-visual-editor/
├── flake.nix                    # Nix dev shell — all tool dependencies declared here
├── package.json                 # JS dependencies (React, Monaco, React Flow, mermaid.js)
├── Cargo.toml                   # Rust workspace (members: src/server)
├── vite.config.ts               # Vite build config + dev proxy
├── tsconfig.json                # TypeScript config
├── index.html                   # HTML entry point
│
├── src/
│   ├── client/                  # Frontend (React + TypeScript)
│   │   ├── main.tsx             # React entry — mounts <App />, imports React Flow CSS
│   │   ├── index.css            # Global styles (Tailwind + CSS variables + utility classes)
│   │   ├── App.tsx              # Root component: tabs, panels, toolbar, status bar, shortcuts
│   │   ├── components/
│   │   │   ├── Editor/index.tsx     # Monaco Editor with custom Mermaid syntax + Catppuccin theme
│   │   │   ├── Preview/index.tsx    # Mermaid.js SVG renderer, debounced 300 ms
│   │   │   ├── Canvas/
│   │   │   │   ├── index.tsx            # Canvas dispatcher — routes by diagram type
│   │   │   │   ├── FlowchartCanvas.tsx  # React Flow visual editor for flowchart/graph
│   │   │   │   ├── SequenceEditor.tsx   # Form-based editor for sequence diagrams
│   │   │   │   ├── GanttEditor.tsx      # Form-based editor for Gantt charts
│   │   │   │   └── PieEditor.tsx        # Form-based editor for pie charts
│   │   │   ├── Resizable/index.tsx      # Draggable split-pane; persists ratio in localStorage
│   │   │   └── DiagramTypePicker/index.tsx  # Popover for switching diagram type
│   │   └── lib/
│   │       ├── api.ts               # Server API client (export, file I/O, session)
│   │       ├── watchClient.ts       # WebSocket client for file watching
│   │       ├── fileOps.ts           # Open/save with server API + browser fallback
│   │       ├── layout.ts            # BFS layered layout for flowchart nodes
│   │       ├── parsers/index.ts     # parse() + detectDiagramType() → DiagramModel union
│   │       ├── serializers/index.ts # serialize(DiagramModel) → Mermaid source string
│   │       └── templates.ts         # Starter diagram source per type
│   │
│   └── server/                  # Backend (Rust + Axum)
│       ├── Cargo.toml           # Rust deps (axum, tokio, notify, rust-embed, clap)
│       └── src/
│           ├── main.rs          # CLI args, bind port, open browser
│           ├── lib.rs           # Public module exports
│           ├── routes.rs        # Router: /api/*, /ws, static fallback
│           ├── export.rs        # POST /api/export (mmdc subprocess)
│           ├── files.rs         # File read/write/session endpoints
│           ├── watch.rs         # notify + WebSocket file change push
│           └── state.rs         # Shared AppState (initial files, watched paths)
│
├── examples/
│   ├── flowchart.mmd            # All 8 node shapes + 4 edge styles + subgraphs
│   ├── sequence.mmd             # Participants, loops, alt/else, notes
│   ├── gantt.mmd                # Task statuses, sections, milestones
│   └── pie.mmd                  # showData flag + realistic breakdown
│
└── docs/
    ├── architecture.md          # Design overview and buffered sync model
    ├── component-graph.mmd      # System architecture as Mermaid flowchart
    ├── sync-loop.mmd            # Bidirectional sync sequence diagram
    └── dev-guide.md             # This file
```

---

## 3. Architecture

### Pane Modes

The app has three panes togglable from the toolbar (or `Ctrl+1/2/3`):

| Pane | Content |
|------|---------|
| **Visual** | Visual editor (React Flow or form) |
| **Source** | Monaco text editor |
| **Preview** | Mermaid.js live SVG preview |

All visible panes are arranged in a resizable split via the `Resizable` splitter. At least one pane must be visible.

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

### Server API

The Rust server provides HTTP endpoints and WebSocket file watching:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Server availability check |
| `/api/export` | POST | Export diagram via mmdc (PNG/PDF/SVG) |
| `/api/file/save` | POST | Write file to disk |
| `/api/file/read` | GET | Read file from disk |
| `/api/session` | GET | Files opened via CLI args |
| `/ws` | WS | File watching (watch/unwatch commands, change/delete events) |

The frontend detects server availability via `GET /api/health` (cached). When unavailable, it falls back to browser-only mode (file picker, download).

---

## 4. Adding a New Diagram Type

Follow these steps to add support for a new Mermaid diagram type (e.g. `classDiagram`):

1. **Register the type** — Add an entry to the `DIAGRAM_TYPES` array in `src/client/lib/templates.ts`:
   ```ts
   { id: "classDiagram", label: "Class", icon: "⬡" }
   ```

2. **Add a starter template** — Add a `case "classDiagram":` branch in `getTemplate()` in the same file returning valid Mermaid source.

3. **Add a parser** — In `src/client/lib/parsers/index.ts`, add a `parseClassDiagram(lines)` function and wire it into `parse()`. Export any new model type and add it to the `DiagramModel` union.

4. **Add a serializer** — In `src/client/lib/serializers/index.ts`, add a `serializeClassDiagram(model)` function and wire it into the `serialize()` dispatcher.

5. **Add a form/canvas editor** — Create `src/client/components/Canvas/ClassDiagramEditor.tsx`. The component receives `{ source, onSourceChange }`. Use the `ownUpdateRef` pattern (see §5) to avoid re-parse cycles.

6. **Register in the Canvas dispatcher** — In `src/client/components/Canvas/index.tsx`, add a branch:
   ```tsx
   if (diagramType === "classDiagram") return <ClassDiagramEditor ... />;
   ```

7. **Test round-trip** — Open the Visual pane, make a change, and verify the Monaco source updates correctly after the 1.5 s debounce.

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
# Build frontend
bun run build

# Build production server (embeds dist/ via rust-embed)
bun run build:server

# Run production server
./target/release/server [FILE...]
```

**Export formats:**
- **SVG** — generated client-side from the live Mermaid.js render; instant, no external deps.
- **PNG / PDF** — invokes `mmdc` (Mermaid CLI) as a subprocess from Rust. `mmdc` must be on `$PATH` (provided automatically in the Nix dev shell; bundle it for distribution).

**File watching:**
```sh
# Open files and watch for external changes (e.g. editing in vim)
./target/release/server ~/diagrams/flowchart.mmd ~/diagrams/sequence.mmd
```
