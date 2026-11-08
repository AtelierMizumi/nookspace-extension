# Privacy Policy for NookSpace

**Effective Date:** November 8, 2026  
**Last Updated:** November 8, 2026  
**Application Version:** 0.1.0-alpha.51  
**Public Policy URL Placeholder:** `[PUBLIC PRIVACY POLICY URL REQUIRED BEFORE STORE SUBMISSION]`  
**Developer Contact Placeholder:** `[DEVELOPER CONTACT INFORMATION REQUIRED BEFORE PUBLICATION]`  

---

## 1. Introduction & Core Philosophy

NookSpace ("we", "our", or "the extension") is a personal productivity workspace browser extension developed with an uncompromising **local-first and privacy-first architecture**.

Our fundamental belief is that your notes, tasks, study records, bookmarks, and daily reflections are personal and belong solely to you. 

- **We do not require an account.**
- **We do not operate a cloud backend or remote database.**
- **We do not track, collect, or monitor your browsing history.**
- **We do not use any telemetry, analytics, or behavioral tracking SDKs.**
- **We do not sell, rent, monetize, or transmit your personal data.**

All user-generated information resides exclusively on your local computer within your browser's sandboxed storage.

---

## 2. Product Overview

NookSpace replaces your default browser New Tab page with a customizable dashboard containing productivity widgets:
- Dashboard widgets (Clock, Greeting, Quick Links)
- Task management (To-Do list)
- Focus management (Pomodoro Timer & Study Stopwatch)
- Goal & habit tracking (Daily Goals & Study Heatmap)
- Smart Bookmarks organizer
- Notes & Knowledge Markdown editor with collections and tags
- Workspace system with starter presets
- Universal JSON backup, transactional restore, and selective merge import

---

## 3. Information Stored Locally

NookSpace stores all application state and user-authored data in your browser's local client-side storage engines.

### 3.1. Local Database Storage (IndexedDB via Dexie.js)
Your data is organized into seventeen (17) structured tables inside the local IndexedDB database named `NookSpaceDB`:
1. `workspaces`: User workspaces, titles, icons, and theme accent colors.
2. `settings`: User preferences, active workspace identifier, and theme configuration.
3. `widgetInstances`: Configured widgets placed on the dashboard.
4. `widgetLayouts`: Grid coordinates (x, y, w, h) across responsive breakpoints.
5. `todos`: Tasks, completion statuses, priority levels, and due dates.
6. `notes`: Markdown note titles, text content, pinned states, and archive flags.
7. `noteCollections`: User-created note folders and notebooks.
8. `noteTags`: Normalized tag labels for organizing notes.
9. `noteBookmarkLinks`: Bidirectional junction links between notes and bookmarks.
10. `bookmarks`: Bookmark URLs, titles, descriptions, folder IDs, and favorite flags.
11. `bookmarkGroups`: Bookmark folder hierarchies, names, icons, and order indices.
12. `focusSessions`: Pomodoro and study session duration logs, completion timestamps, and tags.
13. `dailyGoals`: Daily study and task targets, target counts, and completion statuses.
14. `stickyNotes`: Scratchpad notes, color selections, and canvas coordinates.
15. `vocabulary`: Study flashcards, terms, definitions, and review intervals.
16. `resources`: Reference files and external study materials metadata.
17. `calendarEvents`: User schedule entries, event titles, and dates.

Additionally, a local recovery database (`NookSpaceRecoveryDB`) maintains temporary transaction snapshots during backup restore operations and migration journals to protect against power outages or browser crashes.

### 3.2. Browser Extension Storage (`browser.storage.local` / `chrome.storage.local`)
NookSpace uses minimal extension storage exclusively for:
- Inter-tab coordination events (broadcasting theme switches and workspace changes between open New Tab pages).
- Background timer coordination (allowing the background Pomodoro alarm worker to synchronize remaining countdown time with active tabs).

---

## 4. External Network Requests & Disclosures

NookSpace does not connect to any private servers, proprietary backends, or cloud synchronization endpoints.

### 4.1. Domain Favicon Requests (Optional Visual Enhancement)
When displaying bookmarks in the Smart Bookmarks widget or Note-Bookmark Linker, NookSpace optionally fetches visual website icons using Google's public favicon service:
```text
https://www.google.com/s2/favicons?domain={domain}&sz=64
```
**Strict Technical Safeguards:**
- **Domain Hostname Only:** NookSpace parses the bookmark URL using the browser's standard URL parser and extracts **only the hostname domain** (e.g., `github.com` or `wikipedia.org`).
- **Zero Sensitive Data:** Full paths (e.g., `/user/private-repo`), query parameters (`?token=secret`), bookmarks titles, user notes, and personal identifiers are **never** included in the request.
- **Offline Fallback:** If you are offline, if Google's service is unreachable, or if an image fails to load, NookSpace automatically falls back to an offline built-in vector globe icon (`Globe`).

