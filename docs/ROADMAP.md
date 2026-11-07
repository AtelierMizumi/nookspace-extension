# NookSpace — Project Roadmap & Implementation Plan

## Phase Overview

```
Phase 0: Foundation & Build Pipeline (WXT, React, TS, Tailwind, Cross-Browser)
   │
Phase 1: Design System & Primitives (Tailwind tokens, UI components, Themes)
   │
Phase 2: Core Dashboard & Shell (Header, Navigation, Workspace state)
   │
Phase 3: Widget Architecture & Registry (Contracts, Dynamic rendering, Error boundaries)
   │
Phase 4: Customization Studio & Grid Engine (react-grid-layout, Edit mode, Resizing, Snapping)
   │
Phase 5: Productivity Suite (Pomodoro, Study Stopwatch, Todos, Goals, Streak calculator)
   │
Phase 6: Smart Bookmarks System (Groups, shortcuts, search, favicon resolver)
   │
Phase 7: Notes & Knowledge System (Quick notes, Sticky cards, Vocabulary, Markdown)
   │
Phase 8: Workspaces & Presets (Multi-workspace CRUD, Starter layout presets)
   │
Phase 9: Data Integrity, Backup & QA (Dexie migrations, JSON Import/Export, Unit/E2E tests)
   │
Phase 10: Cross-Browser Release Verification (Chrome MV3 & Firefox builds, Packaging)
```

---

## Detailed Phases & Milestones

