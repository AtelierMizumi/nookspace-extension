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
*Note: Due to Mozilla security policies, unsigned extensions in standard Firefox must be loaded as temporary add-ons or installed via developer channels.*

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
7. Open a new tab (`Ctrl+T`) to use NookSpace.

---

## 3. Data Ownership & Backup Management

Because NookSpace is completely local-first and does not store your notes or tasks on a cloud server, you have complete sovereignty over your data.

### 3.1. Creating a Universal JSON Backup
1. Click the **Settings** gear icon in the top-right corner of the NookSpace dashboard.
2. Under the **Data Integrity & Backup** section, click **"Export Backup"**.
3. A standardized JSON file named `nookspace-backup-v1-YYYY-MM-DD.json` will be saved to your local downloads folder.
4. Keep this file safe (e.g. on an external drive or private personal cloud folder).

### 3.2. Restoring from a Backup (Full Replace)
1. In the **Settings** dialog, click **"Restore Backup"**.
2. Select your `nookspace-backup-v1-*.json` file.
3. The Restore Engine performs compatibility verification and takes an automatic recovery snapshot before replacing your local database.

### 3.3. Merge Import (Non-Destructive)
1. In the **Settings** dialog, click **"Merge Import"**.
2. Choose which categories you wish to import (e.g. only notes or only bookmarks).
3. Review conflict resolution options (generate fresh IDs, skip duplicates, or update).
4. Click **"Apply Merge"** to cleanly incorporate the data into your active workspace.

---

## 4. Troubleshooting & FAQ

### Q: Why does the New Tab page look blank on first install?
**A:** NookSpace automatically seeds default workspaces and starter widgets on its initial startup. If you see a brief delay, refresh the tab (`F5`). If it remains blank, ensure IndexedDB is enabled in your browser settings (Private / Incognito windows sometimes disable IndexedDB).

### Q: Does NookSpace send my notes to any server?
**A:** **No.** NookSpace contains zero tracking, zero analytics, and zero remote databases. All user notes and tasks remain in your local browser IndexedDB storage on your hard drive.

### Q: How do I remove NookSpace and all its data?
**A:** Go to your browser's extension manager (`chrome://extensions` or `about:addons`) and click **"Remove"** / **"Uninstall"**. All local IndexedDB data associated with the extension origin is immediately deleted by your browser.
