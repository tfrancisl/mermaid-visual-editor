# Requirements: Mermaid Visual Editor — Milestone 2

**Defined:** 2026-03-28
**Core Value:** Users can visually edit any Mermaid diagram and have it immediately reflected as correct Mermaid source — and vice versa — without losing their work or breaking the diagram.

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Error Recovery

- [x] **ERR-01**: Parse errors show inline squiggle annotations in Monaco at the failing line/column
- [x] **ERR-02**: Last valid diagram render is preserved when the source contains a parse error (canvas does not clear)
- [x] **ERR-03**: Error banner displays human-readable message with line number (not raw stack trace)
- [x] **ERR-04**: Clicking error banner jumps Monaco cursor to the failing line

### Class Diagram Editor

- [ ] **CLS-01**: User can add a class to a class diagram via the visual editor
- [ ] **CLS-02**: User can delete a class from the visual editor
- [ ] **CLS-03**: User can edit class name, attributes, and methods inline in the visual editor
- [ ] **CLS-04**: User can drag to create a relationship between two classes
- [ ] **CLS-05**: User can set relationship type (inheritance, composition, aggregation, association, dependency, realization)
- [ ] **CLS-06**: User can set cardinality on both ends of a relationship
- [ ] **CLS-07**: Class diagram canvas changes sync back to valid Mermaid source within 1.5s

### ER Diagram Editor

- [ ] **ER-01**: User can add an entity to an ER diagram via the visual editor
- [ ] **ER-02**: User can delete an entity from the visual editor
- [ ] **ER-03**: User can edit entity attributes (name, type, key designator) inline
- [ ] **ER-04**: User can drag to create a relationship between two entities
- [ ] **ER-05**: User can set relationship cardinality (one-or-zero, zero-or-more, one-or-more, exactly-one) on both ends
- [ ] **ER-06**: User can set identifying vs non-identifying relationship (solid vs dashed line)
- [ ] **ER-07**: User can add a label to a relationship
- [ ] **ER-08**: ER diagram canvas changes sync back to valid Mermaid source without data loss (cardinalities preserved)

### State Diagram Editor

- [ ] **STT-01**: User can add a state to a state diagram via a form editor
- [ ] **STT-02**: User can add a transition between states with an optional label
- [ ] **STT-03**: User can delete states and transitions
- [ ] **STT-04**: State diagram source parses and serializes without data loss for simple state diagrams
- [ ] **STT-05**: Diagrams using composite state syntax (nested states, concurrency, fork/join) fall back to RawModel with a read-only notice

### AI Assistance

- [ ] **AI-01**: User can describe a diagram in plain text and generate Mermaid source via AI
- [ ] **AI-02**: User can send an edit instruction to modify the current diagram via AI (e.g. "add a failed login path")
- [ ] **AI-03**: User can trigger AI to repair a broken diagram (one-click fix when parse error is showing)
- [ ] **AI-04**: AI output is validated before being applied — invalid Mermaid is retried once with the error fed back to the model
- [ ] **AI-05**: AI requests are proxied through the Axum server (API key never reaches the browser)
- [ ] **AI-06**: AI panel shows a "configure API key" state when no key is set, rather than hiding entirely
- [ ] **AI-07**: AI features are unavailable in browser-only mode (no server) with a clear explanation
- [ ] **AI-08**: AI-applied changes use Monaco executeEdits() so undo history is preserved

### Templates

- [x] **TMPL-01**: User can open a template picker when creating a new diagram tab
- [x] **TMPL-02**: Template picker includes at least 20 curated starter templates across all supported diagram types
- [x] **TMPL-03**: Templates include a preview thumbnail or rendered preview before selection
- [x] **TMPL-04**: Templates are bundled in the app (no network request required)

## v2 Requirements

Deferred to next milestone. Tracked but not in current roadmap.

### AI Enhancements

- **AI-V2-01**: Support configurable LLM providers (OpenAI, Ollama) in addition to Anthropic
- **AI-V2-02**: Multi-turn AI conversation panel with persistent history
- **AI-V2-03**: AI-powered diagram import from image (multimodal LLM)

### Diagram Improvements

- **DGM-V2-01**: Direction/layout control toolbar in canvas editors (TD/LR/BT/RL)
- **DGM-V2-02**: State diagram drag canvas for nested composite states
- **DGM-V2-03**: Opt-in "re-layout all nodes" action in flowchart canvas with position-loss warning

### Developer Experience

- **DEV-V2-01**: Shared sync guard hook (extract suppressSyncRef/ownUpdateRef pattern from canvas components)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time AI suggestions as user types | Context rot, API cost per keystroke, intrusive UX — explicit trigger only |
| Hosted LLM backend with app-managed keys | Conflicts with local-first constraint; requires accounts and recurring cost |
| Cloud template sync / shared template library | Requires cloud infrastructure; bundled templates sufficient for v1 |
| Full UML 2.x compliance for class diagrams | Mermaid's syntax is intentionally simplified; serialization dead-end for unsupported constructs |
| State diagram drag canvas with nested composite states | Significant layout research problem; form editor + RawModel fallback is sufficient |
| Auto-layout button that rearranges existing positioned nodes | Destructive to user-positioned layout; current behavior (layout on parse only) is correct |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ERR-01 | Phase 1 | Complete |
| ERR-02 | Phase 1 | Complete |
| ERR-03 | Phase 1 | Complete |
| ERR-04 | Phase 1 | Complete |
| TMPL-01 | Phase 1 | Complete |
| TMPL-02 | Phase 1 | Complete |
| TMPL-03 | Phase 1 | Complete |
| TMPL-04 | Phase 1 | Complete |
| CLS-01 | Phase 2 | Pending |
| CLS-02 | Phase 2 | Pending |
| CLS-03 | Phase 2 | Pending |
| CLS-04 | Phase 2 | Pending |
| CLS-05 | Phase 2 | Pending |
| CLS-06 | Phase 2 | Pending |
| CLS-07 | Phase 2 | Pending |
| ER-01 | Phase 2 | Pending |
| ER-02 | Phase 2 | Pending |
| ER-03 | Phase 2 | Pending |
| ER-04 | Phase 2 | Pending |
| ER-05 | Phase 2 | Pending |
| ER-06 | Phase 2 | Pending |
| ER-07 | Phase 2 | Pending |
| ER-08 | Phase 2 | Pending |
| STT-01 | Phase 2 | Pending |
| STT-02 | Phase 2 | Pending |
| STT-03 | Phase 2 | Pending |
| STT-04 | Phase 2 | Pending |
| STT-05 | Phase 2 | Pending |
| AI-01 | Phase 3 | Pending |
| AI-02 | Phase 3 | Pending |
| AI-03 | Phase 3 | Pending |
| AI-04 | Phase 3 | Pending |
| AI-05 | Phase 3 | Pending |
| AI-06 | Phase 3 | Pending |
| AI-07 | Phase 3 | Pending |
| AI-08 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 after roadmap creation (STT moved from Phase 3 to Phase 2 — groups with diagram editor work)*