### Phase 0: Project Foundation & Tooling (Completed & Verified)
- [x] Initial project technical specification analysis & final technical validation.
- [x] Cross-browser compatibility audit (Chromium MV3 vs Firefox MV2/MV3 Gecko ID).
- [x] Dependency locking (React 18 LTS for `react-grid-layout` compatibility, WXT, Dexie 4, Zustand 5, Zod).
- [x] Permission minimization (Drop `unlimitedStorage`, limit to `storage`, `alarms`, `notifications`).
- [x] Core documentation initialized (`PRD.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `AGENTS.md`, `PROJECT_CONTEXT.md`, `CHANGELOG.md`).
- [x] Initialize WXT project with React 18, TypeScript (strict), Tailwind CSS.
- [x] Configure `wxt.config.ts` multi-target build pipeline (`build` for Chromium MV3, `build:firefox` for Firefox MV2/MV3).
- [x] Implement `src/services/browser/index.ts` abstraction layer.
- [x] Configure Vitest + React Testing Library + `fake-indexeddb` with browser API mocks.
- [x] Create functional minimal New Tab entrypoint with React root and theme support.
- [x] Verify both Chromium and Firefox builds pass without warnings or errors.

### Phase 1: Design System & Tokens (Completed & Verified)
- [x] Define CSS variable color tokens and dynamic dark/light/system theme palette.
- [x] Implement anti-flash theme script in `entrypoints/newtab/index.html`.
- [x] Create centralized Zustand theme store (`src/stores/themeStore.ts`) with OS media query listener.
- [x] Implement foundational UI primitives with strict TypeScript interfaces:
  - `Button`, `IconButton`
  - `Input`, `Textarea`
  - `Checkbox`, `Switch`, `Slider`, `Separator`
  - `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
  - `Badge`, `IconContainer`
  - `EmptyState`, `Skeleton`
  - `Tooltip`, `DropdownMenu`, `Modal / Dialog`, `Popover`, `Tabs`
- [x] Build modular Application Shell (`AppShell`, `TopNav`, `WorkspaceHeader`).
- [x] Comprehensive component unit testing (36/36 tests passing in Vitest).
- [x] Verify Chromium and Firefox production builds.

### Phase 2: Main Dashboard & Widget System (Completed & Verified)
- [x] Initialized Dexie IndexedDB with 14 strongly typed entity tables.
- [x] Built domain repositories with Zod schema validation: `WorkspaceRepository` and `WidgetInstanceRepository`.
- [x] Built `WidgetRegistry` singleton managing typed `WidgetDefinition` contracts.
- [x] Implemented `WidgetErrorBoundary` isolating runtime errors to individual widget cards.
- [x] Built `WidgetRenderer` with fallback handling for deprecated or unknown widget types.
- [x] Built `WidgetLibraryModal` with category filtering, search, and dynamic add/remove/toggle actions.
- [x] Implemented 6 foundation widgets:
  - `Digital Clock` (12/24h options, seconds toggle).
  - `Personal Greeting` (customizable name, dynamic day/evening greeting).
  - `Calendar Overview` (month view, current date badge).
  - `Quick Links` (website shortcuts with deterministic HSL monograms and browser tab launcher).
  - `Task List Preview` (checkable interactive tasks with persistent updates).
  - `Quick Notes` (autosaving local scratchpad).
- [x] Created `useWorkspaceStore` and `useWidgetStore` for seamless reactive data binding.
- [x] Responsive Dashboard layout with empty state fallback when all widgets are removed.
- [x] Vitest unit & component test suite expanded to 51 passing tests (100% pass rate).
- [x] Verified Chromium and Firefox production builds.

### Phase 3: Customization Studio & Grid Engine (Completed)
- [x] **Milestone 0**: Technical audit & dependency verification (`react-grid-layout@1.5.4` on React 18 LTS).
- [x] **Milestone 1**: Layout Data Architecture:
  - Breakpoint-based layout data model (`WidgetLayoutEntity`) with natural key `${workspaceId}_${widgetInstanceId}_${breakpoint}`.
  - Dexie Schema Version 2 migration with upgrade handler preserving legacy layouts.
  - Zod validation schema (`WidgetLayoutInputSchema`) with dimension clamping and max column checks.
  - `LayoutRepository` with full CRUD, atomic transaction saving, and reset without touching widget configurations.
  - Idempotent `synchronizeLayout` packing algorithm handling new widgets and orphan purging.
  - Comprehensive unit test suite with 16 tests covering all 15 required scenarios.
- [x] **Milestone 2**: Grid Engine Core:
  - Independent `GridLayoutEngine.tsx` component powered by `react-grid-layout@1.5.4` with `WidthProvider(Responsive)`.
  - Responsive column mapping across 5 breakpoints (`lg: 12`, `md: 10`, `sm: 6`, `xs: 4`, `xxs: 2`).
  - Vertical compaction (`compactType="vertical"`) with collision-reflow.
  - Zero DB writes per drag frame: instant Zustand memory updates with 400ms debounced persistence on drag/resize release.
  - Custom Notion/Linear drag handles and theme-aware accent corner resizers (`src/styles/grid.css`).
  - Unit & component tests expanded to 75 passing tests (100% pass rate).
- [x] **Milestone 3**: Customization Studio & Edit Mode:
  - [x] **Milestone 3.1**: Centralized Customization Studio State Architecture (`customizationStore.ts`), deep clone multi-breakpoint snapshot, staged deletion/addition, dirty state comparison, workspace isolation.
  - [x] **Milestone 3.2**: Notion/Linear styled `CustomizationToolbar.tsx` with View Mode toggle and Edit Mode controls (Add Widget, Reset Layout, Cancel, Done), confirmation dialogs, and Escape key handling.
  - [x] **Milestone 3.3**: Save Transaction & Data Integrity (`commitEditMode` with atomic `[widgetInstances, widgetLayouts]` Dexie transaction, Zod pre-validation, failure injection rollback, workspace security checks, and 0 partial writes).
  - [x] **Milestone 3.4**: Cancel & Snapshot Rollback (Multi-breakpoint rollback, staged addition/deletion restoration, reset layout rollback, cancel idempotency, and modal Escape safety).
  - [x] **Milestone 3.5**: Add Widget staged integration (`WidgetLibraryModal` connectivity, non-overlapping occupancy packing, and staged memory-only instances).
  - [x] **Milestone 3.6**: Reset Layout end-to-end flow (Confirmation modal, default packing across 5 breakpoints, zero data loss, and rollback fidelity).
  - [x] **Milestone 3.7**: Testing Consolidation, Cross-Scenario Lifecycle E2E Suite, and Final Phase 3 Review (126/126 tests passing across 23 test suites, 0 TypeScript errors, both Chromium & Firefox builds clean).

### Phase 5: Productivity Suite (In Progress)
- [x] **Milestone 5.1**: Productivity Data Layer & Zod Validation:
  - Strong domain models and Zod schemas (`TodoEntitySchema`, `TodoCreateSchema`, `TodoUpdateSchema`, `TodoFilterSchema`, `FocusSessionEntitySchema`, `FocusSessionCreateSchema`, `FocusSessionUpdateSchema`).
  - `TodoRepository` with full CRUD, workspace isolation enforcement, multi-criteria filtering, search, date-based queries, and atomic reordering.
  - `FocusSessionRepository` with duration validation, timestamp consistency (`completedAt >= startedAt`), duplicate completion protection, date range queries, and aggregated stats breakdown.
  - `migrateLegacyTodos` database migration safely transferring tasks from `WidgetInstanceEntity.config.tasks` to Dexie `todos` table with atomicity, idempotency, and source backup preservation.
  - Unit & integration test suites (`todoRepository.test.ts`, `focusSessionRepository.test.ts`, `legacyTodoMigration.test.ts`) expanding test coverage to 147 passing tests across 26 test suites.
- [x] **Milestone 5.2**: Advanced Todo Widget & Legacy Data Integration:
  - Hardened legacy migration distinguishing `completed`, `partial`, and `failed` status, ensuring 0 data loss and idempotent retries.
  - Concurrency-safe `migrationCoordinator.ts` ensuring migration runs before initial query without blocking New Tab dashboard.
  - Zustand `useTodoStore` managing UI state, status transitions, workspace switching, filtering, and search.
  - Modern Notion/Linear-inspired `TodoWidget.tsx` with quick inline task creation, 4 filter tabs (*All*, *Active*, *Completed*, *Today*), priority badges, due date indicators, and category tags.
  - Proven Data Invariant: tasks belong to the user in Dexie `todos` table and are NEVER deleted when the widget instance is removed from the dashboard.
  - Full suite of unit & lifecycle tests (`todoStore.test.ts`, `TodoWidgetLifecycle.test.tsx`) expanding test coverage to 157 passing tests across 28 test suites (100% pass rate).
- [x] **Milestone 5.3**: Pomodoro Timer & Background Alarm Service:
  - Background Service Worker alarm scheduler using `browserApi.alarms` with millisecond-exact `targetEndTime` validation and persistent storage envelope.
  - Two-phase coordinator with outbox drain and dead-letter queue for rock-solid Dexie session persistence.
  - Recovery marker and quarantine isolation for crash resilience across browser shutdowns and service worker sleep cycles.
  - Modern Pomodoro widget with circular ring timer, quick presets (Focus 25m, Short Break 5m, Long Break 15m), cycle tracking, and recovery banner.
  - Comprehensive unit test suite (`coordinator.test.ts`, `stateMachine.test.ts`, `pomodoroStore.test.ts`, `PomodoroWidget.test.tsx`) reaching 185 tests.
- [x] **Milestone 5.4**: Study Tracker & Analytics Widget:
  - `StudyTrackerService` computing total focus minutes, completed sessions, average session duration, and daily activity trends.
  - Range selection (7D, 14D, 30D) with local-date aggregation preventing timezone skew.
  - Live data synchronization via `nookspace_pomodoro_last_drained_at` ensuring statistics refresh strictly after Dexie transactions commit.
  - `StudyTrackerWidget` presenting clean metric summaries, bar chart trends, empty states, and resilient error recovery.
  - Full automated test suite expanded to 189 passing tests across 34 test suites.
- [ ] **Milestone 5.5**: Daily Goals, Streak Calculator & Calendar Widget (Deterministic streak engine, daily progress bar, calendar month view & local events).
- [ ] **Milestone 5.6**: Test Consolidation, Build Verification & Final Phase 5 Review.

### Phase 6: Smart Bookmarks
- [ ] Bookmark Group management (Add group, change color/icon, reorder).
- [ ] Website Shortcuts (Add URL with regex validation, custom titles, auto-monogram/favicon).
- [ ] Instant search filtering with keyboard navigation.
- [ ] Netscape HTML & JSON bookmark import and export parser.

### Phase 7: Notes & Knowledge System
- [ ] **Quick Notes Widget**:
  - Autosaving note cards with color tags, search, and pin-to-top.
- [ ] **Floating Sticky Notes Layer**:
  - Independent movable and resizable cards on freeform canvas.
- [ ] **Vocabulary Manager Widget**:
  - Flashcard-like terminology table with word, reading, meaning, and review status.
- [ ] **Resource Library Widget**:
  - Curated links with descriptions and tags.
- [ ] **Safe Markdown Note Editor**:
  - AST-sanitized rich text rendering without raw HTML execution.

### Phase 8: Multiple Workspaces & Presets
- [ ] Workspace state management (Create, Rename, Delete, Switch, Duplicate).
- [ ] Workspace-specific widget collections and layout mappings.
- [ ] Pre-packaged starter presets:
  - "Minimalist" (Clock + Todo + Shortcuts)
  - "Deep Study" (Pomodoro + Study Tracker + Vocabulary + Notes)
  - "Developer" (GitHub Shortcuts + Resource Library + Todos + Sticky Notes)
  - "Full Studio" (Complete suite)

### Phase 9: Data Integrity, Migrations & Testing
- [ ] Full Dexie schema migration tests.
- [ ] Comprehensive JSON Export and Import engine with Zod schema verification.
- [ ] Destruction-safe auto-backup prior to imports.
- [ ] Comprehensive unit and integration test coverage across all features.

### Phase 10: Cross-Browser Validation & Release
- [ ] Chromium production build & manual testing in Google Chrome.
- [ ] Firefox production build & manual testing in Firefox.
- [ ] Manifest and permission audit (verify minimal permissions).
- [ ] Store asset preparation (icons, promotional graphics, README documentation).
