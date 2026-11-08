# NookSpace — Project Context

## Current Status: Phase 10 (Cross-Browser Validation & Release Preparation — Sealed & Release Candidate Frozen)

- **Repository**: `nookspace-extension`
- **Current Milestone**: Phase 10 (Cross-Browser Validation & Release Preparation — Sealed & Release Candidate Frozen)
- **Status Date**: November 2026
- **Release Target**: `0.1.0-alpha.51` (Technical Manifest: `0.1.0`)
- **Release Decision**: `RC_READY_WITH_LIMITATIONS` (Freeze Status: `RC_FROZEN`)
- **Build Status**:
  - Chromium MV3: `.output/chrome-mv3` (Compiled successfully, 1.28 MB)
  - Firefox MV2/MV3: `.output/firefox-mv2` (Compiled successfully, 1.28 MB)
  - Distributable Chromium Archive: `release/chromium/nookspace-chromium-0.1.0-alpha.51.zip` (353.40 KB)
  - Distributable Firefox Archive: `release/firefox/nookspace-firefox-0.1.0-alpha.51.zip` (353.45 KB)
  - AMO Source Code Archive: `release/firefox/nookspace-firefox-0.1.0-alpha.51-sources.zip` (2.01 MB)
  - Vitest Unit & Integration Tests: 1,167 passed (100% pass rate across 152 test files)
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

9. **Smart Bookmarks Architecture (Phase 6)**:
   - Three-tier architecture: Persistent Dexie DB $\to$ Repositories $\to$ Zustand Store (`bookmarkStore.ts`).
   - Pure, offline In-Memory Search Engine (`bookmarkSearchService.ts`) with multi-token AND evaluation, URL domain parsing, ranking hierarchy, deterministic tie-breaking, and sorting by order, title, createdAt, and updatedAt.
   - Discriminated union group filter (`BookmarkGroupFilter`: `{ type: 'all' }`, `{ type: 'uncategorized' }`, `{ type: 'group'; groupId: string }`) ensuring clean separation between All, Uncategorized (`groupId === null`), and specific folders with zero Dexie modification upon filter switching.
   - Dynamic workspace isolation: switching active workspace flushes memory state immediately and increments internal request token to discard out-of-order responses.
   - Dual-mode group deletion: Mode A (reassign to Uncategorized `groupId: null`) and Mode B (cascade deletion) executed within atomic Dexie transactions.
   - Atomic single and bulk bookmark movement (`moveBookmark`, `moveBookmarks`, `BookmarkRepository.moveBulk`) with sequential target order appending and cross-workspace isolation.
   - Cross-tab live synchronization via `nookspace_bookmarks_last_updated_at` storage event.
10. **Smart Bookmarks Import/Export Engine (Milestone 6.7)**:
    - Standards-compliant Netscape Bookmark HTML generation and parsing using safe detached `DOMParser` with unclosed tag auto-repair and URL allowlist enforcement (`https:`, `http:`, `mailto:`).
    - Versioned NookSpace JSON backup format (`NookSpaceBookmarkBackupV1`) with runtime Zod schema verification.
    - Import Coordinator with format auto-detection, preflight validation statistics, duplicate handling policies (`skip`, `import`, `update`), and Merge vs Destructive Replace modes.
    - Multi-table atomic Dexie transaction rollback guarantee with fresh UUID remapping and cross-tab storage synchronization.
