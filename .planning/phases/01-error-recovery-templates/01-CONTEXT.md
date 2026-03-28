# Phase 1: Error Recovery + Templates - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver two independent UX improvements:
1. **Error Recovery** — When Mermaid source contains a parse error, users see the last valid diagram preserved (no blank canvas) plus an inline error indicator in Monaco and a banner with line number and jump-to-line action.
2. **Template Library** — When creating a new diagram tab, users can choose from a curated set of 20+ starter templates with SVG thumbnail previews, organized by diagram type.

This phase does NOT include AI features, new canvas editors, or changes to the parse/serialize pipeline.

</domain>

<decisions>
## Implementation Decisions

### Error Banner
- **D-01:** Error banner is a thin strip docked at the **top of the Preview pane** (above the SVG canvas area, below the pane toolbar if any). It is not a floating overlay, not in the status bar.
- **D-02:** Banner displays: diagram type indicator, error message, and a clickable "Line N" link. Clicking "Line N" calls Monaco's `editor.revealLineInCenter(n)` + `editor.setPosition({ lineNumber: n, column: 1 })` to jump cursor.
- **D-03:** Banner uses the existing CSS custom property palette (`--bg-secondary`, `--border`, `--text-muted`, `--accent`) — no new colors.

### Last-Valid Render Preservation
- **D-04:** Track `lastValidSvg` inside `Preview` component as a `useRef<string>` (not state — avoids re-render). On successful render, update `lastValidSvg`. On error, continue rendering `lastValidSvg` and show the error banner on top.
- **D-05:** If `lastValidSvg` is empty (no successful render yet), show the existing `EmptyState` component + error banner. Do not clear a valid render when the user is mid-edit.
- **D-06:** The existing `State` type in `Preview/index.tsx` gains a `lastValid` field or is restructured to: `{ svg: string | null; error: string | null }` — svg holds last valid, error holds current parse error (or null if clean).

### Monaco Error Markers
- **D-07:** Wire Mermaid parse errors to Monaco `editor.setModelMarkers()`. The existing `Preview` component already catches `mermaid.render()` errors — the parse error message and line/column must be forwarded to the Monaco editor via a callback prop or a shared error state in `App.tsx`.
- **D-08:** Error markers use `MarkerSeverity.Error`. When the parse error is cleared (source becomes valid again), markers are cleared with `editor.setModelMarkers(model, "mermaid", [])`.
- **D-09:** Line/column extraction: parse the error string from `mermaid.render()` catch. Mermaid error messages typically contain "Parse error on line N" or similar — extract with regex. If extraction fails, mark line 1 as a fallback.

### Template Picker UX
- **D-10:** Extend the existing `DiagramTypePicker` into a **two-step flow**: Step 1 — select diagram type (existing list); Step 2 — select a template for that type (new template grid). The picker now opens to Step 1 as before; selecting a type advances to Step 2 unless that type has only one template (in which case it auto-selects and closes).
- **D-11:** "Back" button in Step 2 returns to Step 1. Escape/outside-click closes entirely.
- **D-12:** The component stays in its current popup anchor style — no full-screen modal. Width expands in Step 2 to accommodate the template grid.

### Template Preview Format
- **D-13:** Each template shows a **rendered SVG thumbnail** (~120×80px). Thumbnails are rendered lazily when Step 2 opens (not pre-generated). Use `mermaid.render()` in a hidden offscreen container; swap in the SVG on success.
- **D-14:** If a thumbnail render fails, show a text fallback (template name in a neutral box). Never block the picker on a failed thumbnail.
- **D-15:** Template picker shows template name and a 1-line description beneath each thumbnail.

### Template Content
- **D-16:** Expand `templates.ts` to support multiple templates per diagram type. Structure: `TEMPLATE_LIBRARY: TemplateDefinition[]` with `{ id, diagramType, name, description, source }`. The existing `TEMPLATES` record (single template per type) is kept for backwards compatibility (`getTemplate()` returns the first template for that type).
- **D-17:** Target: 20–25 templates total across flowchart (4), sequence (4), class (3), ER (3), gantt (2), pie (2), state (3), plus 1–2 each for gitGraph, mindmap, timeline. See FEATURES.md for the recommended set.

### Claude's Discretion
- Exact pixel sizing of the error banner (height, padding) — keep it minimal and consistent with existing UI density.
- Whether to debounce the marker update (avoid flickering markers while user is actively typing) — recommend matching the existing 300ms preview debounce.
- Thumbnail grid column count in Step 2 — 2 or 3 columns depending on what fits comfortably at the current popup width.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Code to Extend
- `src/client/components/Preview/index.tsx` — Current error state + SVG render flow; D-04 through D-09 extend this
- `src/client/components/Editor/index.tsx` — Monaco registration; D-07 wires errors to setModelMarkers()
- `src/client/components/DiagramTypePicker/index.tsx` — Current type picker; D-10 through D-15 extend this
- `src/client/lib/templates.ts` — Current single-template-per-type structure; D-16 extends this
- `src/client/App.tsx` — Tab creation flow, error state forwarding between Preview and Editor

### Requirements
- `.planning/REQUIREMENTS.md` §Error Recovery (ERR-01–04)
- `.planning/REQUIREMENTS.md` §Templates (TMPL-01–04)

### Research
- `.planning/research/FEATURES.md` §Error Recovery UX Pattern — best practice: show last valid render, inline squiggles, jump-to-error
- `.planning/research/FEATURES.md` §Template Library Scope — recommended 20–25 templates with per-type breakdown

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Preview/index.tsx` `ErrorState` component: existing error display — keep for the "no valid render yet" case; replace with banner-overlay approach for the "has valid render" case
- `Preview/index.tsx` `mermaid.render()` try/catch: already catches parse errors and extracts clean message — extend to also extract line number
- `DiagramTypePicker/index.tsx`: anchor-aware popup with click-outside/Escape close — Step 2 reuses this shell
- `src/client/index.css` utility classes (`field-input`, `field-select`) and CSS custom properties — use for banner and template grid styling

### Established Patterns
- CSS custom properties for theming: `--bg-primary`, `--bg-secondary`, `--bg-surface`, `--text-primary`, `--text-muted`, `--accent`, `--border`
- Tailwind utility-first with `var(--*)` inline for dynamic theming
- State via `useState`/`useRef`; effects for side effects; no external state manager

### Integration Points
- `App.tsx` creates new tabs via `getTemplate(type)` — the template picker replaces/wraps this flow
- Error state forwarding: `Preview` emits errors → `App` forwards to `Editor` via a new `onError` prop (or shared ref)
- `Editor` receives error markers via a prop, calls `setModelMarkers()` in a `useEffect`

</code_context>

<specifics>
## Specific Ideas

- The existing Preview already strips HTML from Mermaid error messages (`msg.replace(/<[^>]+>/g, "")`) — this clean message is exactly what belongs in the error banner. The line number must be additionally extracted.
- The DiagramTypePicker already handles positioning above/below based on anchor rect — Step 2 can reuse this positioning logic, just widening the popup.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-error-recovery-templates*
*Context gathered: 2026-03-28*
