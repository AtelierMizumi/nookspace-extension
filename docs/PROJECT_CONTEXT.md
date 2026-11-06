# NookSpace — Project Context

## Current Status: Phase 0 — Project Foundation Complete & Verified

- **Repository**: `nookspace-extension`
- **Current Milestone**: Phase 0 — Foundation & Build Pipeline Complete
- **Status Date**: November 2026
- **Build Status**:
  - Chromium MV3: `.output/chrome-mv3` (Compiled successfully, 174 kB)
  - Firefox MV2/MV3: `.output/firefox-mv2` (Compiled successfully, 174 kB)
  - Vitest Unit Tests: 7 passed (100% pass rate)
  - TypeScript: Strict compilation verified (0 errors)

---

## Workspace Environment & Prerequisites
- **Runtime**: Node.js v24.15.0
- **Package Manager**: npm 11.12.1
- **VCS**: Git 2.49.0
- **Target Platforms**: Google Chrome (MV3), Microsoft Edge (MV3), Brave (MV3), Mozilla Firefox (Desktop MV2/MV3)

---

## Active Decisions
1. **Extension Framework**: Selected **WXT** for seamless cross-browser packaging and Vite compilation. Multi-target manifests defined with Firefox Gecko ID (`nookspace@local-dev`) and Chromium MV3 Service Worker.
2. **React Version Locked to React 18 LTS**: Selected `react@^18.3.1` to guarantee 100% peer-dependency stability with `react-grid-layout`, `react-resizable`, and `react-draggable` (avoiding React 19 peer-dependency conflicts).
3. **Permission Minimization**: Strictly limited to `["storage", "alarms", "notifications"]`. Dropped `unlimitedStorage` (IndexedDB provides generous quota automatically, avoiding store review warnings). Zero host or history permissions.
4. **Data Architecture**: IndexedDB with Dexie.js as sole primary database. Layered repository pattern with Zod runtime validation. Atomic Dexie transactions and automated pre-import safety backups. Zero entity storage in `localStorage`.
5. **Deterministic Timer Reliability**: Decoupled from `setInterval`. Timer state stores epoch timestamps (`targetEndTime`). Background alarms (`browser.alarms`) ensure notification delivery even when tabs are closed or service workers suspend.
6. **Layout Engine**: `react-grid-layout` for the 12-column widget grid; separate floating canvas layer for sticky notes.
7. **Cross-Browser Strategy**: All browser APIs encapsulated in `src/services/browser` to guarantee zero direct `chrome.*` or `browser.*` leaks in presentation components.

---

## Next Steps
Awaiting User Review of Phase 0 Foundation. Upon approval, begin **Phase 1 — Design System & Primitives**:
1. Build foundational UI primitives (`Button`, `IconButton`, `Input`, `Card`, `Modal / Dialog`, `DropdownMenu`, `Tabs`, `Badge`, `Switch / Toggle`, `Tooltip`).
2. Implement CSS variables theme system (Dark & Light tokens, Accent palettes).
3. Add unit tests for design system primitives.
