# Architecture Research

**Domain:** AI-assisted visual diagram editor (React + Axum)
**Researched:** 2026-03-28
**Confidence:** HIGH (codebase inspected directly; AI integration patterns from official Claude docs)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Browser (React 18)                          │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  Tab Manager │  │  AI Panel    │  │  Error Layer │               │
│  │  (App.tsx)   │  │  (new)       │  │  (new)       │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                 │                  │                       │
│  ┌──────▼─────────────────▼──────────────────▼──────────────────┐   │
│  │                    Active Tab Context                          │   │
│  │  source: string  |  onSourceChange: (s: string) => void       │   │
│  └──────┬──────────────────────────────────────────┬────────────┘   │
│         │                                          │                 │
│  ┌──────▼───────────┐                   ┌──────────▼──────────┐     │
│  │  Canvas Router   │                   │  Monaco Editor      │     │
│  │  (Canvas/index)  │                   │  (Editor/index)     │     │
│  └──────┬───────────┘                   └─────────────────────┘     │
│         │                                                            │
│  ┌──────┴─────────────────────────────────────────────────────┐     │
│  │  Diagram-specific Canvas (dispatched by type)               │     │
│  │  FlowchartCanvas | ClassCanvas | StateCanvas | ERCanvas     │     │
│  │  SequenceEditor  | GanttEditor | PieEditor   | MindmapCanvas│     │
│  └──────┬─────────────────────────────────────────────────────┘     │
│         │ parse() / serialize()                                      │
│  ┌──────▼──────────────────┐                                        │
│  │  lib/parsers/index.ts   │  DiagramModel union                    │
│  │  lib/serializers/       │  GraphModel | SequenceModel | ...      │
│  └─────────────────────────┘                                        │
│                                                                      │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐     │
│  │  lib/api.ts          │  │  lib/watchClient.ts              │     │
│  │  HTTP client         │  │  WebSocket (file watching)       │     │
│  └──────────┬───────────┘  └──────────────────────────────────┘     │
└─────────────┼────────────────────────────────────────────────────────┘
              │ HTTP / SSE
┌─────────────▼────────────────────────────────────────────────────────┐
│                      Axum Server (src/server/)                        │
│                                                                       │
│  GET  /api/health         POST /api/export (mmdc)                    │
│  POST /api/file/save      GET  /api/file/read                        │
│  GET  /api/session        WS   /ws (file watch)                      │
│                                                                       │
│  POST /api/ai/chat  ──► reqwest ──► Anthropic API (SSE stream)       │
│  (new — returns SSE)                                                  │
│                                                                       │
│  AppState { initial_files, watched_paths, ai_config (new) }          │
└───────────────────────────────────────────────────────────────────────┘
              │
┌─────────────▼─────────────┐
│  Anthropic API             │
│  POST /v1/messages         │
│  stream: true → SSE        │
└───────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Notes |
|-----------|----------------|-------|
| `App.tsx` | Tab state, keyboard shortcuts, file ops, server session load | All state accessed via refs for stale-closure safety |
| `Canvas/index.tsx` | Dispatch source → correct editor by diagram type | Single switch on `detectDiagramType(source)` |
| `FlowchartCanvas` / `ClassCanvas` / `StateCanvas` / `ERCanvas` / `MindmapCanvas` / `BlockCanvas` | React Flow–based visual editing with suppressSyncRef/ownUpdateRef guards | Reference implementation: FlowchartCanvas |
| `SequenceEditor` / `GanttEditor` / `PieEditor` | Form-based editing for structured diagram types | No React Flow; simpler component |
| `lib/parsers/index.ts` | `parse(source) → DiagramModel` union; `detectDiagramType()` | Pure functions, no side effects |
| `lib/serializers/index.ts` | `serialize(model) → string` | Pure functions, no side effects |
| `lib/api.ts` | HTTP calls to Axum; `hasServer()` cached availability | Falls back gracefully when server absent |
| `lib/watchClient.ts` | WebSocket file watching with auto-reconnect | — |
| `AIPanelComponent` (new) | Prompt input, streaming response display, conversation history | Reads/writes active tab source |
| `ErrorBanner` (new) | Surface parse failures and AI errors non-destructively | Sits outside canvas, never blocks editing |
| Axum `/api/ai/chat` (new) | Receive prompt + context, proxy to Anthropic API as SSE stream | Holds API key server-side |
| `AppState` (extended) | Add `ai_api_key: Option<String>` from env | No config UI needed; env var is sufficient |

