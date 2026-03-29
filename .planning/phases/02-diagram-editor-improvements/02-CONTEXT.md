# Phase 2: Diagram Editor Improvements - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning
**Mode:** auto (all decisions selected by Claude with recommended defaults)

<domain>
## Phase Boundary

Extend the three existing canvas components (ClassCanvas, ERCanvas, StateCanvas) from "view and connect" to "full CRUD with round-trip fidelity." No data loss on canvas edits.

Scope includes:
- **Class diagram**: inline editing of class name/attributes/methods, relationship type picker (6 types), cardinality on both ends of a relationship
- **ER diagram**: inline editing of entity attributes (name, type, key designator), relationship configuration (cardinality both ends, identifying vs non-identifying, label), fix hardcoded cardinality bug
- **State diagram**: add state / add transition UI, delete both, composite state detection and RawModel fallback with read-only notice

This phase does NOT include: AI features, new diagram types beyond class/ER/state, or changes to the parse/serialize pipeline beyond fixing round-trip bugs.

</domain>

<decisions>
## Implementation Decisions

### Inline Editing UX
- **D-01:** Double-click a class node or ER entity node opens an **edit popover** (small floating panel anchored to the node) with form fields for the node's content. For class nodes: name, annotation, members (list with add/remove), methods (list with add/remove). For ER entities: entity name, attribute rows (type, name, key designator). Popover closes on outside-click or Escape.
- **D-02:** Editing state is local to the popover — changes are committed when the popover closes (not live-typed). On commit, the node's data is updated via `setNodes`, which triggers the canvas→source sync cycle.
- **D-03:** State diagram nodes (NormalStateNode) support rename via double-click — simpler inline input overlay within the node (no compartments, just a single label). Start/end nodes are not editable.

### Relationship Type & Cardinality
- **D-04:** Clicking a class diagram edge (relationship) shows an **edge inspector popover** with:
  - Relationship type dropdown: `inheritance`, `composition`, `aggregation`, `association`, `dependency`, `realization` (the 6 ClassRelationType values)
  - Label text field (optional)
  Changes write to `edge.data.relType` and `edge.label`, triggering sync.
- **D-05:** Clicking an ER diagram edge shows an **edge inspector popover** with:
  - Left cardinality (cardA): `||`, `|o`, `o|`, `}|`, `|{`, `}o`, `o{`, `}{` — display as human-readable labels (e.g. "exactly one", "zero or one", etc.)
  - Right cardinality (cardB): same options
  - Relationship type: "identifying" (solid line) vs "non-identifying" (dashed line) — stored as `edge.data.identifying: boolean`
  - Label text field
  Changes write to `edge.data`, triggering sync.
- **D-06:** The `flowToModel` function for ERCanvas reads `edge.data.cardA`, `edge.data.cardB`, `edge.data.identifying`, and `edge.label` instead of hardcoded values. This fixes the blocker noted in STATE.md.
- **D-07:** The `flowToModel` function for ClassCanvas already reads `edge.data.relType` — the gap is that newly-created edges (via `onConnect`) don't set a default relType. Fix: `onConnect` writes `data: { relType: "association" }` as the default on new edges.

### Add Node UX
- **D-08:** Each canvas (class, ER, state) has a small **toolbar strip** above the React Flow canvas — not the global app toolbar. It contains diagram-specific actions: "+ Add Class", "+ Add Entity" / "+ Add State". Clicking adds a new node at a fixed offset from viewport center with a generated default ID.
- **D-09:** State canvas toolbar also shows "+ Add Transition" which enters a "connect mode" — cursor changes, user clicks source then target node to create a transition edge. (Alternative: users can already drag from node handles; the button provides a more discoverable path but handle-drag remains the primary method.)
- **D-10:** Delete: existing behavior (select node → "x" button in selection toolbar) is kept. Edges can be deleted by selecting them (React Flow allows edge selection) and pressing Backspace/Delete key.

### Composite State Handling
- **D-11:** The `parseState` function (in `parsers/index.ts`) detects composite state syntax: `state "X" { ... }` blocks, `--` concurrency dividers, fork/join pseudo-states (`<<fork>>`, `<<join>>`). If any are present, the parser returns a `StateModel` with a `hasCompositeStates: true` flag.
- **D-12:** `StateCanvas` checks the `hasCompositeStates` flag on the parsed model. If true, renders a **read-only notice** instead of the editable canvas: "This diagram uses composite state syntax (nested states, concurrency, or fork/join). Visual editing is not available — edit in the source editor." No RawModel fallback needed; the canvas component itself shows the notice.
- **D-13:** Note: `StateModel` interface needs a `hasCompositeStates?: boolean` field added. The `serializeState` function is unchanged — it only operates on the `states` and `transitions` arrays.

### ERCanvas Cardinality Fix
- **D-14:** When the ER parser reads a relationship, cardinalities (`cardA`, `cardB`) are stored in the React Flow edge as `data: { cardA, cardB, identifying, label }`. The `modelToFlow` function for ER must map `ERRelation.cardA/cardB` into `edge.data`, not just into `edge.label`.
- **D-15:** The default cardinality for newly-created edges (via `onConnect`) is `cardA: "||"`, `cardB: "||"`, `identifying: true`, `label: ""`. This is the most conservative default (exactly one on both ends, solid line).

