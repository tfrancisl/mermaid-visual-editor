# Decisions

- 2026-03-28: connect-mode for state transition creation uses two-click pattern instead of handle drag — handle drag conflicts with ReactFlow pan gesture on touch targets
- 2026-03-28: `hasCompositeStates` set `undefined` (not `false`) when absent — avoids storing falsy noise in serialized model
- 2026-03-28: `ClassEditPopover` closes and commits on Escape/outside-click; Cancel explicitly discards — `globalThis.Node` cast used for DOM `contains()` check when ReactFlow `Node` type is in scope
- 2026-03-28: `CLASS_RELATION_RE` extended with optional quoted cardinality capture groups; arrow group shifted 2→3, target 3→5 — preserves existing match offsets while adding cardinality support
- 2026-03-28: `ERRelation.identifying` uses boolean with `undefined` defaulting to `true`; only `false` triggers `..` connector — matches Mermaid default (solid line)
- 2026-03-28: `TEMPLATE_LIBRARY` is the authoritative source; `getTemplate()` falls through to it first before legacy `TEMPLATES` record — backwards compatibility without duplication
- 2026-03-28: `ParseError` exported from Preview component; `editorRef` exposed via prop (not hoisted to App) — keeps error-jump logic colocated with the component that owns the editor
- 2026-03-28: Two-field `PreviewState { svg, error }` enables last-valid SVG preservation on parse errors — blank canvas never shown; last valid render persists
- 2026-03-28: Monaco programmatic edits (AI + canvas sync) use `executeEdits()` not `setValue()` — preserves undo history
- 2026-03-28: AI output validated with `mermaid.parse()` before applying; invalid output shown in preview panel, not applied to editor state — prevents silent diagram corruption from bad AI output
- 2026-03-28: All Anthropic API calls proxied through Axum server (`POST /api/ai/chat`); key read from `ANTHROPIC_API_KEY` env var only — API key never reaches the browser
- 2026-03-28: `@mermaid-js/parser` rejected — no Langium grammars exist for `classDiagram`/`stateDiagram`/`erDiagram`; hand-rolled regex parsers remain the approach
- 2026-03-28: Form editors for sequence/gantt/pie — structured diagrams don't map naturally to free-form canvas; form UI is more predictable
- 2026-03-28: `RawModel` fallback for unsupported diagram types — unsupported types still render preview, just no visual editing
- 2026-03-28: React Flow for flowchart canvas — best visual graph editor for React 18
- 2026-03-28: Buffered sync (not continuous) with `suppressSyncRef`/`ownUpdateRef` guards — prevents infinite parse/serialize cycles
- 2026-03-28: Axum server instead of Tauri — browser-based distribution; removed desktop app dependency
