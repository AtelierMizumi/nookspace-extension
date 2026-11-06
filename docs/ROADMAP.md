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

### Phase 4: Customization Studio & Grid Engine
- [ ] Integrate `react-grid-layout` with responsive 12-column grid.
- [ ] Implement `EditModeToggle` state in Zustand.
- [ ] Visual edit-mode overlay (bounding guides, drag handles, resize corners).
- [ ] Layout persistence in IndexedDB.
- [ ] Save & Cancel transaction rollback logic.
- [ ] Appearance Studio panel (theme selection, accent color picker, opacity slider, background chooser).

### Phase 5: Productivity Suite
- [ ] **Pomodoro Timer Widget**:
  - Focus (25m), Short Break (5m), Long Break (15m).
  - Background audio chime / alarm notifications.
  - Focus session history tracking in Dexie.
- [ ] **Study Tracker / Stopwatch Widget**:
  - Start/pause/stop tracker with topic tags (Coding, Math, Reading).
  - Daily & weekly aggregate study hours chart/metric.
- [ ] **Todo List Widget**:
  - Task CRUD, priority badges, due dates, categories, active/completed filters.
- [ ] **Daily Goals & Streak Widget**:
  - Goal completion checklist with percentage progress bar.
  - Mathematically sound daily streak calculator based on actual activity logs.
- [ ] **Calendar Widget**:
  - Month and week agenda views with local event scheduling.

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
