# NookSpace — Project Context

## Current Status: Phase 5 (Milestone 5.6 — Streak Calculator, Study Calendar & Activity Heatmap Complete)

- **Repository**: `nookspace-extension`
- **Current Milestone**: Phase 5 (Milestone 5.6 — Streak Calculator, Study Calendar & Activity Heatmap Complete)
- **Status Date**: November 2026
- **Build Status**:
  - Chromium MV3: `.output/chrome-mv3` (Compiled successfully, 811.91 kB)
  - Firefox MV2/MV3: `.output/firefox-mv2` (Compiled successfully, 812 kB)
  - Vitest Unit & Integration Tests: 255 passed (100% pass rate across 42 test suites)
  - TypeScript: Strict compilation verified (0 errors)

---

## Workspace Environment & Prerequisites
- **Runtime**: Node.js v24.15.0
- **Package Manager**: npm 11.12.1
- **VCS**: Git 2.49.0
- **Target Platforms**: Google Chrome (MV3), Microsoft Edge (MV3), Brave (MV3), Mozilla Firefox (Desktop MV2/MV3)

---

## Active Decisions & Architectural Invariants
1. **Customization Studio State Architecture (`customizationStore.ts`)**:
   - Total isolation between Persisted State (IndexedDB) and In-Memory Editing Draft.
   - Deep clone snapshot (`originalLayoutsSnapshot`) captured at `enterEditMode` across all 5 responsive breakpoints with zero initial DB writes.
   - Staged addition (`stageAddWidget`) keeps newly added widget instances and layout mappings in-memory until explicit commit.
   - Staged deletion (`stageDeleteWidget`) marks instances for removal without deleting underlying database records until commit.
   - Granular coordinate comparison algorithm determining `hasUnsavedChanges` with exact dirty-state tracking.
   - Workspace isolation safety checks (`requestWorkspaceSwitch` and `forceDiscardAndSwitchWorkspace`) preventing cross-workspace snapshot leakage.
2. **Atomic Save Transaction (`commitEditMode`)**:
   - Single atomic multi-table Dexie transaction `db.transaction('rw', [db.widgetInstances, db.widgetLayouts])`.
   - All-or-nothing guarantee: additions, deletions, and multi-breakpoint layout updates either succeed together or rollback completely with 0 partial writes.
   - Pre-transaction Zod validation (`WidgetLayoutInputSchema`) preventing out-of-bounds or malformed coordinates from entering the database.
   - Double-click mutex protection (`isSaving`) preventing concurrent commits.
3. **Cancel & Snapshot Rollback**:
   - Zero shared memory references guaranteeing pristine initial state restoration.
   - Staged addition rollback cleans memory drafts with 0 orphan DB records.
   - Staged deletion rollback restores widgets with 100% data fidelity (zero loss of notes, tasks, or configuration values).
   - Cancel idempotency: repeated calls outside of edit mode are side-effect free.
   - Modal keyboard hierarchy: `Escape` key dismisses open confirmation dialogs first before triggering toolbar cancellation.
4. **Grid Engine Core (`GridLayoutEngine.tsx`)**:
   - Decoupled component powered by `react-grid-layout@1.5.4` (`WidthProvider(Responsive)`). Reuses `WidgetRenderer` directly.
   - Responsive column mapping across 5 distinct breakpoints (`lg: 12`, `md: 10`, `sm: 6`, `xs: 4`, `xxs: 2`).
   - Vertical compaction (`compactType="vertical"`) with collision-reflow preventing unintended widget overlaps.
   - Notion/Linear styled drag handles, dashed border placeholders, and theme-aware accent corner resizers (`src/styles/grid.css`).
5. **Breakpoint-Isolated Layout Architecture**:
   - Each widget instance layout is keyed by `[workspaceId+breakpoint]` (id: `${workspaceId}_${widgetInstanceId}_${breakpoint}`).
   - Dexie Schema Version 2 with `[workspaceId+breakpoint]` compound index.
6. **Deterministic Packing & Reset Layout**:
   - Deterministic default packing across all 5 responsive breakpoints using `synchronizeLayout`.
   - Accessible confirmation modal with zero data loss guarantee.
   - Rollback fidelity on Cancel reverting to exact initial coordinates.
7. **Extension Framework & Permissions**:
   - WXT framework with minimal permissions: `["storage", "alarms", "notifications"]`.
   - Cross-browser abstraction layer (`browserApi`) seamlessly supporting Chromium MV3 and Firefox MV2/MV3.
8. **Deterministic Streak Engine & Study Calendar Architecture**:
   - DST-immune Day Ordinal arithmetic (`toDayOrdinal = Math.floor(Date.UTC(y, m-1, d) / 86400000)`) preventing clock-shift calculation bugs.
   - Dynamic streak computation derived on-the-fly from verified Dexie tables (`focusSessions`, `todos`, `dailyGoals`); zero persistent streak counters that can desynchronize.
   - Active Study Day evaluation combining focus sessions, completed tasks, and reached goals.
   - Heatmap intensity strictly derived from Focus Minutes (Level 0: 0m, Level 1: 1–29m, Level 2: 30–59m, Level 3: 60–119m, Level 4: >= 120m).
   - Live synchronization reacting to background timer drains and todo updates.

---

## Next Steps
Phase 5 Milestones 5.1 through 5.6 completed. Proceed to **Milestone 5.7: Test Consolidation, Build Verification & Final Phase 5 Review**.
