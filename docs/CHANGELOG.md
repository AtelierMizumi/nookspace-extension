# Changelog — NookSpace

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - Post-Roadmap Extension (2026-11-08)

### Added
- **Music Player v2 — Playlist + Spotify + osu! Library**:
  - Tabbed widget (Player | Playlist | Spotify): local queue merges bundled osu! library (100 songs >70s from `/mnt/SSDStorage/osu!/Songs`, via new `npm run music` script) with device files (Dexie), with search filter, OSU/source badges and click-to-play.
  - Correct playback order logic (`src/features/music/playback.ts`): real repeat modes (off/all/one) replacing the mislabeled autoplay toggle, shuffle with deterministic order, next/prev with stable wrap — all unit-tested.
  - Fixed playback reset bug: changing volume no longer tears down the audio element/object URL (volume-only sync effect).
  - Spotify tab: paste URL, `spotify:<type>:<id>` URI or bare 22-char ID (`parseSpotifyId`) to play via official iframe embed; allowlisted via existing CSP `frame-src`; presets + recent-history chips; direct-audio links play via `<audio>`.
  - Bundled playlist loader (`src/features/music/bundledPlaylist.ts`) with defensive validation; falls back to empty when not generated.
  - Tests: 25 music tests incl. RED→GREEN coverage for playback order, playlist validation, Spotify parsing, build-script selection; full-suite failures unchanged vs baseline (24 upstream).
  - Fix (2026-11-09): bundled playlist loader now accepts the real generated shape `{ tracks: [...] }` (was rejecting it as non-array, empty playlist); regression + real-file integration tests added.
  - YouTube support (2026-11-09): tab renamed "YouTube · Spotify"; accepts single videos (`watch?v=`, `youtu.be/`, shorts, live), playlist-only links (`playlist?list=` → videoseries embed), and video+playlist links keeping the `list` context; YouTube presets shown alongside Spotify.
  - Responsive widget space (2026-11-09): semantic mins raised (Music 4×4, Calendar 4×3, Pomodoro 4×4, Todo 3×3) so new cards are usable; new `useWidgetCompact` hook (ResizeObserver, <320px) collapses Music vinyl to a small disc + hides secondary line, and shrinks Calendar day cells + internal scroll.
- **User Identity & Supabase Authentication Integration**:
  - Official `@supabase/supabase-js` client singleton with custom extension storage adapter (`ExtensionStorageAdapter`) supporting Chromium MV3 and Firefox MV2/MV3 without cookie dependencies.
  - Auth Modal (`AuthModal.tsx`) with tabbed Login, Registration, Forgot Password, and Email Verification states.
  - Safe error handling, password masking toggle, client-side input validation, and password confirmation matching.
  - User Profile & Account Settings modal (`ProfileModal.tsx`) with avatar preview, display name, bio, and sign-out controls.
  - Preserved Core Dual Operating Mode: 100% offline Personal Mode (Dexie.js IndexedDB) vs Authenticated Shared Mode (Supabase).
- **Avatar Upload to Supabase Storage (Option 3)**:
  - Custom Supabase Storage bucket integration (`avatars`) with public read access and RLS isolated user folder uploads (`avatars/{userId}/...`).
  - `avatarStorageService.ts` with file validation (5MB max limit, PNG/JPEG/WEBP/GIF), automatic file naming, upload progress handling, and public URL generation.
  - File picker trigger with camera overlay and remove/revert capability in `ProfileModal.tsx`.
- **Shared Workspaces (Option 1)**:
  - Domain models, database migrations (`shared_workspaces`, `shared_workspace_members`), and `sharedWorkspaceService.ts`.
  - Create shared workspace with name, description, color, and unique 6-character uppercase alphanumeric join code.
  - Join shared workspace by code with atomic Supabase RPC (`join_shared_workspace(code)`) and member list query.
  - Dual Mode Switcher: 1-click toggle between Personal Mode and Shared Room with visual indicator badge in `TopNav.tsx`.
- **Virtual Study Room & Live Pomodoro Presence Sync (Option 2)**:
  - `studyRoomPresence` realtime tracking with statuses: `IN_FOCUS` 🟢, `ON_BREAK` 🟡, `IDLE` ⚪.
  - Supabase Realtime channel subscription with automatic heartbeats, status toggle, activity title updating, and daily focus minutes.
  - Live Peers Grid with animated presence indicators, participant badges, and room focus analytics.
  - `TopNav.tsx` active room indicator button with 1-click shortcut to the Virtual Study Room modal.
- **SQL Migrations & Infrastructure Documentation (Option 5)**:
  - `supabase/migrations/20261108000000_account_profiles.sql`: User profiles table with auto-create trigger and secure RLS.
  - `supabase/migrations/20261108010000_storage_avatars.sql`: Storage bucket setup with isolated user folder RLS policies.
  - `supabase/migrations/20261108020000_shared_workspaces.sql`: Shared workspaces, memberships, study room presence, and RPC functions.
  - Bilingual localization parity (100% English & Vietnamese) for all account, shared workspace, and study room UI.

## [0.1.0-alpha.51] - 2026-11-08

### Added
- Phase 10 (Milestone 10.6) Final Release Candidate Verification & Freeze:
  - Source Code, Version & Quality Audit:
    - Harmonized technical manifest versions (`0.1.0` in `manifest.json` for CWS & AMO schema conformance) with milestone release label (`0.1.0-alpha.51`) and TopNav badge (`v0.1.0`).
    - Verified strict TypeScript compilation across the entire workspace (0 errors).
    - Executed complete test suite: **152 / 152 test files passed, 1,167 / 1,167 tests passed (100% pass rate)**.
  - Multi-Target Packaging & Cryptographic Integrity:
    - Generated clean production bundles `.output/chrome-mv3` (1.28 MB) and `.output/firefox-mv2` (1.28 MB).
    - Packaged `nookspace-chromium-0.1.0-alpha.51.zip` (353,397 bytes, SHA-256 `c0c12491bbfbf845c5cdd6bc2f97c081c6fb7d55490b2d8ec008da916db895bf`).
    - Packaged `nookspace-firefox-0.1.0-alpha.51.zip` (353,446 bytes, SHA-256 `b3f07904026700cf372fd84b6032b10e0f7ce698dfb533a1634c01eb4b591923`).
    - Packaged `nookspace-firefox-0.1.0-alpha.51-sources.zip` (2,010,413 bytes, SHA-256 `20ed64dd959521056b170bc4d8cda82b96bb911507a580a4d3686b5acbe881fb`).
    - Documented package details and checksums in `docs/release/PACKAGE_MANIFEST.md`.
  - Security, CSP & Privacy Certification:
    - Zero remote code execution, zero dynamic HTML injection (`dangerouslySetInnerHTML` prohibited).
    - Strict CSP `script-src 'self'` with externalized anti-flash script (`anti-flash.ts`), completely free of inline scripts.
    - Zero outbound analytics or telemetry; offline-first local IndexedDB persistence with sole external call to Google S2 Favicon service with domain-only query and offline SVG fallback.
    - Strict protocol scheme allowlisting (`https:`, `http:`, `mailto:` only).
  - Release Candidate Freeze:
    - Certified Release Candidate Decision: `RC_READY_WITH_LIMITATIONS` in `docs/release/RELEASE_CANDIDATE_MANIFEST.md`.
    - Documented host environment boundary (testing conducted on Chromium and Zen Browser Gecko fork; official Firefox Stable binary verification recommended once provisioned).
    - Documented local freeze state: 0 git commits, 0 git pushes, 0 git tags, 0 external store uploads.
  - Milestone Documentation:
    - Published full technical report at `docs/reports/PHASE_10/M10.6_FINAL_RELEASE_CANDIDATE_VERIFICATION_REPORT.md`.
- Phase 10 (Milestone 10.5) Store Metadata, Privacy Documentation & Release Assets:
  - Brand Identity & Production Icon Generation:
    - Replaced 70-byte placeholder PNG icons with genuine, anti-aliased 32-bit ARGB production icons across all standard resolutions: 16×16 (295 B), 32×32 (552 B), 48×48 (771 B), 128×128 (3,129 B), and 512×512 (22,161 B).
    - Verified proper manifest inclusion across both Chromium MV3 and Firefox MV2 generated packages.
  - Store Promotional Assets & Screenshots (`docs/release/assets/`):
    - Generated Chrome Web Store small promotional tile (`promo-small-440x280.png`, 440×280 PNG).
    - Generated Chrome Web Store marquee banner (`promo-marquee-1400x560.png`, 1400×560 PNG).
    - Prepared 7 authentic 1280×800 PNG feature screenshots covering Main Dashboard, Customization Studio, Productivity Suite, Smart Bookmarks, Notes & Knowledge, Multi-Workspace Management, and Backup/Restore.
  - Privacy Disclosures & Regulatory Compliance (`docs/release/privacy/`):
    - Published comprehensive `PRIVACY_POLICY.md` documenting local-first architecture, 17-table local data inventory, zero telemetry, and clear placeholders for developer hosting.
    - Published `DATA_HANDLING_DISCLOSURE.md` mapping developer portal privacy questionnaires for Chrome Web Store and Mozilla Add-ons.
    - Published `NETWORK_DISCLOSURE.md` certifying zero backend servers, zero remote code, and disclosing the domain-only Google S2 favicon service with offline vector fallback.
    - Published `PERMISSION_JUSTIFICATIONS.md` detailing technical necessity for `storage`, `alarms`, and `notifications` under the Principle of Least Privilege.
    - Published `PRIVACY_REVIEW_CHECKLIST.md` auditing pre-submission technical verifications and developer action items.
  - Store Listing Copy & Requirements (`docs/release/store/`):
    - Prepared `CHROME_WEB_STORE_LISTING.md` with character-verified title (44 chars), short description (99 chars), formatted description, and asset mappings.
    - Prepared `FIREFOX_AMO_LISTING.md` with summary (218 chars), category selections, and dedicated reviewer reproduction instructions.
    - Prepared `STORE_REQUIREMENTS_CHECKLIST.md` auditing store policies and packaging specifications.
  - Distribution Packaging & Checksum Verification (`release/` & `PACKAGE_MANIFEST.md`):
    - Packaged `nookspace-chromium-0.1.0-alpha.51.zip` (353,397 bytes, SHA-256: `32801fc2295571221d68871d38834c3013a53107e767d9c81c3aa3f12198500d`).
    - Packaged `nookspace-firefox-0.1.0-alpha.51.zip` (353,446 bytes, SHA-256: `9d603a6b2a869c0ea6dc8855501a9c1d3ebec7995fa5fcd86f9f00f891dbc483`).
    - Packaged `nookspace-firefox-0.1.0-alpha.51-sources.zip` (651,654 bytes, SHA-256: `49ca4b15fd45e9a3baf8d27636421b748dc5f820bbfae4691449323bf47385ef`).
    - Published `INSTALLATION_GUIDE.md` covering Chromium unpacked loading, Firefox temporary add-on loading, data backup practices, and troubleshooting.
  - Milestone Documentation:
    - Published full technical report at `docs/reports/PHASE_10/M10.5_STORE_METADATA_PRIVACY_RELEASE_ASSETS_REPORT.md`.

- Phase 10 (Milestone 10.4) Accessibility, Responsive UX & Performance Polish:
  - Accessibility & WCAG 2.2 AA Conformance Polish:
    - Added global reduced-motion preference rules (`@media (prefers-reduced-motion: reduce)`) in `src/styles/globals.css`, setting minimal duration and disabling animations across all components.
    - Added universal `:focus-visible` ring outline styling (`2px solid hsl(var(--ring))`) in `src/styles/globals.css`.
    - Enhanced `src/components/ui/Dropdown.tsx` keyboard navigation to skip disabled items when using `ArrowDown` and `ArrowUp`, support `Home` and `End` keys, and autofocus first enabled item on open.
    - Implemented focus trapping (`Tab` and `Shift+Tab` boundary cycling), auto-focus on open, and focus restoration to the trigger element on close across `NotesManagerModal.tsx` and `BookmarkManagerModal.tsx`.
    - Added explicit `aria-label`s to icon-only buttons in `NotesManagerModal.tsx` (close button, mobile back button) and `BookmarkManagerModal.tsx` (close button, mobile folder toggle button).
  - Responsive Layout & Viewport Optimization:
    - Added `xs: '480px'` screen breakpoint to `tailwind.config.js` under `theme.extend.screens`, aligning Tailwind CSS utilities with `GridLayoutEngine.tsx`.
    - Clamped modal dialog height in `src/components/ui/Modal.tsx` to `max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden` with `overflow-y-auto flex-1` on the body to prevent overflow on small viewport heights ($< 768\text{px}$).
    - Made Preferences dialog action button container wrapping (`flex flex-wrap items-center gap-2`) in `entrypoints/newtab/App.tsx`.
    - Added responsive mobile view switching between folders and bookmark list in `BookmarkManagerModal.tsx` and added `className` prop support to `FolderSidebar.tsx`.
  - Automated Accessibility Test Suite:
    - Added `tests/unit/accessibility/accessibilityPolish.test.tsx` (8 tests) covering modal responsive containers, focus trapping and restoration, dropdown disabled item skipping, reduced motion CSS tokens, and accessible button names.
    - Elevated total test coverage to **1,167 passing tests across 152 test suites (100% pass rate)**.
  - Production Bundle Verification:
    - Verified dual production builds: Chromium MV3 (1.25 MB) and Firefox MV2 (1.25 MB).
  - Milestone Documentation:
    - Published full technical report at `docs/reports/PHASE_10/M10.4_ACCESSIBILITY_RESPONSIVE_PERFORMANCE_REPORT.md`.

