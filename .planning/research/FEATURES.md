# Feature Research

**Domain:** Browser-based Mermaid diagram visual editor (next milestone features)
**Researched:** 2026-03-28
**Confidence:** MEDIUM — primary sources from MermaidChart official docs (HIGH), competitor analysis (MEDIUM), AI tooling patterns (MEDIUM). No formal user research available; findings extrapolated from ecosystem patterns.

---

## Scope

This research covers the four active feature areas identified in PROJECT.md for the next milestone:

1. AI diagram assistance
2. Additional diagram types: class, state, ER
3. Error recovery UX
4. Templates / quick-start library

The existing app already has: flowchart visual editor, sequence/gantt/pie form editors, Monaco source editor, export (PNG/PDF/SVG), multi-tab, file watching, browser-only fallback.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in any Mermaid editor at this maturity level. Missing these makes the product feel unfinished or frustrating.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Inline parse error indicators in Monaco | Every code editor shows errors inline; a Mermaid editor that silently fails feels broken | LOW | Monaco supports `editor.setModelMarkers()`. Pattern is to catch Mermaid parse errors and annotate the editor at the failing line. Already have Monaco — wire up diagnostics. |
| Preserve last valid render on error | The live editor erasing the diagram while user is mid-edit is highly disruptive. MermaidChart added undo (Ctrl-Z) as the recovery path — users expect to not lose their diagram while typing | LOW | Store `lastValidSource`; on parse failure, keep showing last successful render. Show error banner above/below editor, not in place of the diagram. |
| Error message that locates the problem | Generic "syntax error" is useless. Users expect line number + what went wrong | LOW | Mermaid's parser returns structured errors with line/column info; surface these, not raw stack traces |
| Class diagram visual editor | MermaidChart themselves shipped a class diagram GUI in 2025 — this is now the reference bar. Users who compare will notice its absence | HIGH | Operations: add class, drag to create relationship, double-click class to edit properties (annotations, visibility modifiers, attribute types, method signatures), change relationship type and cardinality on click, add labels. Needs React Flow or similar canvas. |
| ER diagram visual editor | MermaidChart shipped ER visual editor — same reference bar argument. ER is the most-requested type for database modeling users | HIGH | Operations: add entity, drag to connect, double-click to edit attributes (name, type, PK/FK/unique), set cardinality and identifying/non-identifying relationships. Similar canvas pattern to flowchart. |
| State diagram form editor | State diagrams are structurally simpler than class/ER (nodes + transitions + labels). A form editor is table stakes; a full drag canvas is a differentiator | MEDIUM | Form editor: add states, define transitions (from→to + label), add composite states. Mermaid state syntax supports: simple states, transitions, notes, composite states, choice, fork/join, concurrency (`--`), direction. Full canvas for nested composite states is HIGH complexity — start with form. |
| Diagram template picker | Every major diagramming tool (Lucidchart 1500+, draw.io, Miro, MermaidOnline 20+) offers template galleries. Users opening the app for the first time expect a "start from..." option | LOW | A curated set of 15–25 templates organized by type is sufficient. UI: picker modal or sidebar with thumbnail preview. |

### Differentiators (Competitive Advantage)