11. **Notes & Knowledge System Architecture (Phase 7 - Completed & Sealed)**:
    - Three-tier domain model: Notes (`NoteEntity`), Collections (`NoteCollectionEntity`), Normalized Tags (`NoteTagEntity`), and Junction Links (`NoteBookmarkLinkEntity`).
    - Dexie Schema Version 4 upgrade: compound indexing on `[workspaceId+collectionId]`, `[noteId+bookmarkId]`, and multi-entry index `*tags`, fully preserving Dexie v1-v3 tables.
    - Pure AST-based Markdown preview engine (`MarkdownRenderer.tsx`) with zero raw HTML execution, zero `dangerouslySetInnerHTML`, interactive task lists, and strict URL allowlisting (`isSafeBookmarkUrl`).
    - Connected Markdown toolbar and editor (`NoteEditor.tsx`) with Split/Edit/Preview modes, debounced auto-saving, word/character counting, and tag management.
    - Responsive 3-panel Notes Manager modal (`NotesManagerModal.tsx`) with collapsible sidebar, real-time multi-token AND search, system views (All, Pinned, Favorites, Uncategorized, Archived), Collections, and Tags.
    - Non-destructive bidirectional Bookmark ↔ Note linking with search picker dialog (`LinkBookmarkModal.tsx`), embedded preview (`LinkedBookmarksSection.tsx`), and "Create Note from Bookmark" integration.
    - Notes Dashboard Widget (`NotesWidget.tsx`) with multi-mode display (Recent, Pinned, Favorites, Collection), configurable density, quick create, and one-click navigation bridge.
    - End-to-end integration test suite (`noteSuiteIntegration.test.tsx`) covering complete note lifecycles, collection cascades, tag propagation, bookmark linking, legacy quick-notes migration, workspace isolation, cross-tab sync, and performance benchmarks up to 5,000 items.

12. **Multiple Workspaces & Presets Architecture (Phase 8 — Completed & Sealed)**:
    - Domain Models & Validation (`src/types/workspaces.ts`): Strict Zod schemas (`WorkspaceSchema`, `CreateWorkspaceInputSchema`, `UpdateWorkspaceInputSchema`, `WorkspaceColorSchema`).
    - Enhanced Workspace Repository (`workspaceRepository.ts`):
      - `update(id, updates)`: Input validation, existence checks, immutable field protection (`id`, `createdAt`, `isDefault`).
      - `reorder(orderedIds)`: Complete permutation validation and atomic transaction ordering.
      - `delete(id)`: Atomic multi-table cascade deletion spanning all 15 workspace-scoped tables (`widgetInstances`, `widgetLayouts`, `notes`, `noteCollections`, `noteTags`, `noteBookmarkLinks`, `bookmarks`, `bookmarkGroups`, `todos`, `focusSessions`, `dailyGoals`, `calendarEvents`, `stickyNotes`, `vocabulary`, `resources`) with failure rollback, default workspace promotion, and settings fallback.
      - `duplicate(id)`: Transactional cloning of dashboard structure ONLY (workspace metadata, new instance IDs with deep-copied configs, and remapped widget layouts across all 5 breakpoints) leaving live user data uncopied.
    - Enhanced Zustand Store (`workspaceStore.ts`): Added `updateWorkspace`, `reorderWorkspaces`, and `duplicateWorkspace` actions with active workspace fallback and error recovery.
    - Built-in Presets Catalog (`src/features/workspaces/presets/`): 4 type-safe, Zod-validated presets (`minimalist`, `deep-study`, `developer`, `full-studio`) with 5-breakpoint responsive layouts and zero user domain data.
    - Preset Application Engine (`PresetApplicationService`): Multi-table atomic Dexie transaction creating workspace, fresh widget instances, and remapped layouts with 100% rollback guarantee.
    - Cross-Feature Synchronization & Multi-Tab Isolation (Milestone 8.6):
      - Canonical active workspace sync key: `STORAGE_KEY_ACTIVE_WORKSPACE_ID` (`nookspace_active_workspace_id`).
      - Centralized `WorkspaceSyncService` & `useWorkspaceSync` React hook listening to `browser.storage.onChanged` / `chrome.storage.onChanged` and window `storage` events.
      - Loopback cycle prevention via internal `syncExternalActiveWorkspace(id)` which updates memory and Dexie settings without broadcasting back to storage.
      - Safe fallback resolution to default workspace if target workspace was deleted in another tab.
      - Customization Studio draft protection: forcibly discards uncommitted drafts via `forceDiscardAndSwitchWorkspace(id)` when external workspace switch arrives, preventing layout contamination across workspaces.
      - Pending debounced layout cancellation: clears pending debounce timers via `clearPendingDebounce()`.
      - Pomodoro session ownership: timer started with `workspaceId` preserves attribution through background coordinator, alarms, and outbox drain to Dexie `focusSessions`, unaffected by tab switches.
    - Workspace & Preset UI Polish, Theme Support & Accessibility (Milestone 8.7):
      - Workspace Switcher dropdown keyboard navigation (`ArrowDown`, `ArrowUp`, `Home`, `End`), `role="menu"`, `role="menuitemradio"`, safe truncation, and focus styling.
      - Workspace Manager with clear active/default badges, boundary-checked accessible reordering buttons, and transparent cascade deletion/duplication warnings.
      - Starter Preset selection cards with radio accessibility, customizable defaults, and seamless toggle with Blank Workspace mode.
      - Light / Dark / System theme consistency across surfaces, borders, and high-contrast focus rings (`focus-visible:ring-2 focus-visible:ring-primary-500`).
      - Modal accessibility with Tab / Shift+Tab focus trap, focus restoration, Escape dismissal, and `motion-reduce:animate-none`.
      - Arrow navigation in `WorkspaceIconPicker` and `WorkspaceColorPicker`.
    - Zero schema migration: Dexie Version 4 retained; built-in presets operate as static TypeScript catalogs without database overhead.