## Recommended Project Structure

```
src/
├── client/
│   ├── App.tsx                     # (extend: add AI panel toggle, error banner)
│   ├── components/
│   │   ├── Canvas/
│   │   │   ├── index.tsx           # (extend: pass parseError to Canvas)
│   │   │   ├── FlowchartCanvas.tsx # reference implementation
│   │   │   ├── ClassCanvas.tsx     # exists — extend edit interactions
│   │   │   ├── StateCanvas.tsx     # exists — extend edit interactions
│   │   │   ├── ERCanvas.tsx        # exists — extend edit interactions
│   │   │   └── ...
│   │   ├── AI/                     # (new)
│   │   │   ├── AIPanel.tsx         # prompt + streamed response UI
│   │   │   └── useAIStream.ts      # custom hook: fetch SSE, accumulate text
│   │   └── ErrorBanner/            # (new)
│   │       └── index.tsx           # non-blocking error surface
│   └── lib/
│       ├── api.ts                  # (extend: addAIChat() function)
│       ├── parsers/index.ts        # (no change — already complete)
│       └── serializers/index.ts    # (no change — already complete)
└── server/
    ├── src/
    │   ├── ai.rs                   # (new) Anthropic proxy handler
    │   ├── routes.rs               # (extend: add /api/ai/chat route)
    │   ├── state.rs                # (extend: add ai_api_key field)
    │   └── ...
    └── Cargo.toml                  # (extend: add reqwest, eventsource-stream)
```

### Structure Rationale

- **`AI/` component folder:** Keeps streaming UI logic isolated; the panel is a drawer/sidebar that reads and writes the active tab's source string, exactly like any other canvas interaction. It does not need access to the DiagramModel — it works at the source string level.
- **`ErrorBanner/`:** Parse errors are not thrown into a React Error Boundary (which would unmount the canvas) — they are caught in the debounced parse effect and surfaced as state to a banner above the canvas.
- **`server/src/ai.rs`:** The Anthropic API key lives only here. The frontend never touches the key. This is consistent with the existing pattern of server-mediated file I/O.

## Architectural Patterns

### Pattern 1: Axum-as-AI-Proxy with SSE Pass-Through

**What:** The Axum server receives `POST /api/ai/chat` with `{ prompt, context, history }`, calls the Anthropic API with `stream: true`, and forwards the raw SSE byte stream to the browser using `axum::response::sse::Sse`.

**When to use:** Always — the API key must not be exposed to the browser. This is non-negotiable for any production deployment.

**Trade-offs:** Adds one network hop. Benefit: key security, rate-limit control, ability to add content filtering or cost caps later without frontend changes.

**Example:**
```rust
// src/server/src/ai.rs (new)
use axum::response::sse::{Event, KeepAlive, Sse};
use axum::extract::State;
use futures::stream::StreamExt;
use reqwest::Client;

pub async fn handle_ai_chat(
    State(state): State<Arc<AppState>>,
    Json(body): Json<AIChatRequest>,
) -> Sse<impl futures::Stream<Item = Result<Event, anyhow::Error>>> {
    let api_key = state.ai_api_key.clone().unwrap_or_default();
    let stream = call_anthropic_streaming(api_key, body).await;
    Sse::new(stream).keep_alive(KeepAlive::default())
}
```

**New Cargo.toml dependencies:**
```toml
reqwest = { version = "0.12", features = ["json", "stream"] }
futures = "0.3"
async-stream = "0.3"
```

### Pattern 2: Frontend SSE Consumer Hook

**What:** A `useAIStream` React hook posts to `/api/ai/chat` using `fetch()` with `ReadableStream`, accumulates `content_block_delta` text tokens, and calls `setStreamingText(prev => prev + token)` on each chunk.