Features that go beyond the reference bar and give this editor a distinctive edge.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI generate diagram from description | Users describe what they want in plain text; AI generates valid Mermaid source. This is the primary AI use case — all major 2025 tools (MermaidChart AI, Eraser DiagramGPT, Excalidraw AI) offer it. The differentiator is *quality*: multi-turn refinement, domain-aware prompting, and a self-correcting loop | MEDIUM | Backend proxy for the LLM API key (never expose in client). System prompt instructs model on current Mermaid v11 syntax + diagram type. Auto-validate output by parsing it before showing; if invalid, feed error back to LLM and retry (GenAIScript pattern). Two-turn fix loop is sufficient for 95% of syntax errors. |
| AI repair broken diagram | One-click "fix this" on a diagram that won't parse. Particularly useful for: diagrams pasted from LLMs (Claude/GPT frequently generate invalid syntax), hand-edited source that drifted. MermaidChart calls this its "best feature" | LOW | Send source + error to LLM with repair prompt. Validate result. Replace source on success. Simpler than full generation — no UI required beyond a button in the error state. |
| AI edit existing diagram from instruction | "Add a failed login path", "make it left-to-right", "add a note to the checkout step". Operates on the current source — not a new diagram. This is the iterative use case that separates "AI as shortcut" from "AI as collaborator" | MEDIUM | Provide current Mermaid source as context to LLM + user instruction. Same validation+repair loop as generation. The key UX distinction: make it clear the user is editing, not replacing. |
| LLM-agnostic / bring-your-own-key | Most AI diagram tools are locked to one provider (OpenAI or their own hosted model). Supporting configurable LLM backends (OpenAI, Anthropic, Ollama for local) is meaningful for users who: have API keys already, care about privacy (local Ollama), or want cost control | LOW–MEDIUM | Backend already exists (Axum). Add `/api/ai/generate` endpoint. Accept provider/model/key config. Proxy to provider. Ollama support is free for localhost users. Requires settings UI. |
| Inline Monaco error squiggles with jump-to-error | Split-pane editors need errors that link the right pane (broken preview) to the left pane (exact failing line). This is the highest-quality error UX: squiggle on the failing token + clicking the error banner jumps cursor to that line | LOW | Uses Monaco `setModelMarkers()` with line/column from Mermaid parse error. Requires connecting Mermaid parser output back to the editor component. |
| Direction/layout control in visual editor | MermaidChart's class diagram GUI lets users change rendering direction (TD, LR, etc.) via toolbar. This is a genuine usability improvement for large diagrams | LOW | Already have Mermaid config in the parser/serializer chain. Expose a dropdown in the canvas toolbar. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time AI suggestions as user types | Sounds powerful; demos well | Context rot degrades LLM quality rapidly; streaming responses over a slow API block the typing loop; every keystroke generates an API call; users find it intrusive | Explicit-trigger AI (button or keyboard shortcut). "Generate", "Fix", "Edit" on demand. |
| AI-only editing (replace source editor) | Looks like the future | Users lose control. AI-generated Mermaid frequently has syntax errors or layout issues that require manual correction. "AI feels added on" when it replaces rather than augments. Source editor is the safety valve | Hybrid model: AI generates/edits source, user refines in Monaco. Never remove the source editor. |
| Hosted LLM backend with app-managed keys | Reduces user setup friction | Turns this local-first tool into a service that requires an account and recurring cost. Conflicts with the "local-first by design" constraint | User-provided API key, stored in localStorage/settings. Proxy through Axum server so the key never touches the client bundle. Support Ollama for zero-cost local usage. |
| Cloud template sync / shared template library | More templates = more value | Requires cloud infrastructure, accounts, trust model. Out of scope per PROJECT.md | Bundled templates in the app binary. Users export/import their own templates as `.mmd` files. |
| Full UML compliance for class diagrams | Power users ask for it | Mermaid's class diagram syntax is intentionally simplified UML — it does not support full UML 2.x. Trying to implement visual editing for constructs Mermaid doesn't support creates a serialization dead-end | Implement visual editing for what Mermaid *actually supports*: classes, attributes, methods, visibility, relationships (inheritance/composition/aggregation/association/dependency/realization), cardinality, notes. Document scope clearly. |
| State diagram full drag canvas with nested composite states | Makes state editing feel complete | Nested composite states + concurrency + fork/join require significantly more layout complexity than flat graphs. The canvas rendering for nested states is a research problem, not a known solution | Form editor for simple state diagrams; fallback to RawModel (source editing only) for diagrams using composite/concurrent state syntax. Add drag canvas in a later phase. |
| Auto-layout button that rearranges existing flowchart nodes | Users ask for "clean up my diagram" | Destroys user-positioned layout. Existing nodes lose their intentional placement. BFS layout is already applied on *parse* for new/unknown nodes — running it again on a positioned diagram is destructive | Apply layout only to newly-added nodes (current behavior). Add an opt-in "re-layout all" confirmation dialog that warns about position loss. |

