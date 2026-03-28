# Stack Research

**Domain:** AI-assisted Mermaid diagram editor (React/TypeScript + Axum/Rust)
**Researched:** 2026-03-28
**Confidence:** HIGH for AI layer, MEDIUM for Mermaid AST parsing (coverage gap confirmed)

---

## Context: What Already Exists

Phases 0–3 are complete. Do not change:

- React 18, Vite, TypeScript (strict), Tailwind CSS
- @xyflow/react (React Flow v12) for flowchart canvas
- mermaid.js v11 for rendering
- Axum + Rust server for file I/O, export, WebSocket file watching
- Hand-rolled parsers/serializers in `src/client/lib/parsers/index.ts` and `serializers/index.ts`
- bun package manager

Canvas editors already exist for: flowchart, sequence, gantt, pie, class, state, ER, mindmap, block-beta.

The three active feature areas are:
1. AI-assisted diagram generation/editing
2. Improving existing visual editors (class, state, ER — are they complete or stub?)
3. Better parse error UX

---

## Recommended Stack Additions

### AI Integration

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@anthropic-ai/sdk` | 0.80.0 | Claude API client for Node/Bun server-side calls | Official Anthropic TypeScript SDK; handles streaming, retries, typed responses. Must run server-side to protect API key. |
| `claude-sonnet-4-6` (model alias) | current | Primary AI model for diagram generation | Best speed/intelligence tradeoff at $3/$15 per MTok. 1M token context, 64k output — more than enough for diagram synthesis. |

**Why not Vercel AI SDK (`ai` package v6)?** It is framework-agnostic and could work, but adds a large dependency for thin value. The Axum server already handles SSE streaming natively; the Anthropic SDK's `messages.stream()` produces standard SSE events that Axum can proxy directly. The `ai` package's React hooks (`useChat`) are Next.js-optimized and fight against the existing `api.ts` + buffered-sync architecture. Use `@anthropic-ai/sdk` directly.

**Why not OpenAI?** Claude produces higher-quality Mermaid syntax with fewer hallucinated constructs. Claude's training on code/diagrams is strong. There is no benefit in this context to adding a second AI provider.

**Why server-side only?** The API key cannot be in the browser bundle. The Axum server already proxies all `/api` calls; adding `/api/ai/generate` and `/api/ai/stream` keeps the security model clean and consistent with `src/client/lib/api.ts`.

### Mermaid AST Parsing

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Hand-rolled regex parsers (existing) | — | Parse class, state, ER, flowchart → `DiagramModel` | Already implemented and working. Do not replace. |
| `mermaid.parse()` API | mermaid v11 (existing) | Syntax validation before re-render | Already available via the bundled mermaid.js. Use for error message extraction; `mermaid.parseError` callback gives `{ line, token, expected }`. |
| `@mermaid-js/parser` | 0.6.2 | Langium-based official AST | **Do not use for class/state/ER.** See below. |

**Critical finding on `@mermaid-js/parser`:** Version 0.6.2 uses Langium 3.3.1 as its sole dependency. Inspecting the source tree at `packages/parser/src/language/`, the Langium grammars cover: `architecture`, `gitGraph`, `info`, `packet`, `pie`, `radar`, `treeView`, `treemap`, `wardley`. There is **no Langium grammar for classDiagram, stateDiagram, or erDiagram** — those diagram types still use the legacy Jison parser inside the main `mermaid` package. The `@mermaid-js/parser` package would add ~100KB+ of Langium runtime for zero benefit on the target diagram types.

**Conclusion:** The existing hand-rolled parsers in `src/client/lib/parsers/index.ts` are the correct approach for class/state/ER. They are already complete (confirmed: ~270 lines each for ClassCanvas, StateCanvas, ERCanvas). No new parsing library is needed.

### Error Recovery / UX

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `mermaid.parse()` + `parseError` callback | mermaid v11 (existing) | Extract structured error position from invalid source | The error hash contains `line`, `token`, `expected[]` — sufficient to highlight the offending line in Monaco. No new package needed. |
| Monaco `editor.setModelMarkers()` | Monaco (existing) | Show red underlines at parse error location | Monaco's built-in diagnostics API; already used for language registration. Wire parse errors to markers for inline feedback. |

---

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@ai-sdk/anthropic` | current | Vercel AI SDK Anthropic adapter | Only if you later need `useChat`/`useCompletion` React hooks. Not needed for this architecture. |
| `eventsource-parser` | ~3.x | Parse SSE stream in browser if proxying raw SSE | Only if the Axum proxy re-streams Claude SSE to the browser using `ReadableStream`. The Anthropic SDK handles this server-side; consider whether to stream tokens incrementally to the UI or return the full response. |