## [0.1.0-alpha.50] - 2026-11-08

### Added
- Phase 10 (Milestone 10.3) Cross-Browser Functional Regression & Data Persistence:
  - 17-Table Data Persistence Verification (`tests/integration/persistence/crossBrowserLifecyclePersistence.test.ts`):
    - Verified complete data preservation across simulated browser restarts, tab closures, and reload cycles across all 17 active database tables.
    - Preserved stable UUIDs, foreign-key relationships, and multilingual Unicode fidelity (Vietnamese diacritics, Japanese kanji/hiragana).
  - Multi-Tab Live State Synchronization:
    - Validated reactive multi-tab event propagation across all 7 operational channels (`STORAGE_KEY_ACTIVE_WORKSPACE_ID`, `nookspace_theme_mode`, `STORAGE_KEY_ENVELOPE`, `STORAGE_KEY_TODO_LAST_UPDATED_AT`, `STORAGE_KEY_BOOKMARKS_LAST_UPDATED_AT`, `STORAGE_KEY_NOTES_LAST_UPDATED_AT`, `STORAGE_KEY_LAST_DRAINED_AT`).
    - Verified loopback cycle prevention, stale request token guards (`latestRequestId`), and Customization Studio remote workspace switch draft protection.
  - Workspace Isolation & Cascade Deletion:
    - Confirmed strict logical separation of all 15 scoped tables across multiple workspaces.
    - Verified clean cascade deletion of non-default workspaces without touching sibling workspaces or default workspace.
  - Protocol Scheme Sanitation:
    - Verified strict rejection of dangerous schemes (`javascript:`, `data:`, `vbscript:`, `ftp:`) in `bookmarkSecurity.ts`.
  - Regression Test Suite Expansion:
    - Added dedicated lifecycle persistence integration test suite with 6 new tests.
    - Elevated total test coverage to **1,159 passing tests across 151 test suites (100% pass rate)**.
  - Dual Production Bundle Verification:
    - Verified dual production packages compiled cleanly: Chromium MV3 (1.25 MB) and Firefox MV2 (1.25 MB).
  - Milestone Documentation:
    - Published full technical report at `docs/reports/PHASE_10/M10.3_CROSS_BROWSER_REGRESSION_REPORT.md`.

## [0.1.0-alpha.49] - 2026-11-08

### Added
- Phase 10 (Milestone 10.2) Firefox / Gecko Runtime Validation & Compatibility Fixes:
  - Gecko WebExtension Dual-Mode Adapter (`src/services/browser/index.ts`):
    - Implemented `callBrowserApi<T>()` dual-mode helper supporting both native Mozilla Firefox Promise-returning WebExtension APIs (`globalThis.browser`) and Chromium callback-based APIs (`globalThis.chrome`).
    - Added single-settle idempotency (`let settled = false`) to guarantee zero double resolutions and proper fallback handling on API rejection.
    - Added safe OS extraction in `runtime.getPlatform()` handling Gecko's `PlatformInfo` object `{ os, arch }`.
  - Strict Content Security Policy (CSP) Remediation (`entrypoints/newtab/anti-flash.ts` & `entrypoints/newtab/index.html`):
    - Extracted inline anti-flash script from `index.html` to standalone module `anti-flash.ts` and imported at top of `main.tsx`.
    - Eliminated inline `<script>` tags from `newtab.html`, achieving 100% compliance with Firefox default WebExtension CSP (`script-src 'self'`) and satisfying Mozilla AMO submission policies.
  - Native Gecko Test Suite (`tests/mocks/browser.ts` & `tests/unit/browserApi.test.ts`):
    - Implemented `createMockGeckoBrowser()` simulating native Gecko Promise-based WebExtension environment.
    - Added 6 dedicated unit tests in `tests/unit/browserApi.test.ts` validating Promise-based storage (`get`, `set`, `remove`), alarms (`create`, `clear`, `onAlarm`), notifications, tabs, platform info, and rejection safety.
  - Full Regression Verification:
    - Elevated total test coverage to **1,153 passing tests across 150 test suites (100% pass rate)**.
    - Verified clean TypeScript compilation (`tsc --noEmit` $\to$ 0 errors).
    - Verified dual production bundles: `.output/firefox-mv2` (1.25 MB) and `.output/chrome-mv3` (1.25 MB).
  - Milestone Documentation:
    - Published full technical report at `docs/reports/PHASE_10/M10.2_GECKO_RUNTIME_VALIDATION_REPORT.md`.

## [0.1.0-alpha.48] - 2026-11-08

### Added
- Phase 10 (Milestones 10.0 & 10.1) Cross-Browser Runtime Audit & Chromium Compatibility:
  - Chromium API Error Suppression (`src/services/browser/index.ts`):
    - Added safe `ext.runtime?.lastError` checks across all asynchronous extension callbacks (`storage.local.get/set/remove`, `alarms.clear`, `notifications.create`, `tabs.create`, `runtime.getPlatformInfo`), preventing unhandled `Unchecked runtime.lastError` warnings in Chrome DevTools.
  - Startup Hydration Race Condition Guard (`src/components/layout/AppShell.tsx`):
    - Guarded `loadWidgets` in `AppShell` with `!isWorkspaceLoading`, ensuring initial widgets query only after workspace seeding completes on clean Chrome profiles.
  - Cross-Tab Theme Synchronization (`src/stores/themeStore.ts`):
    - Added window `storage` event listener in `initializeTheme()` to reactively update document CSS class and store state when `nookspace_theme_mode` changes in sibling tabs.
  - Migration Crash Recovery Lock Release (`src/features/backup/recovery/startupRecoveryCoordinator.ts`):
    - Enhanced `StartupRecoveryCoordinator` to explicitly release the lock held by crashed migration operations (`releaseLock(mig.migrationId)`).
  - Regression Test Suite Expansion:
    - Added regression tests in `tests/unit/browserApi.test.ts` (Chromium runtime lastError safety), `tests/unit/stores/themeStore.test.ts` (cross-tab theme sync), `tests/integration/backup/sharedExclusiveLockCoordination.test.ts` (all pairwise lock coordination), and `tests/integration/migrations/migrationFailureInjection.test.ts` (crash recovery with data verification).
    - Elevated total test coverage to **1,147 passing tests across 150 test suites (100% pass rate)**.
  - Production Build Certification:
    - Dual production packages compiled cleanly: Chromium MV3 (1.25 MB) and Firefox MV2 (1.25 MB).
  - Milestone Report:
    - Generated full report at `docs/reports/PHASE_10/M10.1_CHROMIUM_RUNTIME_VALIDATION_REPORT.md`.

## [0.1.0-alpha.47] - 2026-11-08

### Added
- Phase 9 (Milestone 9.6) Final Integration, Data Integrity Audit & Release Readiness:
  - Shared Exclusive Lock Coordination (`src/features/backup/recovery/recoveryDatabase.ts`):
    - Unified concurrency control across Restore Engine, Merge Import Engine, and Data Migration Engine via single shared lock key `'current_restore_lock'`.
    - Implemented `releaseStaleLock()` for automatic expiration reclamation and `checkLock()` returning detailed ownership info (`isLocked`, `isOwner`, `currentOwner`).
    - Guarded against non-owner lock releases with explicit ownership validation.
  - Startup Recovery Hardening (`src/features/backup/recovery/startupRecoveryCoordinator.ts`):
    - Added automated cleanup of expired or orphaned locks on application launch.
    - Added crash detection for interrupted migrations in `migrationJournal`, transitioning orphaned `running` states to `failed` with `'MIGRATION_INTERRUPTED'`.
  - Stale Plan Freshness Guard Upgrade (`src/features/backup/services/mergePlannerService.ts`):
    - Enhanced `computePlanToken` and `validatePlanFreshness` to inspect both table record counts and boundary timestamps/IDs (`updatedAt`/`createdAt`), detecting in-place content modifications during merge dialog review.
  - Universal 17-Table Round Trip Data Fidelity (`tests/integration/backup/universalRoundTripDataFidelity.test.ts`):
    - Verified 100% byte and data preservation across Seed All 17 Tables $\to$ Export $\to$ Validate $\to$ Restore $\to$ Re-export round trip.
    - Full verification of Vietnamese diacritics, Japanese kanji/hiragana, emojis, Markdown tables, code blocks, and bidirectional junction links.
  - Cross-Workspace Data Isolation Audit (`tests/integration/workspaces/crossWorkspaceDataIntegrityAudit.test.ts`):
    - Verified strict isolation across multiple workspaces with identically named entities and verified clean cascade deletion of scoped entities with zero leakage.
  - Comprehensive Failure Injection Suite (`tests/integration/backup/endToEndDataIntegrityFailureInjection.test.ts`):
    - Validated all 18 failure vectors including checksum tampering, schema truncation, invalid JSON, snapshot storage failure, transaction failure rollback, stale plan abort, post-verification rejection, and startup recovery.
  - Test Suite Expansion:
    - Added 14 new integration tests across 4 comprehensive test suites.
    - Elevated total repository test coverage to **1,142 passing tests across 150 test files (100% pass rate)**.
  - Release Certification:
    - Verified dual-target production builds: Chromium MV3 (1.25 MB) and Firefox MV2 (1.25 MB).
    - Formally closed Phase 9 Data Integrity, Migrations & Testing.

## [0.1.0-alpha.46] - 2026-11-08

### Added
- Phase 9 (Milestone 9.5) Data Migration Engine & Legacy Data Recovery:
  - Migration Engine Architecture (`src/features/migrations/services/migrationEngine.ts`):
    - Topological dependency resolution using Kahn's algorithm with deterministic tie-breaking.
    - Strict dependency validation and cyclic dependency detection with detailed cycle diagnostics.
    - Idempotent execution model: subsequent runs skip already completed migrations safely returning `no_op`.
    - Integrated with exclusive cross-tab recovery lock (`acquireLock`, `renewLock`, `releaseLock`) preventing parallel migration runs across tabs.
  - Persistent Migration Journal (`src/features/migrations/journal/migrationJournalService.ts`):
    - Dedicated `migrationJournal` table in `NookSpaceRecoveryDB` (`nookspace-recovery-db` v2).
    - Persists state transitions (`running` $\to$ `completed` / `failed` / `recovery_required`), duration in ms, and processed/modified record counts.
  - Core Migration Definitions (`src/features/migrations/definitions/`):
    - Schema Migrations (`schemaMigrations.ts`):
      - `v1-v2-widget-layouts`: converts legacy v1 `layouts` table items into breakpointed `widgetLayouts` (`lg`).
      - `v2-v3-bookmark-workspace`: populates missing `workspaceId` foreign keys on bookmarks.
      - `v3-v4-notes-knowledge`: populates `collectionId: null`, `isPinned`, `isFavorite`, `isArchived`, `tags: []`, `order: 0`, and generated `excerpt`.
    - Entity Migrations (`entityMigrations.ts`):
      - `legacy-todos`: extracts tasks from `simple-todo` widget instance configurations into dedicated `todos` table.
      - `legacy-quick-notes`: extracts scratchpad content from `quick-notes` widget configurations into dedicated `notes` table.
    - Relationship Migrations (`relationshipMigrations.ts`):
      - `repair-dangling-relationships`: resets orphan note collection IDs and bookmark group IDs to null without deleting user notes or bookmarks.
    - Data Normalization Migrations (`normalizationMigrations.ts`):
      - `normalize-workspace-metadata`: standardizes workspace hex colors and fallback icons while strictly preserving user-authored markdown, code blocks, prose, and custom vocabulary.
  - Read-Only Legacy Data Scanner (`src/features/migrations/services/legacyDataScanner.ts`):
    - Exhaustive, side-effect-free scanner classifying database health across all tables into `Compatible`, `Migratable`, `Recoverable`, `Unsupported`, and `Corrupted`.
    - Real-time detection of legacy widget configs, deprecated v1 layouts, orphan records, missing fields, and corrupted records.
  - Non-Destructive Legacy Data Repair Service (`src/features/migrations/services/legacyDataRepairService.ts`):
    - Safely heals orphan note collections, orphan bookmark groups, stale layout items, and missing entity defaults without deleting user data.
  - Accessible Migration Diagnostics UI (`src/features/migrations/components/MigrationDiagnosticsModal.tsx`):
    - Integrated modal with Real-time Database Health Scanner, Summary metric pills, Issue cards with severity badges (`info`, `warning`, `critical`), single/batch repair actions, and historical migration journal logs.
    - Wired into App Preferences under "Data Integrity & Backup".
  - Comprehensive Test Suite & Benchmarks:
    - 34 new tests across 8 test suites (registry, scanner, repair, engine, modal UI, historical schema upgrades v1 $\to$ v4, failure injection, scale benchmarks).
    - Benchmarked Small (100 entities in ~5 ms scan, ~28 ms repair), Medium (1,000 entities in ~8 ms scan, ~84 ms repair), Large Scale (10,000 entities in ~38 ms scan, ~209 ms repair).
    - Total project test suite elevated to **1,128 passing tests across 146 test files (100% pass rate)**.
  - Dual-Target Production Builds:
    - Chromium MV3 (1.25 MB) and Firefox MV2 (1.25 MB) compiled cleanly with 0 TypeScript compilation errors.

