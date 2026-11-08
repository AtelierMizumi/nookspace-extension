# NOOKSPACE — POST-ROADMAP FEATURE REFINEMENT REPORT
# YOUTUBE AUDIO LISTENING REFINEMENT & COMPREHENSIVE FLASHCARD SYSTEM

**Date:** November 8, 2026  
**Project:** NookSpace (*Your Space. Your Workflow.*)  
**Workspace:** `D:\NookSpace` | **Branch:** `master`  
**Current Release Target:** `0.1.0-alpha.51` (Manifest `0.1.0`)  
**Target Environments:** Chromium MV3 (Google Chrome, Cốc Cốc, Brave, Edge) & Firefox MV2 / Zen Browser 1.24b+ (Gecko)  
**Execution Policy:** Zero Git commits, zero pushes, zero tags. Sealed Roadmap (No Phase 11). Preserved RC artifacts.

---

## 1. EXECUTIVE SUMMARY

Following live user testing and feedback, two targeted feature refinements were implemented to deliver a focused audio listening experience and a complete vocabulary acquisition system:

1. **Music Widget Refinement (Simplified YouTube Listening)**:
   - **Error 153 Root-Cause Resolution**: Diagnosed and resolved the YouTube "Lỗi cấu hình trình phát video - Lỗi 153" (`Player configuration error`) shown in user testing. Extension URIs (`chrome-extension://` or `moz-extension://`) passed via `&origin=...` are rejected by YouTube's embed origin validator. Omitting the invalid origin parameter restored immediate, clean playback.
   - **Zero Thumbnail Clutter**: Completely removed thumbnail images (`coverUrl`), banner previews, and large video interfaces.
   - **Compact Vinyl LP Stage**: Replaced the video-centric layout with an animated vinyl record (LP) as the focal interactive element. The vinyl record spins smoothly when audio playback is confirmed and immediately halts when paused, ended, or upon error.
   - **Streamlined Workflow**: Paste a YouTube link $\to$ Press Play $\to$ Listen to audio with volume and mute controls.

2. **Flashcard Widget Refinement**:
   - **Automatic Expiration**: Added automatic deck expiration defaulting to **24 hours (1 day)** based on explicit timestamps (`expiresAt = activatedAt + durationMs`). Configurable across 1d, 2d, 3d, 7d, 14d, 30d, or Never. Displays a live remaining time badge. When expired, shows a clean empty state inviting deck replacement without deleting historical user stats.
   - **JSON Deck Management**: Added live Zod validation previews when pasting AI JSON, atomic deck replacement (`replaceDeck`), current deck JSON export with file download, and deck deletion with safety confirmation dialogs.
   - **Vocabulary Test Mode (`Test / Kiểm tra`)**: Introduced a dedicated testing mode supporting Word $\to$ Meaning, Meaning $\to$ Word, 4-option Multiple Choice (with 3 distinct plausible distractors), and typed Fill-in formats. Features lenient answer normalization, instant feedback banners, detailed results summaries (accuracy %, duration, missed words list), and automatic updates to local vocabulary mastery in IndexedDB.

---

## 2. MUSIC WIDGET REFINEMENT

### 2.1 Diagnosis & Resolution of YouTube Error 153
- **Observed Issue**: In Firefox / Zen Browser and Chromium extension runtimes, embedding YouTube with `origin=${encodeURIComponent(window.location.origin)}` resulted in YouTube throwing:
  ```
  Lỗi cấu hình trình phát video
  Lỗi 153
  ```
