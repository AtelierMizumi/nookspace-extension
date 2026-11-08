# NookSpace ✦ Your Space. Your Workflow.

> A customizable, privacy-first personal productivity workspace that turns your browser's New Tab and homepage into an organized studio for studying, deep work, task management, knowledge capture, web search, and smart website navigation. Built for Google Chrome, Microsoft Edge, Brave, Cốc Cốc, and Zen Browser / Mozilla Firefox.

---

## ✨ Features

- 🔍 **Integrated Web Search & Direct Navigation**:
  - Prominent dashboard search bar supporting **Google**, **Microsoft Bing**, and **DuckDuckGo**.
  - Direct URL and domain navigation (`github.com`, `localhost:3000`, `developer.mozilla.org`) without passing through search engines.
  - Built-in defense defanging malicious protocol schemes (`javascript:`, `data:`, `file:`).
  - Quick keyboard shortcuts: `/` to focus, `Ctrl + K` (or `Cmd + K`) to search, and `Escape` to clear.
- 🌐 **Complete Bilingual System (Tiếng Việt & English)**:
  - Instant language switching without page reload.
  - Automatic first-launch browser language detection (`vi` vs `en`).
  - Dynamic locale-aware formatting (`vi-VN` vs `en-US`) for dates, times, numbers, and calendar headers.
  - Zero modification to user-generated data (notes, tasks, bookmarks remain 100% in their original language).
- 🖥️ **Full-Viewport Browser Home**:
  - Occupies 100% of the available content viewport (`100dvh` / `100vh`) with clean responsive layout up to 1600px.
  - Smooth vertical scrolling when widget instances exceed screen height.
  - Configurable browser startup behavior (New Tab Only, Browser Startup, Both, Keep Browser Defaults).
  - Native Zen Browser compatibility (Gecko New Tab override + `chrome_settings_overrides.homepage`).
- 🕒 **Study & Productivity Dashboard**:
  - Digital clock, dynamic localized greetings, Pomodoro timer with alarm/notifications, study stopwatch, priority-based todo list, calendar event scheduler, and streak tracking.
- 🔖 **Smart Bookmarks**:
  - Custom bookmark groups, website shortcuts with domain monograms/favicons, instant fuzzy search, HTML import/export, and JSON backup.
- 📝 **Notes & Knowledge**:
  - Quick notes with color tags, freeform floating sticky notes, vocabulary flashcard manager, curated resource library, and safe Markdown rendering.
- 🎨 **Customization Studio & Wallpaper Engine**:
  - Visual drag-and-drop 12-column grid editor across 5 breakpoints (`lg`, `md`, `sm`, `xs`, `xxs`).
  - Dynamic themes (Light, Dark, Custom accents) and widget opacity/blur sliders.
  - **Custom Background Wallpapers**: Local image uploads (JPG, PNG, WebP up to 10MB stored in IndexedDB) and remote HTTPS image URLs.
  - 4 Wallpaper Display Modes (`Cover`, `Contain`, `Stretch`, `Center`) with Dark Overlay intensity controls (`0%`, `25%`, `50%`, `75%`) for optimal text readability.
- 🗂️ **Multi-Workspace Engine**:
  - Switch seamlessly between dedicated workspaces (e.g., *Study*, *Development*, *Personal*) with independent layouts and configurations.
- 🔒 **Local-First & Privacy-Focused**:
  - Zero mandatory accounts, zero cloud dependencies, zero telemetry, zero analytics.
  - 100% of your data resides securely in your browser's local IndexedDB.

---

## 🛠️ Technology Stack

