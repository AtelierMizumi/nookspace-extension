# NookSpace — Post-Roadmap Product Enhancement Report
## Browser Integration & Bilingual Language System (Vietnamese / English)

**Project:** NookSpace — Your Space. Your Workflow.  
**Workspace:** `D:\NookSpace`  
**Branch:** `master`  
**Current RC:** `0.1.0-alpha.51` (Preserved)  
**Task Type:** Targeted Product Enhancement (Post-Roadmap)  
**Roadmap Policy:** Strictly preserved Phase 0–10; zero new phases created.  
**Git Policy:** Strictly preserved working tree (0 commits, 0 pushes, 0 tags).  
**Release Policy:** Existing frozen RC packages and manifests in `release/` preserved.  

---

## 1. Executive Summary

This targeted post-roadmap product enhancement delivers two significant capabilities to NookSpace:

1. **Feature A — Browser Integration:**
   - Adds a configurable, transparent **Browser Integration** section in Preferences (`Preferences → Browser Integration`).
   - Supports four granular options:
     - **Option 1 — New Tab Only (Default):** NookSpace opens on every new tab; browser startup configuration remains untouched.
     - **Option 2 — Browser Startup:** Guides the user to configure NookSpace as their browser's launch page.
     - **Option 3 — Both (Startup & New Tab):** Combines New Tab override with browser launch configuration.
     - **Option 4 — Keep Browser Defaults:** Explicitly preserves current browser startup settings without prompting.
   - Provides browser-specific guided setup (Google Chrome, Microsoft Edge, Brave, Cốc Cốc, Zen Browser, Mozilla Firefox).
   - Honestly explains security sandboxing and why WebExtensions cannot silently rewrite browser startup pages.

2. **Feature B — Bilingual Language System (Tiếng Việt & English):**
   - Adds a dedicated **Language** section in Preferences (`Preferences → Language`).
   - Implements a 100% type-safe, lightweight, dependency-free i18n architecture under `src/services/i18n/`.
   - **Automatic First-Install Language Detection:** Inspects `navigator.languages` / `navigator.language`; selects Vietnamese (`vi`) if preferred by the user's browser, otherwise defaults to English (`en`), and persists this choice.
   - **Instant UI Language Switching:** Selecting Tiếng Việt or English updates the entire application interface immediately without requiring a page reload.
   - **Zero User-Generated Data Translation:** Strictly preserves user notes, tasks, bookmark titles, workspace names, tags, and custom text in their original authored form.
   - **Locale-Aware Formatting:** Provides dynamic date (`vi-VN` vs `en-US`), time, and number formatting across widgets and calendars.

---

## 2. Technical Architecture & Data Model

### 2.1. Settings Data Model Extension
In `src/types/database.ts`, `AppSettingsEntity` was extended with:

```typescript
export type SupportedLanguage = 'en' | 'vi';

export type BrowserStartupBehavior =
  | 'new-tab-only'
  | 'browser-startup'
  | 'both'
  | 'keep-browser-defaults'
  | 'open-on-startup'          // legacy alias
  | 'preserve-browser-startup'; // legacy alias

export type StartupSetupStatus =
  | 'not-configured'
  | 'manual-verification-required'
  | 'verified';

export type DetectedBrowserFamily =
  | 'chrome'
  | 'edge'
  | 'brave'
  | 'coccoc'
  | 'firefox'
  | 'zen'
  | 'other';

export interface AppSettingsEntity {
  id: string; // 'current_settings'
  // ... existing appearance & workspace fields ...
  language?: SupportedLanguage;
  startupBehavior?: BrowserStartupBehavior;
  startupSetupStatus?: StartupSetupStatus;
  startupSetupBrowser?: DetectedBrowserFamily;
}
```

### 2.2. Validation Schemas & Persistence
- `src/features/backup/schemas/entitySchemas.ts` defines `LanguageCodeSchema = z.enum(['en', 'vi'])` and `BrowserStartupBehaviorSchema`.
- `SettingsRepository` in `src/services/database/repositories/settingsRepository.ts` persists preferences into Dexie table `database.settings` (`current_settings`).
- **Zero Dexie Schema Migration:** Since unindexed fields in Dexie do not require index store definitions, existing user databases and backups load without schema upgrades or version bumps.
- **Cross-Tab Synchronization:** Language changes are broadcast through `browserApi.storage.local` and window `storage` events (`nookspace_language`).

---

## 3. Localization Architecture (`src/services/i18n/`)

```
src/services/i18n/
├── types.ts              # SupportedLanguage ('en' | 'vi'), LanguageOption, TranslationParams
├── languageDetector.ts   # detectBrowserLanguage() for first-install auto-detection
├── locales/
│   ├── en.ts             # Complete English dictionary
│   └── vi.ts             # Complete Vietnamese dictionary (100% key symmetry)
├── i18nStore.ts          # Zustand store with reactive t(), formatDate(), formatNumber()
└── index.ts              # useTranslation() React hook
```

