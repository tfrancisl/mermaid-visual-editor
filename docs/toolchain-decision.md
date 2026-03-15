# ADR: Desktop Framework → Browser + Axum Server

**Status:** Superseded
**Original date:** 2026-03-07
**Updated:** 2026-03-15

## Current Decision

Use an **Axum HTTP server** (Rust) serving the React frontend to the user's browser. Replaced Tauri v2.

## Why the Change

Tauri v2's WebKitGTK webview was buggy on Linux (WM-related rendering issues). The app's functionality is entirely browser-compatible — Tauri provided only:
1. One `invoke("export_diagram")` call to shell out to `mmdc`
2. Native file dialogs via plugins (already had browser fallbacks)
3. Window chrome

Replacing Tauri with a lightweight Rust HTTP server:
- Lets users open the app in their preferred browser
- Enables filesystem watching for external editor workflows (vim, etc.)
- Simplifies the dev environment by dropping ~12 WebKitGTK/GTK packages from the Nix flake
- Produces a single self-contained binary via `rust-embed`

## Original Context (for reference)

The original decision evaluated Tauri v2, Wails (Go), Electron, GPUI (Rust), Fyne/Gio (Go), and pure PWA. Tauri was selected for its small binary size (~5MB) and native webview approach. In practice, the WebKitGTK dependency on Linux proved more trouble than it was worth for this use case.

## Consequences

- **No native file dialogs** — browser File API for open, server-side write for save-to-known-path, browser download for save-as
- **File watching** — `notify` crate + WebSocket push enables external editor workflows
- **Dev environment** — simpler Nix flake (no WebKitGTK, no cargo-tauri)
- **Production binary** — `rust-embed` embeds `dist/` for a self-contained executable
- **Cross-platform** — works anywhere Rust compiles + any modern browser
