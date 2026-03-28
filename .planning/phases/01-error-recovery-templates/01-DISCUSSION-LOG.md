# Phase 1: Error Recovery + Templates - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 01-error-recovery-templates
**Areas discussed:** Error Banner, Last-Valid Render Preservation, Template Picker UX, Template Preview Format
**Mode:** --auto (all choices are recommended defaults, no user interaction)

---

## Error Banner

| Option | Description | Selected |
|--------|-------------|----------|
| Top of Preview pane (docked) | Thin strip above SVG canvas, always visible when error present | ✓ |
| Status bar indicator | Error count badge in status bar, click to see details | |
| Floating overlay | Banner floats over the diagram | |

**User's choice:** [auto] Top of Preview pane — recommended default (co-located with the broken render, most discoverable)
**Notes:** Clicking "Line N" in banner jumps Monaco cursor.

---

## Last-Valid Render Preservation

| Option | Description | Selected |
|--------|-------------|----------|
| Track in Preview (useRef) | lastValidSvg stored in Preview component, zero App-level changes | ✓ |
| Track in App.tsx state | App holds last valid source/svg, passes to Preview | |
| Re-render on demand | Store last valid source string, re-render SVG on error | |

**User's choice:** [auto] Track in Preview via useRef — recommended default (self-contained, no prop drilling)
**Notes:** useRef avoids re-render on SVG update; only state change is the error/ok toggle.

---

## Template Picker UX

| Option | Description | Selected |
|--------|-------------|----------|
| Two-step DiagramTypePicker | Step 1: type, Step 2: template grid — extends existing component | ✓ |
| Separate modal | Full-screen or large modal with type filter + template grid | |
| Sidebar template panel | Persistent left sidebar showing templates | |

**User's choice:** [auto] Two-step DiagramTypePicker — recommended default (builds on existing component, familiar anchor UX)
**Notes:** Types with only one template auto-select and close.

---

## Template Preview Format

| Option | Description | Selected |
|--------|-------------|----------|
| Rendered SVG thumbnails | Live mermaid.render() miniatures, lazy on picker open | ✓ |
| Text labels only | Template name + 1-line description, no visual preview | |
| Static screenshots | Pre-generated PNG/SVG assets bundled in app | |

**User's choice:** [auto] Rendered SVG thumbnails — recommended default (visual tool should show visual previews; mermaid.render() already available)
**Notes:** Failed thumbnails fall back to text label — never block the picker.

---

## Claude's Discretion

- Error banner pixel sizing (height, padding)
- Whether to debounce marker updates (recommend matching 300ms preview debounce)
- Template grid column count in Step 2

## Deferred Ideas

None.
