---
phase: 01-error-recovery-templates
plan: 02
subsystem: frontend/templates
tags: [templates, ui, picker, mermaid]
dependency_graph:
  requires: [01-01]
  provides: [TMPL-01, TMPL-02, TMPL-03, TMPL-04]
  affects: [src/client/lib/templates.ts, src/client/components/DiagramTypePicker/index.tsx, src/client/App.tsx]
tech_stack:
  added: []
  patterns: [lazy-render, two-step-picker, template-library]
key_files:
  modified:
    - src/client/lib/templates.ts
    - src/client/components/DiagramTypePicker/index.tsx
    - src/client/App.tsx
decisions:
  - "TEMPLATE_LIBRARY is authoritative source for templates; getTemplate() falls through to it first, then TEMPLATES record for backwards compat"
  - "DiagramTypePicker uses mermaid.render() for lazy SVG thumbnails with cleanup of detached DOM nodes"
  - "Single-template types auto-select without showing step 2 grid"
metrics:
  duration: 10min
  completed: 2026-03-28
  tasks_completed: 2
  files_modified: 3
---

# Phase 01 Plan 02: Template Library and Two-Step Picker Summary

25 curated Mermaid templates across 10 diagram types with a two-step DiagramTypePicker showing lazy SVG thumbnail previews.

## What Was Built

### Task 1: TEMPLATE_LIBRARY in templates.ts

Added `TemplateDefinition` interface and `TEMPLATE_LIBRARY` array with 25 templates:

- **flowchart (4):** Login Flow, CI/CD Pipeline, Decision Tree, User Onboarding
- **sequenceDiagram (4):** REST API Request, OAuth 2.0 Flow, Microservices, WebSocket Session
- **classDiagram (3):** MVC Pattern, Repository Pattern, Observer Pattern
- **erDiagram (3):** Blog Schema, E-Commerce, User/Auth
- **gantt (2):** Sprint Plan, Project Timeline
- **pie (2):** Market Share, Budget Split
- **stateDiagram-v2 (3):** Traffic Light, Order Lifecycle, Auth Session
- **gitGraph (1):** Feature Branch workflow
- **mindmap (1):** Project Plan
- **timeline (1):** Product History

Each template has realistic Mermaid source (5-20 lines). Updated `getTemplate()` to use `TEMPLATE_LIBRARY` first, then fall back to legacy `TEMPLATES` record. Added `getTemplateById()` helper. Existing `TEMPLATES` and `DIAGRAM_TYPES` untouched.

### Task 2: Two-Step DiagramTypePicker + App.tsx wiring

Extended `DiagramTypePicker` to a two-step flow:

- **Step 1:** Existing diagram type list (unchanged UX)
- **Step 2:** 2-column template grid with lazy SVG thumbnails via `mermaid.render()`
- Thumbnail fallback: shows template name as text while rendering
- Back button resets to Step 1 with state cleared
- Single-template types auto-select without showing Step 2
- Dynamic popup width: 224px (step 1) vs 340px (step 2)
- Cleanup of detached mermaid render nodes via `getElementById().remove()`

App.tsx: imports `getTemplateById`, updates `handleTypeSelected` to resolve template source by id from `TEMPLATE_LIBRARY`, gracefully handles both template ids (Step 2) and plain type ids (Step 1 auto-select).

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all templates contain full realistic Mermaid source content.

## Self-Check: PASSED

- templates.ts: FOUND
- DiagramTypePicker/index.tsx: FOUND
- App.tsx: FOUND
- Commit 6da439a (Task 1): FOUND
- Commit 7c52630 (Task 2): FOUND
