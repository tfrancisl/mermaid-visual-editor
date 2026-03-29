# Phase 2: Diagram Editor Improvements - Research

**Researched:** 2026-03-28
**Domain:** React Flow canvas editing, Mermaid class/ER/state diagram round-trip fidelity
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Double-click a class node or ER entity node opens an edit popover (small floating panel anchored to the node) with form fields for the node's content. For class nodes: name, annotation, members (list with add/remove), methods (list with add/remove). For ER entities: entity name, attribute rows (type, name, key designator). Popover closes on outside-click or Escape.

**D-02:** Editing state is local to the popover — changes are committed when the popover closes (not live-typed). On commit, the node's data is updated via `setNodes`, which triggers the canvas→source sync cycle.

**D-03:** State diagram nodes (NormalStateNode) support rename via double-click — simpler inline input overlay within the node (no compartments, just a single label). Start/end nodes are not editable.

**D-04:** Clicking a class diagram edge shows an edge inspector popover with: relationship type dropdown (6 ClassRelationType values), label text field. Changes write to `edge.data.relType` and `edge.label`, triggering sync.

**D-05:** Clicking an ER diagram edge shows an edge inspector popover with: cardA picker, cardB picker (8 crow's foot symbols, displayed as human-readable labels), relationship type (identifying=solid / non-identifying=dashed), label text field. Changes write to `edge.data`, triggering sync.

**D-06:** `flowToModel` for ERCanvas reads `edge.data.cardA`, `edge.data.cardB`, `edge.data.identifying`, and `edge.label` instead of hardcoded values.

**D-07:** `flowToModel` for ClassCanvas: newly-created edges (via `onConnect`) write `data: { relType: "association" }` as default on new edges.

**D-08:** Each canvas (class, ER, state) has a small toolbar strip above the React Flow canvas — not the global app toolbar. It contains diagram-specific actions: "+ Add Class", "+ Add Entity" / "+ Add State".

**D-09:** State canvas toolbar shows "+ Add Transition" which enters a "connect mode" — cursor changes, user clicks source then target node to create a transition edge.

**D-10:** Delete: existing behavior (select node → "x" button in selection toolbar) is kept. Edges can be deleted by selecting them (React Flow allows edge selection) and pressing Backspace/Delete key.

**D-11:** `parseState` detects composite state syntax: `state "X" { ... }` blocks, `--` concurrency dividers, fork/join pseudo-states (`<<fork>>`, `<<join>>`). If any are present, returns a `StateModel` with `hasCompositeStates: true` flag.

**D-12:** `StateCanvas` checks `hasCompositeStates` flag. If true, renders a read-only notice instead of editable canvas: "This diagram uses composite state syntax (nested states, concurrency, or fork/join). Visual editing is not available — edit in the source editor."

**D-13:** `StateModel` interface needs a `hasCompositeStates?: boolean` field added. `serializeState` function is unchanged.

**D-14:** When ER parser reads a relationship, cardinalities (`cardA`, `cardB`) are stored in the React Flow edge as `data: { cardA, cardB, identifying, label }`. `modelToFlow` for ER must map `ERRelation.cardA/cardB` into `edge.data`.

**D-15:** Default cardinality for newly-created ER edges: `cardA: "||"`, `cardB: "||"`, `identifying: true`, `label: ""`.

**D-16:** Serializer must emit cardinality notation for class diagrams if present. `ClassRelation` extended with optional `cardA?: string` and `cardB?: string` fields. Mermaid syntax: `Class1 "1" --> "n" Class2`.

### Claude's Discretion

- Exact popover positioning (anchor above/below node based on viewport bounds) — use similar logic to DiagramTypePicker's existing anchor detection
- Column layout inside popovers (single-column form vs two-column for compact display)
- Generated default IDs for new nodes (incrementing counter like `Class1`, `Entity1`, `State1`)
- Whether the edge inspector is a popover or a fixed side panel — popover is recommended to stay consistent with node editing

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CLS-01 | User can add a class to a class diagram via the visual editor | D-08: toolbar "+ Add Class" button; `setNodes` with generated ID |
| CLS-02 | User can delete a class from the visual editor | Existing "x" selection toolbar button already works (D-10) |
| CLS-03 | User can edit class name, attributes, and methods inline in the visual editor | D-01/D-02: edit popover on double-click; `setNodes` on commit |
| CLS-04 | User can drag to create a relationship between two classes | Already works via React Flow `onConnect`; D-07 fixes default data |
| CLS-05 | User can set relationship type (inheritance, composition, aggregation, association, dependency, realization) | D-04: edge inspector popover with 6-item dropdown |
| CLS-06 | User can set cardinality on both ends of a relationship | D-16: `ClassRelation` extended with `cardA?`/`cardB?`; edge inspector adds two fields |
| CLS-07 | Class diagram canvas changes sync back to valid Mermaid source within 1.5s | Existing 1.5s debounce in canvas→source `useEffect` covers this |
| ER-01 | User can add an entity to an ER diagram via the visual editor | D-08: toolbar "+ Add Entity" button |
| ER-02 | User can delete an entity from the visual editor | Existing "x" selection toolbar button (D-10) |
| ER-03 | User can edit entity attributes (name, type, key designator) inline | D-01/D-02: edit popover for ER nodes |
| ER-04 | User can drag to create a relationship between two entities | Already works via `onConnect`; D-15 fixes default data |
| ER-05 | User can set relationship cardinality on both ends | D-05/D-06: edge inspector popover; `flowToModel` reads `edge.data` |
| ER-06 | User can set identifying vs non-identifying relationship | D-05: identifying checkbox/toggle in edge inspector; serializer uses `--` vs `..` |
| ER-07 | User can add a label to a relationship | D-05: label text field in edge inspector |
| ER-08 | ER diagram canvas changes sync back to valid Mermaid source without data loss | D-06: `flowToModel` reads all data from edge.data instead of hardcoding |
| STT-01 | User can add a state to a state diagram via a form editor | D-08: toolbar "+ Add State" button |
| STT-02 | User can add a transition between states with an optional label | D-09: "+ Add Transition" connect mode; existing handle-drag |
| STT-03 | User can delete states and transitions | Existing "x" button for nodes (D-10); Backspace/Delete for edges |
| STT-04 | State diagram source parses and serializes without data loss for simple state diagrams | Existing `serializeState` is correct; confirm round-trip test coverage |
| STT-05 | Composite state syntax falls back to RawModel with a read-only notice | D-11/D-12: `hasCompositeStates` flag + read-only notice in StateCanvas |
</phase_requirements>

---

## Summary

Phase 2 extends three existing React Flow canvas components (ClassCanvas, ERCanvas, StateCanvas) from read/connect-only to full CRUD with round-trip fidelity. The work is primarily TypeScript/React — no new dependencies, no new npm packages. All three canvases already implement the `suppressSyncRef`/`ownUpdateRef` sync guards and the 1.5s debounce canvas→source cycle.

The primary technical work breaks into four categories: (1) fixing round-trip bugs in `flowToModel` for ERCanvas (hardcoded cardinalities) and ClassCanvas (missing `cardA`/`cardB`), (2) adding add-node toolbar buttons to all three canvases, (3) adding edit popovers for nodes and edge inspector popovers for edges, and (4) adding composite state detection and a read-only fallback notice to StateCanvas.

The `ClassRelation` type already has `sourceCardinality?`/`targetCardinality?` fields — these will be renamed to `cardA?`/`cardB?` per the decisions, or the existing fields can be used directly. The `ERRelation` type already has `cardA`/`cardB` fields — the gap is that `modelToFlow` puts them in `sourceLabel`/`targetLabel` (display only) rather than `edge.data`. The `identifying` concept for ER does not exist in the current `ERRelation` type — it must be added, and the parser must detect `--` (solid, identifying) vs `..` (dashed, non-identifying) in the relationship line.

**Primary recommendation:** Fix ERCanvas `flowToModel` first (it's the explicitly-flagged STATE.md blocker), then add type system extensions (`cardA`/`cardB` on ClassRelation, `identifying` on ERRelation, `hasCompositeStates` on StateModel), then implement the popover/toolbar UI layer.

## Standard Stack

### Core (all already in use — no new installs)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@xyflow/react` | v12 (existing) | React Flow canvas, node/edge state, `useReactFlow()`, `useNodesState`/`useEdgesState` | Already used in all 3 canvases |
| React 18 | existing | Component state, `useState`, `useRef`, `useEffect` | Project stack |
| TypeScript strict | existing | Type safety across canvas, parser, serializer | Project constraint |
| Tailwind CSS | existing | Popover and toolbar styling via CSS custom properties | Project constraint |

### No new dependencies needed
This phase is pure extension of existing code. No new npm packages. No new Rust crates.

## Architecture Patterns

### Recommended Structure for New Files

```
src/client/components/Canvas/
├── ClassCanvas.tsx          — extend (toolbar, edit popover, edge inspector)
├── ERCanvas.tsx             — extend (fix flowToModel, toolbar, edit popover, edge inspector)
├── StateCanvas.tsx          — extend (composite detection, rename inline, toolbar)
├── FlowchartCanvas.tsx      — reference only (do not modify)
└── (no new files required — popovers inline in canvas component files)
```

### Pattern 1: Edit Popover (double-click node → floating form)

The FlowchartCanvas already implements double-click inline editing via `updateNodeData`. For class and ER nodes the form is more complex (multi-field), so use a popover overlay positioned relative to the node.

**Implementation strategy:**
- Track `editingNodeId: string | null` in canvas state
- On `onNodeDoubleClick(_, node)`, set `editingNodeId = node.id`
- Render popover as `position: absolute` inside the ReactFlow container, using `useReactFlow().getNode(id)?.position` converted to screen coords via `useReactFlow().flowToScreenPosition()` for anchoring
- On popover close (outside-click via `useEffect` + `mousedown` listener, or Escape key), call `setNodes` with updated data

```typescript
// Source: codebase analysis of FlowchartCanvas.tsx + @xyflow/react v12 API
const { flowToScreenPosition } = useReactFlow();

function openEditPopover(nodeId: string) {
  setEditingNodeId(nodeId);
}

// Popover anchor: node position → screen coords
const node = useReactFlow().getNode(editingNodeId ?? "");
const screenPos = node ? flowToScreenPosition(node.position) : null;
```

### Pattern 2: Edge Inspector Popover (click edge → floating form)

React Flow supports `onEdgeClick` callback. Use a similar state pattern to node editing:
- Track `editingEdgeId: string | null`
- On `onEdgeClick(_, edge)`, set `editingEdgeId = edge.id`
- Position popover near the edge midpoint using `edge.sourceX/targetX` interpolation, or simply fixed near the click event coordinates via `MouseEvent.clientX/Y`
- On close, call `setEdges` with updated data and clear `editingEdgeId`

```typescript
// Source: @xyflow/react v12 onEdgeClick API
const onEdgeClick = useCallback(
  (_event: React.MouseEvent, edge: Edge) => {
    setEditingEdgeId(edge.id);
  },
  []
);
```

### Pattern 3: Add Node via Toolbar Button

```typescript
// Source: @xyflow/react v12 useReactFlow() API
const { getViewport, screenToFlowPosition } = useReactFlow();

function addNode(type: "class" | "entity" | "state") {
  const viewport = getViewport();
  // Place new node at viewport center
  const position = screenToFlowPosition({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });
  const id = generateId(type); // "Class1", "Entity1", "State1"
  setNodes((ns) => [...ns, {
    id,
    type: nodeTypeMap[type],
    position,
    data: defaultNodeData(type, id),
  }]);
}
```

### Pattern 4: Composite State Detection

The `parseState` function currently skips `state "X" {` lines with `if (line.startsWith("state ")) continue;`. This means nested states are silently dropped. The detection flag hooks into this existing skip path.

```typescript
// Composite detection markers
const COMPOSITE_PATTERNS = [
  /^state\s+(?:"\w+"|\w+)\s*\{/,          // state Name { or state "Label" {
  /^--$/,                                   // concurrency divider
  /^state\s+\w+\s+<<(?:fork|join)>>/,      // fork/join pseudo-states
];

// In parseState loop: set hasCompositeStates = true if any pattern matches
```

### Pattern 5: ER Identifying vs Non-Identifying

In Mermaid ER syntax: `--` (double dash) = identifying relationship (solid line); `..` (double dot) = non-identifying (dashed line). The current parser regex matches `--` only. Extend to capture:

```
/^(\w+)\s+(\|[|o{]|o[|{]|}\||}o)(--|\.\.)(\|[|o{]|o[|{]|}\||}o)\s+(\w+)\s*:\s*(.+)$/
```

- Group 3 is `--` or `..` → `identifying: true/false`

The serializer must then emit `--` or `..` based on `r.identifying`.

### Anti-Patterns to Avoid

- **Live-typed sync in popovers:** Do NOT call `setNodes` on every keypress inside the popover. Commit only on close. (D-02 locks this.)
- **Replacing entire edges array in onEdgeClick:** Use functional `setEdges` update to avoid stale closures.
- **Re-parsing on every canvas interaction:** The `suppressSyncRef`/`ownUpdateRef` pattern is required in every canvas change path. Missing either guard causes infinite loops.
- **RawModel fallback for composite states:** Per D-12, StateCanvas shows its own read-only notice — it does NOT fall back to RawModel. The model type stays `stateDiagram-v2` with `hasCompositeStates: true`.
- **Breaking the `serializeState` function:** D-13 locks that `serializeState` is unchanged. The `hasCompositeStates` flag is parser/canvas-only.
- **Using `setValue()` in Monaco:** All programmatic edits use `executeEdits()` per the Milestone 2 decision in STATE.md.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Popover outside-click detection | Custom event delegation tree | `useEffect` + `document.addEventListener("mousedown", handler)` pattern | Standard React pattern; already used in DiagramTypePicker |
| Node position → screen position | Manual viewport math | `useReactFlow().flowToScreenPosition()` | @xyflow/react v12 built-in |
| Edge midpoint for popover anchor | Bezier math | Use `onEdgeClick` `MouseEvent.clientX/Y` directly | Simpler, good enough for inspector placement |
| Cardinality display labels | Custom lookup | `cardLabel()` function already exists in ERCanvas (lines 80-88) | Extend the existing switch, don't duplicate |
| ID generation for new nodes | UUID library | Simple incrementing counter with prefix (`Class1`, `Class2`, etc.) | Low collision risk, deterministic, no dep needed |

## Common Pitfalls

### Pitfall 1: ERCanvas flowToModel Hardcoded Cardinalities (STATE.md blocker)
**What goes wrong:** `flowToModel` in ERCanvas.tsx (line 131-132) hardcodes `cardA: "||" as const, cardB: "|{" as const`. Every canvas edit overwrites the user's cardinalities with these defaults.
**Why it happens:** `edge.data` was never populated with cardinality data from `modelToFlow`.
**How to avoid:** Fix `modelToFlow` to write `data: { cardA: r.cardA, cardB: r.cardB, identifying: r.identifying, label: r.label }`. Then `flowToModel` reads `(e.data as EREdgeData).cardA` etc.
**Warning signs:** Round-trip test for `erDiagram` passes only if test input uses `||` and `|{` defaults.

### Pitfall 2: `identifying` field missing from ERRelation type
**What goes wrong:** The `ERRelation` interface has no `identifying` field. The parser regex only captures `--` (identifying); `..` (non-identifying) is not parsed.
**Why it happens:** Original parser only needed to render, not preserve relationship type.
**How to avoid:** Add `identifying?: boolean` to `ERRelation` interface. Extend parser regex to capture `--` vs `..`. Extend `serializeER` to emit `--` or `..` based on the field.

### Pitfall 3: `suppressSyncRef` race on popover commit
**What goes wrong:** If popover commit calls `setNodes` without setting `suppressSyncRef`, the canvas→source `useEffect` fires immediately and serializes the partial state before React has fully reconciled.
**Why it happens:** React batches state updates but the `useEffect` for canvas→source runs after the batch.
**How to avoid:** The 1.5s debounce in the canvas→source `useEffect` provides sufficient buffer. No special handling needed — just ensure `setNodes` is called normally and the timer resets.

### Pitfall 4: Popover z-index conflict with React Flow controls
**What goes wrong:** Popover appears behind React Flow's built-in controls (minimap, controls panel) or behind other UI layers.
**Why it happens:** React Flow renders controls at high z-index inside its own stacking context.
**How to avoid:** Render the popover inside the same React Flow container `<div>` (not outside it), and use `z-50` or higher Tailwind utility. Alternatively use React Portal to body.

### Pitfall 5: ClassRelation cardinality field naming collision
**What goes wrong:** `ClassRelation` already has `sourceCardinality?: string` and `targetCardinality?: string` fields (parser lines 126-127). The CONTEXT decisions reference `cardA`/`cardB`.
**Why it happens:** The existing fields were added before the CONTEXT decisions were written.
**How to avoid:** Use the existing `sourceCardinality`/`targetCardinality` field names (they already exist and are typed) rather than adding new `cardA`/`cardB` fields. This avoids a type-breaking rename. Update CONTEXT references accordingly — the field names are Claude's discretion per D-16's intent.

### Pitfall 6: `parseERCardinality` function has a bug
**What goes wrong:** `parseERCardinality` (parsers line 815-820) maps `"|o"` to `"||"` and `"o{"` appears twice in different cases. The result is that some valid Mermaid ER cardinality notations are silently normalized to `"||"`.
**Why it happens:** The switch cases are incorrect:
```typescript
if (s === "||" || s === "|o") return "||";  // "|o" should be "o|"
if (s === "|{" || s === "}|") return "|{";  // correct
if (s === "o|" || s === "o{") return "o|";  // "o{" should map to "o{"
if (s === "o{" || s === "}o") return "o{";  // dead code: "o{" already returned above
```
**How to avoid:** Fix `parseERCardinality` as part of this phase. Map each notation to its canonical form correctly.

### Pitfall 7: State canvas "[*]" node identity
**What goes wrong:** Multiple `[*]` transitions in a state diagram should create separate start and end nodes, but the current parser stores only one node per `[*]` ID — the first occurrence is `kind: "start"`, later `[*]` as a target is overwritten to `kind: "end"` but it's the same node object.
**Why it happens:** `ensureState` uses `[*]` as the map key, so start and end are the same node.
**How to avoid:** When adding states (STT-01), be aware that new normal states must never use ID `[*]`. Generated IDs should be `State1`, `State2`, etc. The start/end node issue is pre-existing scope — do not break existing behavior, just don't introduce new issues.

## Code Examples

### ERCanvas modelToFlow — correct edge.data population
```typescript
// Fix: populate edge.data with all ER relation fields
const edges: Edge[] = model.relations.map((r) => ({
  id: r.id,
  source: r.entityA,
  target: r.entityB,
  label: r.label,
  data: {
    cardA: r.cardA,
    cardB: r.cardB,
    identifying: r.identifying ?? true,
    label: r.label,
  },
  style: {
    stroke: "var(--text-muted)",
    strokeDasharray: (r.identifying === false) ? "5 3" : undefined,
  },
  labelStyle: { fill: "var(--text-primary)", fontSize: 11 },
  labelBgStyle: { fill: "var(--bg-surface)" },
}));
```

### ERCanvas flowToModel — read from edge.data
```typescript
// Fix: read cardinality from edge.data, not hardcoded defaults
type EREdgeData = { cardA: ERCardinality; cardB: ERCardinality; identifying: boolean; label: string };

const relations = edges.map((e) => {
  const d = (e.data ?? {}) as Partial<EREdgeData>;
  return {
    id: e.id,
    entityA: e.source,
    entityB: e.target,
    cardA: d.cardA ?? "||",
    cardB: d.cardB ?? "||",
    identifying: d.identifying ?? true,
    label: d.label ?? String(e.label ?? "relates"),
  };
});
```

### serializeER — emit identifying vs non-identifying
```typescript
function serializeER(model: ERModel): string {
  const lines = ["erDiagram"];
  for (const r of model.relations) {
    const connector = r.identifying === false ? ".." : "--";
    lines.push(`    ${r.entityA} ${erCardStr(r.cardA)}${connector}${erCardStr(r.cardB)} ${r.entityB} : ${r.label}`);
  }
  // ... entities
}
```

### serializeClass — emit cardinality labels
```typescript
for (const r of model.relations) {
  const label = r.label ? ` : ${r.label}` : "";
  const srcCard = r.sourceCardinality ? ` "${r.sourceCardinality}"` : "";
  const tgtCard = r.targetCardinality ? ` "${r.targetCardinality}"` : "";
  lines.push(`    ${r.source}${srcCard} ${classRelArrow(r.type)}${tgtCard} ${r.target}${label}`);
}
// Mermaid syntax: Class1 "1" --> "n" Class2 : label
```

### StateModel interface extension
```typescript
export interface StateModel {
  type: "stateDiagram-v2";
  states: StateNode[];
  transitions: StateTransition[];
  hasCompositeStates?: boolean;  // add this field
  rawLines: string[];
}
```

### Composite state detection in parseState
```typescript
// At the start of parseState, before the loop:
let hasCompositeStates = false;

// Inside the loop, before/after existing checks:
if (line.match(/^state\s+(?:"[^"]+"|[\w-]+)\s*\{/) ||
    line === "--" ||
    line.match(/^state\s+[\w-]+\s+<<(?:fork|join)>>/)) {
  hasCompositeStates = true;
}

// Return:
return { type: "stateDiagram-v2", states: [...stateMap.values()], transitions, hasCompositeStates, rawLines: lines };
```

### StateCanvas composite notice
```typescript
// In StateCanvasInner render:
const [isComposite, setIsComposite] = useState(false);

// In source → canvas useEffect:
const sm = model as StateModel;
if (sm.hasCompositeStates) {
  setIsComposite(true);
  return; // don't setNodes/setEdges
}
setIsComposite(false);

// In render (before ReactFlow):
if (isComposite) {
  return (
    <div className="flex-1 flex items-center justify-center p-4 text-sm text-[var(--text-muted)] text-center">
      This diagram uses composite state syntax (nested states, concurrency, or fork/join).
      Visual editing is not available — edit in the source editor.
    </div>
  );
}
```

### Add node via toolbar (pattern for all 3 canvases)
```typescript
// ClassCanvas toolbar example
function addNewClass() {
  const count = nodes.filter(n => n.data.classId?.startsWith("Class")).length;
  const id = `Class${count + 1}`;
  const { x, y, zoom } = getViewport();
  const position = {
    x: (-x + window.innerWidth / 2) / zoom,
    y: (-y + window.innerHeight / 2) / zoom,
  };
  setNodes((ns) => [...ns, {
    id,
    type: "umlClass",
    position,
    data: { classId: id, label: id, members: [], methods: [] } satisfies ClassNodeData,
  }]);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded cardinalities in ERCanvas.flowToModel | Read from edge.data | This phase | Fixes ER round-trip data loss (STATE.md blocker) |
| No cardinality on class relations | `sourceCardinality`/`targetCardinality` fields on ClassRelation | Already in type (lines 126-127) | Serializer now needs to use them |
| No composite state detection | `hasCompositeStates` flag + read-only canvas notice | This phase | Correct behavior for diagrams the editor can't handle |

## Open Questions

1. **`parseERCardinality` bug — is the test template affected?**
   - What we know: The function has incorrect mappings (see Pitfall 6). The round-trip test uses `TEMPLATES["erDiagram"]`.
   - What's unclear: Whether the existing test template uses only `||` and `|{` (which happen to work correctly), or whether it uses `o|`/`o{` notation.
   - Recommendation: Fix the function as part of this phase regardless; add specific test cases for all 8 cardinality symbols.

2. **Popover anchor when node is near viewport edge**
   - What we know: CONTEXT D-01 says to use similar logic to DiagramTypePicker's existing anchor detection.
   - What's unclear: DiagramTypePicker uses a simple `getBoundingClientRect` check — may need adaptation for React Flow coordinate space.
   - Recommendation: Start with simple above/below logic; add left/right adjustment if it clips in testing.

3. **Class cardinality parsing — CLASS_RELATION_RE needs extension**
   - What we know: The current regex `CLASS_RELATION_RE` does not capture cardinality labels in quotes (e.g., `Class1 "1" --> "n" Class2`).
   - What's unclear: How common cardinality annotations are in existing user diagrams — if users have source with cardinalities, the parser currently strips them silently.
   - Recommendation: Extend `CLASS_RELATION_RE` to optionally capture `"cardA"` before the arrow and `"cardB"` after, storing in `sourceCardinality`/`targetCardinality`. This is required for round-trip fidelity (CLS-06).

## Environment Availability

Step 2.6: SKIPPED — this phase is purely frontend TypeScript/React code changes with no external runtime dependencies beyond the existing dev stack (Nix flake, bun, Vite).

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis — `src/client/components/Canvas/ClassCanvas.tsx`, `ERCanvas.tsx`, `StateCanvas.tsx`, `FlowchartCanvas.tsx`
- Direct codebase analysis — `src/client/lib/parsers/index.ts`, `src/client/lib/serializers/index.ts`
- Direct codebase analysis — `src/client/lib/__tests__/roundtrip.test.ts`, `parsers.test.ts`
- Phase 2 CONTEXT.md — all locked decisions
- REQUIREMENTS.md — CLS-01 through STT-05
- STATE.md — documented blockers

### Secondary (MEDIUM confidence)
- @xyflow/react v12 API patterns — inferred from existing canvas code which already uses `useReactFlow()`, `useNodesState`, `onEdgeClick`, `flowToScreenPosition`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all libraries already integrated
- Architecture patterns: HIGH — extrapolated from existing FlowchartCanvas reference implementation in same codebase
- Pitfalls: HIGH — most identified from direct code inspection (not theory)
- Round-trip bugs: HIGH — confirmed by reading the hardcoded values in ERCanvas.flowToModel and the regex gaps in the class parser

**Research date:** 2026-03-28
**Valid until:** Indefinite (no external dependencies; all findings from codebase inspection)