## [0.1.0-alpha.45] - 2026-11-08

### Added
- Phase 9 (Milestone 9.4) Merge Import & Non-Destructive Conflict Resolution:
  - Selective Merge Import Engine (`src/features/backup/services/mergeEngineService.ts`):
    - Non-destructive import adding records from Universal JSON Backups into target or newly created workspaces without clearing tables or deleting existing user data.
    - Single atomic Dexie read-write transaction covering all affected tables in dependency order with automatic abort on failure.
    - Verified post-merge data integrity ensuring default workspace uniqueness and boundary record presence.
  - Merge Planner & Read-Only Preview Service (`src/features/backup/services/mergePlannerService.ts`):
    - Inspects live database state, calculates incoming vs existing stats, generates deterministic plan tokens, and formulates conflicts with guaranteed 0 database writes.
    - Rejection of stale plans if database state changes between preview generation and commit.
  - Deterministic Entity Fingerprinting Engine (`src/features/backup/services/mergeFingerprintService.ts`):
    - Content-based, lowercase, whitespace-trimmed fingerprints for all 17 database entity tables to reliably differentiate exact duplicates from distinct items.
    - URL normalization removing protocol and host case-sensitivity and trailing slashes.
  - Deep Entity ID Remapping Engine (`src/features/backup/services/mergeIdRemappingService.ts`):
    - Re-keys colliding primary keys while preserving 1:1 mappings within an import operation.
    - Deeply updates all relational foreign keys (`workspaceId`, `collectionId`, `groupId`, `noteId`, `bookmarkId`, and layout compound keys).
  - Dependency Analysis Service (`src/features/backup/services/mergeDependencyService.ts`):
    - Evaluates inter-group dependencies (Dashboard $\leftrightarrow$ Workspaces, Notes $\leftrightarrow$ Collections, Bookmarks $\leftrightarrow$ Groups, Note-Bookmark Links).
  - Accessible Merge Import Modal UI (`src/features/backup/components/MergeImportModal.tsx`):
    - Integrated multi-step modal (Upload $\to$ Scope Selection $\to$ Conflict Review $\to$ Confirmation Summary $\to$ Progress/Results).
    - Supports bulk conflict actions ("Skip All Duplicates", "Import All as New Copies") and individual policy selection.
  - Targeted Verification Gate & Hardening:
    - Standardized `settings` data shape handling both object and array formats gracefully.
    - Added `rollback_in_progress` to `RestoreState` machine with startup recovery support.
    - Added lock lease renewal (`renewLock`) for heartbeat extension and stale lock safety.
  - Comprehensive Test Suite & Benchmarks:
    - Added 42 new tests across 8 test suites (fingerprinting, ID remapping, dependency analysis, planner, modal, data safety integration, performance benchmarks, and targeted verification gate).
    - Benchmarked Small (100 entities in ~15 ms apply), Medium (1,000 entities in ~80 ms apply), Large Scale (10,000 entities in ~910 ms apply).
    - Total project test suite elevated to **1,094 passing tests across 138 test files (100% pass rate)**.
  - Dual-Target Production Builds:
    - Chromium MV3 (1.21 MB) and Firefox MV2 (1.21 MB) compiled cleanly with 0 TypeScript errors.

## [0.1.0-alpha.44] - 2026-11-08

### Added
- Phase 9 (Milestone 9.3) Restore Engine & Transactional Recovery:
  - Transactional Restore Engine (`src/features/backup/services/restoreEngineService.ts`):
    - Atomic replacement of all 17 active database tables executed in a single Dexie read-write transaction with automatic rollback on failure.
    - Deterministic foreign-key dependency ordering: clears tables in reverse dependency order and inserts in dependency order.
    - Snapshot-before-mutation guarantee: captures and cryptographically verifies an immutable pre-restore snapshot in an independent persistent recovery database before clearing tables.
    - Post-restore verification integration: validates table counts, workspace containment, and active workspace validity before committing the restore state.
  - Restore Preflight Engine (`src/features/backup/services/restorePreflightService.ts`):
    - Full preflight check pipeline validating backup input using M9.2 validation engine.
    - Explicit rejection of partial backups (`isPartialBackup: true`) with typed error `PARTIAL_BACKUP_RESTORE_NOT_SUPPORTED`.
    - Verification of workspace invariants: ensures at least one valid workspace exists, exactly one default workspace is present, and settings `activeWorkspaceId` references an existing workspace.
    - Current database statistics inspection and cross-tab restore concurrency lock evaluation.
  - Decoupled Persistent Recovery Database (`src/features/backup/recovery/recoveryDatabase.ts`):
    - Dedicated IndexedDB database `nookspace-recovery-db` independent from `nookspace-database`.
    - `snapshots` table: stores JSON-serialized pre-restore payloads with SHA-256 integrity checksum, schema version, and per-table entity counts.
    - `journal` table: manages stateful restore lifecycle transitions (`pending` -> `snapshot_created` -> `restoring` -> `completed` / `failed` -> `rollback_completed` / `recovery_required`).
    - `locks` table: enforces cross-tab concurrency prevention with auto-expiring 30-second leases.
  - Idempotent Rollback Service (`src/features/backup/recovery/rollbackService.ts`):
    - Automatically restores original database state from the persistent snapshot if a transaction or post-restore verification check fails.
    - Snapshot integrity re-validation before applying rollback.
    - Fail-safe state handling: transitions journal to `recovery_required` if rollback itself encounters an unexpected failure, preserving the snapshot for manual recovery.
  - Startup Recovery Coordinator (`src/features/backup/recovery/startupRecoveryCoordinator.ts`):
    - Bootstrapped on application launch (`App.tsx`) to check for incomplete, interrupted, or crashed restore operations.
    - Safely cleans up stale locks, rolls back uncommitted restores, or alerts if user action is needed.
  - Post-Restore Verification (`src/features/backup/validation/restorePostVerification.ts`):
    - Post-transaction verification ensuring restored table counts match backup metadata.
    - Invariant checks: default workspace exists, settings active workspace references a valid workspace, widget instances and layouts reference existing workspaces, note collections match notes, and bookmarks reference valid groups without dangerous schemes (`javascript:`, `data:`).
  - Runtime Store Synchronization (`src/features/backup/utils/restoreRuntimeSync.ts`):
    - Evacuates and re-hydrates `useWorkspaceStore`, `useWidgetStore`, and `useLayoutStore` with restored data.
    - Dispatches cross-tab broadcast events notifying open tabs of the database restore.
  - Accessible Restore Modal UI (`src/features/backup/components/RestoreModal.tsx`):
    - File picker supporting `.json` backups with cross-environment `FileReader` / `text()` parsing.
    - Preflight inspection panel showing source metadata, entity count comparison, and warning badges.
    - Destructive action warning with mandatory explicit confirmation checkbox (`Restore and Replace Current Data`).
    - Multi-stage progress indicators (`validating`, `creating_snapshot`, `restoring_data`, `verifying`, `syncing`) and post-restore success summary.
  - Comprehensive Unit & Integration Test Suites:
    - Added 35 new dedicated tests across 7 test files (`recoveryDatabase.test.ts`, `restorePreflightService.test.ts`, `rollbackService.test.ts`, `startupRecoveryCoordinator.test.ts`, `RestoreModal.test.tsx`, `restoreDataSafetyIntegration.test.ts`, `restorePerformance.test.ts`).
    - Complete backup domain coverage: 18 test files, 130 passing tests.
    - Failure injection verification: tested table clear failures, insert failures, post-verification failures, simulated crash/power-kill scenarios, and secondary rollback failures.
    - Benchmarking: Small (~20 entities in ~100 ms), Medium (~150 entities in ~95 ms), Large (~600 entities in ~185 ms).
    - Total project test suite: **1,052 passing tests across 130 test files (100% pass rate)**.
  - Production Builds:
    - Chromium MV3 (1.18 MB) and Firefox MV2 (1.18 MB) compiled with 0 TypeScript errors.

## [0.1.0-alpha.43] - 2026-11-07

### Added
- Phase 9 (Milestone 9.2) Backup Validation & Version Upgrade Engine:
  - Untrusted Backup Validation Engine (`src/features/backup/services/backupValidationService.ts`):
    - Multi-stage pipeline validating untrusted backup files from strings, objects, Blobs, or Files.
    - Stage 1 Input Guard: Hard cap at 100 MB (`BACKUP_HARD_MAX_BYTES`), 25 MB warning threshold (`BACKUP_LARGE_SIZE_WARNING_BYTES`), empty string rejection, robust cross-environment Blob/File text reader (`Blob.text()`, `arrayBuffer()`, and `FileReader` fallback), and non-array root object verification.
    - Stage 2 & 3 Format & Version Detection: Detects canonical `nookspace-backup` (v1) and legacy `nookspace-bookmarks` (v1). Gracefully rejects unrecognized formats and future versions (`UNSUPPORTED_FUTURE_VERSION`) as `unsupported`.
    - Stage 4 In-Memory Version Upgrade: Seamlessly upgrades legacy format without disk mutations.
    - Stage 5 SHA-256 Checksum Verification: Recomputes canonical recursive key-sorted payload hash; flags `CHECKSUM_MISMATCH` or `CHECKSUM_MISSING` (with option `skipChecksumVerification`).
    - Stage 6 Entity Schema Validation: Enforces strict Zod schemas across all 17 database entity tables with bounded error collection (`maxErrors`, `maxWarnings`).
    - Stage 7 Cross-Reference & Domain Integrity: Evaluates workspace containment and relational consistency.
    - Stage 8 Metadata Item Counts: Checks consistency between declared metadata counts and actual data arrays, emitting warnings on discrepancies.
  - Cross-Reference & Domain Integrity Validator (`src/features/backup/validation/crossReferenceValidator.ts`):
    - Duplicate ID detection across all tables.
    - Orphan entity detection for widget instances, layouts, notes, collections, bookmarks, and groups referencing non-existent workspaces.
    - Cross-workspace isolation integrity checks: note to foreign collection, bookmark to foreign group, layout to foreign widget instance, and note-bookmark link across workspaces.
    - URL scheme security checks: flags unsafe or executable URL schemes (`javascript:`, `data:`, `vbscript:`) in bookmarks and study resources with `DANGEROUS_BOOKMARK_URL_SCHEME` and `DANGEROUS_RESOURCE_URL_SCHEME` errors.
  - Pure In-Memory Version Upgrade Engine (`src/features/backup/versioning/`):
    - `VersionUpgradeRegistry` (`versionRegistry.ts`) managing version adapters and format migrations.
    - `LegacyBookmarksAdapter` (`legacyBookmarksAdapter.ts`) upgrading Phase 6 `nookspace-bookmarks` v1 to canonical `NookSpaceUniversalBackupV1` with deterministic synthetic workspace (`ws-imported-bookmarks`, `Imported Bookmarks`), remapped group/bookmark associations, and freshly computed SHA-256 checksum.
    - Strict Immutability & Determinism: Proven zero-mutation on deep-frozen inputs; identical inputs yield byte-identical canonical backups.
  - Strict Database Safety Quality Gate (`tests/integration/backup/backupValidationReadOnlyIntegration.test.ts`):
    - Verified 100% read-only in memory: spies placed across all 17 tables and all Dexie write methods (`add`, `put`, `update`, `delete`, `bulkAdd`, `bulkPut`, `bulkDelete`, `clear`) confirmed 0 calls across all valid, corrupt, legacy, tampered, and cross-reference failure scenarios.
    - Verified exact before/after database state comparison confirms 0 mutations.
  - Comprehensive Test Suite & Benchmarks:
    - Added 50 new dedicated unit and integration tests across 5 test suites (`crossReferenceValidator.test.ts`, `versionUpgradeRegistry.test.ts`, `backupValidationService.test.ts`, `backupValidationReadOnlyIntegration.test.ts`, `backupValidationPipeline.test.ts`).
    - 93 total passing backup tests across 11 test suites.
    - Verified sub-second validation latency across Small (< 200 ms), Medium (< 350 ms), and Large 600+ entities (< 600 ms) datasets.
    - Elevated total project test suite to **1,015 passing tests across 123 test files (100% pass rate)**.
  - Dual-Target Production Builds:
    - Chromium MV3 (1.11 MB) and Firefox MV2 (1.11 MB) compile cleanly with 0 TypeScript errors.