13. **Universal JSON Export Engine Architecture (Phase 9 — Milestone 9.1)**:
    - Self-describing, versioned JSON backup envelope V1 (`nookspace-backup`, `formatVersion: 1`).
    - Decoupled versioning: external format version (1) decoupled from Dexie schema version (4) and app release version (`0.1.0-alpha.41`).
    - Complete 17-table coverage captured inside a single Dexie readonly transaction (`db.transaction('r', ...)`).
    - Proven READ-ONLY GUARANTEE: exact before/after database comparison verifies 0 writes, 0 updates, 0 deletions, and 0 migrations.
    - Web Crypto SHA-256 integrity checksum with canonical recursive key-sorted serialization (excluding the checksum field itself).
    - Strict serialization safety: handles Unicode, Vietnamese, Japanese, emoji, markdown; explicitly rejects BigInt, functions, symbols, NaN, Infinity, and circular references.
    - Missing entity schemas: defined Zod schemas for `StickyNoteEntity`, `VocabularyEntity`, `ResourceEntity`, `CalendarEventEntity`, `AppSettingsEntity`, `WidgetInstanceEntity`, `WidgetLayoutEntity`, and root envelope.
    - File download utility (`downloadBackup.ts`) generating standard `nookspace-backup-YYYY-MM-DD-HHMMSS.json` with DOM and Object URL cleanup.

14. **Backup Validation & Version Upgrade Engine (Phase 9 — Milestone 9.2)**:
    - Multi-stage untrusted JSON backup validation pipeline (`validateBackup`) accepting `string`, `object`, `Blob`, or `File`.
    - Input guard enforcing 100 MB hard limit (`BACKUP_HARD_MAX_BYTES`), 25 MB warning threshold (`BACKUP_LARGE_SIZE_WARNING_BYTES`), and bounded issue reporting (`maxErrors`, `maxWarnings`).
    - Format and version detection: identifies canonical `nookspace-backup` (v1) and legacy `nookspace-bookmarks` (v1), safely rejecting unrecognized formats or future versions (`UNSUPPORTED_FUTURE_VERSION`).
    - Web Crypto SHA-256 integrity checksum verification with canonical recursive key-sorted payload hashing; flags `CHECKSUM_MISMATCH` or `CHECKSUM_MISSING`.
    - Complete 17-table Zod schema validation across all database entities.
    - Cross-reference & domain integrity validator (`validateCrossReferencesAndDomainIntegrity`) checking duplicate IDs, orphan entities, workspace containment, cross-workspace mismatches, and dangerous bookmark/resource URL schemes (`javascript:`, `data:`, `vbscript:`).
    - Pure in-memory version upgrade registry (`VersionUpgradeRegistry`) and legacy bookmarks adapter (`adaptLegacyBookmarksBackup`) synthesizing deterministic isolated workspace containment and generating valid checksums without touching the database.
    - STRICT DATABASE SAFETY QUALITY GATE: Guaranteed 100% read-only in memory with 0 Dexie writes verified by spies across all 17 tables and all mutation methods.