---

## 5. Third-Party Services & Dependencies

NookSpace does not embed any third-party advertising SDKs, tracking pixels, or external analytics scripts.

All JavaScript dependencies (React, Dexie.js, Zustand, Zod, Lucide Icons, Tailwind CSS) are packaged and bundled locally inside the extension. No code is loaded dynamically from Content Delivery Networks (CDNs) or remote servers at runtime, fully complying with Chrome Web Store and Mozilla Add-ons security policies (`script-src 'self'`).

---

## 6. Data Sharing & Disclosure

We do not sell, rent, monetize, trade, or share your data with any third parties, data brokers, advertisers, or business affiliates.

Because your data is stored locally on your machine and never transmitted to our servers, we could not provide your data to third parties or law enforcement even if requested.

---

## 7. Analytics and Telemetry

NookSpace contains **zero analytics, zero error reporting beacons, and zero telemetry**. We do not collect:
- Aggregate usage statistics
- Feature usage counts
- Session durations
- Hardware or device fingerprints
- IP addresses
- Crash reports

---

## 8. Backup, Export & User Data Portability

NookSpace provides built-in tools for complete data sovereignty:
1. **Universal JSON Export:** You can export your entire workspace database into an unencrypted, standardized JSON file at any time via the Settings dialog.
2. **Transactional Restore:** You can restore your data from any verified NookSpace backup file. The restore engine creates an automatic rollback snapshot before committing changes.
3. **Merge Import:** You can selectively import specific categories (notes, bookmarks, tasks) from another backup file without overwriting your current workspace.
4. **HTML Bookmark Export:** Bookmarks can be exported in the industry-standard Netscape Bookmark HTML format for migration into any web browser.

**Your Responsibility:** Downloaded backup files are saved directly to your computer's local downloads directory. Because these files contain your unencrypted notes, bookmarks, and tasks, you are responsible for securely storing and backing up these files.

---

## 9. Data Retention & Deletion

Your data remains stored in your browser's local profile until you explicitly delete it:
- **Individual Deletion:** You can delete individual tasks, notes, bookmarks, or workspaces at any time using the in-app interface.
- **Complete Deletion:** Uninstalling the NookSpace extension from your browser or clearing your browser's site data/cookies/IndexedDB will permanently delete all locally stored data.
- **No Remote Retention:** Because no data exists on external servers, uninstalling the extension or clearing browser data leaves no residual records anywhere.

---

## 10. Security Considerations & Best Practices

- **Sandboxed Execution:** NookSpace operates within the browser's secure extension sandbox.
- **Content Security Policy:** NookSpace enforces a strict CSP prohibiting `eval()`, `unsafe-inline`, and remote script execution.
- **HTML Sanitization:** User-authored Markdown notes are rendered safely without allowing arbitrary raw script execution.
- **Device Security:** Because data is stored in your local browser profile, anyone with physical or administrative access to your computer could theoretically inspect your local IndexedDB files. We recommend using full-disk encryption (e.g., BitLocker or FileVault) and securing your operating system user account.

---

## 11. Children's Privacy

NookSpace is a general-purpose productivity dashboard suitable for all ages. We do not knowingly collect, store, or solicit personal information from children under the age of 13 (or under 16 in the European Union). Because no personal information is transmitted from your computer, NookSpace inherently complies with COPPA and GDPR-K regulations.

---

## 12. Changes to This Privacy Policy

We may update this Privacy Policy from time to time to reflect new features or platform requirements. Any updates will be included in extension release packages with an updated revision date. Substantive updates will be highlighted in the application changelog.

---

## 13. Contact & Support Information

If you have questions, feedback, or concerns regarding this Privacy Policy or NookSpace's privacy practices, please contact:

- **Developer / Publisher:** `[DEVELOPER OR ENTITY NAME REQUIRED BEFORE PUBLICATION]`
- **Support Email:** `[DEVELOPER SUPPORT EMAIL REQUIRED BEFORE PUBLICATION]`
- **Official Repository:** `https://github.com/giabaoqh/nookspace-extension`
- **Issue Tracker:** `https://github.com/giabaoqh/nookspace-extension/issues`
- **Public Policy URL:** `[PUBLIC PRIVACY POLICY URL REQUIRED BEFORE STORE SUBMISSION]`
