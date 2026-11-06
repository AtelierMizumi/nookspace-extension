# NookSpace — Project Context

## Current Status: Phase 1 — Design System & Primitives Complete & Verified

- **Repository**: `nookspace-extension`
- **Current Milestone**: Phase 1 — Design System & UI Primitives Complete
- **Status Date**: November 2026
- **Build Status**:
  - Chromium MV3: `.output/chrome-mv3` (Compiled successfully, 230 kB)
  - Firefox MV2/MV3: `.output/firefox-mv2` (Compiled successfully, 230 kB)
  - Vitest Unit Tests: 36 passed (100% pass rate across 9 test suites)
  - TypeScript: Strict compilation verified (0 errors)

---

## Workspace Environment & Prerequisites
- **Runtime**: Node.js v24.15.0
- **Package Manager**: npm 11.12.1
- **VCS**: Git 2.49.0
- **Target Platforms**: Google Chrome (MV3), Microsoft Edge (MV3), Brave (MV3), Mozilla Firefox (Desktop MV2/MV3)

---

## Active Decisions
1. **Design System Tokens**: Fully tokenized CSS Variables in `src/styles/globals.css` with semantic light, dark, and system modes.
2. **Zero White Flash**: Pre-render inline anti-flash script in `entrypoints/newtab/index.html` reading `nookspace_theme_mode` synchronously before DOM paints.
3. **UI Component Library**: Standardized, Notion/Linear inspired accessible UI primitives created in `src/components/ui/` (`Button`, `IconButton`, `Input`, `Textarea`, `Checkbox`, `Switch`, `Slider`, `Separator`, `Badge`, `Card`, `IconContainer`, `EmptyState`, `Skeleton`, `Tooltip`, `Dropdown`, `Modal`, `Popover`, `Tabs`).
4. **Application Shell**: Modular layout shell created in `src/components/layout/` (`AppShell`, `TopNav`, `WorkspaceHeader`).
5. **Extension Framework**: Selected **WXT** for seamless cross-browser packaging and Vite compilation. Multi-target manifests defined with Firefox Gecko ID (`nookspace@local-dev`) and Chromium MV3 Service Worker.
6. **React Version Locked to React 18 LTS**: Selected `react@^18.3.1` to guarantee 100% peer-dependency stability with `react-grid-layout`, `react-resizable`, and `react-draggable`.
7. **Permission Minimization**: Strictly limited to `["storage", "alarms", "notifications"]`. Dropped `unlimitedStorage`. Zero host or history permissions.
8. **Data Architecture**: IndexedDB with Dexie.js as sole primary database. Layered repository pattern with Zod runtime validation.
9. **Deterministic Timer Reliability**: Decoupled from `setInterval`. Timer state stores epoch timestamps (`targetEndTime`).

---

## Next Steps
Awaiting User Review of Phase 1 Design System. Upon approval, begin **Phase 2 — Main Dashboard**:
1. Implement Navigation & Workspace Switcher state.
2. Integrate Dexie `NookSpaceDB` database initialization.
3. Build Workspace repository and default workspace seeding.
4. Prepare widget container viewport for Widget System integration.