**When to use:** For the AI panel component. Not used by canvas components.

**Trade-offs:** Browser `fetch` SSE requires reading the response body as a stream rather than using `EventSource` (which cannot POST). The pattern is well-established and works in all modern browsers.

**Example:**
```typescript
// src/client/components/AI/useAIStream.ts (new)
export function useAIStream() {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);

  async function send(prompt: string, context: string, history: Message[]) {
    setText("");
    setStreaming(true);
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, context, history }),
    });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      // Parse SSE lines: "data: {...}\n\n"
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const json = JSON.parse(line.slice(6));
        if (json.type === "content_block_delta") {
          setText(prev => prev + json.delta.text);
        }
      }
    }
    setStreaming(false);
  }

  return { text, streaming, send };
}
```

### Pattern 3: Non-Destructive Parse Error Surface

**What:** The debounced `text → canvas` sync effect wraps `parse(source)` in try/catch. On success it clears the error state; on failure it sets `parseError: string | null` in component state. An `ErrorBanner` component displays it above the canvas without unmounting or blocking the editor.

**When to use:** All canvas components should implement this. It replaces silent failures (where the canvas just shows stale state after a syntax error).

**Trade-offs:** Requires passing an `onParseError` callback down through Canvas — a small API surface change. Alternatively, a context value works without prop drilling.

**Example:**
```typescript
// In any canvas component's source → canvas effect:
useEffect(() => {
  if (ownUpdateRef.current) return;
  try {
    const model = parse(source);
    // ... update nodes/edges
    onParseError(null);
  } catch (err) {
    onParseError(err instanceof Error ? err.message : String(err));
    // Do NOT update nodes/edges — keep showing last valid state
  }
}, [source]);
```

### Pattern 4: Conversation Context Management

**What:** The AI panel maintains a local `history: Array<{role, content}>` array in React state. Each send appends the user message and the completed assistant response. The array is passed to the Axum proxy which forwards it verbatim as the `messages` array to the Anthropic API.

**When to use:** Always. Without history, each AI request is stateless and the user cannot ask follow-up questions like "make it more concise" or "add an error state".

**Trade-offs:** History grows unboundedly in a long session. Mitigation: cap at last N turns (8-10) before sending, or summarize on overflow. Do not persist history across tab switches — each diagram tab gets a fresh conversation.

**Example:**
```typescript
// Context shape sent to /api/ai/chat
interface AIChatRequest {
  prompt: string;          // current user turn
  context: string;         // current diagram source (for AI awareness)
  history: Array<{ role: "user" | "assistant"; content: string }>;
}
```

### Pattern 5: Adding a New Diagram Type Editor

**What:** The existing pattern is fully established. Adding a new visual editor (class, state, ER — all of which now exist) follows five steps with clear integration points.

**When to use:** For any Mermaid diagram type where form editing or React Flow canvas is appropriate.

**Build order for a new type:**
1. Add model types to `lib/parsers/index.ts` (extend `DiagramModel` union)
2. Add `parseXxx()` to the parsers dispatch switch
3. Add `serializeXxx()` to `lib/serializers/index.ts` dispatch switch
4. Add template to `lib/templates.ts`
5. Create `Canvas/XxxCanvas.tsx` implementing `suppressSyncRef` + `ownUpdateRef` guards
6. Register in `Canvas/index.tsx` dispatcher

Note: Class, State, ER, Mindmap, and Block editors already exist in the codebase. The pattern is implemented and documented in `FlowchartCanvas.tsx`.

## Data Flow

### AI-Assisted Editing Flow

```
User types prompt in AIPanel
    ↓
useAIStream.send(prompt, activeTab.source, history)
    ↓
POST /api/ai/chat  { prompt, context: source, history }
    ↓ (Axum proxy)
Anthropic API POST /v1/messages  stream: true
    ↓ SSE stream back through Axum
SSE chunks → useAIStream accumulates text tokens
    ↓
AIPanel displays streaming text
    ↓ (when user clicks "Apply" or AI responds with code block)
App.tsx.setActiveTabSource(newSource)
    ↓
Canvas re-parses (debounced 300ms) → React Flow / form re-renders
Monaco re-renders with new source
```

