# NookSpace — Architecture & Technical Design Document

## 1. System Overview & Architecture

NookSpace is designed as a modular, local-first browser extension application built with **WXT**, **React**, **TypeScript**, **Tailwind CSS**, and **Dexie.js (IndexedDB)**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NookSpace Application                           │
├────────────────────────────────────────────────────────────────────────┤
│  Top Navigation (Logo, Workspace Switcher, Edit Mode, Settings)       │
├───────────────────────────────────┬────────────────────────────────────┤
│ Main Grid Layer (react-grid-layout)│ Floating Overlay Layer (Sticky)    │
│  ┌──────────────┐ ┌──────────────┐│  ┌──────────────────────────────┐  │
│  │ Clock Widget │ │Pomodoro Timer││  │ Freeform Draggable &         │  │
│  └──────────────┘ └──────────────┘│  │ Resizable Sticky Note Cards  │  │
│  ┌──────────────┐ ┌──────────────┐│  └──────────────────────────────┘  │
│  │ Todo List    │ │Smart Bookmark││                                    │
│  └──────────────┘ └──────────────┘│                                    │
├───────────────────────────────────┴────────────────────────────────────┤
│  Central Services & Domain Core                                        │
│  - Widget Registry & Lifecycle Manager                                 │
│  - Appearance & Dynamic CSS Variable Engine                            │
│  - Pomodoro & Study Tracker Worker Sync                                │
│  - Backup, JSON Exporter & Zod Schema Validator                        │
├────────────────────────────────────────────────────────────────────────┤
│  Data Layer: Dexie.js (IndexedDB)                                      │
│  - Workspaces | Layouts | WidgetInstances | Todos | Notes | Bookmarks  │
├────────────────────────────────────────────────────────────────────────┤
│  Cross-Browser Platform Abstraction (`src/services/browser`)           │
│  - WXT runtime adapter (Chromium MV3 / Firefox MV2/MV3)                │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack & Technical Evaluation

### 2.1 Extension Framework & Manifest Architecture
- **Framework: WXT (v0.19+)**: Built on Vite. Emits optimal MV3 for Chromium (Chrome, Edge, Brave) and compliant MV2/MV3 for Firefox Desktop.
- **Manifest Multi-Target Strategy (`wxt.config.ts`)**:
  - **Chromium MV3**: Uses background Service Worker (`entrypoints/background.ts`) and `chrome_url_overrides.newtab`.
  - **Firefox**: Configured with `browser_specific_settings.gecko.id: 'nookspace@local-dev'` and minimum version `115.0`.
- **Permissions Audit & Minimization**:
  - Included:
    - `"storage"`: High-speed cross-context cache.
    - `"alarms"`: Background notification triggers for Pomodoro/Stopwatch session completion.
    - `"notifications"`: Native desktop alerts when study/focus sessions conclude.
  - Excluded:
    - `"unlimitedStorage"`: **REMOVED**. Standard browser origin quota (50MB–2GB+) is more than sufficient for thousands of notes, bookmarks, and compressed wallpapers. Avoids intrusive installation warnings and store review delays.
    - Host permissions (`<all_urls>`): **NONE**. Zero remote network permissions required.
    - History permissions: **NONE**.

### 2.2 Core Dependency Matrix (Locked & Verified)
| Package | Version | Justification & Compatibility |
|---|---|---|
| `react` / `react-dom` | `^18.3.1` | **React 18 LTS** selected. Guarantees 100% peer-dependency stability with `react-grid-layout`, `react-draggable`, and `react-resizable` (avoiding React 19 peer conflict issues). |
| `wxt` | `^0.19.14` | Latest stable WXT with Vite 5/6 engine. |
| `@wxt-dev/module-react` | `^1.1.2` | Official WXT React integration module. |
| `typescript` | `^5.6.3` | TypeScript strict mode. |
| `tailwindcss` | `^3.4.14` | Utility-first styling with dynamic CSS custom properties. |
| `react-grid-layout` | `^1.4.4` | Battle-tested 2D grid matrix with collision resolution and 12-column snapping. |
| `dexie` / `dexie-react-hooks` | `^4.0.10` / `^1.1.7` | Type-safe IndexedDB wrapper with reactive queries (`useLiveQuery`). |
| `zustand` | `^5.0.1` | Lightweight UI state store (Edit mode, active modals, active workspace). |
| `zod` | `^3.23.8` | Strict runtime schema parsing for backups, imports, and widget configs. |
| `lucide-react` | `^0.454.0` | Minimalist icons matching Notion/Linear design language. |
| `vitest` | `^2.1.4` | High-speed unit & integration test runner. |
| `fake-indexeddb` | `^6.0.0` | In-memory IndexedDB polyfill for reliable Vitest database testing. |

