# NookSpace — Project Context

## Current Status: Phase 3 (Milestone 1 — Layout Data Architecture Complete & Verified)

- **Repository**: `nookspace-extension`
- **Current Milestone**: Phase 3 (Milestone 1 — Layout Data Architecture Complete)
- **Status Date**: November 2026
- **Build Status**:
  - Chromium MV3: `.output/chrome-mv3` (Compiled successfully, 410 kB)
  - Firefox MV2/MV3: `.output/firefox-mv2` (Compiled successfully, 410 kB)
  - Vitest Unit Tests: 67 passed (100% pass rate across 15 test suites)
  - TypeScript: Strict compilation verified (0 errors)

---

## Workspace Environment & Prerequisites
- **Runtime**: Node.js v24.15.0
- **Package Manager**: npm 11.12.1
- **VCS**: Git 2.49.0
- **Target Platforms**: Google Chrome (MV3), Microsoft Edge (MV3), Brave (MV3), Mozilla Firefox (Desktop MV2/MV3)

---

## Active Decisions
1. **Breakpoint-Isolated Layout Architecture**: Each widget instance layout is keyed by `[workspaceId+breakpoint]` (id: `${workspaceId}_${widgetInstanceId}_${breakpoint}`), allowing independent arrangements on `lg` (12 cols), `md` (10 cols), `sm` (6 cols), `xs` (4 cols), and `xxs` (2 cols).
2. **Dexie Schema Version 2 Migration**: Added `widgetLayouts: 'id, [workspaceId+breakpoint], workspaceId, widgetInstanceId, breakpoint'` table in Dexie with upgrade migration handler preserving existing data.
3. **Idempotent Synchronization Algorithm**: `synchronizeLayout` reconciles active instances and stored layout records, deterministic non-colliding packing for new instances, and automatic orphan pruning for deleted instances. Zero mutation to `instance.config`.
4. **Zod Layout Validation**: `WidgetLayoutInputSchema` strictly enforces non-negative coordinates, positive dimensions, max columns per breakpoint, and `minW <= maxW` / `minH <= maxH`.
5. **Atomic Transactions**: `saveLayouts` executes inside Dexie `rw` transaction ensuring atomic updates and zero inconsistent states.
6. **Widget Architecture & Registry**: Singleton `WidgetRegistry` managing extensible typed `WidgetDefinition` entries.
7. **Widget Isolation & Defensive Error Handling**: Every widget is wrapped inside `WidgetErrorBoundary`.
8. **Foundation Widgets**: 6 concrete widgets: `Digital Clock`, `Personal Greeting`, `Calendar Overview`, `Quick Links`, `Task List Preview`, and `Quick Notes Scratchpad`.
9. **Local-First Persistence**: IndexedDB via Dexie.js as sole persistent data source. Zero business logic in `localStorage`.
10. **Design System Tokens**: Fully tokenized CSS Variables in `src/styles/globals.css`.
11. **Extension Framework**: WXT with multi-target manifests for Chromium MV3 and Firefox Desktop.

---

## Next Steps
Awaiting User Review of Phase 3 (Milestone 1). Upon approval, begin **Milestone 2 — Grid Engine**:
1. Integrate `react-grid-layout` with responsive breakpoints into the Dashboard.
2. Implement drag-and-drop collision resolution and resize handles.
3. Implement debounced auto-save to IndexedDB via `layoutRepo.saveLayouts`.