## [0.1.0-alpha.42] - 2026-11-07

### Added
- Phase 9 (Milestone 9.1) Universal JSON Export Engine:
  - Implemented `BackupExportService` (`src/features/backup/services/backupExportService.ts`):
    - Full export across all 17 active database tables captured within a single Dexie readonly transaction (`db.transaction('r', ...)`).
    - READ-ONLY GUARANTEE: exact before/after database state comparison confirms 0 writes, 0 updates, 0 deletions, and 0 migrations triggered.
    - Deterministic sorting on exported copies (workspaces by order/id, instances by workspace/order/id, layouts by workspace/instance/breakpoint, etc.) without altering Dexie storage.
    - Metadata extraction: export timestamp, application version (with manifest fallback), database schema version, and per-table item counts.
    - Legacy layouts detection: emits informational warning for deprecated v1 `layouts` table while exporting modern responsive `widgetLayouts`.
    - Bookmark URL inspection: emits warnings for suspicious schemes while faithfully preserving original persisted data.
  - Universal Backup Envelope V1 (`src/features/backup/types/backupTypes.ts`):
    - Standardized `NookSpaceUniversalBackupV1` envelope (`format: 'nookspace-backup'`, `formatVersion: 1`).
    - Decoupled backup format versioning from internal Dexie schema version and application release version.
  - SHA-256 Integrity Engine (`src/features/backup/services/backupIntegrityService.ts`):
    - Web Crypto API (`crypto.subtle.digest('SHA-256', ...)`) implementation producing reproducible 64-character lowercase hex checksums.
    - Recursive key-sorted canonical JSON serialization (`canonicalJsonStringify`) excluding the checksum field itself.
    - Checksum verification utility (`verifyBackupChecksum`) asserting payload integrity.
  - Safe Serialization Engine (`src/features/backup/services/backupSerializationService.ts`):
    - Full support for Unicode, Vietnamese, Japanese, emoji, markdown, null, and undefined values.
    - Strict validation detecting BigInt, functions, symbols, NaN, Infinity, -Infinity, circular references, and unsupported non-plain objects, failing with descriptive `BackupSerializationError` rather than silent data loss.
  - Complete Zod Schema Coverage (`src/features/backup/schemas/`):
    - Created missing entity schemas for `StickyNoteEntity`, `VocabularyEntity`, `ResourceEntity`, `CalendarEventEntity`, `AppSettingsEntity`, `WidgetInstanceEntity`, and `WidgetLayoutEntity`.
    - Created root `NookSpaceUniversalBackupV1Schema` validating the entire backup envelope.
  - Browser File Download Utility (`src/features/backup/utils/downloadBackup.ts`):
    - Downloads `nookspace-backup-YYYY-MM-DD-HHMMSS.json` using Blob, Object URL, and temporary anchor with DOM and memory cleanup.
  - Comprehensive Test Suite:
    - Added 43 dedicated unit and integration tests across 6 test suites (`backupIntegrityService.test.ts`, `backupSerializationService.test.ts`, `backupV1Schema.test.ts`, `backupExportService.test.ts`, `downloadBackup.test.ts`, `backupPerformance.test.ts`).
    - Verified sub-second export performance across Small (104 KB in ~85 ms), Medium (1 MB in ~175 ms), and Large 10,000 entities (4.5 MB in ~600 ms) datasets.
    - Verified Phase 6 bookmark export/import remains 100% intact and functional (273 passing tests).
    - Elevated total project test suite to **965 passing tests across 118 test files (100% pass rate)**.
  - Dual-Target Production Builds:
    - Chromium MV3 (1.11 MB) and Firefox MV2 (1.11 MB) compile cleanly with 0 TypeScript errors.

## [0.1.0-alpha.41] - 2026-11-07

### Added
- Phase 8 (Milestone 8.7) Workspace & Preset UI Polish, Theme Support, Accessibility & Phase 8 Final Review:
  - Workspace Switcher Dropdown Polish & Keyboard Navigation (`src/components/ui/Dropdown.tsx`, `src/features/workspaces/components/WorkspaceSwitcher.tsx`):
    - Added full keyboard navigation (`ArrowDown`, `ArrowUp`, `Home`, `End`) across dropdown menu items.
    - Added `role="menu"`, `role="menuitemradio"` for checked items, `aria-haspopup="menu"`, `aria-expanded`, and focus restoration to the trigger on close.
    - Integrated responsive truncation (`max-w-[120px] sm:max-w-[150px] md:max-w-[180px]`) and high-contrast focus rings (`focus-visible:ring-2 focus-visible:ring-primary-500`).
  - Workspace Manager UI Polish (`src/features/workspaces/components/WorkspaceManagerModal.tsx`):
    - Added `aria-current="true"` on active workspace cards and distinct `Active` / `Default` badge styling.
    - Enhanced Move Up / Down reorder buttons with accessible labels (`Move <Workspace> up`/`down`) and boundary disabling.
    - Integrated safe delete confirmation modal preventing deletion of the sole remaining workspace with itemized scoped data loss warnings.
    - Integrated transparent duplication dialog detailing dashboard structure cloning while highlighting that notes, tasks, and bookmarks remain uncopied and isolated.
  - Preset Selection & Creation Flow Polish (`src/features/workspaces/components/WorkspaceFormModal.tsx`):
    - Tactile preset cards with `role="radio"`, `aria-checked`, description snippets, and widget count badges.
    - Pre-populates editable workspace name, icon, and accent color upon preset selection while preserving manual customizations.
    - Accessible mode switcher between "Starter Presets" and "Blank Workspace" with `aria-pressed`.
    - Input validation error association via `aria-invalid="true"` and `role="alert"`.
  - Color & Icon Pickers Keyboard Accessibility (`WorkspaceIconPicker.tsx`, `WorkspaceColorPicker.tsx`):
    - Added 4-way arrow key navigation (`ArrowRight`, `ArrowLeft`, `ArrowDown`, `ArrowUp`) across icons and swatches.
    - Accessible names for each swatch and icon option.
  - Modal Focus Trapping & Accessibility (`src/components/ui/Modal.tsx`):
    - Lightweight Tab / Shift+Tab keyboard focus trap inside dialog modals.
    - Automatic focus on first focusable element upon mount and active element focus restoration on unmount.
    - `prefers-reduced-motion` compliance via `motion-reduce:animate-none`.
  - Top Navigation Responsive Polish (`src/components/layout/TopNav.tsx`):
    - Responsive icon/text breakpoints (`hidden sm:inline` / `hidden md:inline`) for header action buttons on narrow screens.
    - Unified focus ring standards across all header triggers.
  - Theme Support & Contrast:
    - Consistent token mapping across Light, Dark, and System theme modes (`bg-surface-elevated`, `border-surface-border`, `text-content-primary`, `text-content-secondary`, `bg-brand-500`).
  - Phase 8 Final Review:
    - Completed full review across M8.1 through M8.7 with zero database migrations (retaining Dexie Version 4) and zero new npm dependencies.
    - Added 18 dedicated unit tests in `workspaceUIPolishAccessibility.test.tsx`.
    - Elevated project test suite to **922 passing tests across 112 test files (100% pass rate)**.
    - Clean production builds verified for Chromium MV3 (1.11 MB) and Firefox MV2 (1.11 MB).
    - Phase 8 Multiple Workspaces & Presets completed and sealed.

## [0.1.0-alpha.40] - 2026-11-07

### Added
- Phase 8 (Milestone 8.6) Cross-Feature Synchronization & Multi-Tab Isolation:
  - Canonical cross-tab workspace synchronization key: `STORAGE_KEY_ACTIVE_WORKSPACE_ID` (`nookspace_active_workspace_id`) in `src/types/workspaces.ts`.
  - Centralized `WorkspaceSyncService` (`src/features/workspaces/services/workspaceSyncService.ts`) and React `useWorkspaceSync` hook:
    - Listens to `browser.storage.onChanged` / `chrome.storage.onChanged` (and window `storage` events for non-extension fallback).
    - Ignores null, invalid, empty, or duplicate workspace IDs.
    - Validates target workspace existence in Dexie, automatically resolving fallback to default workspace if deleted in another tab.
    - Customization Studio protection: forcibly discards uncommitted drafts via `forceDiscardAndSwitchWorkspace(id)` on external switch, preventing layout snapshot leaks across workspaces.
    - Layout debounce protection: clears pending debounce timers via `clearPendingDebounce()`.
    - Updates workspace collection in memory and synchronizes active workspace without re-emitting storage events (`syncExternalActiveWorkspace`).
    - Immediately reloads dependent `widgetStore` and `layoutStore` instances.
  - Updated `useWorkspaceStore` (`src/stores/workspaceStore.ts`):
    - Added `syncExternalActiveWorkspace(id: string)` internal action for loopback-free external synchronization.
    - Broadcasts `STORAGE_KEY_ACTIVE_WORKSPACE_ID` to `browser.storage.local` upon `setActiveWorkspace`, `createWorkspace`, `createWorkspaceFromPreset`, and `deleteWorkspace`.
  - Wired `useWorkspaceSync` into New Tab entrypoint (`entrypoints/newtab/App.tsx`) for automatic multi-tab synchronization.
  - Pomodoro Workspace Attribution & Ownership:
    - Extended `startTimer` in `src/features/pomodoro/pomodoroStore.ts` with optional `workspaceId?: string`.
    - Updated `PomodoroWidgetComponent` in `src/widgets/PomodoroWidget.tsx` to pass `workspaceId` into `startTimer`.
    - Verified background `PomodoroCoordinator` and `stateMachine` retain session workspace attribution through alarms and outbox drain to Dexie `focusSessions`, ensuring focus time is strictly credited to the originating workspace regardless of cross-tab switches.
  - Added 14 comprehensive unit and integration tests across 3 test suites:
    - `workspaceSyncService.test.ts` (7 tests): validation, existence checks, fallback resolution, draft discarding, debounce clearance, listener registration/cleanup.
    - `workspaceCrossTabSync.test.ts` (4 tests): multi-tab switch without reload, cross-tab creation/deletion synchronization, and pending debounced save cancellation.
    - `pomodoroWorkspaceAttribution.test.tsx` (3 tests): background attribution retention across workspace switches, UI prop propagation, and break cycle preservation.
  - Elevated overall test suite to **904 passing tests across 111 test files (100% pass rate)**.
  - Verified TypeScript strict compilation (`npm run compile` — 0 errors).
  - Multi-target production builds verified: Chromium MV3 (1.10 MB) and Firefox MV2 (1.10 MB).

## [0.1.0-alpha.39] - 2026-11-07

### Added
- Phase 8 (Milestone 8.5) Preset Application Engine & Workspace Creation Flow:
  - Implemented `PresetApplicationService` (`src/features/workspaces/services/presetApplicationService.ts`):
    - Input schema validation via `CreateWorkspaceFromPresetInputSchema` with trim, length (1–50 chars), icon, and hex color validation.
    - Preset resolution & validation against `WorkspacePresetSchema` and widget existence verification against `WidgetRegistry`.
    - Generates fresh, uniquely prefixed IDs (`ws-...` and `wi-...`) and deep-clones widget configurations to guarantee full runtime mutability and preset immutability.
    - Responsive layout conversion across all 5 standard breakpoints (`lg`, `md`, `sm`, `xs`, `xxs`) with repository validation (`WidgetLayoutInputSchema`).
    - Atomic persistence within a single Dexie read-write transaction `[workspaces, widgetInstances, widgetLayouts]` guaranteeing 100% rollback on failure with zero orphan records.
    - Zero user domain data creation or duplication (zero notes, bookmarks, todos, goals, or focus sessions created).
  - Integrated with `useWorkspaceStore` (`src/stores/workspaceStore.ts`):
    - Added `createWorkspaceFromPreset` action with dependency injection support (`presetService`).
    - Refreshes workspace collection from repository upon successful transaction, updates `activeWorkspaceId`, and syncs with global settings.
    - Preserves previous active workspace and error state on failure with clean recovery via `clearError`.
  - Enhanced Workspace Creation UI in `WorkspaceFormModal.tsx`:
    - Added dual creation mode support: "Starter Presets" and "Blank Workspace".
    - Rich preset card selection displaying preset icon, name, category, widget count badge, description, and key highlight snippet.
    - Auto-populates workspace name, icon, and accent color upon preset selection while allowing full user customization before submission.
    - Seamlessly preserved the legacy Blank Workspace creation flow.
    - Integrated with `WorkspaceManagerModal.tsx` and `TopNav.tsx`.
  - Added 24 dedicated unit and integration tests across 5 test suites:
    - `presetApplicationService.test.ts` (8 tests): resolution, validation, fresh IDs, deep-cloned configs, 5-breakpoint layout conversion.
    - `presetApplicationTransaction.test.ts` (4 tests): atomic persistence and full rollback under failure injection on workspaces, instances, or layouts.
    - `presetWorkspaceStore.test.ts` (3 tests): store actions, state transitions, active workspace switching, failure recovery, blank workspace coexistence.
    - `presetWorkspaceCreation.test.ts` (4 tests): end-to-end integration for all 4 presets (Minimalist, Deep Study, Developer, Full Studio) verifying 100% layout bounds and zero collisions.
    - `presetDataIsolation.test.ts` (2 tests): user domain data isolation and multi-instance independence.
    - Extended `workspaceFormModal.test.tsx` with 3 new UI tests (8 tests total).
  - Elevated overall test suite to **890 passing tests across 108 test files (100% pass rate)**.
  - Multi-target production builds verified: Chromium MV3 (1.10 MB) and Firefox MV2 (1.10 MB).