### 2.3 Grid Layout Engine Evaluation
Three options were evaluated for Module D (Customization Studio):

| Criteria | `react-grid-layout` | `@dnd-kit` from scratch | `gridstack.js` |
|---|---|---|---|
| **2D Grid Resizing & Snapping** | Native, mature, rock-solid | Requires building a custom 2D resize engine | Supported via DOM manipulation |
| **Collision Handling** | Built-in vertical compaction and collision avoidance | High complexity to implement custom collision logic | Supported |
| **Responsive Breakpoints** | Built-in responsive column mapping | Manual breakpoint calculation | Responsive via CSS/JS |
| **React Integration** | Pure React declarative components | Native React hooks | Wrapper around imperative JS |
| **Bundle & Maintenance** | Stable, widely used in enterprise dashboards | Actively maintained, but wrong primitive for 2D resizable grids | Heavier DOM overhead |

**Architectural Decision**:
We adopt `react-grid-layout` wrapped in an internal abstraction component (`GridLayoutEngine.tsx`).
- In **Normal Mode**: Draggable and resizable handles are deactivated (`isDraggable: false`, `isResizable: false`), yielding lightweight native rendering without DOM overhead.
- In **Edit Mode**: Active drag handles, resize corners, grid guides, and collision markers are rendered.
- **Sticky Notes**: Implemented outside the grid container in a specialized SVG/HTML Canvas overlay layer (`FloatingStickyOverlay.tsx`), allowing unrestricted floating cards without disturbing grid calculations.

---

## 3. Database Architecture (Dexie.js / IndexedDB)

All persistent user data is maintained locally in IndexedDB under the database name `NookSpaceDB`.

### 3.1 Entities & Tables

```typescript
// Database Schema Definition
export interface WorkspaceEntity {
  id: string; // UUID v4
  name: string;
  icon: string; // Lucide icon name or emoji
  color?: string;
  isDefault: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface LayoutPresetEntity {
  id: string;
  workspaceId: string;
  name: string;
  isDefault: boolean;
  // Serialized layout items for react-grid-layout
  items: Array<{
    widgetInstanceId: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
  }>;
  createdAt: number;
  updatedAt: number;
}

export interface WidgetInstanceEntity {
  id: string;
  workspaceId: string;
  widgetType: string; // Matches WidgetRegistry key (e.g. 'clock', 'pomodoro')
  title?: string;
  config: Record<string, any>; // Type-safe validated widget-specific settings
  createdAt: number;
  updatedAt: number;
}

export interface TodoEntity {
  id: string;
  workspaceId?: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: number;
  category?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface NoteEntity {
  id: string;
  workspaceId?: string;
  title: string;
  content: string; // Markdown text
  isPinned: boolean;
  color?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface StickyNoteEntity {
  id: string;
  workspaceId: string;
  content: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  createdAt: number;
  updatedAt: number;
}

export interface BookmarkGroupEntity {
  id: string;
  workspaceId?: string;
  title: string;
  icon?: string;
  color?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface BookmarkEntity {
  id: string;
  groupId: string;
  title: string;
  url: string;
  iconUrl?: string;
  customColor?: string;
  isFavorite: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface VocabularyEntity {
  id: string;
  workspaceId?: string;
  word: string;
  reading?: string;
  meaning: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  category: string;
  status: 'new' | 'learning' | 'mastered';
  createdAt: number;
  updatedAt: number;
}

export interface ResourceEntity {
  id: string;
  workspaceId?: string;
  title: string;
  url: string;
  description?: string;
  category?: string;
  tags: string[];
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface FocusSessionEntity {
  id: string;
  workspaceId?: string;
  type: 'pomodoro' | 'short_break' | 'long_break' | 'study';
  category?: string;
  durationMinutes: number;
  startedAt: number;
  completedAt: number;
  completed: boolean;
}

export interface DailyGoalEntity {
  id: string;
  workspaceId?: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit?: string;
  dateString: string; // YYYY-MM-DD
  createdAt: number;
  updatedAt: number;
}

export interface CalendarEventEntity {
  id: string;
  workspaceId?: string;
  title: string;
  description?: string;
  startDate: number;
  endDate: number;
  isAllDay: boolean;
  category?: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppSettingsEntity {
  id: 'current_settings';
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  fontFamily: string;
  fontSize: 'sm' | 'md' | 'lg';
  backgroundType: 'color' | 'gradient' | 'image';
  backgroundValue: string;
  widgetOpacity: number;
  widgetBlur: number;
  activeWorkspaceId: string;
  updatedAt: number;
}
```

