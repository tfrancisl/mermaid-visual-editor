# Mermaid Visual Editor

A browser-based app for visually editing [Mermaid](https://mermaid.js.org/) diagrams. Split view: visual canvas on the left, Monaco source editor on the right. Edit either side and they stay in sync.

Built with Rust (Axum) + React 18 + TypeScript. All tooling is provided by a Nix flake — no global installs required.

---

## Features

- **Two-way sync** — edit visually or in source, changes propagate in both directions
- **Visual canvas** — drag, connect, and label nodes using React Flow (flowchart/class/state/ER/mindmap/block)
- **Form editors** — structured editors for sequence diagrams, Gantt charts, and pie charts
- **Live preview** — Mermaid.js renders a live SVG preview pane
- **Multi-tab** — open and edit multiple `.mmd` files at once
- **File watching** — server watches open files and reloads on external changes (great for vim/neovim workflows)
- **Export** — PNG, PDF, and SVG export (PNG/PDF via `mmdc`; SVG client-side)
- **Browser-only mode** — works without the server (file open/save via browser fallbacks)

### Supported diagram types

| Type | Visual editing |
|------|---------------|
| Flowchart / Graph | React Flow canvas (drag, connect, label) |
| Class diagram | React Flow canvas (classes, methods, relationships) |
| State diagram | React Flow canvas (states, transitions) |
| ER diagram | React Flow canvas (entities, relationships) |
| Mindmap | React Flow canvas |
| Block diagram | React Flow canvas |
| Sequence diagram | Form-based editor |
| Gantt chart | Form-based editor |
| Pie chart | Form-based editor |
| Everything else | Source editing + live preview (no visual canvas) |

---

## Usage

### Building from source

**Prerequisites:** [Nix](https://nixos.org/) with flakes enabled.

```sh
nix develop          # enter dev shell (provides Rust, Node, bun, mmdc — nothing else needed)
bun install          # install JS dependencies
bun run build        # build the frontend
bun run build:server # compile the Rust server (embeds the frontend)
```

### Running

```sh
./target/release/server                    # open app in browser with a blank diagram
./target/release/server diagram.mmd        # open a specific file
./target/release/server a.mmd b.mmd        # open multiple files as tabs
```

The server opens `http://localhost:3001` in your default browser. Files passed on the command line are watched for external changes.

### Export

From the toolbar:
- **SVG** — instant, generated client-side
- **PNG / PDF** — requires `mmdc` on `$PATH` (automatically available in the Nix dev shell)

---

## Development

```sh
nix develop          # enter dev shell
bun install          # install JS deps (first time only)

# In two terminals:
bun run dev          # Vite dev server on :5173 (hot reload, proxies /api and /ws to :3001)
bun run dev:server   # Rust server on :3001 (file I/O, export, file watching)
```

Open `http://localhost:5173`.

### Tests

```sh
bun run test                                          # vitest (frontend)
cargo test -p mermaid-visual-editor-server            # Rust tests
```

### Type-checking

TypeScript strict mode is on. Run `bun run build` to type-check the whole frontend without emitting files.

---

## Contributing

See [`docs/dev-guide.md`](docs/dev-guide.md) for:
- Full project structure walkthrough
- How the buffered sync model works
- Step-by-step guide for adding a new diagram type
- Sync loop guard pattern (`suppressSyncRef` / `ownUpdateRef`)
- How keyboard shortcuts are wired

See [`docs/architecture.md`](docs/architecture.md) for design background and system diagrams.

**Key invariants to preserve:**
- Every canvas editor must implement both sync loop guards (see dev guide §5)
- Parsers and serializers must round-trip: `serialize(parse(source))` should produce equivalent Mermaid source
- Browser-only mode must work without the server (`src/client/lib/api.ts` handles the fallbacks)
- Output must be valid Mermaid v11 syntax

---

## License

See [LICENSE](LICENSE).
