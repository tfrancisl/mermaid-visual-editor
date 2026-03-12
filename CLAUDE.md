# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Desktop app for visually editing Mermaid diagrams. Tauri v2 (Rust backend + system webview) with a React/TypeScript frontend.

## Development Commands

All tooling is provided by the Nix flake — no global installs needed.

```sh
nix develop                # enter dev shell (Rust, cargo-tauri, Node, bun, WebKit2GTK, mmdc)
bun install                # install JS dependencies
cargo tauri dev            # start app with hot-reload (frontend on :5173, Rust rebuilds on change)
cargo tauri build          # production build → src-tauri/target/release/bundle/
bun run build              # frontend-only build (tsc + vite)
```

There is no test framework or linter configured. TypeScript strict mode is on (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`). Run `bun run build` to type-check.

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
src/lib/parsers/index.ts    — parse() dispatches by diagram type → DiagramModel union
src/lib/serializers/index.ts — serialize() dispatches by model.type → Mermaid source string
src/lib/layout.ts           — BFS layered layout for flowchart nodes, preserves existing positions
src/lib/buffer.ts           — ChangeBuffer class (push mutations, flush on demand)
```

`DiagramModel` is a union: `GraphModel | SequenceModel | GanttModel | PieModel | RawModel`. Unsupported diagram types fall through as `RawModel` (raw lines, no visual editing).

### Tauri IPC

Frontend uses `invoke()` from `@tauri-apps/api/core`. Rust handlers in `src-tauri/src/lib.rs`. Currently one custom command: `export_diagram` (calls `mmdc` subprocess for PNG/PDF). File I/O uses Tauri's `plugin-fs` and `plugin-dialog` directly from the frontend via `src/lib/fileOps.ts`, with browser fallbacks when `__TAURI__` is not in `window`.

Permissions declared in `src-tauri/capabilities/default.json`.

### Adding a New Diagram Type

1. Add type + template in `src/lib/templates.ts`
2. Add parser function + model type in `src/lib/parsers/index.ts`, extend `DiagramModel` union
3. Add serializer in `src/lib/serializers/index.ts`
4. Create editor component in `src/components/Canvas/` using the `ownUpdateRef` pattern
5. Register in `src/components/Canvas/index.tsx` dispatcher

### Keyboard Shortcuts

Global shortcuts are registered in a single `useEffect([], [])` in `App.tsx`. State is accessed through refs (`tabsRef`, `activeTabIdRef`, etc.) to avoid stale closures. Canvas-specific shortcuts (Cmd+Enter, Escape) live in the canvas component's own effect handler.

### Styling

Tailwind CSS with CSS custom properties for theming (`--bg-primary`, `--bg-secondary`, `--text-primary`, `--text-muted`, `--accent`, `--border`). Catppuccin dark theme in the Monaco editor. Utility classes `field-input` / `field-select` defined in `src/index.css`.