## [0.1.0-alpha.38] - 2026-11-07

### Added
- Phase 8 (Milestone 8.4) Built-in Workspace Preset Definitions:
  - Formulated type definitions and Zod validation schemas (`src/features/workspaces/presets/types.ts` & `src/features/workspaces/presets/presetSchema.ts`):
    - `PresetBreakpointLayoutSchema`: validates integer bounds `x >= 0, y >= 0, w >= 1, h >= 1`, optional min/max dimensions with consistency constraints (`maxW >= minW`, `maxH >= minH`).
    - `PresetWidgetDefinitionSchema`: validates widget type, configuration dictionary, and responsive coordinates across all 5 standard breakpoints (`lg`, `md`, `sm`, `xs`, `xxs`) against maximum column limits (`BREAKPOINT_COLUMNS`).
    - `WorkspacePresetSchema`: validates preset identity (`id` formatted as lowercase alphanumeric with hyphens), positive integer version, name (1–50 chars), description (1–250 chars), category enum (`personal`, `study`, `development`, `productivity`), registered icon check (`WORKSPACE_ICONS`), nullable hex color code (`WorkspaceColorSchema`), preview highlights, widget definition list, and geometric 2D collision detection across all widgets for every breakpoint grid.
  - Implemented 4 static, type-safe, built-in Workspace Presets (`src/features/workspaces/presets/definitions/`):
    - **Minimalist** (`minimalist.ts`): Category `personal`, Icon `Home`, Color `null`. Clean, distraction-free starter space containing `greeting`, `clock`, `quick-links`, and `todo` with balanced 2-row layout on desktop and fluid single-column collapse on mobile.
    - **Deep Study** (`deepStudy.ts`): Category `study`, Icon `GraduationCap`, Color `#10b981` (Emerald). Study & revision environment featuring `greeting`, `clock`, `pomodoro`, `daily-goals`, `study-tracker`, `todo`, and `notes`.
    - **Developer** (`developer.ts`): Category `development`, Icon `Code`, Color `#8b5cf6` (Violet). Software engineering environment featuring `clock` (24h), `quick-links`, `smart-bookmarks`, `notes`, `todo`, and `calendar-overview`.
    - **Full Studio** (`fullStudio.ts`): Category `productivity`, Icon `Sparkles`, Color `#6366f1` (Indigo). Comprehensive 10-widget command center featuring `greeting`, `clock`, `quick-links`, `pomodoro`, `daily-goals`, `study-tracker`, `todo`, `calendar-overview`, `smart-bookmarks`, and `notes`.
  - Implemented In-Memory Preset Registry (`src/features/workspaces/presets/presetRegistry.ts`):
    - Deep-freezes preset objects and child structures guaranteeing complete runtime immutability.
    - Exposes lookup and validation utilities: `getAllPresets`, `getPresetById`, `getPresetsByCategory`, `isPresetId`, and `validatePreset`.
  - Exported presets via unified barrels `src/features/workspaces/presets/index.ts` and `src/features/workspaces/index.ts`.
  - Added 34 dedicated unit tests across 4 new test suites (`tests/unit/workspaces/presets/`):
    - `presetSchema.test.ts` (15 tests): coordinate validation, column boundary enforcement, icon validation, color hex validation, overlap detection, and safe error formatting.
    - `presetRegistry.test.ts` (7 tests): exact 4 presets registered, unique IDs, category filtering, ID lookups, immutability, and schema validation.
    - `presetDefinitions.test.ts` (8 tests): widget counts, metadata integrity, zero `workspaceId` / generated instance IDs, zero personal user data, and widget registry presence.
    - `presetLayoutValidation.test.ts` (4 tests): 5-breakpoint coordinate completeness, column bounds checks (`x + w <= maxCols`), zero geometric collisions across all presets, and minW/minH compliance.
  - Elevated overall test suite to **866 passing tests across 103 test files (100% pass rate)**.
  - Multi-target production builds verified: Chromium MV3 (1.09 MB) and Firefox MV2 (1.09 MB).

## [0.1.0-alpha.37] - 2026-11-07

### Added
- Phase 8 (Milestone 8.3) Multi-Workspace Dashboard Isolation & Dynamic Seeding:
  - Hardened Widget State Store (`src/stores/widgetStore.ts`) with `activeWorkspaceId` tracking, generational `latestRequestId` counter, immediate state isolation on workspace transitions eliminating stale widget flash, and dependency injection support via `createWidgetStore`.
  - Hardened Layout State Store (`src/stores/layoutStore.ts`) with `activeWorkspaceId` tracking, generational `latestRequestId` counter, immediate layout clearing on workspace transitions, snapshot-based debounced save with strict workspace ownership validation, and automatic pending timer clearance on workspace switch.
  - Added strict runtime workspace validation in `WidgetInstanceRepository` (`updateConfig`, `toggleEnabled`, `delete`) and `LayoutRepository` (`saveLayouts`) preventing cross-workspace mutation vulnerabilities with descriptive `Security Violation` exceptions.
  - Enhanced Study Tracker store (`src/features/study-tracker/studyTrackerStore.ts`) with generational request ID guard eliminating stale query race conditions.
  - Normalized `App.tsx` layout loading effect: removed restrictive `instances.length > 0` guard so empty workspaces and workspaces whose widgets were removed cleanly evaluate 0 layouts and render the pristine `EmptyState`.
  - Audited and verified first-installation seed behavior and dynamic blank workspace creation: newly created workspaces start completely empty (0 widgets, 0 layouts), initialize without hardcoded workspace IDs, and allow adding and persisting widgets from scratch.
  - Implemented 36 comprehensive integration tests across 6 dedicated test suites in `tests/integration/workspaces/`:
    - `workspaceDashboardIsolation.test.ts` (9 tests): workspace widget instance isolation, empty workspace zero instances, bidirectional switching without data bleed, configuration isolation, deletion isolation, and security violation exceptions.
    - `workspaceLayoutIsolation.test.ts` (9 tests): layout isolation across all 5 responsive breakpoints (`lg`, `md`, `sm`, `xs`, `xxs`), movement/resizing persistence isolation, empty workspace zero layout records, pending debounce cancellation, and Customization Studio snapshot rollback.
    - `workspaceDynamicSeeding.test.ts` (6 tests): default workspace vs blank workspace initial state, idempotency of initial database seeding, first widget addition in empty workspace, and layout generation for blank workspaces.
    - `workspaceSwitchRaceConditions.test.ts` (4 tests): stale async response rejection, pending debounce cancellation, rapid A $\to$ B $\to$ C switching convergence, and simulated failure isolation.
    - `workspaceDomainIsolation.test.ts` (5 tests): multi-workspace isolation across Todos, Focus Sessions, Daily Goals, Smart Bookmarks, Bookmark Groups, Notes, Collections, Tags, and Bookmark ↔ Note junction links.
    - `workspaceCrossTabIsolation.test.ts` (3 tests): zero sensitive domain content in cross-tab numeric timestamp signals, workspace-specific query reloading, and per-tab active workspace coherence.
  - Elevated overall test suite to **832 passing tests across 99 test files (100% pass rate)**.
  - Multi-target production builds verified: Chromium MV3 (1.08 MB) and Firefox MV2 (1.08 MB).

## [0.1.0-alpha.36] - 2026-11-07

### Added
- Phase 8 (Milestone 8.2) Workspace Switcher & Management UI:
  - Curated, type-safe Lucide icon selector (`WorkspaceIconPicker.tsx`) offering 18 accessible workspace icons (`LayoutGrid`, `Home`, `Briefcase`, `GraduationCap`, `BookOpen`, `Code`, `Laptop`, `Terminal`, `Coffee`, `Palette`, `Lightbulb`, `Folder`, `Rocket`, `Target`, `Sparkles`, `Globe`, `Gamepad2`, `Calendar`) with `getWorkspaceIcon` fallback resolver.
  - Curated 10-swatch workspace color picker (`WorkspaceColorPicker.tsx`) with high-contrast accessibility badges, checkmark selection indicators, and default clear action.
  - Cascade deletion confirmation dialog (`WorkspaceDeleteDialog.tsx`) with detailed itemized impact warnings (widgets, layouts, notes, collections, tags, bookmark links, bookmarks, folders, todos, goals, focus sessions), sole-workspace deletion prevention (`count <= 1`), and active workspace fallback notification.
  - Safe workspace duplication confirmation dialog (`WorkspaceDuplicateDialog.tsx`) detailing dashboard layout & widget duplication while guaranteeing live user content (notes, bookmarks, tasks) remains uncopied and isolated.
  - Dual-mode workspace form modal (`WorkspaceFormModal.tsx`) for Create and Edit workflows with strict input validation (1–50 characters, trimmed, required), live character count, icon picker, and color picker.
  - Comprehensive Workspace Manager modal (`WorkspaceManagerModal.tsx`) providing an overview of all workspaces ordered by `order`, active and default badges, boundary-safe up/down reordering controls, edit modal triggers, duplicate dialog triggers, delete dialog triggers, and integrated child dialog state management.
  - Polished Workspace Switcher trigger and dropdown (`WorkspaceSwitcher.tsx`) integrated directly into `TopNav.tsx` displaying the active workspace's icon, color, and name, with active item checkmarks, single-click workspace switching, `customizationStore.requestWorkspaceSwitch` dirty-state protection, and shortcuts to Create and Manage workspaces.
  - Unified barrel export in `src/features/workspaces/index.ts`.
  - Added 26 dedicated unit tests across 5 new test suites: `workspacePickers.test.tsx` (4 tests), `workspaceDialogs.test.tsx` (4 tests), `workspaceSwitcher.test.tsx` (5 tests), `workspaceFormModal.test.tsx` (5 tests), and `workspaceManagerModal.test.tsx` (8 tests).
  - Elevated overall test suite to **796 passing tests across 93 test files (100% pass rate)**.
  - Multi-target production builds verified: Chromium MV3 (1.08 MB) and Firefox MV2 (1.08 MB).

## [0.1.0-alpha.35] - 2026-11-07

### Added
- Phase 8 (Milestone 8.1) Workspace Domain & Data Architecture:
  - Formalized reusable Zod domain schemas and TypeScript interfaces in `src/types/workspaces.ts`: `WorkspaceSchema`, `CreateWorkspaceInputSchema`, `UpdateWorkspaceInputSchema`, and `WorkspaceColorSchema`.
  - Re-exported `WorkspaceEntity` in `src/types/database.ts` ensuring clean circular-free backward compatibility across the codebase.
  - Enhanced `WorkspaceRepository` (`src/services/database/repositories/workspaceRepository.ts`):
    - `update(id, updates)`: Input validation with `UpdateWorkspaceInputSchema`, entity existence verification, strict immutable field protection (`id`, `createdAt`, `isDefault`), and `updatedAt` update.
    - `reorder(orderedIds)`: Transactional reordering requiring complete permutation of all workspace IDs without duplicates, deterministic order indexing starting from 0, and atomic Dexie commit.
    - `delete(id)`: Safe cascade deletion across all 15 workspace-scoped tables (`widgetInstances`, `widgetLayouts`, `notes`, `noteCollections`, `noteTags`, `noteBookmarkLinks`, `bookmarks`, `bookmarkGroups`, `todos`, `focusSessions`, `dailyGoals`, `calendarEvents`, `stickyNotes`, `vocabulary`, `resources`) within a single atomic Dexie read-write transaction with rollback on failure, fallback default promotion, and settings synchronization.
    - `duplicate(id)`: Atomic duplication of dashboard structure ONLY (workspace metadata, new instance IDs with deep-copied configs, and remapped widget layouts across all 5 breakpoints) leaving live user data uncopied.
  - Enhanced `useWorkspaceStore` (`src/stores/workspaceStore.ts`): added `updateWorkspace`, `reorderWorkspaces`, and `duplicateWorkspace` actions with dependency injection support and state rollback on repository errors.
  - Added 49 dedicated unit tests across 3 new test suites: `workspaceSchema.test.ts` (20 tests), `workspaceRepository.test.ts` (19 tests), and `workspaceStore.test.ts` (10 tests).
  - Elevated overall test suite to **770 passing tests across 88 test files (100% pass rate)**.
  - Multi-target production builds verified: Chromium MV3 (1.06 MB) and Firefox MV2 (1.06 MB).

