---
phase: 02-diagram-editor-improvements
plan: "01"
subsystem: parsers-serializers
tags: [parser, serializer, er-diagram, class-diagram, state-diagram, round-trip, tdd]
dependency_graph:
  requires: []
  provides: [ERRelation.identifying, StateModel.hasCompositeStates, fixed-parseERCardinality, class-cardinality-parsing, er-identifying-serialization, class-cardinality-serialization]
  affects: [ERCanvas, ClassCanvas, any future canvas editor using ERRelation or ClassRelation]
tech_stack:
  added: []
  patterns: [TDD red-green, switch-based cardinality normalization, regex capture group extension]
key_files:
  created:
    - path: src/client/lib/__tests__/parsers.test.ts
      note: added 11 new tests for ER cardinality, identifying, composite state, class cardinality
    - path: src/client/lib/__tests__/serializers.test.ts
      note: added 6 new tests for ER connector and class cardinality serialization
    - path: src/client/lib/__tests__/roundtrip.test.ts
      note: added 4 new round-trip tests for ER and class diagrams
  modified:
    - path: src/client/lib/parsers/index.ts
      note: type extensions, parseERCardinality fix, ER/class/state parser updates
    - path: src/client/lib/serializers/index.ts
      note: serializeER and serializeClass updated for new fields
decisions:
  - "ERRelation.identifying uses boolean with undefined defaulting to true (-- connector); only false triggers .. connector"
  - "StateModel.hasCompositeStates is undefined (not false) when no composite syntax found, avoids storing falsy noise"
  - "CLASS_RELATION_RE2 target group shifted from 3 to 5 due to new cardinality capture groups"
metrics:
  duration: 5min
  completed_date: "2026-03-28"
  tasks_completed: 2
  files_modified: 5
---

# Phase 02 Plan 01: Parser/Serializer Round-Trip Fix Summary

**One-liner:** Fixed 3 parser bugs (ER cardinality mapping, identifying connector, composite state detection) and extended class cardinality parsing with full serializer support and TDD round-trip test coverage.

## What Was Built

This plan resolved the STATE.md blockers identified before Phase 02: ERCanvas hardcoded cardinalities and ClassCanvas incomplete round-trip. Without these fixes, any canvas edit on ER or class diagrams would silently destroy user data.

### Changes in `src/client/lib/parsers/index.ts`

1. **`ERRelation.identifying?: boolean`** — new optional field. `true` = identifying (`--`), `false` = non-identifying (`..`), `undefined` = not parsed (treated as identifying on serialize).

2. **`StateModel.hasCompositeStates?: boolean`** — new optional field. Set `true` when nested state blocks, `--` concurrency dividers, or fork/join pseudo-states are detected.

3. **`parseERCardinality` fixed** — was a broken chain of if/else that mapped `|o` to `||` (wrong) and had dead code for `o{`. Replaced with a `switch` statement correctly mapping all 8 Mermaid ER cardinality symbols to 4 canonical types.

4. **ER relationship regex extended** — was `-- (identifying only)`. Now `(--|\\.\\.)`  captures both connectors as group 3; subsequent groups shifted. `identifying: relM[3] !== ".."` set from match.

5. **Composite state detection** — three patterns set `hasCompositeStates = true`:
   - `state "X" {` or `state X {` (nested state block)
   - `--` (concurrency divider)
   - `<<fork>>` or `<<join>>` kind markers

6. **`CLASS_RELATION_RE` and `CLASS_RELATION_RE2` extended** — optional `"([^"]+)"` capture groups added before and after the arrow to capture cardinality. Arrow group shifted from 2→3, target from 3→5. Both relation parsers updated to populate `sourceCardinality` and `targetCardinality`.

### Changes in `src/client/lib/serializers/index.ts`

1. **`serializeER`** — emits `..` connector when `r.identifying === false`, `--` otherwise (preserves existing behavior for `undefined`).

2. **`serializeClass`** — emits `r.source "srcCard" <|-- "tgtCard" r.target` when cardinality fields are present.

## Test Coverage Added

| Test file | New tests | What they cover |
|-----------|-----------|-----------------|
| parsers.test.ts | +11 | parseERCardinality (all 8 symbols), identifying/non-identifying parse, composite state detection (4 cases), class cardinality labels |
| serializers.test.ts | +6 | serializeER with identifying true/false/undefined, serializeClass with cardinality labels |
| roundtrip.test.ts | +4 | ER identifying/non-identifying round-trips, all 4 cardinality types, class cardinality round-trips |

Total: **+21 tests**. All 131 tests pass.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. All changes wire real data.

## Self-Check: PASSED

Files exist:
- src/client/lib/parsers/index.ts — FOUND
- src/client/lib/serializers/index.ts — FOUND
- src/client/lib/__tests__/parsers.test.ts — FOUND
- src/client/lib/__tests__/serializers.test.ts — FOUND
- src/client/lib/__tests__/roundtrip.test.ts — FOUND

Commits:
- 13d4da4 test(02-01): add failing tests for parser fixes — FOUND
- dc86af1 feat(02-01): fix parser types and bugs for ER, state, and class diagrams — FOUND
- 3940a82 test(02-01): add failing tests for serializer fixes and round-trips — FOUND
- 81e1f0b feat(02-01): fix serializers to emit ER connector and class cardinality labels — FOUND
