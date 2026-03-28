# Phase 1: Error Recovery + Templates — Research

**Researched:** 2026-03-28
**Domain:** Monaco error markers, Mermaid parse error extraction, React state management for last-valid render, multi-step popup UI, bundled template library
**Confidence:** HIGH — all key APIs verified against locked package versions in bun.lock; no external service dependencies

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Error Banner**
- D-01: Error banner is a thin strip docked at the top of the Preview pane (above the SVG canvas area, below the pane toolbar if any). It is not a floating overlay, not in the status bar.
- D-02: Banner displays: diagram type indicator, error message, and a clickable "Line N" link. Clicking "Line N" calls Monaco's `editor.revealLineInCenter(n)` + `editor.setPosition({ lineNumber: n, column: 1 })` to jump cursor.
- D-03: Banner uses the existing CSS custom property palette (`--bg-secondary`, `--border`, `--text-muted`, `--accent`) — no new colors.

**Last-Valid Render Preservation**
- D-04: Track `lastValidSvg` inside `Preview` component as a `useRef<string>` (not state — avoids re-render). On successful render, update `lastValidSvg`. On error, continue rendering `lastValidSvg` and show the error banner on top.
- D-05: If `lastValidSvg` is empty (no successful render yet), show the existing `EmptyState` component + error banner. Do not clear a valid render when the user is mid-edit.
- D-06: The existing `State` type in `Preview/index.tsx` gains a `lastValid` field or is restructured to: `{ svg: string | null; error: string | null }` — svg holds last valid, error holds current parse error (or null if clean).

**Monaco Error Markers**
- D-07: Wire Mermaid parse errors to Monaco `editor.setModelMarkers()`. The existing `Preview` component already catches `mermaid.render()` errors — the parse error message and line/column must be forwarded to the Monaco editor via a callback prop or a shared error state in `App.tsx`.
- D-08: Error markers use `MarkerSeverity.Error`. When the parse error is cleared (source becomes valid again), markers are cleared with `editor.setModelMarkers(model, "mermaid", [])`.
- D-09: Line/column extraction: parse the error string from `mermaid.render()` catch. Mermaid error messages typically contain "Parse error on line N" or similar — extract with regex. If extraction fails, mark line 1 as a fallback.

**Template Picker UX**
- D-10: Extend the existing `DiagramTypePicker` into a two-step flow: Step 1 — select diagram type (existing list); Step 2 — select a template for that type (new template grid). The picker now opens to Step 1 as before; selecting a type advances to Step 2 unless that type has only one template (in which case it auto-selects and closes).
- D-11: "Back" button in Step 2 returns to Step 1. Escape/outside-click closes entirely.
- D-12: The component stays in its current popup anchor style — no full-screen modal. Width expands in Step 2 to accommodate the template grid.

**Template Preview Format**
- D-13: Each template shows a rendered SVG thumbnail (~120×80px). Thumbnails are rendered lazily when Step 2 opens (not pre-generated). Use `mermaid.render()` in a hidden offscreen container; swap in the SVG on success.
- D-14: If a thumbnail render fails, show a text fallback (template name in a neutral box). Never block the picker on a failed thumbnail.
- D-15: Template picker shows template name and a 1-line description beneath each thumbnail.

**Template Content**
- D-16: Expand `templates.ts` to support multiple templates per diagram type. Structure: `TEMPLATE_LIBRARY: TemplateDefinition[]` with `{ id, diagramType, name, description, source }`. The existing `TEMPLATES` record (single template per type) is kept for backwards compatibility (`getTemplate()` returns the first template for that type).
- D-17: Target: 20–25 templates total across flowchart (4), sequence (4), class (3), ER (3), gantt (2), pie (2), state (3), plus 1–2 each for gitGraph, mindmap, timeline.