### Parse Error Recovery Flow

```
User edits source in Monaco
    ↓
onSourceChange fires → debounce 300ms
    ↓
Canvas useEffect: parse(source)
    ├── SUCCESS → update nodes/edges, onParseError(null)
    └── FAILURE → keep last valid nodes/edges, onParseError(message)
                        ↓
                  ErrorBanner renders above canvas
                  (Monaco cursor position preserved)
```

### Text → Canvas Sync (existing, with error extension)

```
Monaco change → onSourceChange(newSource)
    ↓ debounce ~300ms
    ↓ if ownUpdateRef.current → skip
Canvas useEffect:
    try { model = parse(source) }
    catch { setParseError(msg); return; }  ← NEW
    suppressSyncRef.current = true
    setNodes(...) / setEdges(...)
    suppressSyncRef.current = false
    setParseError(null)
```

### Canvas → Text Sync (existing, unchanged)

```
Node/edge drag/edit → React Flow onChange
    ↓
Canvas useEffect (nodes/edges):
    if suppressSyncRef.current → skip
    ownUpdateRef.current = true
    onSourceChange(serialize(buildModel()))
    ownUpdateRef.current = false
```

### Key Data Flows Summary

1. **Source truth:** `source: string` in the active `Tab` object in `App.tsx` state. Everything derives from this.
2. **AI writes source:** AI panel calls `onSourceChange(aiGeneratedSource)` — identical to any other canvas mutation. No special path needed.
3. **Parse errors are non-destructive:** A failed parse sets `parseError` state but leaves `nodes`/`edges` at last valid state. The canvas stays interactive.
4. **API key never leaves server:** Axum reads `ANTHROPIC_API_KEY` from environment at startup. The frontend calls `/api/ai/chat`, never the Anthropic API directly.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single user (local CLI) | Current architecture is ideal — single Axum process, no auth, no rate limits needed |
| Small team (shared instance) | Add `ANTHROPIC_API_KEY` env var, consider per-session rate limiting in Axum middleware |
| Public deployment | Add auth layer in front of Axum, per-user API keys or usage quotas; the proxy pattern already supports this |

### Scaling Priorities

1. **First bottleneck:** Anthropic API rate limits. Mitigation: expose error responses to the UI with clear messaging; add retry-after handling in the proxy.
2. **Second bottleneck:** Large conversation history bloating request payloads. Mitigation: truncate to last 8 turns before sending.

## Anti-Patterns

### Anti-Pattern 1: Direct Browser-to-Anthropic API Calls

**What people do:** Call `https://api.anthropic.com/v1/messages` directly from React with the API key in the frontend bundle.

**Why it's wrong:** The API key is exposed in browser DevTools network tab and in the JS bundle. Anyone can extract it and consume your quota. Official guidance is explicit: always proxy through a backend.

**Do this instead:** All Anthropic calls go through `POST /api/ai/chat` on the Axum server. The server reads the key from environment variables.

### Anti-Pattern 2: Using React Error Boundary for Parse Failures

**What people do:** Wrap the canvas in an `<ErrorBoundary>` and let parse errors bubble up as thrown errors, which triggers the boundary's fallback UI.

**Why it's wrong:** An Error Boundary replaces the entire canvas subtree with a fallback, destroying React Flow's internal state. The user loses their canvas position, selected nodes, etc. This is jarring and unnecessary.

**Do this instead:** Wrap `parse()` in try/catch inside the canvas's `useEffect`. On parse failure, keep the last valid `nodes`/`edges` in state and surface the error message in a non-destructive `ErrorBanner` above the canvas.

### Anti-Pattern 3: Continuous Source Sync During AI Streaming

**What people do:** Call `onSourceChange(streamingText)` on every SSE token delta as the AI types, causing parse + re-render on every token (30-60 times per second).

**Why it's wrong:** Mermaid parsing is synchronous and non-trivial; parsing incomplete intermediate text during generation produces constant parse errors. This floods the error banner and hammers the React reconciler.

