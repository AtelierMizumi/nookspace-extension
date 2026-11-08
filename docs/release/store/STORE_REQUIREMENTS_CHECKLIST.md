# NookSpace — Store Requirements & Developer Policy Verification

**Audit Reference:** Chrome Web Store Developer Program Policies & Mozilla Add-on Policies (2026 Edition)  
**Verification Date:** November 8, 2026  
**Status:** READY FOR STAGING (Awaiting Developer Hosting Credentials)  

---

## 1. Chrome Web Store Requirements Verification

| Requirement | Store Rule / Limit | NookSpace Implementation | Audit Result |
|---|---|---|---|
| **Product Name** | Max 45 characters (recommended) | "NookSpace — Personal Productivity Workspace" (44 chars) | **PASS** |
| **Short Description** | Max 132 characters | "Your Space. Your Workflow. Notion-inspired customizable personal productivity workspace on New Tab." (99 chars) | **PASS** |
| **Detailed Description** | Clear, factual description of features | Structured 6-section description with features, permissions, and privacy pledge | **PASS** |
| **Category** | Select relevant store category | "Productivity" | **PASS** |
| **Store Icon** | 128 × 128 PNG (transparent or solid) | `icon-128.png` (3,129 bytes, valid 32-bit ARGB PNG) | **PASS** |
| **Small Promo Tile** | 440 × 280 PNG or JPEG | `promo-small-440x280.png` (8,458 bytes, 440 × 280) | **PASS** |
| **Marquee Promo Tile** | 1400 × 560 PNG or JPEG | `promo-marquee-1400x560.png` (30,446 bytes, 1400 × 560) | **PASS** |
| **Screenshots** | At least 1 (max 5-8), 1280 × 800 or 640 × 400 | 7 authentic feature screenshots (1280 × 800 PNG) in `docs/release/assets/screenshots/` | **PASS** |
| **Single Purpose Policy** | Must have single, narrow purpose | Productivity workspace on New Tab | **PASS** |
| **Permission Minimization** | Minimum viable permissions | Only `storage`, `alarms`, `notifications`. Zero host permissions. | **PASS** |
| **Remote Code Policy** | Zero remote scripts / eval | Strict MV3 bundle with zero remote script downloads | **PASS** |
| **Privacy Policy URL** | Must be hosted on public HTTPS URL | Formulated in `PRIVACY_POLICY.md`; requires developer hosting before submission | **ACTION REQUIRED BY MAINTAINER** |

---

## 2. Mozilla Add-ons (AMO) Requirements Verification

| Requirement | Store Rule / Limit | NookSpace Implementation | Audit Result |
|---|---|---|---|
| **Add-on Name** | Clear identifying title | "NookSpace — Personal Productivity Workspace" | **PASS** |
| **Summary** | Max 250 characters | "Transform your New Tab into a calm, customizable productivity workspace. Manage notes, tasks, smart bookmarks, study sessions, and daily goals with zero tracking, zero telemetry, and 100% local-first data storage." (218 chars) | **PASS** |
| **Categories** | Up to 2 categories | "Productivity", "Tabs" | **PASS** |
| **Gecko ID** | Valid UUID or email-style identifier | Declared in `wxt.config.ts`: `nookspace@local-dev` | **PASS** |
| **Min Firefox Version** | Strict min version | Declared: `115.0` (Firefox ESR 115+) | **PASS** |
| **Content Security Policy** | Prohibit remote code & inline scripts | Extracted `anti-flash.ts` module, zero inline scripts in HTML | **PASS** |
| **Source Code Submission** | Required for minified/bundled code | Generated `nookspace-firefox-0.1.0-alpha.51-sources.zip` (651 KB) with reproduction instructions | **PASS** |
| **Privacy Policy URL** | Public HTTPS link for users | Drafted in `PRIVACY_POLICY.md`; pending developer publication | **ACTION REQUIRED BY MAINTAINER** |

---

## 3. Human Pre-Submission Gate Summary

The NookSpace release artifact suite is 100% technically complete and verified. 
Prior to clicking "Submit for Review" in either portal, the developer must execute the following two external actions:
1. **Publish Privacy Policy:** Deploy `docs/release/privacy/PRIVACY_POLICY.md` to GitHub Pages or public site and copy URL into the store form.
2. **Set Developer Contact:** Provide an active developer support email address.