## [0.1.0-alpha.34] - 2026-11-07

### Added
- Phase 7 (Milestone 7.8) Suite Integration, Performance Audit & Final Review:
  - Comprehensive source code audit covering all Phase 7 subsystems (M7.1 through M7.7): Domain Models & Zod Schemas, Repositories & Dexie v4 Data Layer, Zustand State Store & Local Search Engine, Markdown AST Renderer & Editor, 3-Panel Notes Manager UI, Bidirectional Bookmark ↔ Note Linking, and Dashboard Notes Widget.
  - Implemented end-to-end integration test suite (`tests/unit/notes/noteSuiteIntegration.test.tsx`) validating 10 critical operational scenarios:
    1. Complete Note Lifecycle (Create $\to$ Edit $\to$ Search $\to$ Pin $\to$ Favorite $\to$ Archive $\to$ Unarchive $\to$ Delete).
    2. Collection Lifecycle & Cascade Integrity (Create $\to$ Assign $\to$ Rename $\to$ Cascade Reassign vs Cascade Delete).
    3. Tag Lifecycle & Dynamic Propagation (Create $\to$ Attach $\to$ Filter $\to$ Rename with cascade $\to$ Delete).
    4. Bookmark ↔ Note Bidirectional Integration (Create Note from Bookmark $\to$ Query bidirectional links $\to$ Non-destructive unlink $\to$ Cascade on delete).
    5. Legacy Quick Notes Migration (Seed legacy scratchpad $\to$ Atomic migration $\to$ Idempotency re-run $\to$ Note retrieval & editing).
    6. Dashboard Notes Widget Integration (Recent/Pinned/Favorites modes, density configurations, quick create, and `EVENT_OPEN_NOTES_MANAGER` navigation).
    7. Strict Workspace Isolation (Zero data leakage between independent workspaces).
    8. Cross-Tab Synchronization (`STORAGE_KEY_NOTES_LAST_UPDATED_AT` live refresh via browser extension storage event).
    9. Failure Handling & Defensive Validation Recovery (Zod boundary validation, simulated repository errors, and error recovery).
    10. Performance Benchmark Metrics (Sub-second processing of 100, 1,000, and 5,000 note datasets: search < 300ms, filter/sort < 150ms, multi-token AND search on 5k items < 1,000ms, excerpt generation on 5k items < 1,500ms).
  - Security and privacy audit confirmed 100% offline local IndexedDB operation, zero network requests, zero telemetry, zero arbitrary HTML execution, and pure AST-based Markdown rendering.
  - Elevated overall test suite to **721 passing tests across 85 test files (100% pass rate)**.
  - Multi-target production builds verified: Chromium MV3 (1.05 MB) and Firefox MV2 (1.05 MB).
  - Formally sealed and completed Phase 7: Notes & Knowledge System.

## [0.1.0-alpha.33] - 2026-11-07

### Added
- Phase 7 (Milestone 7.7) Notes Dashboard Widget & Dashboard Integration:
  - Implemented modular `NotesWidget` (`src/widgets/NotesWidget.tsx`) registered under `type: 'notes'` in `widgetRegistry`, seamlessly integrating the Notes & Knowledge system directly into the New Tab dashboard.
  - Multi-mode display engine supporting Recent notes (ordered by `updatedAt` desc), Pinned notes, Favorite notes, and Collection notes (with Uncategorized notes support and collection inheritance during quick-create).
  - Rich widget configuration interface (`NotesWidgetSettings`) with display mode selector, collection dropdown, maximum displayed notes slider (3, 5, 8, 10), excerpt preview toggle, collection label badge toggle, comfortable vs compact density, and quick-create button toggle.
  - Quick note creation bridge in widget header allowing one-click note creation with active collection inheritance and auto-navigation to Notes Manager.
  - One-click navigation opening the requested note directly in Notes Manager via `nookspace:open-notes-manager` custom event and typed `openNotesManager` helper in `src/features/notes/index.ts`.
  - Full backward compatibility for existing `quick-notes` instances (renamed in library to `'Quick Scratchpad'` to eliminate duplication) with zero breaking changes or data loss.
  - Dedicated unit and integration test suite (`tests/unit/widgets/NotesWidget.test.tsx`) covering 23 comprehensive tests (registration, modes, options, interactions, empty/loading/error states, workspace isolation, cross-tab storage sync, and settings modal).
  - Elevated overall test suite to 711 passing tests across 84 test files (100% pass rate).
  - Multi-target production builds verified: Chromium MV3 (1.05 MB) and Firefox MV2 (1.05 MB).

## [0.1.0-alpha.32] - 2026-11-07

### Added
- Phase 7 (Milestone 7.6) Bookmark ↔ Note Linking:
  - Implemented bidirectional linking between Notes and Smart Bookmarks backed by `NoteBookmarkLinkRepository` and Dexie Version 4 `noteBookmarkLinks` compound index table.
  - Implemented `LinkedBookmarksSection` (`src/features/notes/components/LinkedBookmarksSection.tsx`) embedded within `NoteEditor.tsx`, showcasing Google S2 favicons, domain subtitles, one-click safe external navigation via `isSafeBookmarkUrl`, and non-destructive unlinking.
  - Implemented searchable `LinkBookmarkModal` (`src/features/notes/components/LinkBookmarkModal.tsx`) allowing users to search, filter by folder or query, and link/unlink bookmarks from the active workspace.
  - Enhanced `useNoteStore` with `linkedBookmarks`, `loadLinkedBookmarks`, `linkBookmark`, `unlinkBookmark`, and `createNoteFromBookmark` actions with cross-tab live synchronization.
  - Implemented "Create Note from Bookmark" shortcut in `BookmarkItem.tsx` and `BookmarkManagerModal.tsx` prefilling note title and URL references, creating the junction link transactionally, and auto-navigating to the newly created note via `nookspace:open-notes-manager` event.
  - Added linked notes count pill badge to `BookmarkItem.tsx` when a bookmark has associated notes.
  - Enhanced `BookmarkRepository.delete` and `NoteRepository.delete` to cascade clean junction links while guaranteeing non-destructive link unlinking.
  - Added comprehensive unit and integration test suite (`tests/unit/notes/noteBookmarkLinkUI.test.tsx`) covering 12 dedicated tests across modals, sections, store actions, shortcuts, and cascade integrity.
  - Elevated overall test suite to 687 passing tests across 83 test files (100% pass rate).
  - Multi-target production builds verified: Chromium MV3 (1.04 MB) and Firefox MV2 (1.04 MB).

## [0.1.0-alpha.31] - 2026-11-07

### Added
- Phase 7 (Milestone 7.5) Collections, Tags & Notes Manager UI:
  - Implemented responsive three-panel Notes Manager modal (`src/features/notes/components/NotesManagerModal.tsx`) providing an integrated interface for note browsing, collection organization, tag filtering, and live Markdown editing.
  - Implemented Sidebar (`src/features/notes/components/NotesSidebar.tsx`) with system views (All Notes, Pinned, Favorites, Uncategorized, Archived), collection management (create, rename, delete with mode selection), and tag management (create, rename, delete) displaying live badge counts.
  - Implemented searchable and filterable Note List (`src/features/notes/components/NotesNoteList.tsx`, `NotesNoteListItem.tsx`) with real-time tokenized search, sorting (Last Modified, Created, Title, Custom Order), pin/favorite/archive quick action buttons, tag pills, and empty/no-results states.
  - Implemented collection and tag management dialogs (`src/features/notes/components/NotesDialogs.tsx`) supporting non-destructive deletion with explicit mode choice (`reassign` notes to Uncategorized vs permanent `cascade` deletion).
  - Implemented legacy Quick Notes migration engine (`src/services/database/migrations/legacyQuickNotesMigration.ts`) with coordinator concurrency lock (`ensureQuickNotesMigration`) ensuring non-destructive, idempotent migration of legacy scratchpad widget contents into `db.notes`.
  - Added dedicated Notes entry point to `TopNav.tsx` and `AppShell.tsx` with `FileText` icon, tooltip, and Escape key dismissal hierarchy.
  - Added comprehensive unit and integration test suites: `tests/unit/notes/NotesSidebar.test.tsx` (4 tests), `tests/unit/notes/NotesNoteList.test.tsx` (4 tests), `tests/unit/notes/NotesDialogs.test.tsx` (4 tests), `tests/unit/notes/NotesManagerModal.test.tsx` (5 tests), `tests/unit/notes/TopNavNotesIntegration.test.tsx` (1 test), and `tests/unit/migrations/legacyQuickNotesMigration.test.ts` (4 tests), reaching 111 note domain and migration tests.
  - Elevated overall test suite to 675 passing tests across 82 test files (100% pass rate).
  - Multi-target production builds verified: Chromium MV3 (1.02 MB) and Firefox MV2 (1.02 MB).

## [0.1.0-alpha.30] - 2026-11-07

### Added
- Phase 7 (Milestone 7.4) Markdown Editor, Sanitization & Note Detail View:
  - Implemented secure, zero-dependency AST Markdown preview component (`src/features/notes/components/MarkdownRenderer.tsx`) generating native React VDOM elements without `dangerouslySetInnerHTML`. Supports headers (h1-h6), blockquotes, code blocks with syntax badge and copy button, inline styles (bold, italic, strikethrough, inline code), task lists with interactive toggle callback, markdown tables, horizontal rules, and strict URL allowlisting (`isSafeBookmarkUrl`) neutralizing unsafe schemes (`javascript:`, `data:`).
  - Implemented Markdown formatting toolbar (`src/features/notes/components/MarkdownToolbar.tsx`) and full Note Editor (`src/features/notes/components/NoteEditor.tsx`) with Split, Edit-only, and Preview-only view modes, keyboard shortcuts (Ctrl+B bold, Ctrl+I italic, Tab 2-space indentation), auto list continuation on Enter (`- `, `* `, `1. `, `- [ ] `), debounced auto-saving, word and character counters, and collection/tag/status metadata controls.
  - Implemented connected Note Detail View (`src/features/notes/components/NoteDetailView.tsx`) with empty state and store integration.
  - Added barrel exports in `src/features/notes/components/index.ts`.
  - Added dedicated unit test suites: `tests/unit/notes/MarkdownRenderer.test.tsx` (8 tests) and `tests/unit/notes/NoteEditor.test.tsx` (5 tests), reaching 89 note domain tests.
  - Elevated overall test suite to 653 passing tests across 76 test files (100% pass rate).
  - Multi-target production builds verified: Chromium MV3 (931.05 kB) and Firefox MV2 (931.14 kB).

## [0.1.0-alpha.29] - 2026-11-07

### Added
- Phase 7 (Milestone 7.3) Notes State Store, Search Engine & Organization Services:
  - Implemented local in-memory search engine (`src/features/notes/services/noteSearchService.ts`) with multi-token AND matching across note title, excerpt, content, and tags, multi-tier relevance scoring (exact title match > title prefix > token substring > tags > excerpt > content), tag filtering, view filtering (All, Pinned, Favorites, Uncategorized, Archived, Collection, Tag), and multi-criteria deterministic sorting.
  - Implemented centralized Zustand note store (`src/features/notes/stores/noteStore.ts`) with request token race-condition protection (`latestRequestId`), cross-tab synchronization listening to `STORAGE_KEY_NOTES_LAST_UPDATED_AT`, full CRUD mutations for notes, collections, and tags, state toggle helpers (`togglePin`, `toggleFavorite`, `toggleArchive`), and reactive filtered note selector (`getFilteredNotes`).
  - Added dedicated unit test suites: `tests/unit/notes/noteSearchService.test.ts` (8 tests) and `tests/unit/notes/noteStore.test.ts` (7 tests), reaching 76 note domain tests.
  - Elevated overall test suite to 640 passing tests across 74 test files (100% pass rate).
  - Multi-target production builds verified: Chromium MV3 (922.81 kB) and Firefox MV2 (922.9 kB).

## [0.1.0-alpha.28] - 2026-11-07