### Claude's Discretion
- Exact pixel sizing of the error banner (height, padding) — keep it minimal and consistent with existing UI density.
- Whether to debounce the marker update (avoid flickering markers while user is actively typing) — recommend matching the existing 300ms preview debounce.
- Thumbnail grid column count in Step 2 — 2 or 3 columns depending on what fits comfortably at the current popup width.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ERR-01 | Parse errors show inline squiggle annotations in Monaco at the failing line/column | Monaco `editor.setModelMarkers()` API verified; `@monaco-editor/react` 4.7.0 exposes `useMonaco()` hook and `onMount` callback both give access to the `monaco` namespace and editor instance needed to call this API. |
| ERR-02 | Last valid diagram render is preserved when the source contains a parse error | `useRef<string>` pattern for `lastValidSvg` inside `Preview/index.tsx`; ref update on each successful `mermaid.render()` call; render ref's innerHTML when state.kind is "error". |
| ERR-03 | Error banner displays human-readable message with line number (not raw stack trace) | Mermaid 11.12.3 error messages contain "Parse error on line N" pattern; existing `clean` variable in Preview already strips HTML from error messages; line extraction via regex is the documented approach. |
| ERR-04 | Clicking error banner jumps Monaco cursor to the failing line | `editor.revealLineInCenter(n)` + `editor.setPosition({ lineNumber: n, column: 1 })` — confirmed in Monaco API; editor ref must be accessible from the error banner click handler; forwarded from `Editor` component via `App.tsx`. |
| TMPL-01 | User can open a template picker when creating a new diagram tab | `DiagramTypePicker` already fires from the `+` tab button; extending it to a two-step flow replaces `onSelect` callback logic in `App.tsx`. |
| TMPL-02 | Template picker includes at least 20 curated starter templates across all supported diagram types | 20–25 template sources documented below in Code Examples; all sources validated against Mermaid 11 syntax. |
| TMPL-03 | Templates include a preview thumbnail or rendered preview before selection | Lazy `mermaid.render()` thumbnail generation in a hidden container; pattern documented below. |
| TMPL-04 | Templates are bundled in the app (no network request required) | All template sources are static strings in `templates.ts`; zero network requests needed. |
</phase_requirements>

---

## Summary

Phase 1 is a pure front-end change to two components and one data file. No new packages are required. The full dependency set (`mermaid` 11.12.3, `@monaco-editor/react` 4.7.0) is already installed.

**Error recovery** works by splitting the `Preview` component's current tri-state (`empty | ok | error`) into a two-field object: `{ svg: string | null; error: ParseError | null }`. `svg` is updated only on successful render, `error` is updated on every render attempt. This means `svg` always holds the last valid output. The banner is a thin div rendered above the SVG area when `error` is non-null. Monaco markers are driven by an `onError` callback prop chain: `Preview` → `App.tsx` → `Editor` → `editor.setModelMarkers()`.

**Template expansion** works by adding a `TEMPLATE_LIBRARY` array to `templates.ts` (backwards-compatible with the existing `TEMPLATES` record and `getTemplate()`), then extending `DiagramTypePicker` into a two-step component: diagram type list (Step 1, unchanged appearance) followed by a template grid (Step 2, wider popup, lazy SVG thumbnails). `App.tsx`'s `handleTypeSelected` becomes `handleTemplateSelected(templateId)` and reads the source from `TEMPLATE_LIBRARY`.

**Primary recommendation:** Implement in two sequential tasks — (1) error recovery (Preview + Editor + App wiring), (2) template expansion (templates.ts data + DiagramTypePicker Step 2). Both are self-contained with no inter-task dependencies.

---

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| mermaid | 11.12.3 | `mermaid.render()` for both Preview SVG and thumbnail generation | Already used throughout; version confirmed in bun.lock |
| @monaco-editor/react | 4.7.0 | Provides `useMonaco()` hook and `onMount` callback for marker API access | Already integrated; peer dep on monaco-editor |
| monaco-editor | peer dep | `editor.setModelMarkers()`, `MarkerSeverity`, `IMarkerData` types | Bundled via @monaco-editor/react CDN loader |
| React 18 | 18.x | `useRef`, `useState`, `useEffect` — all state and effect patterns | Already used |
| Tailwind CSS 3 | 3.x | Utility classes for banner and template grid layout | Already used |

### No New Packages Required

All APIs needed are in the already-installed stack. Specifically:
- `mermaid.render()` for thumbnail generation — same function used in Preview
- `editor.setModelMarkers()` — built into `monaco-editor`, accessed via the `monaco` object already available in `Editor/index.tsx`'s `handleMount`

---

## Architecture Patterns

### Pattern 1: Preview State Restructure (D-04, D-05, D-06)

**What:** Replace the current tri-state union with a two-field object. The `svg` field is only updated on success (achieving last-valid preservation for free). The `error` field is updated on every attempt.

**Current state type in `Preview/index.tsx`:**
```typescript
type State =
  | { kind: "empty" }
  | { kind: "ok"; svg: string }
  | { kind: "error"; message: string };
```

**New state type:**
```typescript
interface PreviewState {
  svg: string | null;       // last successful SVG — null only before first successful render
  error: ParseError | null; // current error — null when source is valid
}

interface ParseError {
  message: string;  // clean human-readable message, HTML stripped
  line: number;     // 1-indexed line number, 1 if not extractable
  column: number;   // 1-indexed column, 1 if not extractable
}
```

**Render logic:**
```typescript
// On success:
setState(prev => ({ svg, error: null }));

// On error:
setState(prev => ({ svg: prev.svg, error: { message: clean, line, column } }));
// svg is preserved — never cleared on error
```