---

## Architecture Decision: Where Does the AI Call Live?

**Recommendation: Axum proxy pattern**

```
Browser → POST /api/ai/generate { prompt, context, diagramType }
  → Axum handler
    → calls Anthropic API with @anthropic-ai/sdk (Node/Bun process... wait)
```

**Wait — this is a Rust server, not Node.** The `@anthropic-ai/sdk` is a TypeScript package and cannot run inside Axum. There are two clean options:

**Option A (recommended): Direct HTTP from Axum using `reqwest`**
- Axum calls `api.anthropic.com/v1/messages` directly via `reqwest` (already a common Rust HTTP client)
- Stream the SSE response back to the browser using Axum's `axum::response::Sse`
- API key stored in server environment (`ANTHROPIC_API_KEY` env var)
- No new Rust crates with fragile unofficial SDKs needed — `reqwest` is already in the ecosystem
- Confidence: HIGH — Claude API is standard HTTP+SSE; `reqwest` handles it natively

**Option B: Node.js sidecar**
- Add a tiny Express/Hono Node.js process that wraps `@anthropic-ai/sdk`
- Axum proxies AI requests to it
- Adds operational complexity; two processes to start in dev
- Not recommended for this project

**Decision: Option A.** Add a `/api/ai/generate` endpoint in Axum using `reqwest` to call the Anthropic API, streaming the response as SSE to the browser. The browser `src/client/lib/api.ts` reads the stream and appends tokens to the Monaco editor or a scratch buffer.

### Rust crates needed

| Crate | Version | Purpose |
|-------|---------|---------|
| `reqwest` | ~0.12 (check Cargo.toml) | HTTP client for Anthropic API calls from Axum |
| `serde_json` | existing | Serialize request body to Anthropic API format |
| `axum` SSE support | existing (`axum::response::Sse`) | Stream tokens back to browser |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@mermaid-js/parser` for class/state/ER | No Langium grammars exist for these types; would add ~100KB+ runtime for zero value | Existing hand-rolled parsers in `parsers/index.ts` |
| `tmikus/anthropic-sdk-rust` or other unofficial Rust SDKs | Community-maintained, API drift risk, incomplete | `reqwest` + manual Anthropic HTTP calls; the API is documented and simple |
| Vercel AI SDK (`ai` package) | Designed for Next.js Server Actions; fights the existing buffered-sync architecture and `api.ts` client | `@anthropic-ai/sdk` on a Node sidecar, OR direct `reqwest` from Axum |
| `openai` SDK | No benefit over Claude for diagram generation; splits focus | `@anthropic-ai/sdk` / Anthropic direct HTTP |
| Langium directly | `@mermaid-js/parser` already bundles it; the diagram types you need (class/state/ER) are not covered | Hand-rolled regex parsers already in codebase |
| Real-time streaming every token to Monaco | Would trigger debounced parse on every token, causing flickering | Buffer complete AI response, then insert into Monaco once |

---

## AI Prompt Strategy (not a library, but informs architecture)

Research confirms that direct Mermaid syntax generation from LLMs is error-prone. The recommended pattern (confirmed by academic benchmarks and community tools):

1. **JSON-first generation**: Prompt Claude to return a structured JSON object matching the `DiagramModel` union type, then serialize via the existing `serialize()` function. This avoids LLM Mermaid syntax errors entirely.
2. **Fallback: raw Mermaid + repair loop**: If generating raw Mermaid source directly, parse with `mermaid.parse()` and if it fails, send the error back to Claude for a repair pass. One repair iteration resolves most LLM-induced syntax errors.
3. **Context injection**: Include the current diagram source in the prompt so Claude can edit/extend an existing diagram rather than generating from scratch.

The JSON-first approach is architecturally cleaner because it goes through the existing parse/serialize pipeline and benefits from all the type safety already established.

---

## Installation

```bash
# No new frontend dependencies needed for the core AI integration
# (the call goes Axum → Anthropic API directly)