### Added
- Phase 7 (Milestone 7.2) Notes Repositories & Data Layer:
  - Implemented `NoteCollectionRepository` (`src/features/notes/repositories/noteCollectionRepository.ts`) managing note collections with atomic auto-increment ordering, workspace isolation, dual deletion modes (`reassign` fallback setting notes to Uncategorized vs `cascade` deletion with link cleanup), and atomic array reordering.
  - Implemented `NoteTagRepository` (`src/features/notes/repositories/noteTagRepository.ts`) managing normalized tags with workspace uniqueness guarantees, auto-cascading tag renames across all notes in the workspace, and safe tag deletion cleanup.
  - Implemented `NoteBookmarkLinkRepository` (`src/features/notes/repositories/noteBookmarkLinkRepository.ts`) managing bidirectional junction links between notes and bookmarks with strict existence checks and entity retrieval helpers.
  - Implemented `NoteRepository` (`src/features/notes/repositories/noteRepository.ts`) providing unified operations for notes: auto plain-text excerpt generation, collection verification, deterministic multi-criteria sorting (pinned first, sequential order, updatedAt desc), system filtering (collections, pinned, favorites, archived, tags), atomic reordering, and state toggle helpers.
  - Added barrel exports in `src/features/notes/repositories/index.ts`.
  - Added comprehensive unit test suites: `tests/unit/notes/noteCollectionRepository.test.ts` (7 tests), `tests/unit/notes/noteTagRepository.test.ts` (6 tests), `tests/unit/notes/noteBookmarkLinkRepository.test.ts` (4 tests), and `tests/unit/notes/noteRepository.test.ts` (9 tests), reaching 61 note domain tests.
  - Elevated overall test suite to 625 passing tests across 72 test files (100% pass rate).
  - Multi-target production builds verified: Chromium MV3 (922.81 kB) and Firefox MV2 (922.9 kB).

## [0.1.0-alpha.27] - 2026-11-07

### Added
- Phase 7 (Milestone 7.1) Domain Models, Zod Schemas & Database Migration (Dexie v4):
  - Defined comprehensive domain models, TypeScript interfaces, and runtime Zod validation schemas in `src/types/notes.ts` for Notes (`NoteEntity`, `NoteSchema`), Note Collections (`NoteCollectionEntity`, `NoteCollectionSchema`), Normalized Tags (`NoteTagEntity`, `NoteTagSchema`), and Note-Bookmark Junction Links (`NoteBookmarkLinkEntity`, `NoteBookmarkLinkSchema`).
  - Added strict creation and update input validation schemas with string trimming, bounds enforcement, Lucide icon regex matching, hex color validation, and non-negative integer ordering.
  - Implemented `generateExcerpt` utility parsing and stripping Markdown syntax (headers, bold/italic, code blocks, lists, blockquotes, links, images) to produce clean plain-text excerpts up to 300 characters without markdown AST overhead.
  - Upgraded Dexie database schema to Version 4 in `src/services/database/db.ts` with compound and multi-entry indexes (`[workspaceId+collectionId]`, `[noteId+bookmarkId]`, `*tags`), table properties (`noteCollections`, `noteTags`, `noteBookmarkLinks`), and safe automated migration backfilling legacy notes with default values.
  - Added dedicated unit test suites: `tests/unit/notes/noteSchema.test.ts` (16 tests), `tests/unit/notes/noteCollectionSchema.test.ts` (8 tests), `tests/unit/notes/noteTagSchema.test.ts` (6 tests), `tests/unit/notes/noteBookmarkLinkSchema.test.ts` (5 tests), and `tests/unit/migrations/noteVersion4Migration.test.ts` (3 tests).
  - Elevated full test suite to 599 passing tests across 68 test files (100% pass rate).
  - Verified dual cross-browser production builds: Chromium MV3 (922.81 kB) and Firefox MV2 (922.9 kB).

## [0.1.0-alpha.26] - 2026-11-07

### Added
- Phase 6 (Milestone 6.8) Suite Integration, Performance Audit & Final Review:
  - Full source code audit of Phase 6 Smart Bookmarks (M6.1–M6.7) validating end-to-end Zod schemas, URL security allowlisting, Dexie Version 3 schema compound indexing, transactional safe deletion, store hydration, search ranking, and multi-instance widget isolation.
  - Implemented comprehensive End-to-End Suite Integration test suite (`tests/unit/bookmarks/bookmarkSuiteIntegration.test.tsx`) covering 10 real-world scenarios: Create & Display, Search & Filtering, Bookmark Movement & Dual-Mode Folder Deletion, Strict Workspace Isolation, Cross-Tab Storage Synchronization, Netscape HTML Round Trip, JSON Backup/Restore Round Trip, Duplicate Handling Policies (`skip`, `import`, `update`), Simulated Mid-Transaction Rollback Recovery (Merge & Replace), and Multi-Instance Widget Fallback.
  - Optimized `executeImportTransaction` to emit `notifyBookmarksUpdated()` strictly after the Dexie multi-table transaction commits, guaranteeing zero external signaling on aborted transactions.
  - Completed Performance Audit verifying sub-second responsiveness across synthetic datasets of 100, 1,000, and 5,000 bookmarks: multi-token search < 100ms, filter/sort < 50ms, JSON serialization < 150ms, and complete JSON schema validation < 1,000ms.
  - Elevated test suite to 273 bookmark domain tests and 561 total passing tests across 63 test suites (100% pass rate).
  - Multi-target production builds verified: Chromium MV3 (920.16 kB) and Firefox MV2 (920.25 kB).
  - Phase 6 (Smart Bookmarks) formally completed, verified, and sealed.

## [0.1.0-alpha.25] - 2026-11-07

### Added
- Phase 6 (Milestone 6.7) Netscape HTML & JSON Import/Export Engine:
  - Standards-compliant Netscape Bookmark HTML exporter (`bookmarkHtmlExportService.ts`) and parser (`bookmarkHtmlParser.ts`, `bookmarkHtmlImportService.ts`) with unclosed `<H3>` and `<DL>` auto-repair, safe entity decoding, and strict URL scheme allowlisting (`https:`, `http:`, `mailto:`).
  - Versioned NookSpace JSON backup format (`NookSpaceBookmarkBackupV1`) exporter (`bookmarkJsonExportService.ts`) and parser (`bookmarkJsonImportService.ts`) backed by runtime Zod schema verification (`NookSpaceBookmarkBackupV1Schema`).
  - Import Coordinator (`bookmarkImportCoordinator.ts`) providing automatic file format detection, preflight validation statistics, duplicate handling policies (`skip`, `import`, `update`), and Merge vs Destructive Replace modes.
  - Multi-table atomic Dexie transaction (`executeImportTransaction`) guaranteeing all-or-nothing execution with rollback on error, unique UUID remapping, and cross-tab storage synchronization via `nookspace_bookmarks_last_updated_at`.
  - Accessible, polished UI Dialog (`BookmarkImportExportDialog.tsx`) integrated into `BookmarkManagerModal.tsx` with dedicated Export and Import tabs, preflight summary grid, duplicate policy selectors, destructive replace confirmation guardrails, and import execution progress/summary.
  - Client-side download triggers and date formatting helpers (`bookmarkExportUtils.ts`).
  - Unit test suite expanded with 41 new unit tests across 6 test suites (`bookmarkHtmlExportService.test.ts`, `bookmarkHtmlImportService.test.ts`, `bookmarkJsonExportService.test.ts`, `bookmarkJsonImportService.test.ts`, `bookmarkImportCoordinator.test.ts`, `bookmarkImportExportDialog.test.tsx`), elevating overall test coverage to 549 passing tests across 62 test suites (100% pass rate).
  - Multi-target production builds verified: Chromium MV3 (920.16 kB) and Firefox MV2 (920.25 kB).

## [0.1.0-alpha.24] - 2026-11-07

### Added
- Phase 6 (Milestone 6.6) Smart Bookmarks Widget & Dashboard Integration:
  - Registered `SmartBookmarksWidget` definition in `widgetRegistry` (type: `smart-bookmarks`, category: `productivity`, default dimensions `4x3`, minimum dimensions `3x2`).
  - Implemented `SmartBookmarksWidget.tsx` presenting saved bookmarks as visual website shortcut tiles with Google S2 favicons, automatic fallback to Lucide `Globe`, domain subtitles, star favorite indicators, and safe external navigation (`window.open` with `noopener,noreferrer`).
  - Added multi-source filtering allowing users to display All Bookmarks, Favorites only, Uncategorized only, or a specific user-created folder, with defensive graceful recovery when a configured folder is deleted.
  - Implemented `SmartBookmarksWidgetSettings` supporting configuration of source folder, maximum visible items (4, 6, 8, 12, 16), domain label visibility toggle, and compact density layout.
  - Added seamless Bookmark Manager integration via in-widget header action, empty state buttons, and decoupled event bridge (`EVENT_OPEN_BOOKMARK_MANAGER` / `openBookmarkManager`), enabling users to trigger the New Tab manager directly without modal duplication.
  - Implemented cross-tab live synchronization listening to `STORAGE_KEY_BOOKMARKS_LAST_UPDATED_AT` and strict workspace isolation.
  - Expanded unit test coverage with 18 new tests (`SmartBookmarksWidget.test.tsx` and `initialWidgets.test.tsx`), elevating overall test coverage to 508 passing tests across 56 test suites (100% pass rate).
  - Multi-target production builds verified: Chromium MV3 (891.11 kB) and Firefox MV2 (891.20 kB).

## [0.1.0-alpha.23] - 2026-11-07

### Added
- Phase 6 (Milestone 6.5) Bookmark Manager UI:
  - Accessible, responsive Bookmark Manager full modal (`BookmarkManagerModal.tsx`) with integrated real-time search, header quick actions, two-column split layout, and Escape key dismissal hierarchy.
  - Interactive navigation sidebar (`FolderSidebar.tsx`) with system views (*All Bookmarks*, *Favorites*, *Uncategorized*) with dynamic count badges, user folder listing with color accents, accessible up/down reorder buttons, inline actions (rename, delete), and Add Folder control.
  - Rich bookmark list view (`BookmarkList.tsx`) with toolbar, breadcrumb navigation, active result count, multi-field sort selector (`order`, `title`, `createdAt`, `updatedAt`) with ascending/descending toggle, active search filter pill, shimmer loading skeleton, and distinct empty states.
  - Bookmark item card (`BookmarkItem.tsx`) with safe favicon fallback to Lucide Globe, star toggle, domain extraction, notes preview, accessible reorder buttons, drag handle, and item action controls (open in new tab via safe `window.open`, edit, move, delete).
  - Complete suite of modal dialogs (`BookmarkDialogs.tsx`): `BookmarkFormModal` (Add/Edit bookmark with offline URL validation), `FolderFormModal` (Create/Rename folder with preset color picker), `DeleteFolderModal` (safe reassignment vs cascade options), and `MoveBookmarkModal` (destination folder selector).
  - Seamless New Tab Dashboard integration (`TopNav.tsx`, `AppShell.tsx`, `entrypoints/newtab/App.tsx`) with dedicated Bookmarks button in navigation and clean open/close state.
  - Unit test suite expanded with 40 new UI and integration tests across 4 test suites (`bookmarkDialogs.test.tsx`, `bookmarkFolderSidebar.test.tsx`, `bookmarkList.test.tsx`, `bookmarkManager.test.tsx`), elevating total test coverage to 490 passing tests across 55 test suites (100% pass rate).
  - Multi-target production builds verified: Chromium MV3 (878.49 kB) and Firefox MV2 (878.58 kB).

## [0.1.0-alpha.22] - 2026-11-07

### Added
- Phase 6 (Milestone 6.4) Group / Folder Management & Reordering:
  - Folder Management Actions: Folder creation with name validation, folder rename (`renameGroup`), folder metadata updating, and dual-mode deletion (Mode A safe reassignment to Uncategorized `groupId: null`; Mode B cascade deletion) with automatic reset of selected filter when deleted.
  - Folder Reordering: Deterministic, transaction-safe folder ordering through `BookmarkGroupRepository.reorder` validating duplicates, missing IDs, and cross-workspace access with zero mutation of unrelated workspaces.
  - Bookmark Movement Engine: Atomic movement of bookmarks between folders (`moveBookmark`) and bulk movement (`moveBookmarks` / `BookmarkRepository.moveBulk`) with sequential target order appending, metadata preservation, `updatedAt` tracking, same-folder no-op handling, and cross-workspace verification.
  - Folder-Scoped Bookmark Reordering: Transaction-safe bookmark ordering inside specific folders and Uncategorized (`BookmarkRepository.reorder`), strictly isolating group membership from ordering.
  - Store Integration: Added workspace isolation guardrails in `bookmarkStore.ts` rejecting foreign workspace ID injection in `createBookmark` and `createGroup`.
  - Unit test suite expanded with 22 new tests across repository and store test suites, elevating overall test coverage to 450 passing tests across 51 test suites (100% pass rate).
  - Multi-target production builds verified: Chromium MV3 (813.63 kB) and Firefox MV2 (813.72 kB).

