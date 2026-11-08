# NookSpace — Privacy & Submission Pre-Flight Checklist

**Document Version:** 1.0.0  
**Audit Target:** Version 0.1.0-alpha.51 Release Readiness  
**Evaluation Date:** November 8, 2026  

---

## 1. Automated & Technical Verification Status

| Checklist Item | Required Standard | Current Implementation | Status |
|---|---|---|---|
| **Zero External Analytics** | Zero tracking scripts or beacons | Verified 0 telemetry calls in entire codebase. | **VERIFIED** |
| **Local-First Data Model** | 100% user data in client IndexedDB | All 17 tables reside in client-side `NookSpaceDB`. | **VERIFIED** |
| **Minimal Permissions** | Principle of Least Privilege | Limited strictly to `storage`, `alarms`, `notifications`. Zero host permissions. | **VERIFIED** |
| **No Broad URL Access** | No `<all_urls>` or script injection | Sandboxed strictly to `chrome_url_overrides.newtab`. | **VERIFIED** |
| **Content Security Policy** | Prohibit remote scripts & inline `eval()` | Strict CSP `script-src 'self'`. Zero inline scripts. | **VERIFIED** |
| **Network Transparency** | Disclose all external endpoints | Disclosed Google S2 Favicon service with domain-only query and offline fallback. | **VERIFIED** |
| **Data Portability** | User owns their data | Complete Universal JSON Export and Netscape HTML Bookmark Export available. | **VERIFIED** |
| **Safe Deletion** | Complete wipe capability | In-app item deletion + total wipe on extension uninstall. | **VERIFIED** |

---

## 2. Developer Action Items (Required Prior to Store Submission)

The following items cannot be automated and must be finalized by the extension maintainer prior to initiating public submission in the developer consoles:

### 2.1. Public Privacy Policy Hosting
- [ ] **Action:** Host the markdown content from `docs/release/privacy/PRIVACY_POLICY.md` on a publicly accessible HTTPS website (e.g., GitHub Pages, personal portfolio, or project website).
- [ ] **Action:** Replace placeholder `[PUBLIC PRIVACY POLICY URL REQUIRED BEFORE STORE SUBMISSION]` in store metadata with the live URL (e.g., `https://giabaoqh.github.io/nookspace/privacy`).

### 2.2. Developer Contact Information
- [ ] **Action:** Establish a dedicated developer support email (e.g., `support@nookspace.app` or personal developer email).
- [ ] **Action:** Replace `[DEVELOPER CONTACT INFORMATION REQUIRED BEFORE PUBLICATION]` in `PRIVACY_POLICY.md` and store metadata forms.

### 2.3. Developer Account Verification
- [ ] **Chrome Web Store:** Complete identity verification and pay one-time $5 developer registration fee if not already completed.
- [ ] **Mozilla Add-ons (AMO):** Create or log into Mozilla Add-on developer account with Two-Factor Authentication (2FA) enabled.

---

## 3. Pre-Submission Quality Gate Verification

- [x] Full automated test suite passes: 1,167 tests across 152 test suites (100% pass rate).
- [x] TypeScript strict compilation: 0 errors (`npm run compile`).
- [x] Chromium MV3 production bundle generated without errors (`.output/chrome-mv3`).
- [x] Firefox MV2 production bundle generated without errors (`.output/firefox-mv2`).
- [x] Production zip archives packaged and checksummed in `release/`.
- [x] Placeholder 70-byte icons eliminated and replaced with crisp multi-resolution PNGs (16, 32, 48, 128, 512).