### 3.1. Dictionary Completeness & Symmetry
Both English (`en.ts`) and Vietnamese (`vi.ts`) dictionaries provide complete translations across:
- `common`: Standard actions (Save, Cancel, Delete, Edit, Close, Back, Copy, Copied, Active).
- `topNav`: Navigation, tools, theme selectors.
- `preferences`: Preferences modal, workspace, breakpoints, caching, language, browser integration, backup & diagnostics.
- `browserIntegration`: All 4 option descriptions, guided setup steps, permission notices, extension URL, copy buttons, verification badges.
- `widgets`: Greeting (time-based morning/afternoon/evening/night), Clock (12h/24h, seconds), Calendar & Streak, Quick Links, Tasks (priorities, filters), Quick Notes, Pomodoro Timer (focus/break states), Study Tracker, Daily Goals, Widget Library.
- `bookmarks`: Smart Bookmarks UI, search, folders, import/export.
- `notesManager`: Notes & Knowledge UI, collections, tags, search.
- `workspaces`: Workspace switcher, presets, manager.

### 3.2. Automatic First-Install Detection
On initial launch:
1. `detectBrowserLanguage()` inspects `navigator.languages` or `navigator.language`.
2. If any preferred language tag begins with `vi` (e.g. `vi`, `vi-VN`, `vi_VN`), the application initializes in Vietnamese (`vi`).
3. Otherwise, it defaults to English (`en`).
4. The resolved language is immediately persisted into the local `settings` record.
5. If the user subsequently selects a language manually, the manual choice is persisted and will never be overridden by automatic detection.

---

## 4. Browser Integration Architecture

### 4.1. Supported Startup Options
1. **Option 1 — New Tab Only (Default):**
   - NookSpace appears when opening any new tab.
   - Zero changes to the browser's launch or startup settings.
2. **Option 2 — Browser Startup:**
   - Guides the user to configure NookSpace as the startup page on browser launch.
3. **Option 3 — Both (Startup & New Tab):**
   - Configures NookSpace to launch upon browser startup and appear on every new tab.
4. **Option 4 — Keep Browser Defaults:**
   - Retains the user's current startup behavior without showing startup prompts.

### 4.2. Browser-Specific Capabilities & Guided Setup
When Option 2 or Option 3 is selected, a tailored guided setup panel is displayed based on the detected browser family:
- **Google Chrome:** Points to `chrome://settings/onStartup` $\to$ "Open a specific page or set of pages" $\to$ Add NookSpace URL.
- **Microsoft Edge:** Points to `edge://settings/startHomeNTP` $\to$ "When Edge starts" $\to$ "Open these pages".
- **Brave Browser:** Points to `brave://settings/getStarted` $\to$ "On startup" pages.
- **Cốc Cốc:** Points to `coccoc://settings/onStartup` $\to$ "Khi khởi động" $\to$ "Mở một trang cụ thể".
- **Mozilla Firefox:** Points to `about:preferences#home` $\to$ "Homepage and new windows" $\to$ "Custom URLs...".
- **Zen Browser:** Points to `about:preferences#general` with a dedicated troubleshooting note addressing Zen's workspace sidebar and split tabs.

### 4.3. Transparency & Security Fallback
WebExtensions are strictly prohibited by browser security sandboxes from navigating directly to internal `chrome://` or `about:` protocols. If programmatic tab navigation is blocked, NookSpace catches the restriction and displays an inline notice with the exact address, complemented by a one-click **"Copy URL"** button for the local extension URL.

---

## 5. Verification & Testing Results

### 5.1. Automated Test Suites
- **Unit Tests Passed:**
  - `tests/unit/i18n/i18n.test.ts` (12 tests): Dictionary symmetry, zero empty strings, fallback behavior, interpolation, locale date/number formatting.
  - `tests/unit/i18n/languageDetection.test.ts` (4 tests): Vietnamese detection, English fallback, multi-language preference list.
  - `tests/unit/preferences/LanguageSection.test.tsx` (4 tests): Language selector rendering, immediate state update, keyboard accessibility.
  - `tests/unit/preferences/BrowserIntegrationSection.test.tsx` (9 tests): 4 startup options, guided setup display, URL copying, blocked security notice, Zen notes.
  - `tests/unit/repositories/settingsRepository.test.ts` (9 tests): Language updates, 4 startup behavior states, legacy normalization.
  - `tests/unit/stores/settingsStore.test.ts` (5 tests): Settings store hydration and verification toggles.
  - `tests/unit/browser/browserDetection.test.ts` (15 tests): User-agent detection across 6 browser families.
- **Full Test Suite:** 158 test files passed, 1,215 individual tests passed (100% pass rate).
- **TypeScript Compilation:** `tsc --noEmit` clean with 0 errors.

---

## 6. Acceptance Criteria Checklist

- [x] Both Vietnamese (`vi`) and English (`en`) are fully supported.
- [x] Language switches immediately without page reload.
- [x] Language preference persists locally across sessions.
- [x] Automatic first-install language detection works seamlessly.
- [x] User-generated content is strictly preserved without translation.
- [x] Zero missing translation keys exist across dictionaries.
- [x] Browser Integration supports New Tab Only, Browser Startup, Both, and Keep Browser Defaults.
- [x] Accurate browser-specific instructions provided for Chrome, Edge, Brave, Cốc Cốc, Zen, and Firefox.
- [x] Unsupported browser capabilities and security boundaries are transparently explained.
- [x] Zero unnecessary permissions requested.
- [x] TypeScript compilation and all unit/integration tests pass with 100% success rate.
- [x] Existing Release Candidate artifacts in `release/` are strictly preserved.
- [x] Zero Git commits, pushes, or tags executed.
