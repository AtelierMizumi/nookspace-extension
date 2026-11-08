# NookSpace — Production Package Manifest

**Release Version:** `0.1.0-alpha.51`  
**Build Date:** 2026-11-08  
**Architecture:** Client-Side Browser Extension (Chromium MV3 & Firefox MV2)  
**Security Policy:** Strict Local-First • Zero Remote Code • Zero Telemetry  

---

## 1. Distributable Packages

### 1.1. Google Chrome & Chromium (Manifest V3)
- **Target Platforms:** Google Chrome, Microsoft Edge, Brave Browser, Opera, Vivaldi
- **Archive Path:** `release/chromium/nookspace-chromium-0.1.0-alpha.51.zip`
- **Source Build Path:** `.output/chrome-mv3`
- **Build Command:** `npm run build` (`wxt build`) / `npm run zip` (`wxt zip`)
- **Archive Size:** 353,397 bytes (345.11 KB)
- **Uncompressed Size:** 1.28 MB
- **SHA-256 Checksum:**
  ```text
  c0c12491bbfbf845c5cdd6bc2f97c081c6fb7d55490b2d8ec008da916db895bf
  ```
- **Manifest Version:** 3
- **Primary Entrypoint:** `newtab.html` (New Tab Page Override)
- **Background Worker:** `background.js` (Pomodoro alarm scheduler & recovery coordinator)
- **Included Files:**
  - `manifest.json`
  - `newtab.html`
  - `background.js`
  - `chunks/newtab-zGq9RXl3.js`
  - `assets/newtab-BWSA1Y2i.css`
  - `icon/16.png`, `icon/32.png`, `icon/48.png`, `icon/128.png`, `icon/512.png`, `icon/icon.svg`

---

### 1.2. Mozilla Firefox (Gecko Manifest V2)
- **Target Platforms:** Mozilla Firefox Stable, Firefox Developer Edition, Zen Browser, LibreWolf
- **Archive Path:** `release/firefox/nookspace-firefox-0.1.0-alpha.51.zip`
- **Source Build Path:** `.output/firefox-mv2`
- **Build Command:** `npm run build:firefox` (`wxt build -b firefox`) / `npm run zip:firefox` (`wxt zip -b firefox`)
- **Archive Size:** 353,446 bytes (345.16 KB)
- **Uncompressed Size:** 1.28 MB
- **SHA-256 Checksum:**
  ```text
  b3f07904026700cf372fd84b6032b10e0f7ce698dfb533a1634c01eb4b591923
  ```
- **Gecko ID:** `nookspace@local-dev`
- **Strict Min Version:** `115.0`
- **Manifest Version:** 2
- **CSP Compliance:** `script-src 'self'` (Zero inline scripts, AMO compliant)
- **Included Files:**
  - `manifest.json`
  - `newtab.html`
  - `background.js`
  - `chunks/newtab-zGq9RXl3.js`
  - `assets/newtab-BWSA1Y2i.css`
  - `icon/16.png`, `icon/32.png`, `icon/48.png`, `icon/128.png`, `icon/512.png`, `icon/icon.svg`

---

### 1.3. Mozilla AMO Source Code Archive (For Add-on Review)
- **Archive Path:** `release/firefox/nookspace-firefox-0.1.0-alpha.51-sources.zip`
- **Source Build Path:** Repository source excluding build outputs and `node_modules`
- **Build Command:** Generated automatically by `wxt zip -b firefox`
- **Archive Size:** 2,010,413 bytes (1,963.29 KB)
- **SHA-256 Checksum:**
  ```text
  20ed64dd959521056b170bc4d8cda82b96bb911507a580a4d3686b5acbe881fb
  ```
- **Purpose:** Full buildable source code provided to Mozilla Add-ons reviewers to comply with Mozilla Source Code Submission Policy for minified/bundled code.

---

## 2. Integrity Verification Procedure

To verify package integrity locally on any machine:

```powershell
# Windows PowerShell SHA-256 Verification
Get-FileHash -Algorithm SHA256 release/chromium/nookspace-chromium-0.1.0-alpha.51.zip
Get-FileHash -Algorithm SHA256 release/firefox/nookspace-firefox-0.1.0-alpha.51.zip
Get-FileHash -Algorithm SHA256 release/firefox/nookspace-firefox-0.1.0-alpha.51-sources.zip
```

```bash
# Linux / macOS SHA-256 Verification
sha256sum release/chromium/nookspace-chromium-0.1.0-alpha.51.zip
sha256sum release/firefox/nookspace-firefox-0.1.0-alpha.51.zip
sha256sum release/firefox/nookspace-firefox-0.1.0-alpha.51-sources.zip
```
