# AGENTS.md — Development Conventions & AI Agent Guidelines

## 1. Core Principles & Philosophy
- **Product-First Mindset**: NookSpace is built for real users as a reliable, production-grade browser extension. Every feature must be stable, performant, clean, and durable.
- **Local-First & Privacy-First**: Zero mandatory cloud accounts, zero analytics trackers, zero telemetry, zero arbitrary HTML execution. All user data resides in local IndexedDB.
- **Modular Feature Architecture**: Features are organized by domain under `src/features/` with clear boundaries. Do not tangle feature business logic.
- **Strict Quality Control**: TypeScript strict mode enabled. No `any` types unless interacting with untyped legacy browser globals, which must be safely cast with Zod.
- **Defensive Error Handling**: Always provide loading states, empty states, and Error Boundaries for widgets and async views so a single misbehaving widget never crashes the workspace.

---

## 2. Agent Execution Workflow
Agents working on this repository must strictly adhere to the following sequence:

```
ANALYZE ──> PLAN ──> IMPLEMENT ──> TEST ──> REVIEW ──> DOCUMENT ──> COMMIT
```

1. **ANALYZE**: Read relevant documentation (`docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT_CONTEXT.md`). Inspect existing code.
2. **PLAN**: Outline files to create or modify. Keep step scope small and manageable.
3. **IMPLEMENT**: Write modular, clean, self-documenting code following project patterns.
4. **TEST**: Add unit, component, or integration tests with Vitest and React Testing Library.
5. **REVIEW**: Verify no regressions, proper linting, clean TypeScript compilation, and accessibility.
6. **DOCUMENT**: Keep `docs/CHANGELOG.md`, `docs/PROJECT_CONTEXT.md`, and `docs/ROADMAP.md` up to date.
7. **COMMIT**: Produce clean, descriptive atomic commits.

---

## 3. Technology Stack Rules
| Technology | Role | Conventions |
|---|---|---|
| **WXT** | Extension Framework | Follow WXT conventions (`entrypoints/`, `wxt.config.ts`). Keep manifest minimal. |
| **React 18 LTS** | View Layer | Functional components with hooks. Use React 18.3+ for ecosystem and `react-grid-layout` peer compatibility. |
| **TypeScript** | Type System | Strict mode enabled. Zod for runtime validation at IO/import/storage boundaries. |
| **Tailwind CSS** | Styling | Utility-first. Use CSS variables for user themes and design tokens. |
| **Lucide React** | Icons | Consistent sizing (`h-4 w-4` or `h-5 w-5`) and stroke widths (`1.75` or `2`). |
| **Dexie.js** | Database | Use strongly-typed Dexie tables. Wrap access in domain repositories. |
| **Zustand** | State Management | For ephemeral UI state (Edit mode, modal visibility, active filters). |
| **Vitest** | Testing | Fast unit & integration testing. Match file pattern `*.test.ts(x)`. |

---

## 4. Coding Standards & Conventions

### 4.1 Folder Structure
- `entrypoints/`: Extension entrypoints (`newtab`, `popup`, `background`).
- `src/components/ui/`: Primitive design system components (Button, Input, Dialog, Dropdown, Slider, etc.).
- `src/features/`: Domain features (`workspace`, `widget-system`, `appearance-studio`, `todo`, `pomodoro`, `smart-bookmarks`, etc.).
- `src/widgets/`: Concrete widget implementations registered into the widget system.
- `src/services/`: Core platform services (`database`, `browser`, `backup`, `notifications`).
- `src/stores/`: Global UI Zustand stores.
- `src/types/`: Shared domain interfaces and Zod schemas.
- `src/utils/`: Pure helper utilities.
- `docs/`: Living architectural, planning, and context documentation.

### 4.2 Cross-Browser Abstraction Rules
- Never call raw `chrome.*` or `browser.*` APIs directly inside UI components.
- Always use the unified `browserApi` service layer (`src/services/browser/index.ts`) which abstracts Chromium MV3 and Firefox MV2/MV3 differences.
- Keep manifest permissions to the absolute minimum: `"storage"`, `"alarms"` (for Pomodoro notifications), and `"tabs"` (for shortcut management if needed). Avoid requesting broad host permissions `<all_urls>` or browser history permissions.

### 4.3 Data Layer Conventions
- All primary data lives in Dexie (`NookSpaceDB`).
- All entities have UUID `id`, `createdAt: number`, `updatedAt: number`, and an optional `workspaceId: string` where applicable.
- Never write ad-hoc localStorage hacks for core entities.

### 4.4 Testing Conventions
- Do not bypass or disable tests to make builds green.
- Mock browser extension APIs cleanly using the shared test mock harness in `tests/mocks/browser.ts`.
