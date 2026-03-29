# Mermaid Visual Editor

## What This Is

Browser-based app for visually editing Mermaid diagrams. Users open the app in their browser, see a split view with a visual canvas on the left and a Monaco source editor on the right, and can edit diagrams either way with live two-way sync. An Axum (Rust) server handles file I/O, export, and file watching; the app also works standalone in the browser without a server.

## Core Value

Users can visually edit any Mermaid diagram and have it immediately reflected as correct Mermaid source — and vice versa — without losing their work or breaking the diagram.

## Requirements

### Validated

- ✓ Monaco source editor with Mermaid syntax highlighting — existing
- ✓ Live Mermaid diagram preview — existing
- ✓ Two-way sync: source edits update canvas, canvas edits update source — existing
- ✓ Multi-tab support for editing multiple diagrams — existing
- ✓ Flowchart visual editing (nodes, edges, labels) via React Flow — existing
- ✓ Sequence diagram form editor — existing
- ✓ Gantt chart form editor — existing
- ✓ Pie chart form editor — existing
- ✓ RawModel fallback for unsupported diagram types — existing
- ✓ Export to PNG, PDF, SVG via mmdc — existing
- ✓ Axum server: file open/save, session (CLI args), WebSocket file watching — existing
- ✓ Browser-only fallback when server unavailable — existing
- ✓ Resizable split layout — existing
- ✓ Nix flake dev environment — existing

### Active

- [ ] AI-assisted diagram generation and editing
- ✓ Improved diagram type coverage (class diagrams, state diagrams, ER diagrams) — Validated in Phase 2: Diagram Editor Improvements
- [ ] Better error recovery and user feedback for parse failures
- [ ] Diagram templates and quick-start library

### Out of Scope

- Real-time collaboration — high complexity, single-user tool for now
- Cloud storage / account system — local-first by design
- Mobile app — desktop browser target
- Bundled mmdc (defer) — currently requires external install

## Context

Phase 2 complete — class, ER, and state diagram canvases now have full CRUD editing with round-trip fidelity (cardinality, identifying relationships, composite state detection). The project has completed its foundation phases (0–3): scaffold, core editor, visual canvas, multi-tab, export, and the Tauri→Axum migration. The existing codebase is in `src/client/` (React/TypeScript frontend) and `src/server/` (Rust axum backend). All core editing infrastructure is in place; the next focus is extending diagram type support and adding AI-assisted editing capabilities.

Key architecture patterns already established:
- Buffered sync model with `suppressSyncRef`/`ownUpdateRef` guards preventing infinite loops
- `DiagramModel` union type dispatched through parse/serialize functions
- React Flow for flowchart canvas; form-based editors for sequence/gantt/pie
- `src/client/lib/api.ts` for server communication with browser fallbacks

## Constraints

- **Tech Stack**: Rust + Axum backend, React 18 + TypeScript + Vite + Tailwind frontend — established, no changes
- **Package Manager**: bun only (not npm or yarn)
- **Dev Environment**: Nix flake — all tooling provided, no system installs assumed
- **Diagram Syntax**: Must produce valid Mermaid source compatible with mermaid.js v11
- **Compatibility**: Browser-only mode must work without the server

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Axum server instead of Tauri | Browser-based distribution; removed desktop app dependency | ✓ Good |
| Buffered sync (not continuous) | Prevents infinite parse/serialize cycles | ✓ Good |
| React Flow for flowchart | Best visual graph editor for React | ✓ Good |
| Form editors for sequence/gantt/pie | Structured diagrams don't map naturally to free-form canvas | ✓ Good |
| RawModel fallback | Unsupported types still render preview, just no visual editing | ✓ Good |
| Phase 4 AI integration deferred | Foundation needed to be solid first | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-28 after initialization*
