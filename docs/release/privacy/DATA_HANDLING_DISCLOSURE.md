# NookSpace — Data Handling & Privacy Practices Disclosure

**Target Platforms:** Chrome Web Store (CWS) & Mozilla Add-ons (AMO)  
**Evaluation Date:** November 8, 2026  
**Version:** 0.1.0-alpha.51  
**Audit Reference:** Source code audit of `src/`, `entrypoints/`, `public/`, and `wxt.config.ts`  

---

## 1. Quick Questionnaire Answers (Store Reviewer Reference)

| Question | Answer | Technical Evidence / Justification |
|---|---|---|
| **Does NookSpace collect personal data?** | **NO** | No user data leaves the client browser. Zero user accounts, zero remote servers. |
| **Does NookSpace sell or transfer user data?** | **NO** | No data is sold, monetized, transferred, or shared with third parties or data brokers. |
| **Does NookSpace use user data for advertising?** | **NO** | Zero ads, zero tracking pixels, zero monetization partners. |
| **Does NookSpace use user data for creditworthiness or lending?** | **NO** | Not applicable; purely a personal productivity dashboard. |
| **Does NookSpace transmit user-generated content?** | **NO** | Notes, tasks, study logs, and bookmark URLs remain strictly local in IndexedDB. |
| **Does NookSpace use analytics or telemetry?** | **NO** | Verified zero calls to Google Analytics, Mixpanel, Sentry, or custom telemetry endpoints. |
| **Does NookSpace use a cloud backend?** | **NO** | Operates 100% offline-first. No API server or cloud database exists. |
| **Does NookSpace synchronize data across devices?** | **NO** | Cross-device synchronization is not implemented; data portability is achieved via manual JSON backup export/import. |
| **Does NookSpace store data locally?** | **YES** | User notes, tasks, layouts, and settings are stored locally in IndexedDB (`NookSpaceDB`). |
| **Does NookSpace send external network requests?** | **YES (Optional)** | Domain-only visual favicon fetch via `https://www.google.com/s2/favicons?domain={domain}&sz=64`. Gracefully falls back to offline icon. |
| **Does NookSpace support deleting data?** | **YES** | Users can delete individual items or wipe all data by uninstalling the extension or clearing browser site data. |
| **Does NookSpace support data export?** | **YES** | One-click Universal JSON Export and Netscape Bookmark HTML Export. |

---

## 2. Chrome Web Store Privacy Practices Form Mapping

When completing the **Privacy practices** tab in the Chrome Web Store Developer Dashboard:

### 2.1. Single Purpose Description
> **"NookSpace provides a customizable, privacy-focused productivity dashboard on the New Tab page to manage tasks, notes, bookmarks, study sessions, and daily workflows locally."**

### 2.2. Permission Justification Descriptions
- **`storage`**: *"Used exclusively to persist ephemeral inter-tab coordination events (theme switching and workspace selection) and Pomodoro countdown state between the background alarm and open New Tab pages without touching external servers."*
- **`alarms`**: *"Used to schedule background timers for the Pomodoro focus and break intervals, ensuring accurate timer completion even if New Tab pages are temporarily closed or backgrounded."*
- **`notifications`**: *"Used to display local system desktop notifications when a Pomodoro focus period or break session concludes."*

### 2.3. Data Usage Category Checkboxes
Under the Chrome Web Store Data Usage list:

| CWS Data Category | Collected? | Stored Locally? | Transmitted? | Notes |
|---|---|---|---|---|
| **Personally Identifiable Information (Name, Address, Email, Phone, etc.)** | **NO** | NO | NO | Not requested or collected. |
| **Health Information** | **NO** | NO | NO | Not collected. |
| **Financial and Payment Information** | **NO** | NO | NO | Zero payment processing. |
| **Authentication Information (Passwords, Credentials)** | **NO** | NO | NO | No user accounts or login credentials. |
| **Personal Communications (Emails, Chat messages)** | **NO** | NO | NO | Not accessed. |
| **Location (GPS, Geolocation)** | **NO** | NO | NO | Not accessed. |
| **Web History (Browsing History, Visited URLs)** | **NO** | NO | NO | Browsing history API is deliberately not requested. |
| **User Activity (Clicks, mouse position, page scrolls)** | **NO** | NO | NO | Zero telemetry or user monitoring. |
| **Website Content (Text, Images, Media)** | **NO** | NO | NO | Content scripts are not injected into web pages. |

### 2.4. Developer Certifications
- [x] *"The developer has disclosed that it will not collect or use your data."*
- [x] *"The developer has disclosed that your data is not being sold to third parties, outside of the approved use cases."*
- [x] *"The developer has disclosed that your data is not being used or transferred for purposes that are unrelated to the item's core functionality."*
- [x] *"The developer has disclosed that your data is not being used or transferred to determine creditworthiness or for lending purposes."*

---

## 3. Mozilla Add-ons (AMO) Privacy Questionnaire Mapping

For the Mozilla Add-on Developer Hub submission:

1. **Does your add-on collect user data?**
   - **Answer:** **No.** NookSpace does not collect, transmit, or process user personal data on external servers. All user notes, tasks, and configurations are stored client-side in the browser's local IndexedDB.
2. **Does your add-on access user data outside the browser?**
   - **Answer:** **No.**
3. **Does your add-on contain analytics or tracking?**
   - **Answer:** **No.**
4. **Does your add-on communicate with external servers?**
   - **Answer:** **Yes, for optional favicon images only.** When displaying user-saved bookmarks, the extension requests standard website icons from Google's public favicon service (`https://www.google.com/s2/favicons?domain={domain}&sz=64`) using only the bookmark's extracted domain name. No personal user data or URLs with paths/query parameters are sent. An offline vector icon is rendered if network requests are unavailable or fail.
