# Project Research Summary

**Project:** Mermaid Visual Editor — AI + Diagram Type Coverage Milestone
**Domain:** Browser-based visual diagram editor with AI assistance (React/TypeScript + Axum/Rust)
**Researched:** 2026-03-28
**Confidence:** HIGH (stack, architecture, pitfalls), MEDIUM (features)

## Executive Summary

The project has a complete and solid foundation through Phase 3 (scaffold, core editor, canvas, multi-tab, export). The next milestone extends the app in three well-defined directions: improving visual editing for structured diagram types (class, state, ER), introducing AI-assisted diagram generation/editing, and fixing the parse error UX. Research confirms that all three directions follow established patterns with clear prior art — MermaidChart's own GUI editors set the reference bar for class and ER visual editing, and the Anthropic API proxy pattern is well-documented and architecturally clean for the existing Axum server.

The recommended approach is to build in dependency order: error recovery first (no dependencies, highest UX impact for lowest effort), diagram type editor improvements second (parsers and serializers already exist; only UI interaction work remains), and AI integration last (depends on stable error surfacing so AI-generated invalid syntax fails gracefully). The AI integration uses a direct `reqwest`-based HTTP proxy from Axum to the Anthropic API — no new server language or sidecar needed. AI output should be validated with `mermaid.parse()` before being applied to editor state.

The primary risks are (1) silent data loss in the ER/class round-trip due to hardcoded cardinalities and incomplete `flowToModel` implementations, (2) infinite sync loops in new canvas components that omit the `suppressSyncRef`/`ownUpdateRef` guards, and (3) Monaco undo history being destroyed by `setValue` calls when applying AI output. All three are avoidable with known techniques identified in the codebase inspection.

## Key Findings

### Recommended Stack

No new frontend dependencies are needed for AI integration — the Axum server calls the Anthropic API directly via `reqwest` (already present or easily added to Cargo.toml). The browser calls `/api/ai/chat` and reads the SSE response as a `ReadableStream`. The `@mermaid-js/parser` package is explicitly not recommended: its Langium grammars do not cover `classDiagram`, `stateDiagram`, or `erDiagram` — the exact types being targeted — making it dead weight. The existing hand-rolled parsers in `src/client/lib/parsers/index.ts` are the correct approach.

**Core technologies (new additions only):**
- `reqwest` with `stream` feature (Rust, Cargo.toml): HTTP client for Anthropic API calls from Axum — already common in the ecosystem, handles SSE natively
- `axum::response::Sse` (already in Axum): stream Anthropic SSE response back to browser — no new crate needed
- `futures` + `async-stream` (Rust): compose the SSE forwarding stream in the Axum handler
- `claude-sonnet-4-6` model alias: best speed/quality tradeoff for diagram generation at $3/$15 per MTok; make model configurable via env var

**Explicitly rejected:**
- `@mermaid-js/parser`: no Langium grammars for target diagram types; adds ~100KB+ runtime for zero benefit
- Vercel AI SDK (`ai` package): Next.js-optimized, fights the existing buffered-sync architecture
- Node.js sidecar for `@anthropic-ai/sdk`: unnecessary operational complexity when `reqwest` handles the Anthropic HTTP API directly

### Expected Features

The existing app handles: flowchart visual editor, sequence/gantt/pie form editors, Monaco source editor, export, multi-tab, file watching. The milestone research identifies what users now expect given competitor progress.

**Must have (table stakes):**
- Inline parse error indicators in Monaco (`editor.setModelMarkers()`) — every code editor shows errors inline; silent failures feel broken
- Preserve last valid render on parse error — clearing the canvas mid-edit is highly disruptive; MermaidChart's undo-only recovery is strictly worse
- Class diagram visual editor — MermaidChart shipped a GUI in 2025; this is now the reference bar
- ER diagram visual editor — MermaidChart shipped ER point-and-click editing; database modeling users expect it
- State diagram form editor — structurally simpler than class/ER; form editor scope is well-defined
- Diagram template picker — every major diagramming tool offers templates; users expect "start from..." options

**Should have (competitive differentiators):**
- AI generate diagram from description — core AI use case; differentiator is the self-correcting validation loop
- AI repair broken diagram — low effort, high value; one-click fix for invalid syntax
- AI edit existing diagram from instruction — iterative collaboration use case; requires current source as context
- Inline Monaco error squiggles with jump-to-error — better than competitors' static error boxes

