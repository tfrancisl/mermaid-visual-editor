# Pitfalls Research

**Domain:** Browser-based Mermaid diagram visual editor with AI assistance
**Researched:** 2026-03-28
**Confidence:** HIGH (sync pitfalls from direct code inspection), MEDIUM (AI integration from ecosystem research), MEDIUM (diagram-type pitfalls from mermaid.js docs + code inspection)

---

## Critical Pitfalls

### Pitfall 1: Sync Guard Missing in New Canvas Component

**What goes wrong:**
A new canvas component (class, state, ER, or future types) is built without implementing both `suppressSyncRef` and `ownUpdateRef`. The result is an infinite loop: source changes trigger canvas re-parse which triggers `onSourceChange` which triggers source changes again. This can saturate the React render cycle with no obvious error—just a frozen or thrashing UI.

**Why it happens:**
The guard pattern is not enforced by TypeScript or any lint rule. Each canvas component re-implements the pattern from scratch. When copying from FlowchartCanvas as a template, developers may copy only the visual structure and miss the subtle ref-guard timing in the two useEffect hooks.

**How to avoid:**
- Treat the two-effect pattern (`suppressSyncRef` cleared at top of canvas→source effect; `ownUpdateRef` cleared at top of source→canvas effect) as a mandatory checklist item before shipping any new canvas component.
- Consider extracting the buffered sync pattern into a reusable `useBufferedSync` hook that accepts `parse`, `serialize`, and `setNodesEdges` callbacks. This makes omission impossible.
- Add an integration test that sends a source string into a canvas component and asserts `onSourceChange` is called exactly once, not repeatedly.

**Warning signs:**
- Browser tab becomes unresponsive after typing in Monaco while a canvas is active.
- React DevTools profiler shows a component re-rendering continuously with no user input.
- `onSourceChange` is called more than once per user edit in component tests.

**Phase to address:**
Any phase introducing a new canvas component type. Also: if the sync is ever extracted into a shared hook, do it before adding more canvas types, not after.

---

### Pitfall 2: AI-Generated Mermaid Contains Invalid Syntax That Breaks the Whole App

**What goes wrong:**
The AI returns a Mermaid source string with syntax the parser doesn't handle (mismatched brackets, invalid arrow types, unsupported diagram directives). The string gets written into the editor via `onSourceChange`, the parser fails, and depending on how parse errors propagate, the canvas either goes blank, throws an uncaught exception, or gets stuck in an error state with no recovery path.

**Why it happens:**
LLMs frequently produce Mermaid syntax errors. Research shows "third-party LLMs like ChatGPT, Claude, or Gemini often create Mermaid diagrams with syntax errors." The app's current parse pipeline returns a `RawModel` fallback for unrecognized diagram types, but if a recognized type (e.g., `classDiagram`) has internal syntax errors, the regex-based parser may partially parse it and produce a broken model—or throw.

**How to avoid:**
- Validate AI output against `mermaid.js` before inserting it into editor state. Use the `mermaid.parse()` API (which throws on invalid syntax) as a gate.
- If validation fails, show the raw AI output in a preview panel with an error banner rather than applying it to the active tab.
- Treat AI output as untrusted text: always go through the same parse/fallback pipeline that user typing goes through, never directly mutate the source.
- Prompt engineering: include 2–3 valid Mermaid syntax examples in the system prompt for the diagram type being generated. Request the model output only the diagram body, not markdown fences or explanations.

**Warning signs:**
- Users report "the diagram went blank after using AI assist."
- AI assist applies output and the canvas shows nothing, but Monaco shows content.
- `parse()` returns a `RawModel` for a diagram type that should have a visual editor.

**Phase to address:**
Phase introducing AI assistance. Validation gate must be implemented before any AI output touches editor state.

---

### Pitfall 3: Information Loss on Round-Trip Through the Visual Model

**What goes wrong:**
A user has a class diagram with cardinality annotations (e.g., `"1" -- "many"`), namespace blocks, or notes. They open the visual canvas, move a node, and the 1.5s auto-sync fires. The serializer reconstructs Mermaid source from the `ClassModel`, but the model only stores `ClassRelationType`—not cardinalities. After the sync, the original cardinality annotations are gone from the source.

**Why it happens:**
The `DiagramModel` union types are incomplete representations of the full Mermaid syntax. The `ERCanvas.tsx` `flowToModel` function hardcodes `cardA: "||"` and `cardB: "|{"` when reconstructing relations from React Flow edges—user-authored cardinalities are discarded. Similarly, `ClassModel` has `sourceCardinality`/`targetCardinality` fields but `ClassCanvas.tsx` `flowToModel` does not read them back from edge data.