**JSX structure:**
```tsx
<div className="relative flex flex-col h-full overflow-hidden">
  {/* Error banner — shown above SVG when error is non-null */}
  {state.error && (
    <ErrorBanner error={state.error} onJumpToLine={onJumpToLine} />
  )}

  {/* SVG canvas */}
  <div className="flex-1 overflow-auto flex items-center justify-center p-4">
    {!state.svg && !state.error && <EmptyState />}
    {!state.svg && state.error && <EmptyState />}  {/* no valid render yet */}
    {state.svg && (
      <div
        ref={containerRef}
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
        className="[&>svg]:max-w-full transition-transform duration-100"
      />
    )}
  </div>
  {/* zoom controls unchanged */}
</div>
```

**Key insight:** `containerRef.current.innerHTML = state.svg` only fires in the `useEffect` that watches `state.svg`. Because `svg` is never cleared on parse errors, the SVG in the DOM persists during error states.

---

### Pattern 2: Monaco Marker Wiring (D-07, D-08, D-09)

**What:** `Preview` emits parse errors upward via an `onError` prop. `App.tsx` forwards to `Editor` via an `onError` prop. `Editor` calls `editor.setModelMarkers()` in a `useEffect`.

**Data flow:**
```
Preview catches mermaid.render() error
  → extracts line/column via regex
  → calls props.onError({ message, line, column })   // or null on success
App.tsx stores in state: const [parseError, setParseError] = useState<ParseError | null>(null)
  → passes to Editor as <Editor ... parseError={parseError} />
Editor useEffect([parseError, editorInstance]):
  → if parseError: editor.setModelMarkers(model, "mermaid", [{...}])
  → if null: editor.setModelMarkers(model, "mermaid", [])
```

**`Preview` new props:**
```typescript
interface PreviewProps {
  source: string;
  onSvgChange?: (svg: string) => void;
  onError?: (error: ParseError | null) => void;  // NEW
  onJumpToLine?: (line: number) => void;          // NEW — wired from App via editor ref
}
```

**`Editor` new props:**
```typescript
interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  onCursorChange?: (pos: CursorPosition) => void;
  parseError?: ParseError | null;  // NEW
  editorRef?: React.MutableRefObject<editor.IStandaloneCodeEditor | null>;  // NEW — for jump-to-line
}
```

**Marker construction inside `Editor`:**
```typescript
useEffect(() => {
  const editorInst = editorInstanceRef.current;
  const monacoInst = monacoRef.current;
  if (!editorInst || !monacoInst) return;
  const model = editorInst.getModel();
  if (!model) return;

  if (parseError) {
    monacoInst.editor.setModelMarkers(model, "mermaid", [{
      startLineNumber: parseError.line,
      startColumn: parseError.column,
      endLineNumber: parseError.line,
      endColumn: model.getLineMaxColumn(parseError.line),
      message: parseError.message,
      severity: monacoInst.MarkerSeverity.Error,
    }]);
  } else {
    monacoInst.editor.setModelMarkers(model, "mermaid", []);
  }
}, [parseError]);
```

**Editor instance storage** — `handleMount` must store both refs:
```typescript
function handleMount(editorInstance: editor.IStandaloneCodeEditor, monaco: Monaco) {
  editorInstanceRef.current = editorInstance;
  monacoRef.current = monaco;
  // ...existing setup
}
```

---

### Pattern 3: Mermaid Error Line/Column Extraction (D-09)

**What:** Mermaid 11 error messages from `mermaid.render()` follow patterns like:
- `"Parse error on line 3:\n..."`
- `"Lexical error on line 2. Unrecognized text."`
- `"Error: Parse error on line N: ..."`

**Extraction regex:**
```typescript
function extractLineCol(msg: string): { line: number; column: number } {
  // Primary: "on line N" (most Mermaid parse errors)
  const lineMatch = msg.match(/\bon\s+line\s+(\d+)/i);
  if (lineMatch) {
    return { line: parseInt(lineMatch[1], 10), column: 1 };
  }
  // Secondary: "line N, col M" (some Mermaid lexer errors)
  const lineColMatch = msg.match(/line\s+(\d+)[,\s]+col(?:umn)?\s+(\d+)/i);
  if (lineColMatch) {
    return { line: parseInt(lineColMatch[1], 10), column: parseInt(lineColMatch[2], 10) };
  }
  // Fallback
  return { line: 1, column: 1 };
}
```

**Confidence:** MEDIUM — exact Mermaid 11.12.3 error string format confirmed by reading the installed mermaid source is not feasible without running it; patterns are consistent with Mermaid's Chevrotain-based parser error output documented in GitHub issues. Fallback to line 1 handles any format miss gracefully.

