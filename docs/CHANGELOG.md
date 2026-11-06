# Changelog — NookSpace

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
