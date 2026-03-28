# Roadmap: Mermaid Visual Editor — Milestone 2

## Overview

This milestone extends the editor in three directions: hardening the parse error UX so users are never left with a blank canvas or a confusing raw stack trace; adding full visual editors for class, ER, and state diagrams to match the competitive reference bar; and integrating AI-assisted diagram generation and editing via a secure Axum proxy. Phases 0–3 (scaffold, core editor, canvas, multi-tab, export) are already complete. Phases 1–3 below are the new milestone work.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Error Recovery + Templates** - Surface parse errors inline and give users a curated template library (completed 2026-03-28)
- [ ] **Phase 2: Diagram Editor Improvements** - Full visual editors for class, ER, and state diagrams
- [ ] **Phase 3: AI Integration** - AI-assisted diagram generation, editing, and repair via secure Axum proxy

## Phase Details

### Phase 1: Error Recovery + Templates
**Goal**: Users are never left confused by a parse failure, and can start any new diagram from a curated template
**Depends on**: Nothing (first phase of milestone)
**Requirements**: ERR-01, ERR-02, ERR-03, ERR-04, TMPL-01, TMPL-02, TMPL-03, TMPL-04
**Success Criteria** (what must be TRUE):
  1. User sees red squiggles in Monaco at the exact line/column of a parse error — not just a vague banner
  2. The canvas continues showing the last valid diagram when the source contains a parse error (no blank canvas)
  3. User can read a human-readable error message that includes a line number, and clicking it moves the Monaco cursor there
  4. User can open a template picker when creating a new tab and choose from at least 20 templates spanning all supported diagram types, seeing a preview before committing
**Plans**: 2 plans
Plans:
- [x] 01-01-PLAN.md — Error recovery: last-valid SVG preservation, error banner, Monaco markers, jump-to-line
- [x] 01-02-PLAN.md — Template library: 20+ curated templates, two-step picker with SVG thumbnails

### Phase 2: Diagram Editor Improvements
**Goal**: Users can visually edit class, ER, and state diagrams with full round-trip fidelity — no data loss on save
**Depends on**: Phase 1
**Requirements**: CLS-01, CLS-02, CLS-03, CLS-04, CLS-05, CLS-06, CLS-07, ER-01, ER-02, ER-03, ER-04, ER-05, ER-06, ER-07, ER-08, STT-01, STT-02, STT-03, STT-04, STT-05
**Success Criteria** (what must be TRUE):
  1. User can add, delete, and rename classes; add attributes and methods; drag to connect classes with typed, cardinal relationships — all syncing to valid Mermaid source within 1.5s
  2. User can add, delete, and edit entities; drag to create relationships; set cardinality on both ends and identifying vs non-identifying; user-authored cardinalities survive a canvas edit without being silently discarded
  3. User can add states, define transitions with optional labels, and delete both via a form editor; diagrams using composite state syntax fall back to a read-only canvas with a clear notice
  4. State diagram source round-trips without data loss for simple state diagrams (no composite syntax)
**Plans**: TBD
**UI hint**: yes

### Phase 3: AI Integration
**Goal**: Users can generate, edit, and repair Mermaid diagrams using plain-language instructions, with the API key never leaving the server
**Depends on**: Phase 1
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07, AI-08
**Success Criteria** (what must be TRUE):
  1. User can describe a new diagram in plain text and receive valid Mermaid source applied to the editor, with AI output validated before being applied (invalid output shown in preview, not applied)
  2. User can send an edit instruction against the current diagram and see the result applied as an undoable Monaco edit (undo history preserved)
  3. User can one-click repair a broken diagram when the error banner is showing
  4. User sees a "configure API key" prompt (not a hidden or broken panel) when no key is set; user sees a clear unavailability message in browser-only mode
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Error Recovery + Templates | 0/2 | Complete    | 2026-03-28 |
| 2. Diagram Editor Improvements | 0/? | Not started | - |
| 3. AI Integration | 0/? | Not started | - |
