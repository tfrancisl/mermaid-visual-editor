# ADR: Tauri v2 as Desktop Framework

**Status:** Accepted
**Date:** 2026-03-07

## Decision

Use **Tauri v2** (Rust backend + system webview) as the desktop framework for Mermaid Visual Editor.

## Context

Mermaid is JavaScript-native — the canonical renderer (`mermaid.js`) runs in the browser. The editor UI (Monaco Editor, React Flow) is also JS/React-based. We need a desktop shell that:

1. Runs JS/React natively (no subprocess or JS engine embedding)
2. Supports file system access for opening and saving `.mmd` files
3. Produces small, distributable binaries
4. Targets Linux, macOS, and eventually Windows

## Alternatives Considered

| Option | Verdict | Reason |
|---|---|---|
| **Tauri v2** | **Selected** | Mermaid.js runs in the webview; Rust backend; ~5MB binary; cross-platform |
| Wails (Go) | Strong alt | Identical architecture; Go is simpler; smaller community and security model |
| Electron | Rejected | ~150MB binary; no advantage for this use case |
| GPUI (Rust) | Not viable | Not designed for third-party apps; no webview; everything from scratch |
| Fyne/Gio (Go) | Not viable | No mature Go graph editing libraries |
| Pure PWA | Deferred | No native file dialogs; viable future fallback if desktop proves hard to ship |

## Consequences

- **Mermaid.js runs natively** in the frontend webview — no subprocess needed for rendering
- **Export** (PNG/PDF) calls `mmdc` as a Rust subprocess via `tauri-plugin-shell`
- **Linux** requires WebKit2GTK 4.1 (`webkitgtk_4_1`) as a system dependency; managed via Nix flake
- **macOS** uses WKWebView (built-in); **Windows** uses Edge WebView2 (bundled by Tauri)
- Bundle size ~5–10MB vs Electron's ~150MB
- Rust compiler times are the main development friction; mitigated by incremental builds