### ClassCanvas Round-Trip
- **D-16:** The serializer must emit cardinality notation if present (currently `serializeClass` only emits relationship type arrows, not cardinality labels). Check `ClassRelation` — if it has `cardA`/`cardB` fields, serialize them. If not, skip cardinality for class diagrams (class diagrams in Mermaid use label for cardinality: `Class1 "1" --> "n" Class2`). Extend `ClassRelation` with optional `cardA?: string` and `cardB?: string` fields.

### Claude's Discretion
- Exact popover positioning (anchor above/below node based on viewport bounds) — use similar logic to DiagramTypePicker's existing anchor detection
- Column layout inside popovers (single-column form vs two-column for compact display)
- Generated default IDs for new nodes (incrementing counter like `Class1`, `Entity1`, `State1`)
- Whether the edge inspector is a popover or a fixed side panel — popover is recommended to stay consistent with node editing

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Canvas Components (to extend)
- `src/client/components/Canvas/ClassCanvas.tsx` — current class diagram canvas; `flowToModel` and `modelToFlow` need extending for round-trip and editing
- `src/client/components/Canvas/ERCanvas.tsx` — current ER canvas; `flowToModel` hardcodes cardinalities (STATE.md blocker)
- `src/client/components/Canvas/StateCanvas.tsx` — current state canvas; needs composite detection, add/delete UI
- `src/client/components/Canvas/FlowchartCanvas.tsx` — **reference implementation** for suppressSyncRef/ownUpdateRef pattern

### Parsers & Serializers (to extend)
- `src/client/lib/parsers/index.ts` — `parseClass()` (line 656), `parseState()` (line 749), `parseER()` (line 822); StateModel interface needs `hasCompositeStates` field; ClassRelation needs `cardA`/`cardB` fields
- `src/client/lib/serializers/index.ts` — `serializeClass()`, `serializeState()`, `serializeER()`; class serializer needs cardinality output

### Canvas Dispatcher
- `src/client/components/Canvas/index.tsx` — registers ClassCanvas, ERCanvas, StateCanvas; no changes expected but verify dispatch works

### Requirements
- `.planning/REQUIREMENTS.md` §Class Diagram Editor (CLS-01 through CLS-07)
- `.planning/REQUIREMENTS.md` §ER Diagram Editor (ER-01 through ER-08)
- `.planning/REQUIREMENTS.md` §State Diagram Editor (STT-01 through STT-05)

### STATE.md Blockers (must resolve)
- `.planning/STATE.md` §Blockers/Concerns — "ERCanvas.flowToModel hardcodes cardinalities; ClassCanvas.flowToModel has incomplete round-trip. Audit both before marking editors production-ready."

### Prior Phase Context
- `.planning/phases/01-error-recovery-templates/01-CONTEXT.md` — CSS custom property palette and UI pattern decisions that apply here

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- React Flow `useNodesState`/`useEdgesState` + `useReactFlow()` hooks: already in use in all three canvases
- `suppressSyncRef`/`ownUpdateRef` pattern: established in FlowchartCanvas, already copied into ClassCanvas/ERCanvas/StateCanvas
- `computeLayout()`: BFS layered layout, already imported in all three canvases
- CSS custom properties: `--bg-surface`, `--bg-secondary`, `--text-primary`, `--text-muted`, `--accent`, `--border` — use for popovers
- Selection toolbar pattern (small `<div>` that appears `absolute -bottom-7` when node `selected`): already in ClassCanvas, ERCanvas, StateCanvas — reuse for "edit" button

### Established Patterns
- Node editing: select → selection toolbar with "x" (delete) button. **Extend this pattern with an "edit" button that opens the edit popover.**
- Sync cycle: canvas changes → `useEffect([nodes, edges])` → 1.5s debounce → `serialize(flowToModel(...))` → `onSourceChange()`
- Source→canvas: `useEffect([source])` → `parse(source)` → `suppressSyncRef.current = true` → `setNodes/setEdges`

### Integration Points
- `ClassRelation` type in parsers: add `cardA?: string`, `cardB?: string` optional fields for cardinality labels
- `StateModel` type in parsers: add `hasCompositeStates?: boolean` optional field
- `ERRelation` type in parsers: `cardA`/`cardB` already exist — just not being passed through to edge.data in modelToFlow
- The canvas toolbar strip is new (no existing toolbar inside canvas components); add above the `<ReactFlow>` element, styled with `--bg-secondary`/`--border`

</code_context>

<specifics>
## Specific Ideas

- STATE.md explicitly flags the ERCanvas cardinality bug and ClassCanvas round-trip as blockers for production-readiness. These are the highest-priority fixes.
- The composite state fallback notice (D-12) should be styled consistently with the Phase 1 error banner — a thin strip using the same CSS custom properties.
- For the ER cardinality picker, displaying human-readable labels ("exactly one", "zero or more", etc.) alongside the Mermaid notation (`||`, `|{`, etc.) will help users who aren't familiar with crow's foot notation.
- Mermaid class diagram cardinality uses string labels in quotes: `Class1 "1" --> "n" Class2`. The serializer needs to emit `"${cardA}" ${arrow} "${cardB}"` when cardA/cardB are set on a ClassRelation.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-diagram-editor-improvements*
*Context gathered: 2026-03-28*
