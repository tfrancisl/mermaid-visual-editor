# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Browser-based app for visually editing Mermaid diagrams. Axum (Rust) server backend + React/TypeScript frontend. Users open the app in their preferred browser.

## Development Commands

All tooling is provided by the Nix flake — no global installs needed.

```sh
nix develop                # enter dev shell (Rust, Node, bun, mmdc)
bun install                # install JS dependencies
bun run dev                # Vite dev server on :5173 (proxies /api, /ws to :3001)
bun run dev:server          # Rust axum server on :3001 (--dev mode, no static serving)
bun run build              # frontend-only build (tsc + vite → dist/)
bun run build:server        # production server build (embeds dist/ via rust-embed)
bun run test               # vitest
cargo test -p mermaid-visual-editor-server  # Rust tests
```

TypeScript strict mode is on (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`). Run `bun run build` to type-check.

Production usage:
```sh
bun run build && bun run build:server
./target/release/server [FILE...]   # serves app, opens browser, watches files
```

## Package Manager

Use **bun**, not npm or yarn.

## Architecture

### Layout

Single unified view: visual editor (left) + Monaco source editor (right) in a resizable split, with two-way sync. File tabs along the top for multi-document editing.

### Buffered Sync Model

The core design pattern: text and visual canvas sync bidirectionally but **not continuously**.

**Text → Canvas** (debounced ~300ms): Monaco source → `parse(source)` → `DiagramModel` → React Flow nodes/edges or form state.

**Canvas → Text** (auto 1.5s or Cmd+Enter): canvas mutations → `serialize(model)` → new Mermaid source → Monaco.

### The Sync Loop Guards (`suppressSyncRef` / `ownUpdateRef`)

Two refs prevent infinite re-parse/re-serialize cycles in canvas components:

- **`suppressSyncRef`**: Set `true` before `setNodes`/`setEdges` from a source prop update. The canvas→source `useEffect` checks this and skips serialization if set.
- **`ownUpdateRef`**: Set `true` before calling `onSourceChange()` from canvas interaction. The source→canvas `useEffect` checks this and skips re-parsing if set.

Every new canvas editor **must** implement both guards. See `FlowchartCanvas.tsx` for the reference implementation and `SequenceEditor.tsx`/`GanttEditor.tsx`/`PieEditor.tsx` for form-based variants.

### Data Flow

```
src/client/lib/parsers/index.ts    — parse() dispatches by diagram type → DiagramModel union
src/client/lib/serializers/index.ts — serialize() dispatches by model.type → Mermaid source string
src/client/lib/layout.ts           — BFS layered layout for flowchart nodes, preserves existing positions
src/client/lib/buffer.ts           — ChangeBuffer class (push mutations, flush on demand)
```

`DiagramModel` is a union: `GraphModel | SequenceModel | GanttModel | PieModel | RawModel`. Unsupported diagram types fall through as `RawModel` (raw lines, no visual editing).

### Server API

Rust axum server in `src/server/`. Frontend communicates via HTTP/WebSocket, detected at runtime via `GET /api/health`.

**Endpoints:**
- `GET /api/health` — server availability check (result cached by frontend)
- `POST /api/export` — `{ source, format }` → raw binary (PNG/PDF/SVG via `mmdc`)
- `POST /api/file/save` — `{ path, content }` → write file to disk
- `GET /api/file/read?path=...` — read file from disk
- `GET /api/session` — returns files opened via CLI args
- `WS /ws` — file watching (notify crate + WebSocket push)

**Frontend API client:** `src/client/lib/api.ts` (replaces Tauri IPC). Browser fallbacks preserved when server is unavailable.

**File watching client:** `src/client/lib/watchClient.ts` — WebSocket with auto-reconnect.

### Adding a New Diagram Type

1. Add type + template in `src/client/lib/templates.ts`
2. Add parser function + model type in `src/client/lib/parsers/index.ts`, extend `DiagramModel` union
3. Add serializer in `src/client/lib/serializers/index.ts`
4. Create editor component in `src/client/components/Canvas/` using the `ownUpdateRef` pattern
5. Register in `src/client/components/Canvas/index.tsx` dispatcher

### Keyboard Shortcuts

Global shortcuts are registered in a single `useEffect([], [])` in `App.tsx`. State is accessed through refs (`tabsRef`, `activeTabIdRef`, etc.) to avoid stale closures. Canvas-specific shortcuts (Cmd+Enter, Escape) live in the canvas component's own effect handler.

### Styling

Tailwind CSS with CSS custom properties for theming (`--bg-primary`, `--bg-secondary`, `--text-primary`, `--text-muted`, `--accent`, `--border`). Catppuccin dark theme in the Monaco editor. Utility classes `field-input` / `field-select` defined in `src/client/index.css`.