**Defer to v1.x / v2+:**
- State diagram drag canvas with nested composite states — layout research problem; form editor first
- LLM provider selection / Ollama support — after validating AI usage
- AI multi-turn conversation panel with persistent history — after single-turn is proven useful
- Import diagram from image via AI vision — unclear practical value for this user base

### Architecture Approach

The architecture extends the existing buffered-sync model with two new subsystems: an AI panel component that reads and writes the active tab's source string (identical interface to existing canvas components), and a non-destructive error banner that surfaces parse failures without unmounting the canvas. The Axum server gains a single new route (`POST /api/ai/chat`) that proxies to the Anthropic API using `reqwest` SSE streaming. The API key lives only in server-side environment variables. All AI output goes through the same `parse()` validation pipeline as user-typed source.

**Major components:**
1. `AI/AIPanel.tsx` + `AI/useAIStream.ts` — prompt input, streaming response display, conversation history (keyed per tab, not global)
2. `ErrorBanner/index.tsx` — non-blocking parse failure surface; sits above canvas, never unmounts it
3. `server/src/ai.rs` — Axum handler: receives prompt + context + history, proxies to Anthropic API as SSE, forwards stream to browser
4. Extended canvas components (`ClassCanvas`, `StateCanvas`, `ERCanvas`) — UI interaction improvements for visual editing of existing parser/serializer pairs
5. Template picker modal — standalone, no dependencies on other new features

### Critical Pitfalls

1. **Missing sync guards in new canvas components** — Every canvas component calling `onSourceChange` must implement both `suppressSyncRef` (blocks serialization when source prop updates) and `ownUpdateRef` (blocks re-parsing when the canvas itself changed source). Omitting either causes an infinite render loop that freezes the browser tab. Mitigation: extract the pattern into a `useBufferedSync` hook before adding more canvas types, making omission impossible.

2. **AI output breaks editor if not validated before applying** — LLMs frequently produce invalid Mermaid syntax. Research confirms this for all major models. Mitigation: run `mermaid.parse()` on AI output before calling `onSourceChange`; show the raw output in a preview panel on validation failure rather than applying it.

