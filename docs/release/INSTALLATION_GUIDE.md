# NookSpace — Installation & User Manual

**Version:** 0.1.0-alpha.51  
**Build:** Universal Cross-Browser Extension (Chromium MV3 & Firefox MV2)  
**Distribution:** Local Unpacked / Packaged Archive  

---

## 1. Chromium Installation Guide (Google Chrome, Microsoft Edge, Brave, Opera, Vivaldi)

### Method A: Installing from Unpacked Production Directory
1. Open your Chromium-based browser.
2. Navigate to the Extensions Management page:
   - **Google Chrome:** `chrome://extensions`
   - **Microsoft Edge:** `edge://extensions`
   - **Brave Browser:** `brave://extensions`
3. In the top-right corner, enable the **"Developer mode"** toggle.
4. Click the **"Load unpacked"** button in the top toolbar.
5. In the file picker dialog, navigate to the NookSpace workspace and select the folder:
   ```text
   D:\NookSpace\.output\chrome-mv3
   ```
6. Click **Select Folder**.
7. NookSpace is now installed! Open a new browser tab (`Ctrl+T` or `Cmd+T`) to view your personal dashboard.

### Method B: Installing from Release Archive ZIP
1. Navigate to `D:\NookSpace\release\chromium\`.
2. Extract `nookspace-chromium-0.1.0-alpha.51.zip` to a convenient folder.
3. In `chrome://extensions` with Developer Mode enabled, click **"Load unpacked"** and select the extracted folder.

---

## 2. Mozilla Firefox Installation Guide (Firefox Stable, Developer Edition, Zen Browser)

### Method: Loading as a Temporary Add-on for Local Testing
*Note: Due to Mozilla security policies, unsigned extensions in standard Firefox and Zen Browser must be loaded as temporary add-ons or installed via developer channels.*

1. Open Mozilla Firefox or Zen Browser.
2. In the URL address bar, enter:
   ```text
   about:debugging#/runtime/this-firefox
   ```
3. Under **Temporary Extensions**, click the button: **"Load Temporary Add-on..."**.
4. In the file picker, navigate to:
   ```text
   D:\NookSpace\.output\firefox-mv2\manifest.json
   ```
   *(Or select the packaged zip: `release/firefox/nookspace-firefox-0.1.0-alpha.51.zip`)*
5. Click **Open**.
6. The extension is now loaded with ID `nookspace@local-dev`.
7. **Zen Browser Specific Setup (Crucial for New Tab):**
   - By default, Zen Browser intercepts New Tab actions with its Floating URL Bar search popup instead of loading the extension page.
   - To display NookSpace on `Ctrl+T` or clicking `+`:
     1. Open `about:config` in Zen's address bar.
     2. Search for `zen.urlbar.replace-newtab`.
     3. Toggle the preference value to **`false`**.
     4. Open a new tab (`Ctrl+T`) — NookSpace will now appear immediately!
   - NookSpace also automatically overrides Zen's Homepage via `chrome_settings_overrides.homepage` (`newtab.html`). When clicking the Home button or launching with "Open your home page", NookSpace opens directly.

---

## 3. Browser Integration & Startup Configuration

NookSpace provides configurable integration options directly within **Preferences → Browser Integration**:

### 3.1. Option 1 — New Tab Only (Default)
- **Behavior:** NookSpace opens automatically whenever you open a new browser tab (`Ctrl+T` or `Cmd+T`).
- **Startup:** Your existing browser startup configuration (e.g. continue previous session, blank page, or custom homepage) remains completely untouched.

### 3.2. Option 2 — Open NookSpace on Browser Startup
- **Behavior:** NookSpace opens immediately upon launching your browser as well as on every new tab.
- **Why Guided Manual Setup is Required:**
  Modern WebExtension security specifications (Chromium MV3 and Mozilla Gecko) strictly prohibit extensions from silently modifying your browser's startup pages without explicit user action.
- **Guided Setup Steps:**
  1. Click **Preferences** (gear icon) in NookSpace $\to$ scroll to **Browser Integration**.
  2. Select **"Option 2 — Open NookSpace on Browser Startup"**.
  3. Click **"Copy URL"** to copy your unique local extension URL (e.g. `chrome-extension://<id>/entrypoints/newtab/index.html`).
  4. Follow the tailored instructions for your detected browser:
     - **Google Chrome:** Go to `chrome://settings/onStartup` $\to$ select "Open a specific page or set of pages" $\to$ click "Add a new page" and paste the URL.
     - **Microsoft Edge:** Go to `edge://settings/startHomeNTP` $\to$ select "Open these pages" $\to$ click "Add a new page" and paste the URL.
     - **Mozilla Firefox:** Go to `about:preferences#home` $\to$ under "Homepage and new windows", choose "Custom URLs..." $\to$ paste the URL.
     - **Zen Browser:** Go to `about:preferences#home` or `about:preferences#general` $\to$ NookSpace is declared as your Homepage via `chrome_settings_overrides.homepage`. Under Startup, select "Open your home page" (or keep "Open previous windows and tabs" to preserve your session). Also ensure `zen.urlbar.replace-newtab` is set to `false` in `about:config`.
  5. Check the **"I have configured my browser startup settings"** checkbox in NookSpace to mark setup as Verified.

