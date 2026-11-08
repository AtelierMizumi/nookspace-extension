# NookSpace — Release Candidate Manifest

**Release Candidate Label:** `0.1.0-alpha.51`  
**Manifest & Engine Version:** `0.1.0`  
**Milestone:** Phase 10 / Milestone 10.6 — Final Release Candidate Verification & Freeze  
**Freeze Date:** 2026-11-08  
**Baseline Git Commit:** `a6c33f3c894979fc6316acd9a0c9655087c0194b`  
**Repository:** `https://github.com/giabaoqh/nookspace-extension.git`  
**Freeze Status:** `RC_FROZEN` — Sealed locally for release evaluation  

---

## 1. Release Candidate Decision

### Decision: `RC_READY_WITH_LIMITATIONS`

NookSpace `0.1.0-alpha.51` has successfully passed all local automated quality gates, structural integrity checks, cross-browser compatibility verifications, security audits, and packaging validations. The codebase, documentation, metadata, and distributable packages are frozen.

### Documented Limitations & Prerequisites Before Public Store Submission:
1. **Mozilla Firefox Official Host Validation:**
   - Testing on Gecko was performed on Zen Browser 1.24b (Gecko fork).
   - Official Mozilla Firefox Stable / Developer Edition was not installed on the local Windows development machine.
   - Verification status: *Gecko architecture validated; final smoke-test on official Mozilla Firefox binary recommended once host environment is provisioned with Firefox Stable.*
2. **Public Store Listing Hosting URLs:**
   - Store listings currently link to the repository privacy documentation (`docs/release/privacy/PRIVACY_POLICY.md`).
   - A public HTTPS URL (e.g. GitHub Pages or custom domain) and a dedicated maintainer support email (`support@nookspace.app` or maintainer contact) must be finalized by the project owner prior to clicking "Submit" in the Chrome Web Store Developer Dashboard and Mozilla Add-on Developer Hub.
3. **External Submission Policy:**
   - In accordance with project instructions, **zero external network submissions, uploads, or publishing actions have been performed.** All artifacts reside locally.

---

## 2. Release Packages & Cryptographic Checksums

| Package Name | Target Browser | Size | SHA-256 Checksum |
|---|---|---|---|
| `nookspace-chromium-0.1.0-alpha.51.zip` | Google Chrome, Edge, Brave (MV3) | 353,397 bytes (345.11 KB) | `c0c12491bbfbf845c5cdd6bc2f97c081c6fb7d55490b2d8ec008da916db895bf` |
| `nookspace-firefox-0.1.0-alpha.51.zip` | Mozilla Firefox, Zen Browser (MV2) | 353,446 bytes (345.16 KB) | `b3f07904026700cf372fd84b6032b10e0f7ce698dfb533a1634c01eb4b591923` |
| `nookspace-firefox-0.1.0-alpha.51-sources.zip` | Mozilla AMO Reviewers (Full Source) | 2,010,413 bytes (1,963.29 KB) | `20ed64dd959521056b170bc4d8cda82b96bb911507a580a4d3686b5acbe881fb` |

---

## 3. Automated Quality Gate Audit

| Verification Gate | Command | Result | Details |
|---|---|---|---|
| **TypeScript Compilation** | `npm run compile` | **PASS (0 errors)** | `tsc --noEmit` clean across 100% of workspace |
| **Unit & Integration Tests** | `npm test` | **PASS (100%)** | **152 / 152 test files passed**, **1,167 / 1,167 tests passed** (0 failures, 0 skipped) |
| **Chromium MV3 Build** | `npm run build` | **PASS** | `.output/chrome-mv3` generated (1.28 MB total uncompressed) |
| **Firefox MV2 Build** | `npm run build:firefox` | **PASS** | `.output/firefox-mv2` generated (1.28 MB total uncompressed) |
| **Chromium Packaging** | `npm run zip` | **PASS** | `nookspace-extension-0.1.0-chrome.zip` (353.40 KB) |
| **Firefox Packaging** | `npm run zip:firefox` | **PASS** | `nookspace-extension-0.1.0-firefox.zip` & sources zip created |

