---
phase: 02-diagram-editor-improvements
plan: 03
subsystem: ui
tags: [react, xyflow, class-diagram, mermaid, canvas, popover, crud]

requires:
  - phase: 02-diagram-editor-improvements/02-01
    provides: ClassRelation with sourceCardinality/targetCardinality fields in parser/serializer

provides:
  - ClassCanvas with full CRUD: add class via toolbar, edit via double-click popover, configure edges via inspector
  - ClassEdgeData type with relType, sourceCardinality, targetCardinality, label for round-trip fidelity
  - ClassEditPopover component (name, annotation, members with visibility/type/name, methods with visibility/name/params/returnType)
  - ClassEdgeInspector component (6 relationship types, source/target cardinality, label)

affects:
  - phase-03 (AI integration may generate class diagrams benefiting from CRUD canvas)

tech-stack:
  added: []
  patterns:
    - "ClassEditPopover/ClassEdgeInspector: fixed-position popovers with outside-click and Escape-key dismiss, committing on close"
    - "ClassEdgeData satisfies type pattern for compile-time exhaustive edge data assignment"
    - "globalThis.Node cast for DOM contains() check when ReactFlow's Node type is in scope"

key-files:
  created: []
  modified:
    - src/client/components/Canvas/ClassCanvas.tsx
    - src/client/components/Canvas/FlowchartCanvas.tsx
    - src/client/components/Canvas/MindmapCanvas.tsx

key-decisions:
  - "ClassEditPopover closes and commits on both Escape key and outside click (not 'Cancel discards, Apply commits'); Cancel explicitly discards"
  - "addNewClass() places new class at viewport center using getViewport() + window.innerWidth/2 calculation"
  - "DOM Node type collision resolved with globalThis.Node cast (ReactFlow imports Node type with same name)"

patterns-established:
  - "Popover outside-click detection: cast event.target as globalThis.Node when ReactFlow's Node type is in scope"

requirements-completed: [CLS-01, CLS-02, CLS-03, CLS-04, CLS-05, CLS-06, CLS-07]

duration: 12min
completed: 2026-03-28
---

# Phase 02 Plan 03: Class Canvas CRUD Summary

**Full CRUD class diagram canvas with toolbar add-class button, double-click node edit popover (name/annotation/members/methods with visibility), edge inspector (6 relationship types, source/target cardinality, label), and correct cardinality round-trip through edge.data**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-28T12:40:00Z
- **Completed:** 2026-03-28T12:52:00Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Added `ClassEdgeData` type with `relType`, `sourceCardinality`, `targetCardinality`, `label` fields; wired through `modelToFlow` and `flowToModel` for complete round-trip
- Implemented `ClassEditPopover` with visibility select (+ - # ~ none), type/name inputs for attributes, visibility/name/params/returnType inputs for methods
- Implemented `ClassEdgeInspector` with all 6 `ClassRelationType` options displayed with arrow syntax labels, source/target cardinality inputs, optional label
- Added `+ Add Class` toolbar button placing new class at viewport center
- Wired `onNodeDoubleClick` and `onEdgeClick` to open respective popovers

## Task Commits

1. **Task 1: Extend ClassCanvas with full CRUD** - `c260ab7` (feat)

## Files Created/Modified

- `src/client/components/Canvas/ClassCanvas.tsx` - Complete rewrite with ClassEdgeData type, ClassEditPopover, ClassEdgeInspector, addNewClass, full modelToFlow/flowToModel cardinality round-trip, onNodeDoubleClick/onEdgeClick handlers
- `src/client/components/Canvas/FlowchartCanvas.tsx` - Fix: renamed unused `shape` param to `_shape` in shapeForNode (pre-existing noUnusedLocals error)
- `src/client/components/Canvas/MindmapCanvas.tsx` - Fix: removed unused `useCallback` import (pre-existing noUnusedLocals error)

## Decisions Made

- `ClassEditPopover` closes and commits current state on Escape/outside-click; explicit Cancel button discards changes. This matches the pattern where closing a popover via keyboard/click confirms intent.
- New class nodes are centered in the current viewport by computing `(-x + width/2) / zoom` — avoids placing offscreen when user has panned.
- DOM `contains()` check uses `globalThis.Node` cast because `@xyflow/react` exports `Node` type into the same scope, causing TS2345 type mismatch.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] TypeScript `Node` type collision in popover mousedown handlers**
- **Found during:** Task 1 (build verification)
- **Issue:** `e.target as Node` inside `useEffect` click handlers was resolving to ReactFlow's `Node` type (React Flow node with `id`, `position`, etc.) instead of DOM `Node`. TypeScript TS2345 error prevented build.
- **Fix:** Changed casts to `e.target as globalThis.Node` in both `ClassEditPopover` and `ClassEdgeInspector` components.
- **Files modified:** `src/client/components/Canvas/ClassCanvas.tsx`
- **Verification:** `bun run build` exits 0
- **Committed in:** c260ab7

**2. [Rule 3 - Blocking] Pre-existing unused variable errors in FlowchartCanvas.tsx and MindmapCanvas.tsx**
- **Found during:** Task 1 (build verification)
- **Issue:** `noUnusedLocals: true` in tsconfig causes `tsc` to exit non-zero for `shape` param in `shapeForNode()` (FlowchartCanvas) and `useCallback` import (MindmapCanvas). Both pre-existed before this plan's changes but blocked build verification.
- **Fix:** Prefixed unused `shape` param with `_` in FlowchartCanvas; removed unused `useCallback` import from MindmapCanvas.
- **Files modified:** `src/client/components/Canvas/FlowchartCanvas.tsx`, `src/client/components/Canvas/MindmapCanvas.tsx`
- **Verification:** `bun run build` exits 0; all 109 tests pass
- **Committed in:** c260ab7

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking build)
**Impact on plan:** Both fixes essential for build verification. No scope creep.

## Issues Encountered

None beyond the TypeScript type collision documented above.

## Known Stubs

None - all data flows are fully wired. ClassEditPopover and ClassEdgeInspector write directly to React Flow node/edge state which triggers the canvas→source sync cycle within 1.5s.

## Next Phase Readiness

- Class diagram now has full CRUD parity with ER and Flowchart canvases
- Cardinality round-trip is complete: parse → modelToFlow → edge.data → flowToModel → serialize
- Phase 03 (AI integration) can generate class diagrams that will render fully in the visual canvas

---
*Phase: 02-diagram-editor-improvements*
*Completed: 2026-03-28*
