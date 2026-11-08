# Firefox Add-ons (AMO) — Store Listing Draft

**Add-on Name:** NookSpace — Personal Productivity Workspace  
**Target Platform:** Mozilla Add-ons (AMO — Gecko MV2 / MV3)  
**Gecko ID:** `nookspace@local-dev` (Development ID)  
**Strict Minimum Version:** `115.0` (Firefox ESR 115+)  
**Version:** 0.1.0-alpha.51  
**Categories:** Productivity, Tabs  
**Tags:** productivity, newtab, dashboard, notes, bookmarks, pomodoro, study, markdown, local-first  

---

## 1. AMO Listing Fields

### 1.1. Summary (Max 250 characters)
```text
Transform your New Tab into a calm, customizable productivity workspace. Manage notes, tasks, smart bookmarks, study sessions, and daily goals with zero tracking, zero telemetry, and 100% local-first data storage.
```
*(Length: 218 characters)*

---

## 2. Full Description (AMO Formatted)

```markdown
NookSpace is a personal productivity workspace designed for focus and privacy. It replaces your blank New Tab page with an elegant, responsive dashboard for organizing your tasks, notes, bookmarks, study sessions, and daily habits.

Inspired by Notion and Linear, NookSpace combines modular flexibility with a strict local-first philosophy: your thoughts, tasks, and bookmarks stay securely on your computer in your local browser database.

CORE FEATURES:

• Customizable Dashboard: Drag, drop, resize, and arrange widgets on a responsive 12-column grid.
• Multiple Workspaces: Organize by context (Work, Study, Personal, Coding) with instant switching and built-in starter presets.
• Smart Bookmarks: Curate web links with custom folders, instant search, domain favicon previews, and two-way note linking. Supports standard Netscape HTML import and export.
• Notes & Knowledge: Write Markdown notes with full formatting, collections, normalized tags, and cross-linking to bookmarks.
• Productivity Suite: Focus with a background-accurate Pomodoro timer, Study stopwatch, Daily Goals checklist, and a streak activity heatmap.
• Universal Backup & Recovery: One-click JSON backup export, transactional restore with automatic rollback, and selective merge import.

PRIVACY & PERMISSIONS:

• 100% Local-First: Zero cloud servers, zero user accounts, zero telemetry.
• Sandboxed Storage: All data resides in local client-side IndexedDB.
• Minimal Permissions: Requests only 'storage' (for multi-tab synchronization), 'alarms' (for Pomodoro timers), and 'notifications' (for focus completion alerts).
• Content Security Policy: Strict CSP prohibiting remote script execution. Fully compliant with Mozilla AMO review policies.

SOURCE CODE & REVIEW:

NookSpace is open source. Complete source code is provided in the review submission archive.
• Repository: https://github.com/giabaoqh/nookspace-extension
• Issue Tracker: https://github.com/giabaoqh/nookspace-extension/issues
• Privacy Policy: [PUBLIC PRIVACY POLICY URL REQUIRED BEFORE STORE SUBMISSION]
```

---

## 3. Reviewer Notes (Submitted in AMO Developer Console)

```text
Notes for AMO Reviewers:
1. Build & Packaging:
   - Built with WXT 0.19 and React 18 LTS.
   - Production bundle artifact: release/firefox/nookspace-firefox-0.1.0-alpha.51.zip.
   - Buildable source code archive: release/firefox/nookspace-firefox-0.1.0-alpha.51-sources.zip.
2. Build Reproduction:
   - Extract source archive.
   - Run: npm install
   - Run: npm run build:firefox
   - The output will match the submitted package in .output/firefox-mv2.
3. Content Security Policy:
   - Extension pages enforce script-src 'self'. Zero inline scripts or remote scripts.
4. Network Activity:
   - The extension operates entirely offline except for optional domain favicon images fetched via standard <img> tags from Google S2 Favicon service (domain hostname only, with built-in offline SVG fallback).
```