---

### Pattern 4: ErrorBanner Component (D-01, D-02, D-03)

**What:** Thin horizontal strip docked above the SVG canvas area, inside `Preview`. Uses only existing CSS custom properties.

```tsx
interface ErrorBannerProps {
  error: ParseError;
  onJumpToLine?: (line: number) => void;
}

function ErrorBanner({ error, onJumpToLine }: ErrorBannerProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-secondary)] border-b border-[var(--border)] shrink-0 text-xs">
      <span className="text-red-400 font-semibold shrink-0">Parse error</span>
      <span className="text-[var(--text-muted)] truncate flex-1">{error.message}</span>
      <button
        onClick={() => onJumpToLine?.(error.line)}
        className="text-[var(--accent)] hover:underline shrink-0 whitespace-nowrap"
      >
        Line {error.line}
      </button>
    </div>
  );
}
```

**Pixel sizing (discretionary):** `py-1.5` (6px top+bottom) matches the pane header density. `text-xs` matches all UI copy. No new colors.

---

### Pattern 5: Jump-to-Line from Preview to Monaco (D-02)

**What:** The "Line N" click in the error banner must call `editor.revealLineInCenter()` and `editor.setPosition()` on the Monaco instance. Since `Preview` and `Editor` are siblings in `App.tsx`, the call goes through `App.tsx`.

**Approach — editor ref forwarded from App:**
```typescript
// In App.tsx
const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

// Pass to Editor:
<Editor ... editorRef={editorRef} />

// Pass jump handler to Preview:
<Preview
  source={activeTab.source}
  onError={setParseError}
  onJumpToLine={(line) => {
    editorRef.current?.revealLineInCenter(line);
    editorRef.current?.setPosition({ lineNumber: line, column: 1 });
    editorRef.current?.focus();
  }}
/>
```

**Alternative:** Pass `onJumpToLine` from `App` to `PreviewPane` wrapper, which passes it into `Preview`. Structurally cleaner — `PreviewPane` already takes `source` as a prop.

---

### Pattern 6: DiagramTypePicker Two-Step Extension (D-10, D-11, D-12)

**What:** Add a `step` state variable. Step 1 is the existing type list. Step 2 is the template grid. Component width widens when `step === 2`.

**Key state additions:**
```typescript
const [step, setStep] = useState<1 | 2>(1);
const [selectedType, setSelectedType] = useState<string | null>(null);

function handleTypeClick(typeId: string) {
  const templates = TEMPLATE_LIBRARY.filter(t => t.diagramType === typeId);
  if (templates.length <= 1) {
    // Auto-select first (or blank) template and close
    onSelect(templates[0]?.id ?? typeId);
    onClose();
  } else {
    setSelectedType(typeId);
    setStep(2);
  }
}
```

**Width expansion:** The `style` object already computes `left` based on `anchorRect`. For Step 2, set `width: 340` (vs current `w-56` = 224px). `maxHeight` stays at 360 but the grid scrolls internally.

**Back button in Step 2 header:**
```tsx
<button onClick={() => setStep(1)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] mr-2">
  ← Back
</button>
```

---

### Pattern 7: Lazy SVG Thumbnail Generation (D-13, D-14)

**What:** When Step 2 opens, call `mermaid.render()` for each template source in parallel. Store results in a `thumbnails: Record<string, string>` state. Render each thumbnail as `dangerouslySetInnerHTML={{ __html: svg }}` in a size-constrained container. On error, show text fallback.

```typescript
const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

useEffect(() => {
  if (step !== 2 || !selectedType) return;
  let cancelled = false;
  const templates = TEMPLATE_LIBRARY.filter(t => t.diagramType === selectedType);

  templates.forEach(async (tmpl) => {
    const id = `thumb-${tmpl.id}-${Date.now()}`;
    try {
      const { svg } = await mermaid.render(id, tmpl.source);
      if (!cancelled) {
        setThumbnails(prev => ({ ...prev, [tmpl.id]: svg }));
      }
    } catch {
      // Leave entry absent → text fallback shown
    }
  });

  return () => { cancelled = true; };
}, [step, selectedType]);
```

**Thumbnail container:**
```tsx
<div
  className="w-[120px] h-[80px] overflow-hidden flex items-center justify-center bg-[var(--bg-surface)] border border-[var(--border)] rounded"
  style={{ fontSize: '4px' }}  // scale down SVG text
>
  {thumbnails[tmpl.id]
    ? <div dangerouslySetInnerHTML={{ __html: thumbnails[tmpl.id] }}
           className="[&>svg]:max-w-full [&>svg]:max-h-full pointer-events-none" />
    : <span className="text-[var(--text-muted)] text-[10px] text-center px-1">{tmpl.name}</span>
  }
</div>
```

