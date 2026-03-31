# Mermaid Visual Editor

Browser-based app for visually editing Mermaid diagrams. Split view: visual canvas (left) + Monaco source editor (right) with live two-way sync. Axum (Rust) server handles file I/O, export, and file watching; app also works standalone without a server.

**Current milestone:** v1.0 — Phase 3 (AI Integration) is next; Phases 1–2 complete.

## Constraints

- **Tech stack**: Rust + Axum backend, React 18 + TypeScript + Vite + Tailwind — no changes
- **Package manager**: bun only (not npm or yarn)
- **Dev environment**: Nix flake — all tooling provided, no system installs assumed
- **Diagram syntax**: Must produce valid Mermaid source compatible with mermaid.js v11
- **Compatibility**: Browser-only mode must work without the server
- **Local-first**: No cloud storage, no accounts, no hosted LLM keys
