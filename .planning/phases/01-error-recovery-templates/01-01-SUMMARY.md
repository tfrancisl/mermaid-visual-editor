---
phase: 01-error-recovery-templates
plan: 01
subsystem: ui
tags: [monaco, mermaid, react, error-handling, typescript]

# Dependency graph
requires: []
provides:
  - ParseError type exported from Preview component
  - ErrorBanner component in Preview with line number and jump-to-line button
  - Last valid SVG preserved on parse errors (two-field PreviewState)
  - Monaco model markers (red squiggles) at the error line via setModelMarkers
  - Jump-to-line handler in App.tsx wired from error banner to Monaco cursor
  - parseError state cleared on tab switch
affects: [02-error-recovery-templates, phase-02, phase-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-field state pattern: {svg, error} instead of union for last-valid preservation"
    - "Error callback chain: Preview.onError -> App.setParseError -> Editor.parseError prop"
    - "editorRef pattern: expose Monaco IStandaloneCodeEditor to parent for programmatic control"

key-files:
  created: []
  modified:
    - src/client/components/Preview/index.tsx
    - src/client/components/Editor/index.tsx
    - src/client/App.tsx

key-decisions:
  - "Two-field PreviewState {svg, error} instead of tri-state union — enables last-valid SVG preservation by keeping prev.svg on error"
  - "ParseError exported from Preview component so Editor and App can share the type without a separate types file"
  - "editorRef stored in Editor component (not hoisted to App) to satisfy React rules — exposed via prop to App for jump-to-line"
  - "extractLineCol regex approach: try 'on line N' pattern first, then 'line N, col N' — mermaid error messages use both formats"

patterns-established:
  - "Error recovery pattern: setState(prev => ({ svg: prev.svg, error: newError })) preserves last valid state"
  - "Monaco marker lifecycle: set markers on parseError truthy, clear with empty array on parseError null"
  - "Jump-to-line: revealLineInCenter + setPosition + focus — three-step for complete UX"

requirements-completed: [ERR-01, ERR-02, ERR-03, ERR-04]

# Metrics
duration: 8min
completed: 2026-03-28
---

# Phase 01 Plan 01: Error Recovery and Monaco Markers Summary

**Parse error UX: last-valid SVG preserved, inline ErrorBanner with line numbers, and Monaco red squiggles via setModelMarkers — zero blank canvas on syntax errors**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-28T16:02:47Z
- **Completed:** 2026-03-28T16:05:47Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Replaced tri-state Preview `State` union with `{svg, error}` two-field struct — last valid SVG is preserved across parse errors
- Added `ErrorBanner` component with parse error message truncated to available width, plus a "Line N" button that triggers jump-to-line
- Wired `ParseError` through App.tsx: Preview reports errors via `onError` callback, App forwards to Editor via `parseError` prop, Editor sets Monaco markers via `setModelMarkers`
- Jump-to-line: clicking "Line N" in ErrorBanner calls `editorRef.current.revealLineInCenter` + `setPosition` + `focus`
- Markers clear automatically when source becomes valid (null `parseError` → empty marker array)
- `parseError` state cleared on tab switch in `activateTab`

## Task Commits

Each task was committed atomically:

1. **Task 1: Restructure Preview state, add ErrorBanner, extract error line numbers** - `775f070` (feat)
2. **Task 2: Wire error state through App.tsx, add Monaco markers in Editor, implement jump-to-line** - `1af5556` (feat)

## Files Created/Modified
- `src/client/components/Preview/index.tsx` - Exported ParseError type, two-field PreviewState, extractLineCol(), ErrorBanner, onError/onJumpToLine props, removed old ErrorState
- `src/client/components/Editor/index.tsx` - Added editorInstanceRef/monacoRef, expanded EditorProps with parseError/editorRef, added marker useEffect, fixed implicit any types on language provider callbacks
- `src/client/App.tsx` - Imported ParseError and editor types, added parseError state and editorRef, handleJumpToLine callback, updated SourcePane/PreviewPane signatures and PaneLayout call, setParseError(null) in activateTab

## Decisions Made
- Two-field PreviewState `{svg, error}` instead of tri-state union: cleanest way to express "previous valid SVG + current error" simultaneously
- ParseError exported from Preview (not a shared types file): keeps related types co-located with the component that produces them
- editorRef lives in Editor, exposed via prop: avoids ref hoisting anti-pattern, satisfies React rules
- extractLineCol tries two patterns: mermaid.js emits both "on line N" and "line N, col N" depending on diagram type and error class

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed implicit `any` type errors on Monaco language provider callbacks**
- **Found during:** Task 2 (Editor component rewrite)
- **Issue:** Original Editor code had `(l)` and `(model, position)` parameters without type annotations, causing TS6133/TS7006 errors in strict mode
- **Fix:** Added explicit `(l: { id: string })`, `(model: editor.ITextModel, position: { lineNumber: number; column: number })` type annotations
- **Files modified:** src/client/components/Editor/index.tsx
- **Verification:** No Editor TypeScript errors in build output
- **Committed in:** 1af5556 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Necessary fix for TypeScript strict mode compliance. No scope creep.

## Issues Encountered
- Pre-existing Canvas TypeScript errors (ClassCanvas, FlowchartCanvas, MindmapCanvas, StateCanvas) were present before this plan and remain unchanged. These are out of scope per deviation boundary rules.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Error recovery UX complete and wired end-to-end
- Ready for Plan 02 (diagram templates or remaining phase work)
- No blockers

## Self-Check: PASSED

- FOUND: src/client/components/Preview/index.tsx
- FOUND: src/client/components/Editor/index.tsx
- FOUND: src/client/App.tsx
- FOUND: .planning/phases/01-error-recovery-templates/01-01-SUMMARY.md
- FOUND: commit 775f070
- FOUND: commit 1af5556

---
*Phase: 01-error-recovery-templates*
*Completed: 2026-03-28*