---

## Feature Dependencies

```
[AI Generate Diagram]
    └──requires──> [Axum /api/ai endpoint]
                       └──requires──> [LLM provider config / settings UI]

[AI Repair Broken Diagram]
    └──requires──> [Axum /api/ai endpoint]
    └──enhances──> [Inline error indicators] (repair button shown in error state)

[AI Edit Existing Diagram]
    └──requires──> [Axum /api/ai endpoint]
    └──requires──> [Current source accessible to AI panel]

[Class Diagram Visual Editor]
    └──requires──> [Class diagram parser] (parse classDiagram source → ClassModel)
    └──requires──> [Class diagram serializer] (ClassModel → classDiagram source)
    └──follows pattern of──> [FlowchartCanvas.tsx + suppressSyncRef/ownUpdateRef]

[ER Diagram Visual Editor]
    └──requires──> [ER diagram parser] (parse erDiagram source → ERModel)
    └──requires──> [ER diagram serializer] (ERModel → erDiagram source)
    └──follows pattern of──> [FlowchartCanvas.tsx]

[State Diagram Form Editor]
    └──requires──> [State diagram parser]
    └──requires──> [State diagram serializer]
    └──follows pattern of──> [SequenceEditor.tsx / GanttEditor.tsx]

[Inline Monaco Error Indicators]
    └──requires──> [Mermaid parse error → Monaco marker bridge]
    └──enhances──> [Preserve last valid render] (errors inform which source was last valid)

[Template Picker]
    └──standalone──> (no dependencies on other new features)
    └──enhances──> [All diagram types] (each type needs at least one template)
```

### Dependency Notes

- **AI endpoints require Axum backend**: The browser-only fallback path cannot offer AI features (no server to proxy LLM calls). This is acceptable — AI is an enhancement, not core functionality.
- **Class/ER visual editors require parser+serializer first**: The DiagramModel union must be extended before canvas work begins. This is the same pattern used for all existing diagram types.
- **Error recovery is largely independent**: Inline error indicators and last-valid render preservation can be implemented without any other new features, making them good early wins.
- **Templates are fully independent**: Can be built in parallel with diagram type work or AI work.

---

## MVP Definition

The existing app foundation is complete. This milestone is about extending capability, not building from scratch.

### Launch With (this milestone)

- [ ] **Inline parse error indicators + last-valid render preservation** — Highest UX impact for lowest effort. Fixes the most common frustration in any diagram editor. ~1 day of work.
- [ ] **Class diagram visual editor** — MermaidChart set the reference bar; class is the most-used structured diagram type. ~3–5 days.
- [ ] **ER diagram visual editor** — Second most-used structured type; database modeling use case. ~3–5 days.
- [ ] **AI generate/repair/edit via configurable LLM backend** — Core AI feature. Backend endpoint + floating panel in UI. ~3–5 days.
- [ ] **Template picker with curated starter set (~20 templates)** — Zero-friction onboarding; 1–2 days.

### Add After Validation (v1.x)

- [ ] **State diagram form editor** — Useful but lower priority than class/ER; form editor scope is well-defined.
- [ ] **Direction/layout control in canvas toolbar** — Small but satisfying UI improvement.
- [ ] **LLM provider selection UI (Ollama support)** — After validating the AI feature is being used.

### Future Consideration (v2+)