15. **Restore Engine & Transactional Recovery Architecture (Phase 9 — Milestone 9.3)**:
    - Preflight Pipeline (`prepareRestore`): validates backup input, rejects partial backups (`PARTIAL_BACKUP_RESTORE_NOT_SUPPORTED`), verifies settings `activeWorkspaceId` containment, inspects current database stats, and acquires exclusive restore lock.
    - Decoupled Persistent Recovery Database (`NookSpaceRecoveryDB` in `recoveryDatabase.ts`): isolated IndexedDB `nookspace-recovery-db` storing verified pre-restore snapshots, stateful journal records, and concurrency lock with timeout lease.
    - Transactional Replacement Engine (`restoreBackup` in `restoreEngineService.ts`): executes clear and insertion across all 17 tables in strict foreign-key dependency order inside a single Dexie read-write transaction.
    - Post-Restore Verification (`verifyRestoredDatabase`): checks table counts, default workspace presence, active workspace containment, widget/note/bookmark group isolation, and blocks dangerous URL schemes.
    - Idempotent Rollback Service (`rollbackFromSnapshot` in `rollbackService.ts`): re-instates snapshot state if transaction or verification fails, transitioning to `recovery_required` if rollback fails while preserving snapshot.
    - Application Startup Recovery Coordinator (`startupRecoveryCoordinator.ts`): auto-rolls back interrupted operations or reports critical recovery requirement on app launch.
    - Runtime Store Sync (`restoreRuntimeSync.ts`): resets and re-hydrates `useWorkspaceStore`, `useWidgetStore`, and `useLayoutStore` and fires cross-tab notification events.
    - Accessible UI Modal (`RestoreModal.tsx`): file picker with fallback `FileReader`, validation summary, explicit confirmation checkbox, progress spinner, and post-restore success dialog.

16. **Merge Import & Non-Destructive Conflict Resolution Architecture (Phase 9 — Milestone 9.4)**:
    - Selective Scope Import: Supports 8 independent or combined data groups (Workspaces, Dashboard, Tasks, Notes, Bookmarks, Productivity, Personal Data, Settings).
    - Non-Destructive Guarantee: Strictly avoids clearing tables or wiping existing workspaces; incoming entities are safely added alongside existing user data.
    - Deterministic Fingerprinting Engine (`mergeFingerprintService.ts`): Computes normalized content fingerprints to distinguish exact duplicates from independent entities across all 17 tables.
    - Deep Entity ID Remapping (`mergeIdRemappingService.ts`): Re-keys colliding primary IDs and recursively updates all foreign keys (`workspaceId`, `collectionId`, `groupId`, `noteId`, `bookmarkId`, widgetLayout IDs).
    - Read-Only Preview Engine (`mergePlannerService.ts`): Inspects live database state, calculates incoming vs existing stats, generates deterministic plan tokens, and formulates conflicts without writing a single byte to IndexedDB.
    - Atomic Merge Transaction (`mergeEngineService.ts`): Executes all selected inserts and updates inside a single Dexie read-write transaction in foreign-key dependency order with all-or-nothing rollback on failure.
    - Stale Plan Guard: Detects database state modifications occurring between preview generation and execution, rejecting stale plans.
    - Accessible UI Modal (`MergeImportModal.tsx`): 5-stage workflow (Upload -> Scope Selection -> Conflict Resolution -> Summary Confirmation -> Progress/Results) integrated into Preferences alongside Restore and Export.

