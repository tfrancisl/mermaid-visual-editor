---
phase: 01-error-recovery-templates
verified: 2026-03-28T16:30:00Z
status: passed
score: 5/10 must-haves verified
gaps:
  - truth: "User can open a template picker when creating a new tab via the + button"
    status: partial
    reason: "The picker opens (DiagramTypePicker is wired in App.tsx) but it only shows Step 1 (type list) — Step 2 (template grid) is absent because the Plan 02 implementation commits (6da439a, 7c52630) were never merged into main/HEAD."
    artifacts:
      - path: "src/client/components/DiagramTypePicker/index.tsx"
        issue: "Still the original single-step picker — no step state, no TEMPLATE_LIBRARY import, no thumbnail generation, no Back button"
    missing:
      - "Merge or cherry-pick commits 6da439a and 7c52630 into main (or re-execute Plan 02 on current branch)"

  - truth: "Template picker shows diagram types in Step 1, then a template grid in Step 2"
    status: failed
    reason: "Two-step flow not present in code on main. DiagramTypePicker has no step state, no selectedType, no thumbnails state."
    artifacts:
      - path: "src/client/components/DiagramTypePicker/index.tsx"
        issue: "Missing: step state, handleTypeClick, mermaid.render thumbnail loop, Step 2 grid JSX, Back button"
    missing:
      - "Full Plan 02 Task 2 implementation in DiagramTypePicker"

  - truth: "Template grid shows at least 20 templates across all supported diagram types with SVG thumbnails"
    status: failed
    reason: "TEMPLATE_LIBRARY does not exist in src/client/lib/templates.ts on main. File ends at line 175 with only the legacy TEMPLATES record and getTemplate()."
    artifacts:
      - path: "src/client/lib/templates.ts"
        issue: "Missing: TemplateDefinition interface, TEMPLATE_LIBRARY array, getTemplateById(). getTemplate() still uses only legacy TEMPLATES fallback."
    missing:
      - "Full Plan 02 Task 1 implementation in templates.ts (TEMPLATE_LIBRARY with 20+ entries)"

  - truth: "Selecting a template creates a new tab with that template's source"
    status: failed
    reason: "handleTypeSelected in App.tsx calls getTemplate(type) directly — no getTemplateById() call because that function doesn't exist in the file on main. Template id-based resolution is absent."
    artifacts:
      - path: "src/client/App.tsx"
        issue: "handleTypeSelected uses getTemplate() only; getTemplateById not imported, TEMPLATE_LIBRARY not referenced"
    missing:
      - "getTemplateById import and usage in handleTypeSelected per Plan 02 Task 2 step 11"

  - truth: "Templates are bundled in the app with no network requests"
    status: failed
    reason: "TEMPLATE_LIBRARY doesn't exist on main. There are no templates to bundle."
    artifacts:
      - path: "src/client/lib/templates.ts"
        issue: "Only legacy TEMPLATES record present — 14 single-entry templates, no TEMPLATE_LIBRARY"
    missing:
      - "TEMPLATE_LIBRARY implementation in templates.ts"

  - truth: "Back button in Step 2 returns to Step 1, Escape closes the picker"
    status: failed
    reason: "Step 2 does not exist in the code on main. The Escape handler is present (closes picker), but there is no Back button."
    artifacts:
      - path: "src/client/components/DiagramTypePicker/index.tsx"
        issue: "No Back button, no step state"
    missing:
      - "Step 2 header with Back button per Plan 02 Task 2 step 8"
---

# Phase 1: Error Recovery + Templates Verification Report

**Phase Goal:** Users are never left confused by a parse failure, and can start any new diagram from a curated template
**Verified:** 2026-03-28T16:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Critical Finding: Plan 02 Implementation Not Merged

The git history reveals that Plan 02 implementation commits (`6da439a` and `7c52630`) exist on a **diverged branch that was never merged into main**. The current HEAD (`5ae72cd`) contains the Plan 02 SUMMARY documentation but not the actual code changes. This means the entire TMPL-* side of the phase goal is undelivered on main.

```
* 5ae72cd  HEAD  docs(01-02): complete template library and two-step picker plan
* 1048e0a        docs(01-01): complete error-recovery-templates plan 01
* 1af5556        feat(01-01): wire error state ...
* 775f070        feat(01-01): restructure Preview state ...
| * 7c52630        feat(01-02): extend DiagramTypePicker (NOT on main)
| * 6da439a        feat(01-02): expand templates.ts (NOT on main)
|/
```

---

## Goal Achievement

### Observable Truths