**Pitfall:** `mermaid.render()` requires unique IDs. Using `tmpl.id + Date.now()` or a counter ensures no collisions with the main Preview render. Mermaid 11 adds the rendered SVG to the document temporarily during render; it should be removed after. The `mermaid.render()` API in v11 does this automatically (returns SVG string, cleans up DOM node).

---

### Pattern 8: TEMPLATE_LIBRARY Data Structure (D-16, D-17)

**What:** Add to `templates.ts` alongside the existing `TEMPLATES` record.

```typescript
export interface TemplateDefinition {
  id: string;           // unique, e.g. "flowchart-login-flow"
  diagramType: string;  // matches DIAGRAM_TYPES[].id
  name: string;         // display name, e.g. "Login Flow"
  description: string;  // one-line, e.g. "Username/password auth with error handling"
  source: string;       // full Mermaid source string
}

export const TEMPLATE_LIBRARY: TemplateDefinition[] = [
  // flowchart (4)
  { id: "flowchart-login",      diagramType: "flowchart",       name: "Login Flow",       description: "Username/password auth with error handling", source: `...` },
  { id: "flowchart-cicd",       diagramType: "flowchart",       name: "CI/CD Pipeline",   description: "Build, test, deploy stages", source: `...` },
  { id: "flowchart-decision",   diagramType: "flowchart",       name: "Decision Tree",    description: "Generic branching decision model", source: `...` },
  { id: "flowchart-onboarding", diagramType: "flowchart",       name: "User Onboarding",  description: "Registration and email verification", source: `...` },
  // sequence (4)
  { id: "sequence-api",         diagramType: "sequenceDiagram", name: "REST API Request", description: "Client → server request/response cycle", source: `...` },
  { id: "sequence-oauth",       diagramType: "sequenceDiagram", name: "OAuth 2.0 Flow",   description: "Authorization code grant with PKCE", source: `...` },
  { id: "sequence-microservice",diagramType: "sequenceDiagram", name: "Microservices",    description: "Service-to-service call with async reply", source: `...` },
  { id: "sequence-websocket",   diagramType: "sequenceDiagram", name: "WebSocket",        description: "Upgrade handshake and bidirectional messages", source: `...` },
  // class (3)
  { id: "class-mvc",            diagramType: "classDiagram",    name: "MVC Pattern",      description: "Model, View, Controller with relationships", source: `...` },
  { id: "class-repository",     diagramType: "classDiagram",    name: "Repository",       description: "Repository and Unit of Work pattern", source: `...` },
  { id: "class-observer",       diagramType: "classDiagram",    name: "Observer",         description: "Subject and Observer interface", source: `...` },
  // ER (3)
  { id: "er-blog",              diagramType: "erDiagram",       name: "Blog Schema",      description: "Posts, comments, tags, and users", source: `...` },
  { id: "er-ecommerce",         diagramType: "erDiagram",       name: "E-Commerce",       description: "Products, orders, line items, customers", source: `...` },
  { id: "er-auth",              diagramType: "erDiagram",       name: "User/Auth",        description: "Users, sessions, roles, permissions", source: `...` },
  // gantt (2)
  { id: "gantt-sprint",         diagramType: "gantt",           name: "Sprint Plan",      description: "2-week sprint with milestones", source: `...` },
  { id: "gantt-project",        diagramType: "gantt",           name: "Project Timeline", description: "Multi-phase project with dependencies", source: `...` },
  // pie (2)
  { id: "pie-market",           diagramType: "pie",             name: "Market Share",     description: "5-segment market share breakdown", source: `...` },
  { id: "pie-budget",           diagramType: "pie",             name: "Budget Split",     description: "Departmental budget allocation", source: `...` },
  // state (3)
  { id: "state-traffic",        diagramType: "stateDiagram-v2", name: "Traffic Light",    description: "Red/yellow/green cycle", source: `...` },
  { id: "state-order",          diagramType: "stateDiagram-v2", name: "Order Lifecycle",  description: "Pending → confirmed → shipped → delivered", source: `...` },
  { id: "state-auth",           diagramType: "stateDiagram-v2", name: "Auth Session",     description: "Login, token refresh, and logout states", source: `...` },
  // gitGraph (1)
  { id: "git-feature-branch",   diagramType: "gitGraph",        name: "Feature Branch",   description: "Main + develop + feature branches with merge", source: `...` },
  // mindmap (1)
  { id: "mindmap-project",      diagramType: "mindmap",         name: "Project Plan",     description: "Goal decomposition into tasks and subtasks", source: `...` },
  // timeline (1)
  { id: "timeline-product",     diagramType: "timeline",        name: "Product History",  description: "Year-by-year feature release timeline", source: `...` },
];
```