**Do this instead:** The AI panel accumulates the full streamed response in its own local state without touching `onSourceChange`. Only when the stream is complete (or user clicks "Apply") is `onSourceChange` called once with the final text.

### Anti-Pattern 4: Skipping ownUpdateRef / suppressSyncRef in New Canvas Components

**What people do:** Write a new canvas component without the sync loop guards, assuming the simple case won't cause cycles.

**Why it's wrong:** Without guards, canvas → source serialization triggers a source prop change which triggers re-parsing which triggers canvas re-render which triggers serialization again. This is an infinite loop that freezes the browser tab.

**Do this instead:** Every canvas component that calls `onSourceChange` must set `ownUpdateRef.current = true` before the call and `false` after. Every source → canvas effect must check `if (ownUpdateRef.current) return` at the top. See `FlowchartCanvas.tsx` for the canonical implementation.

### Anti-Pattern 5: Storing AI Conversation History in AppState or Zustand

**What people do:** Lift AI conversation history to global state so it persists across tab switches.

**Why it's wrong:** Conversation context is tightly coupled to a specific diagram's source. When the user switches to a different tab, the history refers to a different diagram, making follow-up questions confusing ("make it simpler" — simpler than what?).

**Do this instead:** Store conversation history as local state in the AIPanel component, keyed by tab ID. Reset history when the active tab changes.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Anthropic API | Axum proxy `POST /api/ai/chat` → `reqwest` streaming → SSE pass-through | API key from `ANTHROPIC_API_KEY` env var; never in frontend |
| `mmdc` (Mermaid CLI) | Existing: `POST /api/export` → subprocess | No changes needed |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `AIPanel` ↔ `App.tsx` | Props: `source` (read) + `onSourceChange` (write) | Identical interface to canvas components |
| Canvas ↔ `ErrorBanner` | Props: `parseError: string \| null` | Pass through Canvas `index.tsx` or use a context |
| `useAIStream` hook ↔ Axum | `fetch()` POST + ReadableStream SSE reader | No EventSource (can't POST); use fetch + stream reader |
| Axum `ai.rs` ↔ Anthropic | `reqwest` with `stream` feature; `async-stream` for SSE forwarding | Keep connection open until Anthropic closes it; detect client disconnect via `axum::body::Body` cancellation |
| `AppState` ↔ AI config | `ai_api_key: Option<String>` from env at startup | Stateless — no per-request config needed |

## Build Order Implications

The three areas (AI integration, new diagram type editors, error recovery) have this dependency order:

```
1. Error Recovery (ErrorBanner + parse try/catch)
   — No dependencies. Safe to build first.
   — All canvas components benefit immediately.

2. New Diagram Type Editors (Class, State, ER improvements)
   — Parsers/serializers already exist.
   — Only UI interaction improvements needed.
   — Can proceed in parallel with error recovery.

3. AI Integration
   — Depends on: stable source string interface (exists)
   — Depends on: error recovery (so AI-generated invalid diagrams surface cleanly)
   — Build last: requires Cargo.toml changes, new server route, new frontend component
```

Recommended phase order: Error Recovery → Diagram Editor Improvements → AI Integration.

## Sources

- Anthropic Streaming API: https://platform.claude.com/docs/en/build-with-claude/streaming (HIGH confidence — official docs, verified 2026-03-28)
- Axum SSE: https://docs.rs/axum/latest/axum/response/sse/ (HIGH confidence — official crate docs)
- Proxy pattern requirement (API key security): https://www.nucamp.co/blog/building-ai-powered-apps-in-2026-integrating-openai-and-claude-apis-with-react-and-node (MEDIUM confidence — corroborates official guidance)
- reqwest streaming: https://docs.rs/reqwest/latest/reqwest/ (HIGH confidence — official crate docs)
- Mermaid parse error handling: https://dev.to/geanruca/handling-mermaid-diagram-rendering-errors-1n8i (MEDIUM confidence — community article)
- Existing codebase: `src/client/` and `src/server/` inspected directly (HIGH confidence)

---
*Architecture research for: Mermaid Visual Editor — AI integration + diagram type extension + error recovery*
*Researched: 2026-03-28*