- **Extension Framework**: [WXT](https://wxt.dev/) (Next-generation web extension framework built on Vite)
- **UI Framework**: React 18 + TypeScript (Strict mode)
- **Styling**: Tailwind CSS + CSS Variables for dynamic design tokens
- **Icons**: Lucide React
- **State Management**: Zustand
- **Local Database**: IndexedDB wrapped with Dexie.js
- **Grid Layout Engine**: `react-grid-layout`
- **Validation**: Zod
- **Testing**: Vitest + React Testing Library (165 test files, 1,263+ unit & integration tests)

---

## 🚀 Getting Started & Installation

### 1. Developer Setup
```bash
# Clone the repository
git clone https://github.com/giabaoqh/nookspace-extension.git
cd nookspace-extension

# Install dependencies
npm install

# Run TypeScript compilation check
npm run compile

# Run full test suite (100% pass rate)
npm test
```

### 2. Building Distribution Packages
```bash
# Build Chromium MV3 (Chrome, Edge, Brave, Cốc Cốc)
npm run build
# Output: .output/chrome-mv3/

# Build Firefox / Gecko MV2 (Firefox, Zen Browser)
npm run build:firefox
# Output: .output/firefox-mv2/
```

### 3. Installing in Browsers

#### Google Chrome / Microsoft Edge / Brave / Cốc Cốc:
1. Open `chrome://extensions` (or `edge://extensions`, `coccoc://extensions`).
2. Toggle **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the folder:
   ```text
   D:\NookSpace\.output\chrome-mv3
   ```
4. Open a new tab (`Ctrl + T`) to launch NookSpace.

#### Zen Browser / Mozilla Firefox:
1. Open Zen Browser or Firefox.
2. Navigate to:
   ```text
   about:debugging#/runtime/this-firefox
   ```
3. Click **Load Temporary Add-on...** and select:
   ```text
   D:\NookSpace\.output\firefox-mv2\manifest.json
   ```
4. **Crucial for Zen Browser:**
   - Open `about:config` in Zen's address bar.
   - Search for `zen.urlbar.replace-newtab` and toggle it to **`false`**.
   - Press `Ctrl + T` to enjoy NookSpace as your Zen New Tab!

---

## 📁 Repository Structure

```
nookspace-extension/
├── docs/                      # Living architectural & user documentation
│   ├── PRD.md                 # Product Requirements Document
│   ├── ARCHITECTURE.md        # Technical Architecture & Schema Design
│   ├── ROADMAP.md             # Development Roadmap (Phases 0–10 complete)
│   ├── PROJECT_CONTEXT.md     # Current State & Decisions
│   ├── CHANGELOG.md           # Version History
│   ├── release/               # Installation Guide & Release Notes
│   └── reports/POST_ROADMAP/  # Post-Roadmap Enhancement Reports
├── entrypoints/               # WXT Extension Entrypoints
│   ├── newtab/                # Main New Tab & Homepage Application
│   ├── popup/                 # Quick Extension Action Popup
│   └── background.ts          # Background Service Worker / Alarms
├── src/
│   ├── components/            # UI Primitives & Layout Shell (AppShell, TopNav, Header)
│   ├── features/              # Feature Modules (Search, Preferences, Workspaces, Notes, etc.)
│   ├── widgets/               # Pluggable Widgets (Clock, Tasks, Pomodoro, Calendar, etc.)
│   ├── services/              # Database (Dexie), i18n Engine, Browser APIs
│   ├── stores/                # Zustand UI Stores (Settings, Layout, Customization)
│   ├── types/                 # Shared TypeScript Interfaces & Schemas
│   └── utils/                 # Utility Functions
├── tests/                     # 163 Test Suites (Unit, Integration & E2E)
├── AGENTS.md                  # Development Conventions & Guidelines
├── README.md                  # Project Overview & Manual
└── wxt.config.ts              # Cross-Browser WXT Configuration
```

---

## 📄 Documentation Links
- [Installation Guide & User Manual](./docs/release/INSTALLATION_GUIDE.md)
- [Search Dropdown, Custom Backgrounds & Localization Report](./docs/reports/POST_ROADMAP/SEARCH_BACKGROUND_AND_LOCALIZATION_REPORT.md)
- [Zen Browser Compatibility Report](./docs/reports/POST_ROADMAP/ZEN_BROWSER_HOMEPAGE_COMPATIBILITY_REPORT.md)
- [Full-Viewport Search & Localization Report](./docs/reports/POST_ROADMAP/FULL_VIEWPORT_SEARCH_AND_LOCALIZATION_REPORT.md)
- [Product Requirements Document (PRD)](./docs/PRD.md)
- [Technical Architecture](./docs/ARCHITECTURE.md)
- [Agent & Contributor Guidelines](./AGENTS.md)
