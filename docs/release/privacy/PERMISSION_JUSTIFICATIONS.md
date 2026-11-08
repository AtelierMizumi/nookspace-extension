# NookSpace — Permission Justifications & Least-Privilege Audit

**Target Platforms:** Chromium MV3 (Chrome, Edge, Brave) & Firefox MV2 (Mozilla AMO)  
**Milestone:** 10.5 Release Documentation  
**Current Manifest Permissions:** `storage`, `alarms`, `notifications`  
**Host Permissions:** NONE  
**Optional Permissions:** NONE  

---

## 1. Declared Permissions Audit Table

| Permission | Chromium MV3 | Firefox MV2 | Features Utilizing It | Is Required? | Official Store Justification |
|---|---|---|---|---|---|
| **`storage`** | Yes | Yes | Theme synchronization, cross-tab workspace change signals, Pomodoro background-foreground sync. | **YES** | *"Required for inter-tab reactive event broadcasting (live theme updates, workspace switches) and Pomodoro countdown state sharing between the background alarm worker and open New Tab pages without remote network calls."* |
| **`alarms`** | Yes | Yes | Pomodoro Timer background interval tracking, auto-recovery on browser restart. | **YES** | *"Required to schedule browser background alarms for Pomodoro focus sessions and rest breaks, ensuring accurate timer completion even when the New Tab page is closed or inactive."* |
| **`notifications`** | Yes | Yes | Pomodoro Timer completion alerts. | **YES** | *"Required to notify users via native system notifications when a scheduled Pomodoro focus session or rest break finishes."* |

---

## 2. In-Depth Technical Justification by Permission

### 2.1. `storage` Permission
- **Source Code Locations:**
  - `src/services/browser/index.ts` (`browserApi.storage.local`)
  - `src/stores/themeStore.ts` (cross-tab theme synchronization listener)
  - `src/features/workspaces/stores/workspaceStore.ts` (active workspace broadcast)
  - `src/features/pomodoro/coordinator.ts` (active session persistence for background recovery)
- **Why IndexedDB alone is insufficient:** While all primary application entities reside in IndexedDB, IndexedDB transactions do not trigger immediate cross-tab change events across separate extension worker threads. `browser.storage.local` provides the lightweight, zero-latency signaling bus required for instant inter-tab state reconciliation.
- **Can it be optional?** No. Disabling `storage` would cause open tabs to desynchronize when a user switches workspaces or toggles dark/light theme in another window.

### 2.2. `alarms` Permission
- **Source Code Locations:**
  - `entrypoints/background.ts` (`browser.alarms.onAlarm.addListener`)
  - `src/features/pomodoro/coordinator.ts` (`browserApi.alarms.create`, `browserApi.alarms.clear`)
- **Why `setTimeout` / `setInterval` is insufficient:** Browser background service workers (Chromium MV3) and event pages (Firefox) are suspended by the operating system after ~30 seconds of inactivity to conserve laptop battery and memory. Standard JavaScript timers (`setTimeout`) are paused during browser sleep or suspension. The `alarms` API allows the browser engine to reliably wake the background worker at the exact scheduled end of a study session.
- **Can it be optional?** No. Without `alarms`, users would lose their Pomodoro countdown whenever they switch to other work tabs.

### 2.3. `notifications` Permission
- **Source Code Locations:**
  - `src/services/browser/index.ts` (`browserApi.notifications.create`)
  - `src/features/pomodoro/coordinator.ts` (`showCompletionNotification`)
- **Why it is necessary:** The primary purpose of a Pomodoro timer is to notify the user when their focus interval ends so they can step away from their computer or resume work.
- **Can it be optional?** It could theoretically be optional, but since Pomodoro is a core built-in productivity suite widget, requesting it at install time ensures seamless alert delivery without disruptive permission dialogs mid-study.

---

## 3. Deliberately Excluded Permissions (Least-Privilege Verification)

To uphold NookSpace's strict privacy-first pledge, the following high-risk or invasive permissions were audited and **explicitly rejected**:

1. **`history`:**
   - *Status:* **REJECTED.**
   - *Reason:* NookSpace is a personal workspace, not a browser history manager. We have zero need to inspect visited websites.
2. **`bookmarks`:**
   - *Status:* **REJECTED.**
   - *Reason:* Smart Bookmarks manages its own curated bookmarks independently inside local IndexedDB. It does not tamper with or read the user's native browser bookmarks bar without explicit user file import.
3. **`tabs`:**
   - *Status:* **REJECTED.**
   - *Reason:* NookSpace does not monitor open URLs, tab titles, or browsing activity.
4. **`<all_urls>` / `*://*/*` (Broad Host Permissions):**
   - *Status:* **REJECTED.**
   - *Reason:* NookSpace operates strictly within its own sandboxed New Tab page (`chrome_url_overrides.newtab`). It never injects scripts into third-party web pages.
5. **`unlimitedStorage`:**
   - *Status:* **REJECTED.**
   - *Reason:* Standard IndexedDB quota granted to extension origins is more than sufficient for tens of thousands of notes and bookmarks.
6. **`webRequest` / `declarativeNetRequest`:**
   - *Status:* **REJECTED.**
   - *Reason:* NookSpace never intercepts or modifies network traffic.