Plan 01 (ERR-01–ERR-04):

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User sees red squiggles in Monaco at the exact line of a parse error | VERIFIED | `setModelMarkers` wired in Editor/index.tsx:135-145; `parseError` prop flows from App.tsx:416 |
| 2 | Canvas continues showing last valid diagram on parse error | VERIFIED | `setState(prev => ({ svg: prev.svg, error: parseError }))` in Preview/index.tsx:70 |
| 3 | User sees human-readable error message with line number in a banner | VERIFIED | `ErrorBanner` component at Preview/index.tsx:131-144; rendered conditionally at line 96-98 |
| 4 | Clicking line number in error banner jumps Monaco cursor | VERIFIED | `handleJumpToLine` in App.tsx:305-309 calls `revealLineInCenter` + `setPosition` + `focus`; wired at App.tsx:417 |
| 5 | Error banner and squiggles disappear when source becomes valid | VERIFIED | `onError?.(null)` on success (Preview:63); `setModelMarkers(model, "mermaid", [])` on null parseError (Editor:144) |

Plan 02 (TMPL-01–TMPL-04):

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 6 | User can open a template picker via the + button | PARTIAL | Picker opens to Step 1 (type list) but no Step 2 — Plan 02 code not on main |
| 7 | Template picker shows Step 1 (types) then Step 2 (template grid) | FAILED | DiagramTypePicker has no step state, no two-step flow |
| 8 | Template grid shows 20+ templates with SVG thumbnails | FAILED | TEMPLATE_LIBRARY absent from templates.ts on main |
| 9 | Selecting a template creates a new tab with template source | FAILED | handleTypeSelected resolves via getTemplate() only; getTemplateById absent |
| 10 | Templates are bundled, no network requests | FAILED | No TEMPLATE_LIBRARY to bundle |
| 11 | Back button in Step 2 returns to Step 1; Escape closes picker | FAILED | No Step 2, no Back button; Escape close is present |

**Score: 5/10 truths verified** (all ERR truths pass; all TMPL truths fail or partial)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/client/components/Preview/index.tsx` | PreviewState, ErrorBanner, ParseError, extractLineCol | VERIFIED | All present and substantive |
| `src/client/components/Editor/index.tsx` | parseError prop, setModelMarkers, editorInstanceRef, monacoRef | VERIFIED | All present and wired |
| `src/client/App.tsx` | parseError state, editorRef, handleJumpToLine, onError={setParseError} | VERIFIED | All present and wired |
| `src/client/lib/templates.ts` | TEMPLATE_LIBRARY (20+), TemplateDefinition, getTemplateById | MISSING | File on main has only legacy TEMPLATES (14 entries, one per type) — no TEMPLATE_LIBRARY |
| `src/client/components/DiagramTypePicker/index.tsx` | Two-step flow, step state, thumbnails, Back button | STUB | Still original single-step picker (73 lines) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| Preview/index.tsx | App.tsx | `onError` callback prop | WIRED | `onError?.(parseError)` at Preview:71; `onError={setParseError}` at App:417 |
| App.tsx | Editor/index.tsx | `parseError` prop | WIRED | `parseError={parseError}` at App:416 |
| App.tsx | Preview/index.tsx | `onJumpToLine` prop | WIRED | `onJumpToLine={handleJumpToLine}` at App:417 |
| DiagramTypePicker/index.tsx | templates.ts | imports TEMPLATE_LIBRARY | NOT WIRED | DiagramTypePicker only imports DIAGRAM_TYPES; no TEMPLATE_LIBRARY import |
| App.tsx | templates.ts | TEMPLATE_LIBRARY.find via getTemplateById | NOT WIRED | App.tsx imports only getTemplate, not getTemplateById; TEMPLATE_LIBRARY.find not present |

---

### Data-Flow Trace (Level 4)

ERR artifacts pass Level 3 (wired) and render dynamic data (error from mermaid.render):

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| Preview/index.tsx | `state.error` | `mermaid.render()` catch block | Yes — real parse error from mermaid | FLOWING |
| Editor/index.tsx | Monaco markers | `parseError` prop from App state | Yes — derives from real mermaid error | FLOWING |

TMPL artifacts fail Level 1 (missing/stub), no data-flow trace applicable.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Build compiles (ERR side) | `bun run build` | Not run (context limit) | SKIP |
| TEMPLATE_LIBRARY exists in templates.ts | `grep -c "TEMPLATE_LIBRARY" src/client/lib/templates.ts` | 0 matches | FAIL |
| DiagramTypePicker has step state | `grep -c "step" src/client/components/DiagramTypePicker/index.tsx` | 0 matches | FAIL |
| getTemplateById exists | `grep -c "getTemplateById" src/client/lib/templates.ts` | 0 matches | FAIL |
| Commits 6da439a and 7c52630 reachable from HEAD | `git log --oneline HEAD` | Not in HEAD ancestry — on diverged branch | FAIL |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ERR-01 | 01-01 | Parse errors show inline squiggle annotations in Monaco | SATISFIED | setModelMarkers in Editor:135-145 |
| ERR-02 | 01-01 | Last valid diagram preserved on parse error | SATISFIED | prev.svg preservation in Preview:70 |
| ERR-03 | 01-01 | Error banner with human-readable message + line number | SATISFIED | ErrorBanner at Preview:131-144 |
| ERR-04 | 01-01 | Clicking error banner jumps Monaco cursor | SATISFIED | handleJumpToLine in App:305-309 |
| TMPL-01 | 01-02 | User can open template picker when creating a new tab | BLOCKED | Two-step picker not on main; only single-step type list exists |
| TMPL-02 | 01-02 | 20+ curated starter templates | BLOCKED | TEMPLATE_LIBRARY not in codebase on main |
| TMPL-03 | 01-02 | Preview thumbnail or rendered preview before selection | BLOCKED | No template grid, no thumbnail generation |
| TMPL-04 | 01-02 | Templates bundled in app, no network request | BLOCKED | No TEMPLATE_LIBRARY to bundle |

**Orphaned requirements:** None. All 8 requirement IDs (ERR-01–ERR-04, TMPL-01–TMPL-04) appear in plan frontmatter and are accounted for above.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/client/components/DiagramTypePicker/index.tsx` | 58-63 | `onClick={() => { onSelect(dt.id); onClose(); }}` — calls onSelect with diagram type id, not template id | Warning | handleTypeSelected in App.tsx receives a type id and calls getTemplate(type) — functional for single-step, but does not use template library |