---

## 4. Security & Privacy Certification

- **Zero Remote Code Execution:** Strictly 0 remote scripts, zero `eval()`, zero `Function()` constructors, and zero dynamic string interpolation into HTML.
- **Strict Content Security Policy:**
  - Chromium MV3: Compliant with declarative MV3 CSP defaults.
  - Firefox MV2: Explicit `script-src 'self'`. Anti-flash script extracted to standalone module `chunks/anti-flash-*.js`, ensuring **0 inline `<script>` tags** and 100% compliance with Mozilla AMO Review Policies.
- **Network Privacy Invariant:** Zero telemetry, zero analytics, zero external user data transmission. The sole network interaction is Google S2 Favicon service (`https://www.google.com/s2/favicons?domain={domain}&sz=64`), transmitting solely the domain hostname with an offline SVG vector fallback.
- **Permission Boundaries:** Minimalist permissions requested:
  - `storage`: For fast synchronous anti-flash theme preferences.
  - `alarms`: For Pomodoro background timer ticks.
  - `tabs`: Cross-browser tab management for workspace shortcuts.
  - Zero broad host permissions (`<all_urls>`, `*://*/*` omitted).
- **DOM Injection & Markdown Security:** AST-based custom React Markdown renderer (`MarkdownRenderer.tsx`) with zero `dangerouslySetInnerHTML` usage. Strict URL protocol filtering (`https:`, `http:`, `mailto:` only; blocking `javascript:`, `data:`, `vbscript:`).

---

## 5. Version Identifier Alignment Matrix

| Context | Version String | Regulatory / Functional Purpose |
|---|---|---|
| Chrome Web Store / `manifest.json` (Chrome) | `0.1.0` | CWS schema validation requires integer-separated digits. |
| Mozilla Add-ons (AMO) / `manifest.json` (Firefox) | `0.1.0` | AMO manifest validation requires integer-separated digits. |
| Node.js Package (`package.json`) | `0.1.0` | Standard semver package identifier. |
| In-App UI Header Badge (`TopNav.tsx`) | `v0.1.0` | User-facing product release version indicator. |
| Release Archive Filenames | `0.1.0-alpha.51` | Milestone-specific distribution packaging identifier. |
| Project Roadmap & Git Tracking | `0.1.0-alpha.51` | Complete project development phase alignment. |

---

## 6. Release Documentation Suite

- **User Installation Guide:** `docs/release/INSTALLATION_GUIDE.md`
- **Distributable Package Manifest:** `docs/release/PACKAGE_MANIFEST.md`
- **Store Listings:**
  - Chrome Web Store Listing: `docs/release/store/CHROME_WEB_STORE_LISTING.md`
  - Firefox Add-ons (AMO) Listing: `docs/release/store/FIREFOX_AMO_LISTING.md`
  - Store Requirements Checklist: `docs/release/store/STORE_REQUIREMENTS_CHECKLIST.md`
- **Privacy Disclosures:**
  - Privacy Policy: `docs/release/privacy/PRIVACY_POLICY.md`
  - Data Handling Disclosure: `docs/release/privacy/DATA_HANDLING_DISCLOSURE.md`
  - Network Interaction Disclosure: `docs/release/privacy/NETWORK_DISCLOSURE.md`
  - Permission Justifications: `docs/release/privacy/PERMISSION_JUSTIFICATIONS.md`
  - Privacy Review Checklist: `docs/release/privacy/PRIVACY_REVIEW_CHECKLIST.md`
- **Visual Assets:**
  - Extension Icons: `public/icon/` (16px, 32px, 48px, 128px, 512px, SVG)
  - Promotional Graphics: `docs/release/assets/promo/` (Small 440x280, Marquee 1400x560)
  - Hi-Res Screenshots: `docs/release/assets/screenshots/` (7 verified screenshots at 1280x800)

---

## 7. Release Candidate Freeze Declaration

This Release Candidate is **FROZEN**. All planned capabilities for Phase 10 are delivered and verified. No further modifications or code changes shall be introduced without a formal new milestone authorization.
