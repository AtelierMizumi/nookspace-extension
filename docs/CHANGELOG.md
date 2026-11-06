# Changelog — NookSpace

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-alpha.10] - 2026-11-07

### Added
- Phase 3 (Milestone 3.6) Reset Layout End-to-End Flow:
  - Accessible Reset Layout confirmation modal clearly communicating zero data loss and scope of layout rearrangement.
  - Deterministic default packing across all 5 responsive breakpoints (`lg`, `md`, `sm`, `xs`, `xxs`) using `synchronizeLayout`.
  - In-memory draft updates: sets `hasUnsavedChanges = true` with zero immediate IndexedDB writes.
  - Seamless inclusion of staged added widgets and exclusion of staged deleted widgets during layout recalculation.
  - Absolute data preservation: zero widget instances deleted, zero loss of notes, tasks, or configuration values.
  - Snapshot rollback fidelity: clicking Cancel after Reset Layout accurately reverts positions to pre-edit custom coordinates.
  - Unit test suite (`resetLayoutFlow.test.ts`) expanding test coverage to 123 passing tests across 22 test suites (100% pass rate).

## [0.1.0-alpha.9] - 2026-11-07

### Added
- Phase 3 (Milestone 3.5) Add Widget Integration:
  - Staged addition in Edit Mode keeping newly added widget instances and layouts in-memory without early IndexedDB commits.
  - Automatic non-overlapping layout allocation using `synchronizeLayout` occupancy packing across all 5 responsive breakpoints (`lg`, `md`, `sm`, `xs`, `xxs`).
  - Seamless integration with `WidgetLibraryModal` featuring search by title/description, category filtering, and real-time added badges.
  - Rollback fidelity: cancelling an edit session completely purges staged instances with 0 orphan records.
  - Comprehensive unit test suite (`addWidgetIntegration.test.ts`), expanding test coverage to 118 passing tests across 21 test suites (100% pass rate).

## [0.1.0-alpha.8] - 2026-11-07

### Added
- Phase 3 (Milestone 3.4) Cancel & Snapshot Rollback:
  - Deep clone snapshot isolation verifying zero shared references between `originalLayoutsSnapshot` and in-memory editing drafts.
  - Full multi-breakpoint rollback across all 5 responsive breakpoints (`lg`, `md`, `sm`, `xs`, `xxs`).
  - Staged addition rollback ensuring zero orphan widget instances or layouts in IndexedDB.
  - Staged deletion rollback ensuring 100% data fidelity without loss of tasks, notes, or widget configurations.
  - Safe handling of complex composite scenarios: Add, Delete, Reset Layout, and Multi-breakpoint edits combined rollback to exact initial state.
  - Cancel idempotency: consecutive calls and out-of-edit-mode calls are completely side-effect free.
  - Modal keyboard hierarchy: `Escape` key prioritizes dismissing open confirmation dialogs before triggering edit mode cancellation.
  - Unit test suite expanded to 114 passing tests across 20 test suites (100% pass rate).

## [0.1.0-alpha.7] - 2026-11-07

### Added
- Phase 3 (Milestone 3.3) Save Transaction & Data Integrity:
  - Atomic multi-table Dexie transaction (`[widgetInstances, widgetLayouts]`) guaranteeing all-or-nothing commits across additions, deletions, and 5 responsive breakpoints.
  - In-memory staged instance management (`stagedAddedInstances`) ensuring newly added widgets never touch IndexedDB until explicit commit.
  - Complete rollback on failure injection: simulated disk quota, database lock, or network errors result in 0 partial writes.
  - Strict pre-transaction Zod validation (`WidgetLayoutInputSchema`) preventing malformed or out-of-bounds coordinates from entering the database.
  - Workspace isolation security checks blocking any cross-workspace widget mutation or deletion.
  - Double-click / concurrent commit prevention (`isSaving` mutex).
  - Clean no-op commit when `hasUnsavedChanges === false`.
  - Comprehensive unit test suite with 8 failure injection & transaction tests (`saveTransaction.test.ts`), expanding test coverage to 105 tests across 19 suites (100% pass rate).

## [0.1.0-alpha.6] - 2026-11-07

### Added
- Phase 3 (Milestone 3.1 & 3.2) Customization Studio State & Toolbar:
  - Centralized `useCustomizationStore` managing complete separation between Persisted State (IndexedDB) and In-Memory Editing Draft.
  - Deep clone multi-breakpoint snapshot (`originalLayoutsSnapshot`) captured at `enterEditMode` with zero DB writes on entry.
  - Staged deletion (`stageDeleteWidget`) and staged addition (`stageAddWidget`) mechanisms protecting against premature deletion and orphaned layouts on Cancel.
  - Granular coordinate comparison algorithm determining `hasUnsavedChanges` with exact dirty-state tracking.
  - Workspace navigation safety checks (`requestWorkspaceSwitch` and `forceDiscardAndSwitchWorkspace`) preventing cross-workspace snapshot leakage.
  - Notion/Linear styled `CustomizationToolbar.tsx` with View Mode toggle and Edit Mode controls (Add Widget, Reset Layout, Cancel, Done).
  - Accessible confirmation modals for Discard Changes on Cancel, Reset Layout to Default, and Workspace Switch with Unsaved Changes.
  - Keyboard accessibility with `Escape` key shortcut to initiate Cancel workflow.
  - Unit and component tests expanded to 97 passing tests across 18 test suites.

## [0.1.0-alpha.5] - 2026-11-07