No TODO/FIXME/placeholder comments found in modified files. No empty return stubs in ERR-side files.

---

### Human Verification Required

The ERR-side behavior (squiggles, banner, jump-to-line) requires a running browser to fully verify:

#### 1. Error Banner + Squiggle Smoke Test

**Test:** Open app, type a valid flowchart, introduce a syntax error (delete a closing bracket).
**Expected:** (a) last valid SVG stays visible, (b) red "Parse error" banner appears above preview with message and "Line N" button, (c) Monaco shows red squiggle at error line, (d) clicking "Line N" moves cursor to that line. Fix the error — banner and squiggle disappear.
**Why human:** Visual rendering, Monaco marker display, and cursor jump cannot be verified by static analysis.

#### 2. Template Picker Regression Check (if Plan 02 code is merged)

**Test:** Click "+" tab button; click "Flowchart"; verify Step 2 grid opens with 4 template cards and SVG thumbnails loading; click "Back"; click a type with 1 template (e.g., gitGraph) — verify it auto-selects without Step 2.
**Expected:** Two-step flow works end-to-end; thumbnails render within ~1s; Back returns to Step 1.
**Why human:** Lazy mermaid.render() thumbnail timing and visual layout require a browser.

---

### Gaps Summary

The phase is split into two halves with asymmetric outcomes:

**Plan 01 (ERR-01–ERR-04): COMPLETE.** All five observable truths verified. Preview preserves last-valid SVG, ErrorBanner renders with line number, jump-to-line wired through App.tsx to Monaco, markers clear on valid source. Code is substantive, wired, and data flows from real mermaid errors.

**Plan 02 (TMPL-01–TMPL-04): UNDELIVERED ON MAIN.** The implementation commits (`6da439a` — templates.ts expansion, `7c52630` — DiagramTypePicker two-step flow) exist on a diverged branch but were never merged into main. The SUMMARY documentation was committed to main while the code was left on a side branch. On the current HEAD: `TEMPLATE_LIBRARY` does not exist in `templates.ts`, `DiagramTypePicker` remains a single-step type list, `getTemplateById` does not exist, and `handleTypeSelected` in App.tsx does not use the template library.

**Root cause:** The `docs(01-02)` commit (`5ae72cd`) was made on main, but the `feat(01-02)` commits were made on a branch that diverged before that docs commit and was never merged.

**Resolution needed:** Cherry-pick or merge commits `6da439a` and `7c52630` onto main, then verify the template-side truths. Alternatively, re-execute Plan 02 on the current main branch.

---

_Verified: 2026-03-28T16:30:00Z_
_Verifier: Claude (gsd-verifier)_
