# NookSpace — Project Context

## Current Status: Phase 3 (Milestone 2 — Grid Engine Core Complete & Verified)

- **Repository**: `nookspace-extension`
- **Current Milestone**: Phase 3 (Milestone 2 — Grid Engine Core Complete)
- **Status Date**: November 2026
- **Build Status**:
  - Chromium MV3: `.output/chrome-mv3` (Compiled successfully, 509 kB)
  - Firefox MV2/MV3: `.output/firefox-mv2` (Compiled successfully, 509 kB)
  - Vitest Unit Tests: 75 passed (100% pass rate across 16 test suites)
  - TypeScript: Strict compilation verified (0 errors)

---

## Workspace Environment & Prerequisites
- **Runtime**: Node.js v24.15.0
- **Package Manager**: npm 11.12.1
- **VCS**: Git 2.49.0
- **Target Platforms**: Google Chrome (MV3), Microsoft Edge (MV3), Brave (MV3), Mozilla Firefox (Desktop MV2/MV3)

---

## Active Decisions
1. **Grid Engine Core (`GridLayoutEngine.tsx`)**: Decoupled component powered by `react-grid-layout@1.5.4` (`WidthProvider(Responsive)`). Reuses `WidgetRenderer` directly.
2. **Responsive Breakpoints & Column Mapping**: 5 breakpoints cleanly mapped: `lg` (1200px, 12 cols), `md` (996px, 10 cols), `sm` (768px, 6 cols), `xs` (480px, 4 cols), `xxs` (0px, 2 cols). Breakpoint transitions preserve existing layout records per breakpoint.
3. **Debounced Persistence Architecture**: During active drag/resize, layout updates occur purely in Zustand RAM (`updateLayoutsInMemory`). IndexedDB writes are triggered only upon drag/resize release (`onDragStop`, `onResizeStop`) with a 400ms debounce protection (`debouncedSaveLayouts`).
4. **Collision & Compaction**: Vertical compaction (`compactType="vertical"`) with smooth reflow (`preventCollision=false`).
5. **View Mode vs Edit Mode Clean Separation**: In View Mode (`isEditMode = false`), dragging and resizing listeners are completely deactivated with zero drag handle overhead. In Edit Mode, grip handles and custom corner resizers are visible.
6. **Custom Grid Styling (`src/styles/grid.css`)**: Notion/Linear styled drag handles, dashed border placeholders, and theme-aware accent corner resizers.
7. **Breakpoint-Isolated Layout Architecture**: Each widget instance layout is keyed by `[workspaceId+breakpoint]` (id: `${workspaceId}_${widgetInstanceId}_${breakpoint}`).
8. **Dexie Schema Version 2 Migration**: `widgetLayouts` table with `[workspaceId+breakpoint]` compound index.
9. **Idempotent Synchronization Algorithm**: `synchronizeLayout` reconciles active instances and stored layout records, deterministic non-colliding packing for new instances, and automatic orphan pruning for deleted instances. Zero mutation to `instance.config`.
10. **Zod Layout Validation**: `WidgetLayoutInputSchema` strictly enforces non-negative coordinates, positive dimensions, max columns per breakpoint, and `minW <= maxW` / `minH <= maxH`.
11. **Extension Framework**: WXT with multi-target manifests for Chromium MV3 and Firefox Desktop.

---

## Next Steps
Awaiting User Review of Phase 3 (Milestone 2). Upon approval, begin **Milestone 3 — Customization Studio & Edit Mode**:
1. Implement Customization Toolbar (Edit / Done, Add Widget, Reset Layout with confirmation dialog).
2. Implement Undo / Snapshot rollback when user clicks Cancel.
3. Polish Edit Mode visual boundaries and transitions.