- **Root Cause**: `window.location.origin` inside extension newtab pages resolves to `moz-extension://<uuid>` or `chrome-extension://<id>`. YouTube's IFrame server validates the `origin` query parameter strictly against `http://` and `https://` web domains and rejects extension protocol schemes with Error 153.
- **Fix**: Removed the `originParam` query parameter from the embed URL in [MusicWidget.tsx](file:///d:/NookSpace/src/widgets/MusicWidget.tsx#L395-L404):
  ```typescript
  const getEmbedSourceUrl = () => {
    if (!activeConfig.embedUrl) return '';
    if (provider === 'youtube') {
      return `${activeConfig.embedUrl}?enablejsapi=1&autoplay=1`;
    }
    return activeConfig.embedUrl;
  };
  ```

### 2.2 Removal of Video Clutter & Hero Vinyl Design
- Removed `coverUrl` image rendering and video previews.
- Designed a sleek **Compact Interactive Vinyl Record (LP)**:
  - Concentric groove styling with subtle reflective highlights.
  - Center spindle label acting as an interactive Play/Pause toggle.
  - CSS `@keyframes spin` active strictly during confirmed playback (`isPlaying && isPlaybackConfirmed`).
  - Halts immediately when audio is paused, ended, or upon network error.
- Direct inline YouTube URL parsing supporting standard watch URLs, short URLs (`youtu.be`), shorts (`/shorts/`), live streams (`/live/`), and playlists.

---

## 3. FLASHCARD SYSTEM REFINEMENT

### 3.1 Automatic Expiration Engine
- **Model**: Defined `FlashcardDeckMetadata` with `activatedAt`, `expiresAt`, `expirationHours`, and `totalCards`.
- **Supported Durations**:
  - `24` hours: 1 Day (Default)
  - `48` hours: 2 Days
  - `72` hours: 3 Days
  - `168` hours: 7 Days (1 Week)
  - `336` hours: 14 Days (2 Weeks)
  - `720` hours: 30 Days (1 Month)
  - `-1`: Never expire
- **Persistent Timestamp Evaluation**: Checked on load and render (`Date.now() >= metadata.expiresAt`), guaranteeing consistent expiration across browser restarts, page reloads, and timezones without requiring permanent background timers.
- **Expired State UI**: Renders an alert state prompting the user to replace or renew the deck, with quick links to deck settings and practice tests.

### 3.2 JSON Deck Management
- **Live Preview**: Real-time validation of pasted JSON with card count, source language, target language, and validity indicator before applying changes.
- **Atomic Replacement**: `flashcardRepository.replaceDeck()` deletes previous deck cards in the workspace, bulk adds new cards, updates deck metadata, and resets daily selection caches in a single clean workflow.
- **JSON Export**: Downloads a formatted `.json` file containing full vocabulary cards, metadata, and language pairs.
- **Safe Deletion**: Deletes active deck cards with a safety confirmation dialog.

### 3.3 Vocabulary Test Mode (`Test / Kiểm tra`)
- Created [testEngine.ts](file:///d:/NookSpace/src/features/flashcards/testEngine.ts):
  - **Question Types**: Word $\to$ Meaning, Meaning $\to$ Word, or Mixed.
  - **Question Formats**: Multiple Choice (1 correct + 3 distinct distractors from the deck), Fill-in (typed text input), or Mixed.
  - **Lenient Answer Evaluation**: Normalizes whitespace, converts to lowercase, strips trailing punctuation, and matches alternative synonyms from slash/comma-separated definitions (e.g., matching either "học tập" or "học hành" for "Học tập / Học hành").
  - **Testing Flow**: Configuration $\to$ Interactive Question Cards $\to$ Instant Feedback Banner (Green for correct, Red with correct answer for incorrect) $\to$ Results Summary (Score, Accuracy %, Duration, Missed Words List).
  - **Mastery Integration**: Correct answers mark cards as `'mastered'` / `'good'`; incorrect answers mark cards as `'learning'` / `'hard'` in local IndexedDB.

---

## 4. LOCALIZATION & USER GUIDE

- **Bilingual Parity**: Added 44 localized key pairs across English and Vietnamese in [en.ts](file:///d:/NookSpace/src/services/i18n/locales/en.ts) and [vi.ts](file:///d:/NookSpace/src/services/i18n/locales/vi.ts). Verified 100% key parity and zero empty values with `bilingualCompleteness.test.ts`.
- **In-App User Guide**: Updated [userGuideData.ts](file:///d:/NookSpace/src/features/user-guide/userGuideData.ts) to document YouTube audio listening, Error 153 safeguard, 24-hour deck expiration, deck replacement, and vocabulary test mode.

---

## 5. QUALITY GATES & VERIFICATION

| Verification Gate | Result | Notes |
|---|---|---|
| **TypeScript Strict Compilation** (`tsc --noEmit`) | **PASS (0 errors)** | Full codebase clean under strict type-checking. |
| **Bilingual Completeness Audit** | **PASS (5/5 tests)** | 100% key parity between English and Vietnamese. |
| **Music Player Tests** (`MusicWidget.test.tsx`, `musicUtils.test.ts`) | **PASS (16/16 tests)** | Playback, volume, URL parsing, Error 153 fix verified. |
| **Flashcard Test Suites** (`FlashcardWidget.test.tsx`, `FlashcardWidgetExtended.test.tsx`, `testEngine.test.ts`, `flashcardImportService.test.ts`, `dailySelectionEngine.test.ts`, `aiPromptGenerator.test.ts`) | **PASS (25/25 tests)** | Expiration, deck replacement, test mode, scoring verified. |
| **Full Vitest Regression Suite** | **PASS (175/175 files, 1,315/1,315 tests)** | 0 failures across the entire repository. |
| **Chromium MV3 Build** (`npm run build`) | **PASS** | `.output/chrome-mv3` built cleanly in 8.8s. |
| **Firefox MV2 Build** (`npm run build:firefox`) | **PASS** | `.output/firefox-mv2` built cleanly in 8.6s. |

---

## 6. POLICY COMPLIANCE
- **Git Policy**: Strictly 0 Git commits, 0 pushes, 0 tags. Working tree preserved uncommitted.
- **Roadmap Policy**: Sealed Phases 0–10 untouched; Phase 11 was NOT created.
- **Release Policy**: Frozen release artifacts in `release/` remain untouched.
