---
status: approved
phase: 02-diagram-editor-improvements
source: [02-VERIFICATION.md]
started: 2026-03-28T17:10:00.000Z
updated: 2026-03-28T17:10:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. ER edge inspector popover interaction and cardinality sync
expected: Clicking an ER diagram edge opens the edge inspector popover; changing cardinality selects (cardA/cardB), identifying checkbox, or label field updates the edge data; within 1.5s the canvas→source sync fires and the Mermaid source reflects the new cardinality notation

### 2. State canvas composite diagram fallback
expected: Opening a state diagram that uses `state "X" { ... }`, `--` concurrency dividers, or `<<fork>>`/`<<join>>` pseudo-states shows a read-only notice ("This diagram uses composite state syntax...") instead of the editable canvas

### 3. State canvas inline rename stateId conditional logic
expected: Double-clicking a normal state node opens an inline input; after confirming the new label, the node's stateId updates only if it previously matched the label (auto-generated name); user-typed stateIds are preserved unchanged

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