3. **Monaco `setValue` destroys undo history** — Calling `editor.setValue(newSource)` for AI-applied or canvas-synced changes clears the undo stack entirely (Monaco issue #303). Mitigation: use `editor.executeEdits('ai-assist', [{ range: model.getFullModelRange(), text: newSource }])` for all programmatic source updates.

4. **Information loss on ER/class round-trip** — `ERCanvas.flowToModel` hardcodes cardinalities (`||` and `|{`); `ClassCanvas.flowToModel` does not read cardinalities back from edge data. User-authored cardinalities are silently discarded on any canvas edit. Mitigation: audit and fix `flowToModel` before marking these editors production-ready; store original values in React Flow edge `data`.

5. **Direct browser-to-Anthropic API calls** — Exposing the API key via `VITE_` prefixed env vars makes it visible in browser DevTools and the JS bundle. Mitigation: all Anthropic calls go through `POST /api/ai/chat` on the Axum server; the key is read from `ANTHROPIC_API_KEY` env var at server startup only.

## Implications for Roadmap

Based on the dependency analysis from architecture research, three phases emerge naturally. The ordering is driven by: (1) error recovery has no dependencies and makes all subsequent work safer, (2) diagram editor improvements have existing parsers/serializers and can proceed independently, (3) AI integration depends on error recovery being in place so invalid AI output surfaces cleanly.

### Phase 1: Error Recovery + Polish

**Rationale:** No dependencies on anything new. Highest UX impact per effort. Fixes the most common frustration in any diagram editor. Should ship first so all subsequent phases (including AI) benefit from it immediately.

**Delivers:**
- Inline parse error indicators in Monaco (red squiggles via `setModelMarkers()`)
- Last-valid render preservation on parse failure
- `ErrorBanner` component above canvas (reused by AI phase)
- Parse try/catch in all canvas `useEffect` hooks — replaces silent failures

**Addresses:** "Inline parse error indicators", "Preserve last valid render", "Error message that locates the problem" from FEATURES.md

**Avoids:** "Using React Error Boundary for parse failures" anti-pattern from ARCHITECTURE.md; lays groundwork for safe AI error handling

**Research flag:** Standard patterns, well-documented — skip `/gsd:research-phase`

---

### Phase 2: Visual Editor Improvements (Class, State, ER)

**Rationale:** Parsers and serializers already exist for all three types. The work is UI interaction improvements, not new parsing infrastructure. This is the highest-value feature work for users who use the app for structured diagramming. Class and ER set the competitive reference bar.

**Delivers:**
- Class diagram: add class, drag to create relationships, double-click to edit properties, change relationship type and cardinality, full round-trip fidelity
- ER diagram: add entity, drag to connect, double-click to edit attributes, set cardinality and relationship type, fix hardcoded `flowToModel` cardinality loss
- State diagram: form editor for add states / define transitions / labels; composite state fallback to RawModel with read-only notice
- Template picker (20–25 curated templates organized by type)
- Direction/layout control in canvas toolbar

**Addresses:** "Class diagram visual editor", "ER diagram visual editor", "State diagram form editor", "Diagram template picker" from FEATURES.md

**Avoids:** "Information loss on ER/class round-trip" (fix `flowToModel`) and "Composite state flattening" (explicit fallback) from PITFALLS.md; "Missing sync guards" (all new/extended canvas components must implement both refs)

**Research flag:** Standard React Flow canvas patterns — skip `/gsd:research-phase` for class/ER. State diagram composite states may need scoped research if the read-only fallback boundary needs refinement.

---

### Phase 3: AI Integration

**Rationale:** Depends on Phase 1 (error recovery) being in place so AI-generated invalid syntax surfaces cleanly instead of breaking the app. The Axum proxy pattern is architecturally settled; this phase is an implementation task, not a design task.

**Delivers:**
- `POST /api/ai/chat` Axum endpoint with `reqwest` SSE proxy to Anthropic API
- `AI/AIPanel.tsx` with prompt input, streaming response, per-tab conversation history
- `AI/useAIStream.ts` hook using `fetch` + `ReadableStream` (not `EventSource`, which cannot POST)
- AI generate diagram from natural language description
- AI repair broken diagram (one-click fix; shown in error state)
- AI edit existing diagram from instruction (current source passed as context)
- `mermaid.parse()` validation gate before any AI output is applied to editor state
- `editor.executeEdits()` for applying AI output (preserves undo history)
- `ANTHROPIC_API_KEY` env var support in `AppState`

**Uses:** `reqwest` + `axum::response::Sse` + `futures`/`async-stream` from STACK.md; `useAIStream` hook pattern from ARCHITECTURE.md

**Avoids:** "AI output breaks editor" (validation gate), "Monaco undo destroyed" (`executeEdits`), "API key in frontend" (server-side env only), "AI streaming races with canvas auto-sync" (pause auto-sync timer during generation), "Prompt injection via diagram content" (diagram source in user message, not system prompt) from PITFALLS.md

**Research flag:** Needs `/gsd:research-phase` for the Axum SSE proxy implementation details — specifically: `async-stream` composition pattern, `axum::body::Body` cancellation detection, and `X-Accel-Buffering: no` header for reverse-proxy deployments.

---

### Phase Ordering Rationale

- **Error recovery before AI:** AI-generated invalid Mermaid is a documented common occurrence. Without the error banner and last-valid preservation in place first, invalid AI output creates a blank canvas with no recovery path — a catastrophic UX failure.
- **Diagram editors before AI (or parallel):** The canvas interaction improvements in Phase 2 are independent of AI and can run concurrently if resources allow. If sequential, do them before Phase 3 so AI-generated diagrams for class/ER types immediately benefit from the improved visual editors.
- **Template picker with Phase 2:** Templates are fully independent but belong with diagram editor work since each new editor type needs at least one template to demonstrate it.
- **AI last:** New Rust crates in Cargo.toml, new server route, new frontend component tree — this is the highest-complexity phase and benefits from having the simpler phases settled first.

### Research Flags

Phases needing deeper research during planning:
- **Phase 3 (AI Integration):** The Axum SSE proxy implementation requires research on `async-stream` + `reqwest` stream composition, client disconnect detection, and deployment headers. The streaming UX (when to surface tokens vs. buffer) also needs a decision.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Error Recovery):** Monaco `setModelMarkers()` is well-documented; try/catch in useEffect is trivial; `ErrorBanner` is a simple component.
- **Phase 2 (Diagram Editors):** React Flow canvas pattern is fully established in `FlowchartCanvas.tsx`; parsers/serializers exist; the pattern is documented in CLAUDE.md and the codebase.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Codebase inspected directly; Anthropic API docs verified; `@mermaid-js/parser` grammar gap confirmed by source inspection |
| Features | MEDIUM | MermaidChart feature claims from official docs (HIGH); competitor analysis partially from vendor marketing (MEDIUM); no formal user research |
| Architecture | HIGH | Existing codebase inspected directly; AI proxy pattern from official Anthropic + Axum docs; anti-patterns confirmed in code |
| Pitfalls | HIGH | Sync loop pitfalls from direct code inspection; Monaco undo issue from confirmed GitHub issues; AI validation from benchmarked research |