### Added
- Phase 3 (Milestone 2) Grid Engine Core:
  - Built independent `GridLayoutEngine.tsx` component integrating `react-grid-layout@1.5.4` (`Responsive` + `WidthProvider`).
  - Seamlessly connected with Phase 2 `WidgetRenderer` without code duplication.
  - Responsive column mapping across 5 distinct breakpoints (`lg: 12`, `md: 10`, `sm: 6`, `xs: 4`, `xxs: 2`).
  - Vertical compaction (`compactType="vertical"`) with collision-reflow preventing unintended widget overlaps.
  - Zero DB writes per drag frame: instant Zustand memory updates with 400ms debounced persistence on drag/resize release (`debouncedSaveLayouts`).
  - Custom Notion/Linear styled drag handles and theme-aware accent corner resizers (`src/styles/grid.css`).
  - Unit and component tests expanded to 75 passing tests across 16 test suites.

## [0.1.0-alpha.4] - 2026-11-07

### Added
- Phase 3 (Milestone 1) Layout Data Architecture:
  - Granular Breakpoint-based Widget Layout entity model (`WidgetLayoutEntity`) supporting `lg`, `md`, `sm`, `xs`, `xxs`.
  - Dexie Schema Version 2 migration (`widgetLayouts` table with `[workspaceId+breakpoint]` compound index and automated v1->v2 data upgrade).
  - Strict Zod validation (`WidgetLayoutInputSchema`) verifying coordinates, positive dimensions, max columns per breakpoint, and `minW <= maxW` / `minH <= maxH`.
  - `LayoutRepository` providing atomic transaction persistence (`saveLayouts`), query by workspace/instance, orphan cleanup, and layout reset without modifying widget configuration.
  - Deterministic and idempotent `synchronizeLayout` algorithm with 2D occupancy grid packing and automatic orphan pruning.
  - Comprehensive unit test suite covering all 15 required layout data scenarios (67/67 tests passing).

## [0.1.0-alpha.3] - 2026-11-07

### Added
- Dexie.js (IndexedDB) database layer with schema versioning and automatic default data seeding (`NookSpaceDB`).
- Domain repositories: `WorkspaceRepository` and `WidgetInstanceRepository` with Zod schema validation.
- Extensible `WidgetRegistry` singleton managing typed `WidgetDefinition` specifications.
- `WidgetErrorBoundary` ensuring single widget failures never crash the dashboard.
- `WidgetRenderer` with fallback card for unknown or removed widget types.
- 6 Initial Foundation Widgets:
  - `Digital Clock` (12/24h format, toggle seconds, live date).
  - `Personal Greeting` (customizable user display name, dynamic morning/afternoon/evening greetings).
  - `Calendar Overview` (monthly agenda grid with today marker).
  - `Quick Links` (website shortcuts with offline domain monogram badges and new tab launcher).
  - `Task List Preview` (interactive checkable priorities with persistent storage).
  - `Quick Notes` (autosaving local scratchpad).
- Searchable and categorized `WidgetLibraryModal` supporting Add, Remove, and Enable/Disable widget actions.
- Zustand stores: `useWorkspaceStore` and `useWidgetStore` managing multi-workspace and widget lifecycles.
- Unit and integration tests expanded to 51 passing tests across 13 test suites.

## [0.1.0-alpha.2] - 2026-11-07

### Added
- Complete Notion/Linear inspired Design System and Design Tokens in `src/styles/globals.css`.
- Theme management system (`useThemeStore`) supporting Light, Dark, and System modes with anti-flash script in `entrypoints/newtab/index.html`.
- Accessible, typed UI Component Library in `src/components/ui/`:
  - `Button` & `IconButton` (5 variants, 3 sizes, loading and disabled states).
  - `Input` & `Textarea` (with error states and custom left/right icon support).
  - `Checkbox`, `Switch`, `Slider`, `Separator`.
  - `Badge` (semantic states: default, secondary, outline, success, warning, destructive).
  - `Card` compound components (`CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`).
  - `IconContainer` for bookmark monograms and widget badges.
  - `EmptyState` and animated `Skeleton` shimmer for asynchronous states.
  - Floating overlays: `Tooltip`, `Dropdown` menu, `Modal` / `Dialog`, `Popover`, and `Tabs`.
- Modular Application Shell in `src/components/layout/`:
  - `AppShell`: Viewport container with theme initialization.
  - `TopNav`: Header with workspace switcher, search shortcut, theme selector, and customization mode trigger.
  - `WorkspaceHeader`: Time, greeting, and date banner.
- Interactive Design System showcase integrated into `entrypoints/newtab/App.tsx`.
- Vitest component tests achieving 36/36 passing tests across 9 suites.

## [0.1.0-alpha] - 2026-11-06

### Added
- Initialized Phase 0 Project Foundation with WXT 0.19, React 18 LTS, TypeScript, and Tailwind CSS.
- Configured multi-target build pipeline for Chromium MV3 and Firefox Desktop MV2/MV3 with Gecko ID `nookspace@local-dev`.
- Implemented `browserApi` abstraction service in `src/services/browser/` (Storage, Alarms, Notifications, Tabs, Runtime, and Offline Domain Monogram generator).
- Built foundational New Tab entrypoint with live digital clock, theme toggle (Dark/Light), and environment detection.
- Built background service worker in `entrypoints/background.ts` with alarm listener and desktop notification dispatch.
- Configured Vitest test harness with browser mocks and achieved 100% test pass on `tests/unit/browserApi.test.ts`.
- Verified clean production builds for Chromium (`.output/chrome-mv3`) and Firefox (`.output/firefox-mv2`).