- [ ] **State diagram drag canvas with nested composite states** — Significant layout research required; defer until form editor is validated.
- [ ] **AI multi-turn diagram conversation panel** — Full chat history context; after single-turn is proven useful.
- [ ] **Import diagram from image (AI vision)** — Interesting but requires multimodal LLM; nice demo, unclear practical value for this tool's user base.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Inline error indicators + last-valid render | HIGH | LOW | P1 |
| Class diagram visual editor | HIGH | HIGH | P1 |
| ER diagram visual editor | HIGH | HIGH | P1 |
| AI generate/repair/edit | HIGH | MEDIUM | P1 |
| Template picker | MEDIUM | LOW | P1 |
| State diagram form editor | MEDIUM | MEDIUM | P2 |
| Direction/layout control in toolbar | MEDIUM | LOW | P2 |
| LLM provider selection / Ollama | MEDIUM | MEDIUM | P2 |
| State diagram drag canvas | HIGH | VERY HIGH | P3 |
| AI multi-turn conversation | MEDIUM | HIGH | P3 |

**Priority key:** P1 = this milestone, P2 = next iteration, P3 = future

---

## Competitor Feature Analysis

| Feature | MermaidChart (mermaid.ai) | Eraser (eraser.io) | Mermaid Live (mermaid.live) | Our Approach |
|---------|--------------------------|--------------------|-----------------------------|--------------|
| Visual class diagram editing | Yes (2025 GUI: drag to relate, double-click to edit properties) | No (source only) | No | Build it — this is now the expected bar |
| Visual ER diagram editing | Yes (point-and-click entity/attribute/cardinality editor) | No | No | Build it — MermaidChart sets expectation |
| Visual state diagram editing | No dedicated editor found | No | No | Form editor first; full canvas deferred |
| AI generate from description | Yes (native MermaidChart AI) | Yes (DiagramGPT, multi-modal) | No | Yes — differentiator is self-correcting loop + local Ollama option |
| AI repair broken diagram | Yes ("repair button" is highlighted as best feature) | Partial | No | Yes — low effort, high value |
| Error inline indicators | Partial (error box below diagram) | Partial | Error box, no inline | Inline Monaco squiggles — better than both |
| Last-valid render preservation | Undo only (Ctrl-Z recovery) | Unknown | No (clears on error) | Automatic — better than undo |
| Templates | Not prominent | Some architecture templates | Examples page (not in-app) | In-app picker with previews |
| Browser-only fallback | No (requires account) | No (requires account) | Yes (but read-only export) | Yes — maintain as core constraint |
| Local/offline usage | No | No | Limited | Yes — local-first is our identity |

---

## Technical Notes for Implementation

### Class Diagram Parser/Serializer Scope

Based on what Mermaid's `classDiagram` syntax actually supports (verified against mermaid.js docs):

- Classes with annotations (`<<interface>>`, `<<abstract>>`, custom), visibility modifiers (`+`, `-`, `#`, `~`), attributes, methods
- Relationships: inheritance (`<|--`), composition (`*--`), aggregation (`o--`), association (`-->`), dependency (`..>`), realization (`<|..`)
- Cardinality on both ends of relationships
- Notes (free-text annotations)
- Namespaces
- Direction (`direction TD/LR/BT/RL`)

The visual editor should only expose what Mermaid can serialize back to. Do not implement visual editing for constructs that have no serialization path.

### ER Diagram Parser/Serializer Scope

Based on Mermaid `erDiagram` syntax:

- Entities with attributes (type, name, PK/FK/UK key designators, optional comment)
- Relationships with left/right cardinality (one-or-zero, zero-or-more, one-or-more, exactly-one)
- Identifying (solid line) vs non-identifying (dashed line) relationships
- Relationship labels

### AI Integration Architecture

The recommended pattern (confirmed by GenAIScript, Mermaid AI repair, Eraser):