17. **Data Migration Engine & Legacy Data Recovery Architecture (Phase 9 — Milestone 9.5)**:
    - Modular Migration Engine Core (`src/features/migrations/`): Topological dependency resolution (Kahn's algorithm), cycle detection, and idempotent execution across all four migration strategies (Schema, Entity, Relationship, Data Normalization).
    - Persistent Migration Journal (`migrationJournalService.ts`): Backed by `NookSpaceRecoveryDB` table `migrationJournal` tracking `pending` -> `running` -> `completed` / `failed` -> `recovery_required` with duration, record metrics, and failure reasons.
    - Read-Only Legacy Data Scanner (`legacyDataScanner.ts`): Exhaustive, side-effect-free scanner classifying records into `Compatible`, `Migratable`, `Recoverable`, `Unsupported`, and `Corrupted`.
    - Non-Destructive Legacy Data Repair Service (`legacyDataRepairService.ts`): Safely heals orphan collection IDs, orphan bookmark group IDs, stale widget layouts, and missing schema defaults while strictly preserving user-authored prose, markdown, and code blocks.
    - Cross-Tab Concurrency Lock: Integrated with `recoveryDb.acquireLock` and heartbeat lease renewal preventing parallel migration runs across tabs.
    - Accessible Diagnostics UI (`MigrationDiagnosticsModal.tsx`): Real-time scanner, issue severity cards (`info`, `warning`, `critical`), batch/individual repair actions, and persistent migration journal history.

18. **Final Integration, Data Integrity Audit & Release Readiness (Phase 9 — Milestone 9.6)**:
    - Shared Exclusive Lock Coordination: Enforced strict mutual exclusion between Restore, Merge Import, and Data Migration operations using `'current_restore_lock'` in `NookSpaceRecoveryDB.locks`. Added `releaseStaleLock()` and `checkLock()` for expired lease reclamation and ownership validation.
    - Startup Recovery Hardening: Enhanced `startupRecoveryCoordinator.ts` with automatic cleanup of expired locks and crash detection for orphaned migration journal records (`running` -> `failed` with `'MIGRATION_INTERRUPTED'`).
    - Stale Plan Freshness Upgrade: Upgraded `mergePlannerService.ts` (`computePlanToken` and `validatePlanFreshness`) to track record counts and boundary timestamps/IDs (`updatedAt`/`createdAt`), detecting in-place content edits occurring during merge dialog review.
    - Universal 17-Table Round Trip Fidelity: 100% byte and data preservation verified across Seed All 17 Tables -> Export -> Validate -> Restore -> Full Round Trip verification, preserving multilingual Unicode (Vietnamese diacritics, Japanese kanji/hiragana), Markdown tables, code blocks, and junction links.
    - Cross-Workspace Data Isolation Audit: Verified zero data bleed across multiple workspaces with identical entity names and validated clean cascade deletion of scoped entities.
    - Exhaustive Failure Injection Suite: Validated all 18 failure vectors (checksum corruption, schema truncation, invalid JSON, snapshot storage failure, transaction rollback, stale plan abort, post-verification abort, and startup recovery).
    - Test Suite: 1,142 passing tests across 150 test files (100% pass rate).
    - Dual production packages verified: Chromium MV3 (1.25 MB) and Firefox MV2 (1.25 MB).
    - Phase 9 Data Integrity, Migrations & Testing officially closed and certified release-ready.

19. **Cross-Browser Runtime Validation, Compatibility & Persistence (Phase 10 — Milestones 10.0, 10.1, 10.2 & 10.3)**:
    - Host Environment Audit: Discovered Google Chrome `156.0.8078.81`, Microsoft Edge `157.0.4341.42`, Zen Browser `1.24b` (Gecko engine); confirmed Brave and official Mozilla Firefox are not installed on host.
    - Chromium Extension Error Suppression (M10.1): Added safe `ext.runtime?.lastError` checks across all asynchronous extension callbacks (`storage.local`, `alarms`, `notifications`, `tabs`, `runtime`) in `browserApi.ts`, eliminating `Unchecked runtime.lastError` warnings in Chrome DevTools.
    - Startup Hydration Guard (M10.1): Guarded `loadWidgets` in `AppShell.tsx` with `!isWorkspaceLoading`, preventing race conditions where widgets query before initial workspace seeding finishes on clean Chrome profiles.
    - Cross-Tab Theme Sync (M10.1): Added window `storage` event listener in `themeStore.ts` for instant reactive theme updates across all open New Tab pages.
    - Gecko WebExtension Dual-Mode Adapter (M10.2): Implemented `callBrowserApi<T>()` in `src/services/browser/index.ts` to seamlessly handle both native Gecko Promise returns (`globalThis.browser`) and Chromium callback returns (`globalThis.chrome`) with single-settle idempotency (`settled = true`), error rejection fallback, and `lastError` suppression.
    - Content Security Policy (CSP) Remediation (M10.2): Extracted inline anti-flash script from `entrypoints/newtab/index.html` to `entrypoints/newtab/anti-flash.ts` imported in `main.tsx`, eliminating inline script CSP violations in Firefox extension pages (`script-src 'self'`) and satisfying Mozilla AMO submission policies.
    - Lifecycle Data Persistence & Multi-Tab Synchronization (M10.3): Verified 17-table data fidelity across simulated browser restarts, tab closures, and reload cycles. Validated reactive multi-tab event propagation across 7 operational channels with loopback cycle protection and stale request token guards.
    - Added dedicated lifecycle persistence integration test suite `crossBrowserLifecyclePersistence.test.ts` (6 tests).
    - Test Suite: **1,159 passing tests across 151 test suites (100% pass rate)**.
    - Dual production packages verified: Chromium MV3 (1.25 MB) and Firefox MV2 (1.25 MB).
    - Detailed milestone reports generated in `docs/reports/PHASE_10/M10.1_CHROMIUM_RUNTIME_VALIDATION_REPORT.md`, `docs/reports/PHASE_10/M10.2_GECKO_RUNTIME_VALIDATION_REPORT.md`, and `docs/reports/PHASE_10/M10.3_CROSS_BROWSER_REGRESSION_REPORT.md`.

20. **Accessibility, Responsive UX & Performance Polish (Phase 10 — Milestone 10.4)**:
    - Universal Reduced Motion & Focus Tokens: Added `@media (prefers-reduced-motion: reduce)` minimal animation overrides and universal `:focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 2px; }` in `src/styles/globals.css`.
    - Modal Focus Management & Clamping: Implemented focus trapping (`Tab`/`Shift+Tab` cycling), auto-focus on open, and trigger element focus restoration across `Modal.tsx`, `NotesManagerModal.tsx`, and `BookmarkManagerModal.tsx`. Clamped modal container heights to `max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden` with `overflow-y-auto flex-1` on the body.
    - Dropdown Accessibility: Enhanced `Dropdown.tsx` arrow key navigation to skip disabled items, navigate with `Home`/`End`, and autofocus first enabled action on open.
    - Responsive Breakpoint Alignment: Added `xs: '480px'` under `theme.extend.screens` in `tailwind.config.js`, aligning Tailwind classes with `GridLayoutEngine.tsx`.
    - Responsive Folder Sidebar: Added responsive mobile view switching between folders and bookmark list in `BookmarkManagerModal.tsx` and added `className` support to `FolderSidebar.tsx`. Wrapped Preferences action buttons (`flex flex-wrap items-center gap-2`).
    - Automated Accessibility Test Suite: Added `tests/unit/accessibility/accessibilityPolish.test.tsx` (8 tests).
    - Test Suite: **1,167 passing tests across 152 test suites (100% pass rate)**.
    - Dual production packages verified: Chromium MV3 (1.25 MB) and Firefox MV2 (1.25 MB).
    - Detailed milestone report generated in `docs/reports/PHASE_10/M10.4_ACCESSIBILITY_RESPONSIVE_PERFORMANCE_REPORT.md`.

21. **Store Metadata, Privacy Documentation & Release Assets (Phase 10 — Milestone 10.5)**:
    - Production Icon Generation: Replaced 70-byte placeholders with anti-aliased 32-bit ARGB PNG icons: 16×16 (295 B), 32×32 (552 B), 48×48 (771 B), 128×128 (3,129 B), and 512×512 (22,161 B).
    - Store Promotional Assets: Generated CWS promotional tile (`promo-small-440x280.png`), marquee banner (`promo-marquee-1400x560.png`), and 7 authentic 1280×800 PNG feature screenshots in `docs/release/assets/`.
    - Privacy Disclosures: Published `PRIVACY_POLICY.md` (local-first, zero telemetry, 17-table data inventory), `DATA_HANDLING_DISCLOSURE.md` (CWS & AMO questionnaire mapping), `NETWORK_DISCLOSURE.md` (certifying 0 remote code, 0 analytics, and domain-only favicon resolver with offline fallback), and `PERMISSION_JUSTIFICATIONS.md` (`storage`, `alarms`, `notifications`).
    - Store Listings: Published character-verified listings in `CHROME_WEB_STORE_LISTING.md` and `FIREFOX_AMO_LISTING.md`.
    - Release Packaging: Packaged `nookspace-chromium-0.1.0-alpha.51.zip` (353 KB), `nookspace-firefox-0.1.0-alpha.51.zip` (353 KB), and `nookspace-firefox-0.1.0-alpha.51-sources.zip` (651 KB) with SHA-256 checksums in `PACKAGE_MANIFEST.md` and created `INSTALLATION_GUIDE.md`.
    - Detailed milestone report generated in `docs/reports/PHASE_10/M10.5_STORE_METADATA_PRIVACY_RELEASE_ASSETS_REPORT.md`.

---

22. **Final Release Candidate Verification & Freeze (Phase 10 — Milestone 10.6)**:
    - Release Candidate Decision: Certified `RC_READY_WITH_LIMITATIONS` and sealed as `RC_FROZEN`.
    - Automated Quality Gates: 100% clean compilation (`tsc --noEmit`), 1,167 / 1,167 passing tests across 152 test files, production bundles built for both Chromium MV3 and Firefox MV2.
    - Verified Packages & SHA-256 Checksums:
      - Chromium MV3: `release/chromium/nookspace-chromium-0.1.0-alpha.51.zip` (353,397 bytes, SHA-256 `c0c12491bbfbf845c5cdd6bc2f97c081c6fb7d55490b2d8ec008da916db895bf`)
      - Firefox MV2: `release/firefox/nookspace-firefox-0.1.0-alpha.51.zip` (353,446 bytes, SHA-256 `b3f07904026700cf372fd84b6032b10e0f7ce698dfb533a1634c01eb4b591923`)
      - AMO Sources: `release/firefox/nookspace-firefox-0.1.0-alpha.51-sources.zip` (2,010,413 bytes, SHA-256 `20ed64dd959521056b170bc4d8cda82b96bb911507a580a4d3686b5acbe881fb`)
    - Version Harmonization: Manifest version `0.1.0` (mandated by CWS/AMO integer schemas) reconciled with git development label `0.1.0-alpha.51` and UI badge `v0.1.0`.
    - Security & Privacy Audit: Zero remote code, zero external analytics/tracking, single-settle Promise handling, AST-based React Markdown renderer (zero `dangerouslySetInnerHTML`), strict URL scheme filtering.
    - Release Candidate Manifest published in `docs/release/RELEASE_CANDIDATE_MANIFEST.md`.
    - Detailed milestone report generated in `docs/reports/PHASE_10/M10.6_FINAL_RELEASE_CANDIDATE_VERIFICATION_REPORT.md`.

---

## Next Steps
All Phases 0 through 10 are completely delivered, validated, and sealed.
- **Phase 10 (Cross-Browser Validation & Release Preparation)**: ALL MILESTONES (10.0, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6) COMPLETED.
- **Current State**: `RC_FROZEN` locally awaiting developer store dashboard submission when external developer credentials/hosting URLs are provisioned.