## [0.1.0-alpha.21] - 2026-11-07

### Added
- Phase 6 (Milestone 6.3) Bookmark Store & Local Search Engine:
  - High-performance, 100% offline local search engine `bookmarkSearchService.ts` implementing multi-token AND query matching, URL domain extraction, hierarchical relevance scoring (Title exact > Title prefix > Domain exact > Subdomain > Description), deterministic tie-breaking, and multi-field sorting (`order`, `title`, `createdAt`, `updatedAt`).
  - Discriminated union group filter representation (`BookmarkGroupFilter`: `{ type: 'all' }`, `{ type: 'uncategorized' }`, `{ type: 'group'; groupId: string }`) with zero Dexie mutation during filter toggling, and helper actions `selectAllGroups()`, `selectUncategorized()`, `selectGroup(groupId)`, and `setGroupFilter()`.
  - Centralized Zustand UI store `bookmarkStore.ts` bridging `BookmarkRepository` and `BookmarkGroupRepository` with full reactive CRUD actions, filter state (`searchQuery`, `groupFilter`, `activeGroupId`, `showFavoritesOnly`, `sortBy`, `sortDirection`), and cross-tab synchronization via `nookspace_bookmarks_last_updated_at`.
  - Stale async request protection with atomic request counters (`latestRequestId`) and complete state evacuation upon workspace switching.
  - Unit test suite expanded with 37 tests across 2 new test suites (`bookmarkSearchService.test.ts`, `bookmarkStore.test.ts`), elevating overall test coverage to 428 passing tests across 51 test suites (100% pass rate).
  - Multi-target production builds verified: Chromium MV3 (813.63 kB) and Firefox MV2 (813.72 kB).

## [0.1.0-alpha.20] - 2026-11-07

### Added
- Phase 6 (Milestone 6.2) Repositories & Dexie Data Layer:
  - Persistent repositories `BookmarkRepository` and `BookmarkGroupRepository` in `src/features/bookmarks/repositories/` with workspace isolation and strict domain validation.
  - Dexie Schema Version 3 upgrade adding `workspaceId` index to `bookmarks` table with defensive historical data migration.
  - Multi-mode group deletion: Mode A (default safe reassignment to Uncategorized `groupId: null`) and Mode B (explicit cascade deletion) executing within single atomic Dexie transactions.
  - Atomic, all-or-nothing reordering operations for groups and bookmarks enforcing strict workspace isolation and membership validation.
  - Unit test suite expanded with 43 repository and migration tests across 3 new test suites (`bookmarkRepository.test.ts`, `bookmarkGroupRepository.test.ts`, `bookmarkVersion3Migration.test.ts`), bringing total test coverage to 391 passing tests across 49 test suites (100% pass rate).
  - Verified multi-target production builds: Chromium MV3 (813.57 kB) and Firefox MV2 (813.66 kB).

## [0.1.0-alpha.19] - 2026-11-07

### Added
- Phase 6 (Milestone 6.1) Smart Bookmarks Domain Models, Zod Schemas & Security Validation:
  - Strong domain models and entity definitions in `src/types/bookmarks.ts` for `BookmarkGroupEntity` and `BookmarkEntity`, synchronized with `src/types/database.ts`.
  - Comprehensive Zod validation schemas (`BookmarkGroupSchema`, `BookmarkSchema`, `CreateBookmarkGroupSchema`, `UpdateBookmarkGroupSchema`, `CreateBookmarkSchema`, `UpdateBookmarkSchema`) with `.strict()` input safety and non-empty title constraints.
  - Offline security validation module (`src/features/bookmarks/utils/bookmarkSecurity.ts`) providing `isSafeBookmarkUrl`, `validateBookmarkUrl`, `isSafeIconUrl`, `isValidHexColor`, and `isValidLucideIcon`.
  - Scheme allowlist (`https:`, `http:`, `mailto:`), blocking `javascript:`, `data:`, `file:`, `blob:`, `chrome:`, `about:`, embedded credentials, and ASCII control characters without any network requests.
  - 84 new targeted unit tests in `tests/unit/bookmarks/` covering security rules, boundary cases, XSS text rendering safety, mailto/localhost edge cases, and entity schemas. Total test suite expanded to 348 passing tests across 46 test suites (100% pass rate).

## [0.1.0-alpha.18] - 2026-11-07

### Added
- Phase 5 (Milestone 5.7) Productivity Suite Integration & Final Review:
  - Cross-module integration test suite (`productivitySuiteIntegration.test.ts`) validating 8 comprehensive lifecycle scenarios (Pomodoro $\to$ Study Tracker, Pomodoro $\to$ Daily Goals, Todo $\to$ Daily Goals, Todo $\to$ Calendar & Streak, Combined Activity, Workspace Isolation, Restart Recovery, Multi-tab Synchronization).
  - Cross-tab live synchronization for `TodoWidget.tsx` listening to `STORAGE_KEY_TODO_LAST_UPDATED_AT`, ensuring multi-tab task status parity.
  - Regression test suite expanded in `TodoWidgetLifecycle.test.tsx` verifying reactive task hydration across tabs.
  - Total test coverage consolidated to 264 passing tests across 43 test suites (100% pass rate).
  - Multi-target builds verified: Chromium MV3 (812.24 kB) and Firefox MV2 (812.33 kB). Entire Phase 5 Productivity Suite successfully sealed.

## [0.1.0-alpha.17] - 2026-11-07

### Added
- Phase 5 (Milestone 5.6) Streak Calculator, Study Calendar & Activity Heatmap:
  - Deterministic `streakCalculator.ts` implementing DST-immune UTC date-only ordinal arithmetic (`Math.floor(Date.UTC(y, m-1, d) / 86400000)`), computing current streak with pending-today tolerance and all-time best streak across complete user history.
  - Active Study Day rules combining completed Pomodoro focus sessions (`completed && type in ['pomodoro', 'study']`), completed tasks with explicit `completedAt` timestamps, and reached daily goals (`currentValue >= targetValue`).
  - GitHub-style Activity Heatmap (7-week matrix, 5 distinct intensity levels strictly derived from focus minutes) and Sunday-aligned Calendar Month Glance with active-day indicators.
  - Centralized Zustand store (`calendarTrackerStore.ts`) with request token race-condition prevention, view mode toggle (`month` vs `heatmap`), month navigation, and selected day drill-down inspection.
  - Upgraded `CalendarOverviewWidget.tsx` (aliased as `StudyCalendarWidget`) integrating live synchronization via `STORAGE_KEY_LAST_DRAINED_AT` and `STORAGE_KEY_TODO_LAST_UPDATED_AT`.
  - Comprehensive unit and widget test suite expanding test coverage to 255 passing tests across 42 test suites (100% pass rate).
  - Multi-target builds verified: Chromium MV3 (811.91 kB) and Firefox MV2 (812 kB).

## [0.1.0-alpha.16] - 2026-11-07

### Added
- Phase 5 (Milestone 5.5) Daily Goals & Targets:
  - Local-first `DailyGoalRepository` managing persistent goals in Dexie `dailyGoals` table with Zod schema validation and workspace isolation.
  - `DailyGoalsService` deriving actual progress from verified source-of-truth focus sessions and completed tasks (excluding breaks and cancellations).
  - Centralized `useDailyGoalsStore` managing UI state, goal targets, and race condition defense against stale async responses.
  - Linear/Notion-styled `DailyGoalsWidget` with progress bars, celebratory achievement banners, and inline target configuration.
  - Live data synchronization via `nookspace_pomodoro_last_drained_at` storage event.
  - Full automated test suite expanded to 210 passing tests across 38 test suites.
  - Multi-target builds verified: Chromium MV3 (797.83 kB) and Firefox MV2 (797.92 kB).

## [0.1.0-alpha.15] - 2026-11-07

### Added
- Phase 5 (Milestone 5.4) Study Tracker & Analytics Widget:
  - `StudyTrackerService` computing total focus minutes, completed sessions, average session duration, and daily activity trends.
  - Granular time range selection (7D, 14D, 30D) with local-date aggregation preventing timezone skew.
  - Live data synchronization via `nookspace_pomodoro_last_drained_at` ensuring statistics refresh strictly after Dexie transactions commit.
  - `StudyTrackerWidget` presenting clean metric summaries, bar chart trends, empty states, and resilient error recovery.
  - Full automated test suite expanded to 189 passing tests across 34 test suites.
  - Multi-target builds verified: Chromium MV3 (783.57 kB) and Firefox MV2 (783.66 kB).

## [0.1.0-alpha.14] - 2026-11-07

### Added
- Phase 5 (Milestone 5.3) Pomodoro Timer & Background Alarm Service:
  - Background Service Worker alarm scheduler using `browserApi.alarms` with millisecond-exact `targetEndTime` validation and persistent storage envelope.
  - Two-phase coordinator with outbox drain and dead-letter queue for rock-solid Dexie session persistence.
  - Recovery marker and quarantine isolation for crash resilience across browser shutdowns and service worker sleep cycles.
  - Pomodoro widget with circular ring timer, quick presets (Focus 25m, Short Break 5m, Long Break 15m), cycle tracking, and recovery banner.

## [0.1.0-alpha.13] - 2026-11-07

### Added
- Phase 5 (Milestone 5.2) Advanced Todo Widget & Legacy Data Integration:
  - Hardened `legacyTodoMigration.ts` with explicit `completed`, `partial`, and `failed` status tracking, preventing premature completion flags when tasks are skipped.
  - Concurrency-safe `migrationCoordinator.ts` coordinating initialization across multiple concurrent New Tab windows.
  - Centralized `useTodoStore` managing UI state (`idle`, `loading`, `success`, `error`), active workspace isolation, and reactive filter/search updates.
  - Notion/Linear styled `TodoWidget.tsx` supporting task CRUD, inline <kbd>Enter</kbd> creation, priority badges (`urgent`, `high`, `medium`, `low`), due date badges ("Today", "Tomorrow", "Overdue"), and 4 navigation tabs (*All*, *Active*, *Completed*, *Today*).
  - Data safety verified: removing a Todo Widget from the dashboard preserves 100% of tasks in Dexie `todos` table for future re-hydration.
  - Unit and lifecycle test suites expanding total test coverage to 157 passing tests across 28 test suites (100% pass rate).
  - Multi-target builds verified: Chromium MV3 (548.5 kB) and Firefox MV2 (548.6 kB).

## [0.1.0-alpha.12] - 2026-11-07

### Added
- Phase 5 (Milestone 5.1) Productivity Data Layer & Zod Validation:
  - Strong domain models and Zod runtime schemas (`TodoEntitySchema`, `TodoCreateSchema`, `TodoUpdateSchema`, `TodoFilterSchema`, `FocusSessionEntitySchema`, `FocusSessionCreateSchema`, `FocusSessionUpdateSchema`).
  - `TodoRepository` implementing complete CRUD operations, strict workspace isolation ownership checks, multi-attribute filtering (completed, category, priority, date, searchQuery), atomic reordering, and bulk clearing.
  - `FocusSessionRepository` implementing focus session persistence, duration and timestamp verification (`completedAt >= startedAt`), duplicate completion protection, date range queries, and aggregated stats calculation.
  - `migrateLegacyTodos` migration engine safely transitioning legacy tasks from `WidgetInstanceEntity.config.tasks` to Dexie `todos` table with all-or-nothing transaction atomicity, idempotency, and source backup preservation.
  - Comprehensive unit test suites expanding total test coverage to 147 passing tests across 26 test suites (100% pass rate).
  - Multi-target builds verified: Chromium MV3 (526.3 kB) and Firefox MV2 (526.4 kB).

## [0.1.0-alpha.11] - 2026-11-07

### Added
- Phase 3 (Milestone 3.7) Testing Consolidation & Final Phase 3 Review:
  - Comprehensive end-to-end user lifecycle integration test suite (`customizationStudioE2E.test.tsx`):
    - Full View Mode -> Enter Edit Mode -> Staged Edits -> Cancel Discard -> View Mode rollback cycle.
    - Full View Mode -> Enter Edit Mode -> Staged Move -> Done Commit -> View Mode persistence cycle.
    - Full View Mode -> Enter Edit Mode -> Staged Add -> Reset Layout -> Done Commit -> Multi-breakpoint synchronization cycle.
  - Test suite consolidation reaching 126 total tests across 23 test suites (100% pass rate).
  - TypeScript strict compilation audit verified (0 errors).
  - Multi-browser production builds verified: Chromium MV3 (526.3 kB) and Firefox MV2 (526.4 kB).
  - Officially completed all milestones of **Phase 3 — Customization Studio & Grid Engine** (Milestones 0, 1, 2, 3.1 through 3.7).

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
