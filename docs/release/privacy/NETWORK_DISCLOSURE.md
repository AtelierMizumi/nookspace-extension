# NookSpace — Network Behavior & External Services Disclosure

**Milestone:** 10.5 Release Documentation  
**Audit Date:** November 8, 2026  
**Audited Target:** `src/`, `entrypoints/`, `public/`, `wxt.config.ts`  
**Classification:** Low Risk • Single Read-Only External Static Image Service  

---

## 1. Network Activity Summary

An exhaustive static and runtime audit of the NookSpace codebase was conducted to identify all network requests, outbound connections, and remote resources.

```
================================================================================
NETWORK AUDIT RESULTS
================================================================================
Application Backend Calls:        0 (Zero API servers)
Cloud Databases / Sync:           0 (Zero remote persistence)
Analytics / Telemetry Beacons:    0 (Zero tracking)
Remote Script Execution (CDNs):   0 (Zero remote scripts, script-src 'self')
Third-Party Ad Networks:         0 (Zero advertising)
External Image Requests:          1 (Domain-only Favicon visual resolver)
================================================================================
```

---

## 2. Exhaustive Network Audit by Feature

### 2.1. Smart Bookmarks Widget & Note Linking
- **Endpoint:** `https://www.google.com/s2/favicons?domain={domain}&sz=64`
- **Trigger:** Rendered via standard `<img>` tag when a user views a bookmark card in the Smart Bookmarks widget or Note-Bookmark Linker.
- **Source Code Locations:**
  - `src/widgets/SmartBookmarksWidget.tsx` (line 58)
  - `src/features/notes/components/LinkBookmarkModal.tsx` (line 266)
  - `src/features/notes/components/LinkedBookmarksSection.tsx` (line 96)
- **Data Transmitted:** Extracted website domain name only (e.g. `domain=github.com`).
- **Data Strictly Omitted:**
  - Full URL paths (e.g. `/my-username/private-repo`) are **never** included.
  - Query parameters (e.g. `?auth=token&id=123`) are **never** included.
  - Bookmark titles and user-entered descriptions are **never** included.
  - User notes, tasks, or study logs are **never** included.
  - User identifiers, IP mappings, or extension IDs are **never** included.
- **Fallback Behavior:** If the network is disconnected, if the service is blocked, or if an image HTTP error occurs, the component's `onError` callback triggers `setHasError(true)`, which immediately replaces the image with an offline SVG vector icon (`Globe className="h-3.5 w-3.5"`).

### 2.2. Pomodoro & Study Tracker
- **Network Requests:** 0 (Zero).
- **Execution Model:** Background alarms and Dexie database writes are entirely offline.

### 2.3. Notes & Knowledge System
- **Network Requests:** 0 (Zero).
- **Execution Model:** Notes, collections, tags, and Markdown parsing occur locally in the client.

### 2.4. Todo & Daily Goals
- **Network Requests:** 0 (Zero).
- **Execution Model:** Tasks and daily goals are queried and modified strictly in IndexedDB.

### 2.5. Universal Backup & Restore
- **Network Requests:** 0 (Zero).
- **Execution Model:** Backups are serialized to JSON in client memory and downloaded using local `Blob` URLs (`URL.createObjectURL(blob)`). Restore and merge parse user-selected files using `FileReader`. No file is sent over the network.

---

## 3. Remote Code & Content Security Policy (CSP)

NookSpace complies strictly with Manifest V3 and Mozilla AMO remote code prohibition policies:
- **Zero Remote Code:** No JavaScript or WebAssembly is downloaded or executed from external sources at runtime.
- **CSP Directive:** 
  - Chromium MV3: Standard MV3 CSP (`script-src 'self'; object-src 'self'`).
  - Firefox MV2: Standard Firefox CSP (`script-src 'self'`).
- **Inline Scripts:** All inline scripts have been completely eliminated (verified in Milestone 10.2 via `anti-flash.ts` module extraction).
