---
phase: 02-diagram-editor-improvements
plan: "02"
subsystem: er-canvas
tags: [er-diagram, canvas, crud, popover, edge-inspector, data-flow, cardinality]
dependency_graph:
  requires: [ERRelation.identifying, fixed-parseERCardinality, er-identifying-serialization]
  provides: [ER-CRUD-canvas, entity-edit-popover, edge-inspector-popover, er-cardinality-round-trip]
  affects: [ERCanvas, any downstream ER diagram consumers]
tech_stack:
  added: []
  patterns: [EREdgeData-via-edge.data, popover-outside-click-escape, flowToScreenPosition-popover-placement]
key_files:
  created: []
  modified:
    - path: src/client/components/Canvas/ERCanvas.tsx
      note: Full CRUD rewrite — EREdgeData type, fixed modelToFlow/flowToModel, toolbar, entity edit popover, edge inspector
    - path: src/client/components/Canvas/ClassCanvas.tsx
      note: Removed unused EdgeProps/BaseEdge/getStraightPath imports (pre-existing tsc error)
    - path: src/client/components/Canvas/FlowchartCanvas.tsx
      note: Prefixed unused shape param (pre-existing tsc error)
    - path: src/client/components/Canvas/MindmapCanvas.tsx
      note: Removed unused useCallback import (pre-existing tsc error)
    - path: src/client/components/Canvas/StateCanvas.tsx
      note: Removed unused data params from ChoiceNode/ForkJoinNode (pre-existing tsc error)
decisions:
  - "sourceLabel/targetLabel used on Edge objects in modelToFlow (not via addEdge) — React Flow accepts them as extra edge props even if not in official types"
  - "onConnect drops sourceLabel/targetLabel since addEdge typing rejects them; cardinality label display comes from edge.data for new connections"
  - "Entity rename in popover propagates to edges: source/target fields updated when entityName changes"
metrics:
  duration: 12min
  completed_date: "2026-03-28"
  tasks_completed: 2
  files_modified: 5
---

# Phase 02 Plan 02: ER Canvas Full CRUD Summary

**One-liner:** Fixed ER cardinality data loss bug (hardcoded values in flowToModel) and added complete CRUD editing: toolbar add-entity button, double-click entity edit popover with attribute management, and click-edge inspector with cardinality pickers and identifying toggle.

## What Was Built

This plan resolved the D-06 STATE.md blocker: `ERCanvas.flowToModel` was hardcoding `cardA: "||" as const, cardB: "|{" as const`, silently destroying cardinality data on every canvas sync. The plan also adds the full interactive editing surface so users can author ER diagrams visually without touching Mermaid source.

### Changes in `src/client/components/Canvas/ERCanvas.tsx`

1. **`EREdgeData` type** — new type `{ cardA, cardB, identifying, label }` stored in `edge.data` to survive round-trips through React Flow state.

2. **`modelToFlow` fixed** — edges now carry `data: { cardA: r.cardA, cardB: r.cardB, identifying: r.identifying ?? true, label: r.label }`. Non-identifying relationships (`r.identifying === false`) render with `strokeDasharray: "5 3"`.

3. **`flowToModel` fixed** — relations now read from `(e.data ?? {}) as Partial<EREdgeData>` with fallback `"||"` instead of hardcoded constants.

4. **`onConnect` fixed** — new edges get full `EREdgeData` defaults (`cardA: "||", cardB: "||", identifying: true, label: "relates"`).

5. **`+ Add Entity` toolbar button** — places a new `erEntity` node at the viewport center using `getViewport()`.

6. **`EREntityEditPopover`** — fixed popover (position: fixed, z-50) triggered by `onNodeDoubleClick`. Form fields for entity name, and a row-per-attribute editor (type input, name input, key select, remove button). Outside-click and Escape commit changes.

7. **`EREdgeInspector`** — fixed popover triggered by `onEdgeClick`. Contains two `<select>` elements for cardA/cardB with human-readable labels ("Exactly one (||)", "Zero or one (o|)", "One or more (|{)", "Zero or more (o{)"), a label text input, and an identifying checkbox. Outside-click and Escape commit changes and update the edge's `data`, `sourceLabel`, `targetLabel`, and `style.strokeDasharray`.

8. **Entity rename propagation** — when entityName changes in the popover, edge `source`/`target` fields update to match the new name.

### Pre-existing tsc build blockers fixed (Rule 1 auto-fix)

Four other canvas files had `noUnusedLocals` errors that prevented `bun run build` from succeeding. Fixed as blocking issues:
- `ClassCanvas.tsx`: removed unused `EdgeProps`, `BaseEdge`, `getStraightPath` imports
- `FlowchartCanvas.tsx`: prefixed unused `shape` param with `_`
- `MindmapCanvas.tsx`: removed unused `useCallback` import
- `StateCanvas.tsx`: removed unused `data` params from `ChoiceNode`/`ForkJoinNode`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-existing tsc errors blocked build**
- **Found during:** Task 1 verification
- **Issue:** 7 `noUnusedLocals` TypeScript errors in ClassCanvas, FlowchartCanvas, MindmapCanvas, StateCanvas prevented `bun run build` from exiting 0
- **Fix:** Removed/prefixed the offending unused identifiers in each file
- **Files modified:** ClassCanvas.tsx, FlowchartCanvas.tsx, MindmapCanvas.tsx, StateCanvas.tsx
- **Commit:** 4015e94

**2. [Rule 3 - Blocking] Plan 01 code changes were stranded on a different worktree branch**
- **Found during:** Pre-task setup
- **Issue:** The `ERRelation.identifying` field required by this plan was added by Plan 01 (`dc86af1`) but that commit was on `worktree-agent-a3939b5a` — not merged to main or this worktree
- **Fix:** Cherry-picked commits 13d4da4, dc86af1, 3940a82, 81e1f0b from the other worktree branch
- **Commits cherry-picked:** f9b4f28, 666fd37, 77d63e1, 039ebc3

**3. [Rule 1 - Bug] `addEdge` type rejects `sourceLabel`/`targetLabel`**
- **Found during:** Task 1 build verification
- **Issue:** The plan's `onConnect` spec included `sourceLabel`/`targetLabel` in the `addEdge(...)` call, but React Flow types don't include those on `Edge | Connection`. TypeScript strict mode errors.
- **Fix:** Dropped `sourceLabel`/`targetLabel` from the `addEdge` call in `onConnect`. The cardinality label display from `modelToFlow` still uses them (valid on `Edge[]` objects). For new connections, the labels display via the `data.cardA`/`data.cardB` stored in `edge.data`.

## Known Stubs

None. All cardinality data flows through edge.data. Entity and edge edits are fully wired.

## Self-Check: PASSED

Files exist:
- src/client/components/Canvas/ERCanvas.tsx — FOUND
- src/client/components/Canvas/ClassCanvas.tsx — FOUND
- src/client/components/Canvas/FlowchartCanvas.tsx — FOUND
- src/client/components/Canvas/MindmapCanvas.tsx — FOUND
- src/client/components/Canvas/StateCanvas.tsx — FOUND

Commits:
- 4015e94 fix(02-02): remove unused imports/vars that blocked tsc build — FOUND
- 17d66fc feat(02-02): fix ER canvas data flow and add full CRUD editing — FOUND