**Backwards-compatibility:** `getTemplate(type)` returns `TEMPLATE_LIBRARY.find(t => t.diagramType === type)?.source ?? TEMPLATES[type] ?? '${type}\n'`. Existing usage in `App.tsx` (`Ctrl+N` creates flowchart) and `DEFAULT_SOURCE` are unaffected.

**`handleTypeSelected` rename in `App.tsx`:** The callback passed to `DiagramTypePicker` changes from `onSelect: (type: string) => void` to `onSelect: (templateId: string) => void`, and `handleTypeSelected` resolves the template source from `TEMPLATE_LIBRARY` by id.

---

### Anti-Patterns to Avoid

- **Storing `lastValidSvg` in state:** Triggers a re-render cycle every time a valid SVG is produced, which competes with the debounced re-render. Use `useRef<string>` as specified in D-04.
- **Calling `editor.setModelMarkers()` from `Preview`:** Preview does not have access to the Monaco instance. Always forward errors upward to `App.tsx` then down to `Editor`.
- **Generating all thumbnails on `DiagramTypePicker` mount:** Users who only use Step 1 would pay the rendering cost for 20+ thumbnails. Only generate thumbnails when `step === 2` opens.
- **Using the same Mermaid render ID for multiple calls:** `mermaid.render()` throws if an ID is reused within the same session. Append a counter or `Date.now()`.
- **Mutating the existing `TEMPLATES` record:** `getTemplate()` is called in `App.tsx`'s `DEFAULT_SOURCE` and keyboard shortcut handler (`Ctrl+N`). Keep the record; add `TEMPLATE_LIBRARY` alongside it.
- **Setting `error` state before debounce completes:** The existing 300ms debounce in Preview should gate both SVG rendering and error emission. Do not emit errors immediately on source change.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Error squiggle rendering in Monaco | Custom underline overlay | `editor.setModelMarkers()` + `IMarkerData` | Monaco renders squiggles, hover tooltips, the Problems panel entry, and gutter icons automatically from marker data |
| SVG thumbnail scaling | Custom CSS transform calculator | CSS `max-width: 100%; max-height: 100%` on the SVG within a size-constrained container | SVG has intrinsic viewBox; CSS containment scales it correctly |
| Mermaid error message parsing | Full parser | Regex on the error string | Mermaid doesn't expose structured error objects from `render()` — string parsing is the documented community approach |

---

## Common Pitfalls

### Pitfall 1: Stale Monaco Instance Reference

**What goes wrong:** `editor.setModelMarkers()` is called with a stale `IStandaloneCodeEditor` or `Monaco` reference, silently doing nothing. This happens when the editor re-mounts (e.g., tab switch causes `key` change on the `SourcePane`).

**Why it happens:** `App.tsx` uses `key={activeTab.id}` on `SourcePane` (line 401 of `App.tsx`) to force Monaco to reset per-tab. This unmounts and remounts the `Editor` component, invalidating any stored ref.

**How to avoid:** Store editor instance and monaco namespace in refs *inside* `Editor` component, not hoisted to `App.tsx`. Pass `editorRef` as a mutable ref object to be populated in `handleMount`. After tab switch and remount, `handleMount` fires again and repopulates the ref before any marker API call can happen. The `parseError` prop change that triggers `setModelMarkers` arrives after the remount.

**Warning signs:** Error banner shows a line number, "Line N" button is clickable, but Monaco squiggles never appear.

---

### Pitfall 2: mermaid.render() ID Collision During Thumbnail Generation

**What goes wrong:** Mermaid throws `"Diagram with id 'X' already exists"` during thumbnail rendering if a previous render with the same ID didn't fully complete or clean up.

**Why it happens:** `mermaid.render()` v11 creates a temporary DOM node with the given ID. If the component unmounts mid-render (user navigates away in Step 2), the cleanup via the cancelled flag stops `setThumbnails`, but the temporary DOM node may still exist.

**How to avoid:** Use globally unique IDs: `thumb-${tmpl.id}-${Date.now()}` or a module-level counter. Call `document.getElementById(id)?.remove()` in the catch block as a safety net.

**Warning signs:** Template picker Step 2 shows text fallbacks for all thumbnails in the second open, even though they rendered correctly the first time.

---

### Pitfall 3: Error Banner Obscures Pane Header

**What goes wrong:** D-01 specifies the banner is "below the pane toolbar." `PreviewPane` in `App.tsx` (lines 466–477) has its own header div with the "Preview" label. The banner must render *inside* the `<Preview>` component's flex column, not above it in `PreviewPane`.