# If building a Node sidecar (Option B, not recommended):
bun add @anthropic-ai/sdk

# For eventsource parsing in browser (only if streaming tokens to UI):
bun add eventsource-parser
```

For Rust (Cargo.toml additions):
```toml
# reqwest is likely already present; add if not:
reqwest = { version = "0.12", features = ["json", "stream"] }
```

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@anthropic-ai/sdk` 0.80.0 | Node 20 LTS+, Bun, TypeScript >=4.9 | Dev shell uses Nix-pinned Node; Bun runtime confirmed supported |
| `mermaid` v11.13.0 | React 18, modern browsers | Already in use |
| `@xyflow/react` v12 | React 18 | Already in use |
| `reqwest` 0.12 | tokio async runtime (already in use) | Already likely in Cargo.toml for the export flow |

---

## Current Model Recommendations (verified 2026-03-28)

From official Anthropic API docs:

| Model | API Alias | Context | Output | Cost (in/out per MTok) | Use For |
|-------|-----------|---------|--------|------------------------|---------|
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | 1M tokens | 64k | $3 / $15 | **Default for diagram generation** — best speed/quality ratio |
| Claude Haiku 4.5 | `claude-haiku-4-5` | 200k tokens | 64k | $1 / $5 | Faster/cheaper for simple edits or repair loops |
| Claude Opus 4.6 | `claude-opus-4-6` | 1M tokens | 128k | $5 / $25 | Complex multi-diagram synthesis if quality matters more than cost |

Start with `claude-sonnet-4-6`. Make the model configurable via environment variable so users can swap.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Direct `reqwest` Anthropic calls from Axum | Node.js sidecar with `@anthropic-ai/sdk` | Only if you need the SDK's type safety and don't want to write the HTTP layer manually |
| JSON-first AI generation → serialize() | Raw Mermaid text generation | Only if diagram types are simple (flowchart/pie) where LLM Mermaid accuracy is high |
| `mermaid.parse()` for error extraction | `@mermaid-js/parser` for error extraction | `@mermaid-js/parser` only if you specifically need class/state/ER AST — but those grammars don't exist there yet |
| `claude-sonnet-4-6` | `claude-haiku-4-5` | When latency matters more than quality (quick inline edits) |

---

## Sources

- [Anthropic Models Overview](https://platform.claude.com/docs/en/about-claude/models/overview) — model IDs, pricing, context windows (verified 2026-03-28)
- [Anthropic Streaming Docs](https://platform.claude.com/docs/en/build-with-claude/streaming) — SSE event format, SDK usage patterns
- [@anthropic-ai/sdk GitHub](https://github.com/anthropics/anthropic-sdk-typescript) — version 0.80.0, Node 20+ / Bun support confirmed
- [@mermaid-js/parser npm](https://www.npmjs.com/package/@mermaid-js/parser) — version 0.6.2, Langium 3.3.1 dependency
- [mermaid-js/mermaid parser language directory](https://github.com/mermaid-js/mermaid/tree/develop/packages/parser/src/language) — confirmed: no grammars for classDiagram/stateDiagram/erDiagram
- [mermaid releases](https://github.com/mermaid-js/mermaid/releases) — v11.13.0 latest
- [Vercel AI SDK 6 announcement](https://vercel.com/blog/ai-sdk-6) — framework-agnostic but Next.js-optimized
- [MermaidSeqBench paper](https://arxiv.org/html/2511.14967v1) — LLM Mermaid generation accuracy research
- [GenAIScript Mermaid repair](https://microsoft.github.io/genaiscript/blog/mermaids/) — iterative LLM repair pattern for parse errors
- [excalidraw/mermaid-to-excalidraw supported types](https://deepwiki.com/excalidraw/mermaid-to-excalidraw/2.2-supported-diagram-types) — confirms flowchart/sequence/class for visual conversion; ER/state/gantt/pie fall through to SVG embed

---

*Stack research for: Mermaid Visual Editor — AI + diagram type coverage milestone*
*Researched: 2026-03-28*