**Overall confidence:** HIGH

### Gaps to Address

- **`flowToModel` audit scope:** Research identified that `ERCanvas.flowToModel` hardcodes cardinalities and `ClassCanvas.flowToModel` has incomplete round-trip. The full extent of lossy fields across all canvas types was not exhaustively mapped. Audit each canvas's `flowToModel` during Phase 2 planning.
- **Streaming UX decision:** Research recommends buffering AI output until complete before applying to Monaco, but does not specify whether to show streaming preview text in the AI panel during generation. This UX decision should be made during Phase 3 planning.
- **Ollama / alternative LLM support:** Research confirms this is architecturally straightforward (same Axum proxy, different endpoint + auth), but it was deferred to v1.x. If there is early user demand, the `/api/ai/chat` endpoint should be designed with a pluggable provider field from the start rather than hardcoding Anthropic.
- **State diagram composite state boundary:** Research recommends showing a read-only canvas with a notice for diagrams using composite/concurrent state syntax. The exact detection heuristic (which source patterns trigger read-only mode) was not specified and should be defined during Phase 2 planning.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection (`src/client/`, `src/server/`) — sync guard pattern, `flowToModel` hardcoded values, `ERCardinality` types confirmed
- [Anthropic Models Overview](https://platform.claude.com/docs/en/about-claude/models/overview) — model IDs, pricing, context windows verified 2026-03-28
- [Anthropic Streaming Docs](https://platform.claude.com/docs/en/build-with-claude/streaming) — SSE event format, SDK usage patterns
- [Axum SSE docs](https://docs.rs/axum/latest/axum/response/sse/) — SSE response pattern
- [reqwest docs](https://docs.rs/reqwest/latest/reqwest/) — streaming feature
- [MermaidChart GUI for Class Diagrams](https://mermaid.ai/docs/blog/posts/gui-for-editing-mermaid-class-diagrams) — official docs, feature reference bar
- [MermaidChart ER Diagram Visual Editor](https://mermaid.ai/docs/blog/posts/mermaid-introduces-the-visual-editor-for-entity-relationship-diagrams) — official docs
- [Monaco editor issue #303](https://github.com/microsoft/monaco-editor/issues/303) — setValue loses undo/redo, confirmed
- [@mermaid-js/parser source: language directory](https://github.com/mermaid-js/mermaid/tree/develop/packages/parser/src/language) — no grammars for classDiagram/stateDiagram/erDiagram confirmed
- [GenAIScript Mermaid Self-Correction Pattern](https://microsoft.github.io/genaiscript/blog/mermaids/) — official Microsoft source; LLM repair loop pattern

### Secondary (MEDIUM confidence)
- [MermaidSeqBench paper (arXiv 2511.14967)](https://arxiv.org/html/2511.14967v1) — LLM Mermaid generation accuracy; benchmarks confirm frequent syntax errors
- [React Flow performance documentation](https://reactflow.dev/learn/advanced-use/performance) — `nodeTypes` must be module-level
- [GitHub Issue: Show last valid diagram on invalid syntax](https://github.com/mermaid-js/mermaid/issues/415) — Mermaid team resolution documented
- [OWASP LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) — indirect injection via user-supplied content
- [Mermaid State Diagram Syntax Reference](https://mermaid.ai/open-source/syntax/stateDiagram.html) — scope of state diagram features

### Tertiary (LOW confidence)
- [Best AI Diagram Tools 2025 (Eraser)](https://www.eraser.io/guides/best-ai-diagram-tools-in-2025) — vendor analysis, useful for ecosystem survey only
- [Best AI Flowchart Generators 2026](https://www.companionlink.com/blog/2026/03/the-best-ai-flowchart-generators-in-2026/amp/) — marketing content, ecosystem survey only

---
*Research completed: 2026-03-28*
*Ready for roadmap: yes*