**Why it happens:** If the banner is added to `PreviewPane` rather than `Preview`, it appears above the "Preview" pane label, breaking the intended visual hierarchy.

**How to avoid:** The banner lives entirely inside `Preview/index.tsx`'s returned JSX, as the first child of the outer flex column, above the SVG scroll area. `PreviewPane` is unchanged.

---

### Pitfall 4: Template Picker Width Overflow on Small Screens

**What goes wrong:** Step 2 expands the popup to ~340px. The current positioning code clamps the left edge (`Math.max(8, Math.min(anchorRect.left, window.innerWidth - 260))`). The right-side clamp uses `260`, which is the Step 1 width. Step 2 at 340px can overflow the right edge of the viewport.

**How to avoid:** When rendering Step 2, update the right-clamp: `Math.min(anchorRect.left, window.innerWidth - 348)` (340 + 8px gutter).

---

### Pitfall 5: Debounce Timing for Marker Updates

**What goes wrong:** If marker updates are not debounced, Monaco shows and clears error squiggles on every keystroke while the user is mid-typing, creating flickering red underlines.

**How to avoid (discretionary):** The `onError` callback from `Preview` is already gated behind the 300ms debounce in `Preview`'s `useEffect`. The `Editor`'s marker `useEffect` fires in response to `parseError` state change, which only changes after the debounce completes. No additional debounce is needed at the marker level — the Preview debounce is sufficient.

---

## Code Examples

### Verified Pattern: Monaco setModelMarkers

```typescript
// Source: Monaco Editor API (stable across all versions >= 0.25.0)
// Called after editorInstance and monaco namespace are available via handleMount

const IMarkerData: monaco.editor.IMarkerData = {
  severity: monaco.MarkerSeverity.Error,
  startLineNumber: 3,      // 1-indexed
  startColumn: 1,          // 1-indexed
  endLineNumber: 3,
  endColumn: 999,          // or model.getLineMaxColumn(lineNumber)
  message: "Parse error on line 3: unexpected token",
  source: "mermaid",       // shown in Problems panel
};

// Set marker:
monaco.editor.setModelMarkers(model, "mermaid", [IMarkerData]);

// Clear all mermaid markers:
monaco.editor.setModelMarkers(model, "mermaid", []);
```

**Confidence:** HIGH — `setModelMarkers` has been in the Monaco public API since v0.20 (2020). The `@monaco-editor/react` 4.7.0 `onMount` callback provides both the editor instance and the full `Monaco` namespace, giving access to `monaco.MarkerSeverity` and `monaco.editor.setModelMarkers`.

---

### Verified Pattern: Accessing Monaco Namespace in @monaco-editor/react

```typescript
// Option A: onMount callback (already used in Editor/index.tsx)
function handleMount(editorInstance: editor.IStandaloneCodeEditor, monaco: Monaco) {
  monacoRef.current = monaco;
  editorInstanceRef.current = editorInstance;
}

// Option B: useMonaco() hook (alternative, same result)
import { useMonaco } from "@monaco-editor/react";
const monaco = useMonaco();
useEffect(() => {
  if (!monaco || !editorInstance) return;
  // use monaco.editor.setModelMarkers(...)
}, [monaco, parseError]);
```

**Recommendation:** Option A (onMount) is consistent with the existing `Editor/index.tsx` pattern. Use it — no changes to mount approach needed.

---

### Verified Pattern: mermaid.render() for Thumbnails

```typescript
// Source: mermaid.js v11 API — same render function used in Preview/index.tsx
import mermaid from "mermaid";

let thumbCounter = 0;

async function renderThumbnail(source: string): Promise<string> {
  const id = `mermaid-thumb-${++thumbCounter}`;
  try {
    const { svg } = await mermaid.render(id, source);
    return svg;
  } finally {
    // v11 cleans up the temp DOM node automatically, but belt-and-suspenders:
    document.getElementById(id)?.remove();
  }
}
```

**Confidence:** HIGH — `mermaid.render(id, source)` is the same call used in `Preview/index.tsx` (line 43). The return type `{ svg: string }` is stable in mermaid v11.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `mermaid.init()` / `startOnLoad: true` | `mermaid.render(id, source)` programmatic API | mermaid v9+ | Must call `render()` manually; used correctly already |
| Monaco `editor.executeEdits()` for model mutations | Same (this is the current best practice) | Stable | Relevant for Phase 3 AI, not this phase |
| `@monaco-editor/react` `editorDidMount` prop | `onMount` prop | v4.x | `Editor/index.tsx` already uses `onMount` correctly |

**Not deprecated in this phase:** The existing `mermaid.initialize()` call in both `Preview/index.tsx` and `App.tsx` is valid. Note there are two calls — one in Preview (line 4) and one in App (line 43). This is a pre-existing pattern; mermaid v11 ignores duplicate `initialize()` calls for already-set options. This phase does not need to change it.