1. User triggers generation/repair/edit
2. Frontend sends request to `POST /api/ai/generate` (Axum endpoint)
3. Axum proxies to LLM provider using stored/configured API key (never in client)
4. System prompt specifies: current Mermaid v11 syntax, diagram type, output format (code block only)
5. Parse the LLM response to extract the Mermaid code block
6. Validate by running `mermaid.parse()` on the result
7. If invalid: send error + original response back to LLM with "fix the syntax error" prompt (one retry)
8. If valid: return to frontend, replace/update source in Monaco

This two-pass self-correction handles ~95% of LLM syntax errors without user intervention (confirmed by GenAIScript research).

### Error Recovery UX Pattern

Best practice from research (CodeMirror inline error article + Mermaid issue analysis):

- **Do**: Show last valid render; show error banner with line number; annotate Monaco with squiggle at failing line; provide jump-to-error action
- **Do not**: Clear the canvas; show raw parse stack trace; block the editor while showing error
- The Mermaid Live Editor's resolution was: show detailed error trace + Ctrl-Z to recover. Our approach is strictly better: automatic last-valid preservation + inline indicators means no recovery action needed in most cases.

### Template Library Scope

Minimum useful set per diagram type (based on common patterns from MermaidOnline, ClickUp examples, Mermaid docs):

| Type | Templates |
|------|-----------|
| Flowchart | Login flow, CI/CD pipeline, Decision tree, User registration |
| Sequence | API request/response, OAuth flow, Microservice call, WebSocket |
| Class | MVC pattern, Repository pattern, Observer pattern |
| ER | Blog schema, E-commerce schema, User/auth schema |
| Gantt | Sprint plan, Project timeline |
| Pie | Simple 3-slice, 5-slice examples |
| State | Traffic light, Order lifecycle, Auth session |

Total: ~20–25 templates. Enough to be useful, small enough to curate for quality.

---

## Sources

- [MermaidChart GUI for Class Diagrams](https://mermaid.ai/docs/blog/posts/gui-for-editing-mermaid-class-diagrams) — HIGH confidence (official docs)
- [MermaidChart ER Diagram Visual Editor](https://mermaid.ai/docs/blog/posts/mermaid-introduces-the-visual-editor-for-entity-relationship-diagrams) — HIGH confidence (official docs)
- [Mermaid State Diagram Syntax Reference](https://mermaid.ai/open-source/syntax/stateDiagram.html) — HIGH confidence (official docs)
- [GenAIScript Mermaid Self-Correction Pattern](https://microsoft.github.io/genaiscript/blog/mermaids/) — HIGH confidence (official Microsoft source)
- [GitHub Issue: Show last valid diagram on invalid syntax](https://github.com/mermaid-js/mermaid/issues/415) — HIGH confidence (official resolution documented)
- [CodeMirror Inline Error Patterns](https://www.devtoolsdaily.com/blog/showing-inline-errors-codemirror/) — MEDIUM confidence (community blog, patterns verified against Monaco issue tracker)
- [Best AI Diagram Tools 2025 — Eraser](https://www.eraser.io/guides/best-ai-diagram-tools-in-2025) — MEDIUM confidence (vendor analysis, self-interested source)
- [MermaidOnline Templates Gallery](https://www.mermaidonline.live/templates) — MEDIUM confidence (competitor, useful for scope reference, site was unreachable during research)
- [AI Diagram Generation Quality: LLM Diagrams](https://smcleod.net/2024/10/generating-diagrams-with-with-ai-/-llms/) — MEDIUM confidence (community practitioner)
- [Context Rot in LLMs — Morph](https://www.morphllm.com/context-rot) — MEDIUM confidence (secondary source for known LLM behavior)
- [Best AI Flowchart Generators 2026](https://www.companionlink.com/blog/2026/03/the-best-ai-flowchart-generators-in-2026/amp/) — LOW confidence (marketing content, useful for ecosystem survey only)

---

*Feature research for: Mermaid Visual Editor — next milestone (AI, diagram types, error UX, templates)*
*Researched: 2026-03-28*
