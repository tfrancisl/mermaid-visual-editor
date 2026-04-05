# Ideas

## AI Integration (Phase 3 — next up)
- AI-01: Plain-text diagram generation — user describes diagram, AI generates valid Mermaid source
- AI-02: Edit instruction against current diagram (e.g. "add a failed login path") — applied as undoable Monaco edit
- AI-03: One-click diagram repair when error banner is showing
- AI-04: AI output validated before applying; invalid Mermaid retried once with error fed back to model
- AI-05: All AI requests proxied through Axum server (`POST /api/ai/chat`); API key never reaches browser
- AI-06: "Configure API key" prompt when no key is set, rather than hiding the AI panel
- AI-07: Clear unavailability message in browser-only mode (no server)
- AI-08: AI-applied changes use `executeEdits()` to preserve undo history

## AI Enhancements (v2)
- AI-V2-01: Configurable LLM providers (OpenAI, Ollama) in addition to Anthropic
- AI-V2-02: Multi-turn AI conversation panel with persistent history
- AI-V2-03: AI-powered diagram import from image (multimodal LLM)

## Diagram Improvements (v2)
- DGM-V2-01: Direction/layout control toolbar in canvas editors (TD/LR/BT/RL)
- DGM-V2-02: State diagram drag canvas for nested composite states — significant layout research problem; form editor + RawModel fallback is sufficient for now
- DGM-V2-03: Opt-in "re-layout all nodes" action in flowchart canvas with position-loss warning — currently layout only runs on parse

## Developer Experience (v2)
- DEV-V2-01: Canvas Sync Engine — extract `suppressSyncRef`/`ownUpdateRef`/1.5s debounce/parse-on-source-change from all 9 canvas editors into a shared `useCanvasSync<T>` hook; the 6 ReactFlow editors also duplicate `useNodesState`/`useEdgesState`/`onConnect`/toolbar wiring; currently zero canvas tests exist, and a unified hook would make sync logic independently testable
- DEV-V2-02: Parser↔Serializer validation layer — add runtime contract enforcement between `parse()` and `serialize()` to catch silent field drops during roundtrip; currently papered over by `stripRawLines()` in roundtrip tests; could use property-based testing at the boundary

## Known Gaps / Tech Debt
- `ERCanvas.flowToModel` hardcodes cardinalities — audit before marking ER editor production-ready
- `ClassCanvas.flowToModel` has incomplete round-trip — audit before marking class editor production-ready
- Axum SSE proxy for AI streaming: async-stream composition, client disconnect handling, `X-Accel-Buffering` header — needs research during Phase 3 planning

## Out of Scope (with reasons)
- Real-time collaboration — high complexity, single-user tool for now
- Cloud storage / account system — local-first by design
- Mobile app — desktop browser target
- Bundled mmdc — currently requires external install; defer
- Real-time AI suggestions as user types — context rot, API cost per keystroke, intrusive UX
- Hosted LLM backend with app-managed keys — conflicts with local-first constraint
- Cloud template sync / shared template library — bundled templates sufficient for v1
- Full UML 2.x compliance for class diagrams — Mermaid syntax is intentionally simplified
- Auto-layout button that rearranges existing positioned nodes — destructive to user layout