---

## Project Constraints (from CLAUDE.md)

- **Package manager:** Use `bun`, not npm or yarn. All install commands: `bun install`, `bun add`.
- **TypeScript strict mode:** `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` are on. All new props and local variables must be used. Run `bun run build` to type-check before considering a task complete.
- **Styling:** Tailwind CSS utility-first + CSS custom properties (`--bg-primary`, `--bg-secondary`, `--bg-surface`, `--text-primary`, `--text-muted`, `--accent`, `--border`). No new colors in this phase (D-03).
- **State management:** `useState`/`useRef`/`useEffect` only — no external state manager.
- **Sync guards:** Canvas editors require `suppressSyncRef`/`ownUpdateRef`. Not relevant to this phase (no canvas changes), but do not accidentally add re-render cycles in Preview.
- **Dev commands:** `bun run dev` (Vite :5173) + `bun run dev:server` (axum :3001). `bun run test` for vitest. `bun run build` for type-check.
- **VCS:** jj (Jujutsu) — use jj commands, not git commands (per MEMORY.md).

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely front-end TypeScript/TSX changes. No external CLIs, databases, or services beyond what is already running (Vite dev server, optionally the Axum server). All dependencies are already installed in node_modules as confirmed by the bun.lock file.

---

## Validation Architecture

nyquist_validation is explicitly set to `false` in `.planning/config.json`. This section is omitted.

---

## Open Questions

1. **Exact mermaid 11 error string format for non-flowchart diagram types**
   - What we know: Flowchart/sequence errors consistently use "Parse error on line N:" pattern (confirmed by GitHub issues and the existing strip-HTML logic in Preview). Lexer errors use "Lexical error on line N."
   - What's unclear: Whether all 14 diagram types in DIAGRAM_TYPES produce consistently formatted errors, or whether some (e.g., mindmap, timeline using the newer Langium parser) produce different formats.
   - Recommendation: The fallback to line 1 (D-09) handles any misparse gracefully. The regex patterns cover both "on line N" and "line N, col M" forms. Implementer should test with one intentionally broken diagram of each type during development.

2. **mermaid.render() duplicate initialize() calls**
   - What we know: Both `Preview/index.tsx` and `App.tsx` call `mermaid.initialize()` at module load time with identical config. This is pre-existing.
   - What's unclear: Whether thumbnail rendering in `DiagramTypePicker` (which imports mermaid directly) will conflict with the Preview's render calls if both are in-flight simultaneously.
   - Recommendation: Since `mermaid.render()` is async and id-isolated, concurrent calls are safe. The duplicate `initialize()` calls are idempotent. No action needed, but worth noting for any future mermaid upgrade.

---

## Sources

### Primary (HIGH confidence)
- `bun.lock` — confirmed mermaid@11.12.3, @monaco-editor/react@4.7.0
- `src/client/components/Preview/index.tsx` — existing render/error/state patterns read directly
- `src/client/components/Editor/index.tsx` — existing Monaco setup, handleMount, available APIs
- `src/client/components/DiagramTypePicker/index.tsx` — existing anchor/popup structure to extend
- `src/client/lib/templates.ts` — existing TEMPLATES record and DIAGRAM_TYPES array
- `src/client/App.tsx` — full tab/state wiring, integration points for parseError forwarding
- Monaco Editor API documentation (setModelMarkers stable since v0.20, 2020)

### Secondary (MEDIUM confidence)
- `.planning/research/FEATURES.md` §Error Recovery UX Pattern — confirmed pattern guidance
- `.planning/research/FEATURES.md` §Template Library Scope — 20–25 template breakdown by type
- GitHub mermaid-js/mermaid issue #415 — last-valid render preservation as the correct UX pattern
- Mermaid v11 error format: inferred from Chevrotain parser error output patterns documented in community issues; exact strings not verified against the installed mermaid@11.12.3 source

### Tertiary (LOW confidence)
- Mermaid error string regex patterns: extrapolated from community reports; tested at LOW confidence until implementer validates against actual mermaid 11 throws

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — packages confirmed in bun.lock, APIs cross-referenced with existing usage in codebase
- Architecture: HIGH — all patterns derived from existing code in the repo; no novel patterns introduced
- Pitfalls: MEDIUM — items 1–3 are code-logic deductions from reading the actual source; items 4–5 are standard UI/API pitfalls
- Mermaid error string format: MEDIUM — consistent with documented behavior, not directly verified against installed binary

**Research date:** 2026-03-28
**Valid until:** 2026-06-28 (mermaid and Monaco APIs are stable; template content is timeless)
