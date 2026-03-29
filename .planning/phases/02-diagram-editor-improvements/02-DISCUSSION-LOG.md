# Phase 2: Diagram Editor Improvements - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 02-diagram-editor-improvements
**Mode:** --auto (Claude selected recommended defaults for all areas)
**Areas discussed:** Inline Editing UX, Relationship Type & Cardinality, Add Node UX, Composite State Handling, ERCanvas Cardinality Fix, ClassCanvas Round-Trip

---

## Inline Editing UX

| Option | Description | Selected |
|--------|-------------|----------|
| Double-click → edit popover | Floating form panel anchored to node, commits on close | ✓ |
| Double-click → inline contenteditable | In-place editing within the node box | |
| Select → side panel | Fixed side panel opens on node selection | |

**Auto-selected:** Double-click → edit popover
**Rationale:** Avoids contenteditable complexity in React Flow, cleanly handles multi-field editing (members/methods for class, attributes for ER), consistent with existing selection toolbar pattern.

---

## Relationship Type & Cardinality

| Option | Description | Selected |
|--------|-------------|----------|
| Click edge → edge inspector popover | Small floating panel with dropdowns | ✓ |
| Right-click → context menu | Context menu with nested options | |
| Edge label click → inline edit | Only edits label, not type/cardinality | |

**Auto-selected:** Click edge → edge inspector popover
**Rationale:** Consistent with the node editing popover approach; avoids right-click menu which is less discoverable; handles all metadata (type, cardinality, label) in one panel.

---

## Add Node UX

| Option | Description | Selected |
|--------|-------------|----------|
| Canvas toolbar "+ Add" button | Button strip above React Flow, adds node at viewport center offset | ✓ |
| Double-click empty canvas | Adds node at click position | |
| Keyboard shortcut only | No visual affordance | |

**Auto-selected:** Canvas toolbar "+ Add" button
**Rationale:** Most discoverable; doesn't conflict with React Flow's native double-click behavior; can include diagram-specific labels ("+ Add Class", "+ Add Entity", "+ Add State").

---

## Composite State Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Canvas shows read-only notice | StateCanvas detects flag, renders notice instead of canvas | ✓ |
| Fall through to RawModel | Parser returns RawModel for composite diagrams | |
| Show canvas but disable editing | Canvas renders but all edit actions are disabled | |

**Auto-selected:** Canvas shows read-only notice
**Rationale:** Matches STT-05 requirement text exactly ("fall back to RawModel with a read-only notice"). Implemented at the canvas level (checks `hasCompositeStates` flag) rather than the parser level (RawModel) to preserve syntax highlighting in the source editor. The notice uses the same thin-strip styling as the Phase 1 error banner.

---

## ERCanvas Cardinality Fix

| Option | Description | Selected |
|--------|-------------|----------|
| Store cardA/cardB in edge.data | flowToModel reads from edge.data, modelToFlow writes to edge.data | ✓ |
| Keep hardcoded, fix via serializer hack | Emit || hardcoded always | |

**Auto-selected:** Store cardA/cardB in edge.data
**Rationale:** This is the correct fix for the blocker noted in STATE.md. ERRelation already has cardA/cardB fields in the parser — they just weren't being carried through to edge.data in modelToFlow.

---

## ClassCanvas Round-Trip

| Option | Description | Selected |
|--------|-------------|----------|
| Extend ClassRelation with cardA/cardB, serialize with quotes | "1" --> "n" notation | ✓ |
| Omit cardinality from class canvas (use label field instead) | User types cardinality in label field | |

**Auto-selected:** Extend ClassRelation with cardA/cardB
**Rationale:** Mermaid class diagram syntax supports quoted cardinality labels. Storing them as first-class fields in the model gives a cleaner round-trip. The label field can still be used for relationship labels (not cardinality).

---

## State Editor Paradigm

| Option | Description | Selected |
|--------|-------------|----------|
| Keep canvas approach (StateCanvas exists) | Canvas-based editing; requirements "form editor" is descriptive | ✓ |
| Replace with form editor | Listed form UI like GanttEditor/SequenceEditor | |

**Auto-selected:** Keep canvas approach
**Rationale:** StateCanvas already exists and handles state/transition visualization correctly. Replacing it with a form editor would regress functionality. The REQUIREMENTS.md "form editor" language is interpreted as describing the editing capability generally, not mandating a literal form UI.

---

## Claude's Discretion

- Exact popover positioning logic (anchor above/below based on viewport bounds)
- Generated default IDs for new nodes
- Column layout inside popovers

## Deferred Ideas

None — discussion stayed within phase scope.