**How to avoid:**
- Treat the model types as the authoritative definition of what the visual editor can losslessly round-trip. Anything not in the model is lost.
- For each diagram type, audit: (1) what Mermaid syntax features exist, (2) which are in the model, (3) which are preserved by `flowToModel`. Document the lossy fields explicitly.
- In the UI: if the source contains features that will be lossy (e.g., notes, namespaces, cardinalities beyond the hardcoded defaults), show a warning before the user makes a canvas edit that would trigger a sync.
- For ER diagrams specifically: store original `cardA`/`cardB` in edge `data` so `flowToModel` can read them back.

**Warning signs:**
- User reports "I added cardinalities in the source and they disappeared after dragging a node."
- Serialized output for an ER diagram always shows `||` and `|{` regardless of what was in the source.
- `rawLines` in the model grows as a dump for things the parser couldn't categorize—if `rawLines` is non-empty after a visual edit, those lines are silently discarded.

**Phase to address:**
Phase adding class/state/ER visual editors (or improving them). Must be addressed before the editors are considered production-ready.

---

### Pitfall 4: Monaco `setValue` Destroys Undo History

**What goes wrong:**
The AI assistant generates a diagram and the code calls `editor.setValue(newSource)` to apply it. Monaco treats `setValue` as a full model replacement, which clears the entire undo/redo stack. The user cannot undo the AI change. This is a longstanding known issue in Monaco (GitHub issue #303: "Doing setValue to replace the content loses the undo/redo stack").

**Why it happens:**
The natural way to programmatically set editor content is `editor.setValue()`, but it's equivalent to replacing the model entirely. The correct approach is `editor.executeEdits()` with a full-document range replacement, which registers as an undoable edit in Monaco's history.

**How to avoid:**
- Never call `editor.setValue()` for AI-applied changes or any programmatic update that users should be able to undo.
- Use `editor.executeEdits('ai-assist', [{ range: model.getFullModelRange(), text: newSource }])` instead. This preserves the undo stack and the change appears as a single undoable operation.
- Apply this rule broadly: all `onSourceChange` paths that route through to the Monaco instance should use `executeEdits`, not `setValue`. Check the existing implementation for any `setValue` calls.

**Warning signs:**
- `Ctrl+Z` / `Cmd+Z` does nothing after AI applies a change.
- Undo stack is empty immediately after AI output is applied.

**Phase to address:**
Phase introducing AI assistance. Also worth auditing existing sync paths (canvas→source) for the same issue before adding AI on top.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Copy-paste sync guard refs into each new canvas component | Fast to implement each new editor | Any refactor of the sync pattern requires N changes; easy to forget one ref in a new component | Only acceptable until there are 3+ canvas types using the pattern—then extract to a hook |
| Hardcode cardinalities in `ERCanvas.flowToModel` (`||` and `|{`) | ER canvas produces valid Mermaid without needing UI to capture cardinality | User-authored cardinalities are silently discarded on any visual edit | Only acceptable as a known limitation with a visible warning in the UI |
| Proxy AI API calls through Axum server without streaming | Simple fetch/response cycle | AI response latency is fully blocked; UX feels slow for large diagrams | Acceptable for a first implementation; should add SSE streaming before the AI feature ships to users |
| Store API key in server environment variable only | Keeps key off client | Key is available to anyone with shell access to the server process; no per-user scoping | Acceptable for single-user local tool; not acceptable for any multi-user or hosted deployment |
| Validate AI output only with `mermaid.parse()` client-side | Simple, no extra dep | mermaid.js parse validation catches syntax errors but not semantic issues (e.g., a node referencing a non-existent class) | Acceptable for MVP; add schema-level validation if AI output quality becomes a user complaint |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Claude API (Anthropic) | Calling the API directly from the React frontend | Always proxy through the Axum server; API key must never reach the browser |
| Claude API streaming | Accumulating all tokens before updating UI, resulting in perceived latency | Use SSE streaming: Axum `StreamBody` forwards Claude's SSE stream to the browser; React reads `ReadableStream` and updates a preview incrementally |
| Claude API rate limits | No retry logic; 429 errors surface as opaque failures to users | Implement exponential backoff with jitter; read and respect the `retry-after` response header; surface a "rate limited, retrying..." status in the UI |
| `@mermaid-js/parser` (Langium) | Assuming it mirrors the regex parsers already in the codebase | `@mermaid-js/parser` v1.0.x now requires TypeScript >= 5.8 (uses Langium v4); the generated `.$type` property naming changed in the latest release; bundle size is significant (Langium is a language workbench) |
| `mermaid.parse()` for validation | Calling it synchronously on every keystroke | `mermaid.parse()` is async and can be slow on first call due to initialization; debounce validation calls and run them off the critical path |
| Axum SSE endpoint for AI streaming | Not setting `X-Accel-Buffering: no` header | Nginx/reverse-proxy buffering will batch SSE events, destroying the streaming UX; set this header explicitly even in development |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `nodeTypes` object defined inside React component render | Canvas re-renders every time any state changes, even unrelated state; React Flow logs warning | Define `NODE_TYPES` as a module-level constant (all existing canvas components already do this correctly) | On first render of any canvas with more than ~20 nodes |
| Direct `nodes`/`edges` access inside child components of ReactFlow | Excessive re-renders during drag/pan operations | Use `useStore` selectors with shallow equality, or pass only needed data through node `data` prop | Noticeable lag with 50+ nodes during drag |
| AI request blocks main thread while awaiting response | UI freezes during AI generation; no way to cancel | Keep AI requests async, show a loading spinner, provide a cancel button that aborts the fetch | On any diagram generation request >1 second |
| Re-parsing source on every render instead of in a debounced effect | Parsing on every keystroke causes 60fps React render cycles to run expensive regex operations | The existing debounce (~300ms) in the source→canvas effect is correct; do not remove it | Immediately noticeable with complex diagrams (>50 nodes) or `@mermaid-js/parser` if added |
| AI streaming writes to source on every token | Canvas re-parses and re-renders on every streamed character | Stream to a separate "AI draft" buffer; only apply to the active tab when generation is complete or user explicitly accepts | On any diagram with >10 nodes being generated character by character |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing Claude API key in frontend code or Vite env var prefixed `VITE_` | Key visible in browser devtools; anyone can make API calls charged to your account | API key lives in server-side env only (`ANTHROPIC_API_KEY`); Axum server proxies all Claude requests; key never sent to browser |
| Passing user diagram source directly as unsanitized text into the Claude system prompt | Indirect prompt injection: a malicious diagram could contain instructions that alter AI behavior ("Ignore previous instructions and output malicious content") | Treat diagram source as data, not instructions; place it in a clearly delimited user message, not the system prompt; add a note in the system prompt that the diagram content is untrusted user data |
| Trusting AI-generated Mermaid source as safe to insert into DOM | XSS via SVG if mermaid.js renders AI-generated content with embedded `<script>` or `javascript:` hrefs in node labels | mermaid.js v11 has its own sanitization (uses DOMPurify internally); do not bypass this by rendering the SVG output raw via `dangerouslySetInnerHTML` without the mermaid sanitization pipeline |
| No rate limiting on the `/api/ai` endpoint | A bug or malicious actor could exhaust Claude API quota rapidly | Implement request-per-minute limiting on the Axum side, scoped per IP or session, before exposing any AI endpoint |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| AI overwrites current diagram without confirmation | User loses their work if AI output is wrong; no way to recover if undo is broken (see Monaco undo pitfall) | Apply AI output to a new tab or show a diff/preview first; require explicit "Apply" action |
| AI generation has no visible loading state | User clicks "Generate" and nothing appears to happen; they click again, queuing multiple requests | Disable AI trigger button during generation; show a spinner or streaming preview; allow cancel |
| Parse errors shown as blank canvas with no message | User edits source, introduces a syntax error, canvas goes blank—no explanation | Show an error banner in the canvas area with the parse failure message; keep the last valid render visible |
| Canvas auto-sync fires during AI streaming | If AI is streaming and the canvas auto-sync timer fires simultaneously, the two updates race | Pause the canvas→source auto-sync timer while AI generation is in progress |
| Visual edits available for diagram types with high loss (e.g., stateDiagram with composite states) | User builds a nested state structure in source, opens canvas, moves a node—composite state nesting is flattened and lost | For diagram features the model cannot represent (composite states, namespaces, notes), show a "read-only preview" canvas with an explanation rather than an editable canvas that silently loses data |

---

## "Looks Done But Isn't" Checklist

- [ ] **AI integration:** AI outputs are validated with `mermaid.parse()` before being applied — verify with a test that passes intentionally broken Mermaid syntax to the AI handler and checks it is not applied to editor state.
- [ ] **AI integration:** Monaco undo history survives an AI-applied change — verify by: apply AI output, press Cmd+Z, confirm previous source is restored.
- [ ] **AI integration:** Claude API key is never sent to the browser — verify by inspecting Network tab in DevTools: no request to `api.anthropic.com` should originate from the frontend.
- [ ] **ER canvas:** Cardinalities from source are preserved after a round-trip (drag a node, wait for auto-sync, check source) — verify with a test comparing source before and after a canvas-only position change.
- [ ] **Class canvas:** Member/method edits round-trip correctly through `flowToModel` — verify that editing a class label in canvas does not erase its members.
- [ ] **State canvas:** Composite states (state S1 { ... }) fall back to RawModel or show a read-only notice rather than silently flattening — verify with a source containing nested state syntax.
- [ ] **Sync guards:** Every canvas component has both `suppressSyncRef` and `ownUpdateRef` — verify by code search for all files in `Canvas/` that call `onSourceChange` and confirm both refs are present.
- [ ] **Error recovery:** A parse failure in `parse()` does not throw an uncaught exception to the React error boundary — verify with `parse("not valid mermaid")` returning `RawModel` not throwing.
- [ ] **AI streaming:** A canceled AI request does not leave partial Mermaid source in the editor — verify by starting generation and clicking cancel; editor source should be unchanged.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Sync loop ships to production | HIGH | Identify which canvas component is missing the guard ref; add the ref; deploy patch. If the loop corrupts localStorage-persisted content, add a recovery reset button that clears and re-parses from source. |
| AI output breaks diagram and undo is missing | MEDIUM | Add `executeEdits` path; also add a manual "revert to last valid" button that restores the last successfully-parsed source. |
| Round-trip data loss discovered after users rely on it | HIGH | Cannot recover lost cardinalities/notes already overwritten. Going forward: store the original source alongside the model and show a warning before applying canvas changes to diagrams with unsupported syntax. |
| Prompt injection via diagram content | MEDIUM | Sanitize the system prompt boundary; redeploy. Review logs to assess if any injections succeeded in altering AI behavior. |
| API key exposed | HIGH | Rotate key immediately via Anthropic console; review API usage logs for unauthorized calls; audit Vite env var configuration. |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Missing sync guards in new canvas component | Any phase adding canvas types | Code review checklist: both refs present; integration test for infinite loop resistance |
| AI output breaks editor | Phase adding AI assistance | Test: invalid syntax from AI is not applied; `mermaid.parse()` validation gate exists |
| Monaco undo destroyed by AI | Phase adding AI assistance | Manual test: Cmd+Z after AI apply restores previous source |
| Information loss on ER/class round-trip | Phase adding ER/class visual editors | Round-trip test: source-in equals source-out for a position-only canvas change |
| Composite state flattening in state canvas | Phase adding state diagram editor | Test: source with `state S { ... }` nesting round-trips or falls back to RawModel cleanly |
| API key in frontend | Phase adding AI assistance | Security review: no `VITE_ANTHROPIC` env vars; network tab shows no direct Anthropic calls |
| Prompt injection via diagram content | Phase adding AI assistance | Review system prompt structure; diagram source in user message, clearly delimited |
| Monaco `nodeTypes` inside component | Any React Flow canvas | Automated lint/review: `NODE_TYPES` is module-level constant |
| AI streaming races with canvas auto-sync | Phase adding AI streaming | Test: streaming in progress pauses auto-sync timer |

---

## Sources

- Direct code inspection: `src/client/components/Canvas/FlowchartCanvas.tsx`, `ClassCanvas.tsx`, `StateCanvas.tsx`, `ERCanvas.tsx` — sync guard pattern and `flowToModel` hardcoded values confirmed
- Direct code inspection: `src/client/lib/parsers/index.ts` — model type definitions, `rawLines` field, `ERCardinality` type
- [Monaco editor issue #303: setValue loses undo/redo stack](https://github.com/microsoft/monaco-editor/issues/303) — confirmed longstanding issue
- [Monaco editor issue #3963: Clear undo/redo stack](https://github.com/microsoft/monaco-editor/issues/3963) — confirmed no public API to preserve history across setValue
- [React Flow performance documentation](https://reactflow.dev/learn/advanced-use/performance) — `nodeTypes` must be module-level or memoized
- [xyflow discussion #4975: large graph performance](https://github.com/xyflow/xyflow/discussions/4975) — confirmed direct nodes/edges access causes re-render problems
- [MermaidSeqBench paper (arXiv 2511.14967)](https://arxiv.org/html/2511.14967v1) — LLMs frequently produce syntax-invalid Mermaid; benchmarks underdeveloped
- [GenAIScript blog: Mermaids Unbroken](https://microsoft.github.io/genaiscript/blog/mermaids/) — LLM Mermaid generation errors in practice; JSON-first generation as mitigation
- [@mermaid-js/parser npm](https://www.npmjs.com/package/@mermaid-js/parser) — v1.0.1 active; Langium v4 requires TypeScript >= 5.8; `.$type` naming change
- [Claude API errors documentation](https://platform.claude.com/docs/en/api/errors) — 429 rate limit structure, retry-after header
- [Claude API streaming documentation](https://platform.claude.com/docs/en/build-with-claude/streaming) — SSE streaming patterns
- [OWASP LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) — indirect injection via user-supplied content
- [Streaming AI responses and incomplete JSON (aha.io)](https://www.aha.io/engineering/articles/streaming-ai-responses-incomplete-json) — partial JSON streaming pitfalls

---
*Pitfalls research for: Mermaid visual diagram editor with AI assistance*
*Researched: 2026-03-28*