### 3.1 Entities & Tables

```typescript
// Breakpoints & Layout Architecture
export type Breakpoint = 'lg' | 'md' | 'sm' | 'xs' | 'xxs';

export const BREAKPOINT_COLUMNS: Record<Breakpoint, number> = {
  lg: 12,
  md: 10,
  sm: 6,
  xs: 4,
  xxs: 2,
};

export interface WidgetLayoutEntity {
  id: string; // Primary Key: `${workspaceId}_${widgetInstanceId}_${breakpoint}`
  workspaceId: string;
  widgetInstanceId: string;
  breakpoint: Breakpoint;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}
```

### 3.2 Dexie Database Versioning & Migration Strategy
- Database class: `NookSpaceDB extends Dexie`
- **Version 1 Schema**:
  - `workspaces: 'id, isDefault, order'`
  - `layouts: 'id, workspaceId, isDefault'`
  - `widgetInstances: 'id, workspaceId, widgetType, isEnabled, order'`
  - `todos: 'id, workspaceId, completed, priority, dueDate, category, order'`
  - `notes: 'id, workspaceId, isPinned, *tags, updatedAt'`
  - `stickyNotes: 'id, workspaceId'`
  - `bookmarkGroups: 'id, workspaceId, order'`
  - `bookmarks: 'id, groupId, isFavorite, order'`
  - `vocabulary: 'id, workspaceId, category, status'`
  - `resources: 'id, workspaceId, category, *tags, isPinned'`
  - `focusSessions: 'id, workspaceId, type, startedAt, completedAt'`
  - `dailyGoals: 'id, workspaceId, dateString'`
  - `calendarEvents: 'id, workspaceId, startDate, endDate'`
  - `settings: 'id'`
- **Version 2 Schema (Milestone 1 — Granular Breakpoint Layout Architecture)**:
  - `widgetLayouts: 'id, [workspaceId+breakpoint], workspaceId, widgetInstanceId, breakpoint'`
  - Upgrade Migration Handler: Automatically extracts legacy records from `layouts` table, converts them to `widgetLayouts` records with `breakpoint: 'lg'`, and preserves all data with zero loss.

### 3.3 Data Layer Conventions & Repository Pattern
- All data access is wrapped in domain repository classes (`src/services/database/repositories/`):
  - `WorkspaceRepository`
  - `LayoutRepository`
  - `WidgetInstanceRepository`
  - `TodoRepository`
  - `NoteRepository`
  - `StickyNoteRepository`
  - `BookmarkRepository`
  - `FocusSessionRepository`
  - `DailyGoalRepository`
  - `CalendarEventRepository`
  - `SettingsRepository`
- **Zero Raw localStorage Hacks**: `localStorage` is used solely as a read-only flash-prevention cache for the CSS theme string (`'dark' | 'light'`) during initial page load before React and IndexedDB initialize. All entities live in Dexie.
- **Safe Backup & Restore Mechanism**:
  1. **Export**: Serializes all IndexedDB tables into a versioned JSON payload (`{ version: 1, exportedAt: number, data: { ... } }`).
  2. **Zod Dry-Run Validation**: Full schema verification of the import payload before writing. If invalid, the process aborts with descriptive error details.
  3. **Safety Backup**: Automatically triggers a snapshot export of the existing database prior to executing destructive restore operations.
  4. **Atomic Dexie Transaction**: Imports run inside a multi-table read-write transaction (`db.transaction('rw', allTables, ...)`). Any runtime failure triggers an immediate automatic rollback.

---

## 4. Timer Reliability Architecture (Pomodoro & Study Stopwatch)

### 4.1 The Browser Lifecycle Problem
1. **New Tab Page Unmount**: When the user navigates away or closes the New Tab page, JavaScript execution in that tab terminates. Counting down via `setInterval(() => remainingSeconds--, 1000)` breaks immediately.
2. **Chromium MV3 Service Worker Termination**: Chromium MV3 background service workers go idle and terminate after ~30 seconds of inactivity. `setInterval()` in background scripts does not survive.

### 4.2 Deterministic Timestamp Architecture
NookSpace solves this by decoupling timer progression from CPU tick intervals:
- Timers never store remaining seconds as the single source of truth.
- Instead, timer state stores fixed epoch timestamps:
  ```typescript
  export interface ActiveTimerState {
    id: string;
    mode: 'pomodoro' | 'short_break' | 'long_break' | 'study';
    status: 'idle' | 'running' | 'paused';
    durationMinutes: number;
    targetEndTime: number | null; // Date.now() + remainingMs
    remainingMsOnPause: number | null;
    startedAt: number;
    category?: string;
  }
  ```