### 3.3. Option 3 — Keep Browser Startup Settings
- **Behavior:** Explicitly instructs NookSpace to preserve your browser's existing startup behavior without prompting or showing startup guidance.

---

## 4. Language & Localization (Bilingual System)

NookSpace provides full native support for **Tiếng Việt** and **English**:
- **Automatic Detection:** On first launch, NookSpace detects your preferred browser language (`navigator.languages`). If Vietnamese is detected, the UI initializes in Vietnamese (`vi`); otherwise, it defaults to English (`en`).
- **Instant Language Switching:**
  1. Open **Preferences** (gear icon in the top navigation bar).
  2. In the **Language / Ngôn ngữ** section, click **Tiếng Việt** or **English**.
  3. The interface updates instantly across all menus, dialogs, widgets, date headers, and relative timestamps without requiring a browser reload.
- **Data Integrity:** Switching the language only translates UI labels and system prompts. Your custom workspaces, note titles, todo items, and bookmarks remain 100% in their original language and are never altered.

---

## 5. Integrated Web Search & Direct Website Navigation

NookSpace features a prominent, full-viewport search interface at the top of your dashboard:
- **Direct Navigation:** Type any full URL (`https://...`, `http://...`) or recognizable domain (`github.com`, `localhost:3000`, `developer.mozilla.org`) and press **Enter** to navigate straight to that website without passing through a search engine.
- **Web Search Queries:** Type any ordinary search phrase (e.g. `react hooks tutorial`) to query your chosen search engine.
- **Security & Privacy Safeguard:** Dangerous URL schemes (`javascript:`, `data:`, `file:`, etc.) are automatically sanitized and treated as harmless search terms rather than executed.
- **Configurable Search Engines:**
  - Choose between **Google**, **Microsoft Bing**, and **DuckDuckGo** directly from the search dropdown or under **Preferences → Search Engine**.
  - Your engine preference is saved locally and synchronized across tabs.
- **Keyboard Shortcuts:**
  - Press `/` anywhere on the dashboard to immediately focus the search bar (unless already typing in a note or input).
  - Press `Ctrl + K` (or `Cmd + K`) to focus and select the current search text.
  - Press `Escape` to clear the query or close the search menu.

---

## 6. Data Ownership & Backup Management

Because NookSpace is completely local-first and does not store your notes or tasks on a cloud server, you have complete sovereignty over your data.

### 4.1. Creating a Universal JSON Backup
1. Click the **Settings** gear icon in the top-right corner of the NookSpace dashboard.
2. Under the **Data Integrity & Backup** section, click **"Export Backup"**.
3. A standardized JSON file named `nookspace-backup-v1-YYYY-MM-DD.json` will be saved to your local downloads folder.
4. Keep this file safe (e.g. on an external drive or private personal cloud folder).

### 4.2. Restoring from a Backup (Full Replace)
1. In the **Settings** dialog, click **"Restore Backup"**.
2. Select your `nookspace-backup-v1-*.json` file.
3. The Restore Engine performs compatibility verification and takes an automatic recovery snapshot before replacing your local database.

### 4.3. Merge Import (Non-Destructive)
1. In the **Settings** dialog, click **"Merge Import"**.
2. Choose which categories you wish to import (e.g. only notes or only bookmarks).
3. Review conflict resolution options (generate fresh IDs, skip duplicates, or update).
4. Click **"Apply Merge"** to cleanly incorporate the data into your active workspace.

---

## 7. Troubleshooting & FAQ

### Q: Why does the New Tab page look blank on first install?
**A:** NookSpace automatically seeds default workspaces and starter widgets on its initial startup. If you see a brief delay, refresh the tab (`F5`). If it remains blank, ensure IndexedDB is enabled in your browser settings (Private / Incognito windows sometimes disable IndexedDB).

### Q: Does NookSpace send my notes to any server?
**A:** **No.** NookSpace contains zero tracking, zero analytics, and zero remote databases. All user notes and tasks remain in your local browser IndexedDB storage on your hard drive.

### Q: How do I remove NookSpace and all its data?
**A:** Go to your browser's extension manager (`chrome://extensions` or `about:addons`) and click **"Remove"** / **"Uninstall"**. All local IndexedDB data associated with the extension origin is immediately deleted by your browser.