- **Foreground Calculation**: When any New Tab is opened or regains visibility (`visibilitychange` event), the remaining time is calculated directly from `Math.max(0, Math.ceil((targetEndTime - Date.now()) / 1000))`.
- **Background Completion & Notifications**: When a timer starts, an alarm is scheduled with the browser runtime:
  `browser.alarms.create('nookspace-timer-complete', { when: targetEndTime })`
  When the alarm triggers, the background script displays a native desktop notification (`browser.notifications.create`) and logs the completed session in IndexedDB, even if all New Tab pages are closed!
- **Alarm Interval Differences**: While Chrome limits periodic alarms to 1-minute intervals in production, single one-off alarms scheduled with `{ when: epochTime }` fire accurately at the target epoch timestamp across Chromium and Firefox.

---

## 5. Widget System Architecture

Every widget in NookSpace follows a strictly typed contract:

```typescript
export interface WidgetDefinition<TConfig = Record<string, any>> {
  type: string;
  name: string;
  description: string;
  category: 'productivity' | 'organization' | 'learning' | 'personal' | 'utilities';
  icon: LucideIcon;
  defaultConfig: TConfig;
  defaultDimensions: { w: number; h: number };
  minDimensions: { w: number; h: number };
  maxDimensions?: { w: number; h: number };
  component: React.ComponentType<WidgetProps<TConfig>>;
  settingsComponent?: React.ComponentType<WidgetSettingsProps<TConfig>>;
}

export interface WidgetProps<TConfig = Record<string, any>> {
  instanceId: string;
  workspaceId: string;
  isEditMode: boolean;
  config: TConfig;
  onUpdateConfig: (newConfig: Partial<TConfig>) => void;
  onRemove: () => void;
}
```

### 5.1 Widget Lifecycle & Isolation
1. **Dynamic Registry**: `WidgetRegistry` maintains a map of available widgets.
2. **Error Boundary Wrapping**: Every widget instance is wrapped in an individual `WidgetErrorBoundary`. If one widget throws a runtime error, only that widget displays a fallback UI; the remainder of the workspace continues operating without interruption.
3. **Suspense & Code Splitting**: Heavy widgets (such as the Calendar or Markdown Editor) are dynamically imported via `React.lazy` to keep the initial New Tab boot time under 50ms.

---

## 6. Cross-Browser Abstraction Strategy

Browser extensions across Chromium and Firefox differ in:
- Namespace (`chrome` vs `browser`)
- Return signatures (Callback-based vs Promise-based in older MV2)
- Favicon access protocols
- Service Worker persistence lifecycles

To achieve 100% codebase parity:
- Create `src/services/browser/index.ts`:
  - `browserApi.storage`: Wrapper for extension storage (or Dexie persistence).
  - `browserApi.tabs`: Safe new tab opener.
  - `browserApi.notifications`: Cross-platform notifications using Web Notifications API or browser extension notifications.
  - `browserApi.alarms`: Standard alarm scheduler for Pomodoro timer sessions.
  - `browserApi.getFaviconUrl(domain)`: Multi-tiered favicon resolver with offline monogram generator.

---

## 7. Security & Content Security Policy (CSP)
- **Zero Script Injections**: All extension scripts are packaged locally within the extension bundle.
- **Safe Markdown Rendering**: The Notes feature uses an AST-based Markdown parser (`react-markdown` with `rehype-sanitize`) configured with a strict whitelist. Raw HTML tags and script payloads are stripped before DOM rendering.
- **Image Storage Security**: Custom background wallpapers uploaded by users are converted to compressed Blobs and stored directly inside IndexedDB. Data URLs are revoked properly on component unmount.

---

## 8. Performance & Optimization Plan
1. **Perceived Render Time < 50ms**:
   - Critical path components (Clock, Greeting, Top Nav, Skeleton Grid) load synchronously in the main bundle.
   - Non-critical modals (Appearance Studio, Widget Library modal, Settings dialog) are loaded lazily.
2. **IndexedDB Query Optimization**:
   - Use Dexie `useLiveQuery` to establish reactive, micro-subscription queries that only re-render components when relevant rows change.
3. **Memory & Timer Management**:
   - All interval timers (Clock, Pomodoro, Study Tracker) use deterministic hooks (`useInterval`) that properly clear handles on unmount.
