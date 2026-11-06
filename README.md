# NookSpace ✦ Your Space. Your Workflow.

> A customizable, privacy-first personal productivity workspace that turns your browser's New Tab page into an organized studio for studying, deep work, task management, knowledge capture, and smart website navigation. Built for Google Chrome, Microsoft Edge, Brave, and Mozilla Firefox.

---

## ✨ Features

- 🕒 **Study & Productivity Dashboard**: Digital clock, dynamic greetings, Pomodoro timer with sound/notifications, study stopwatch, priority-based todo list, calendar event scheduler, and streak tracking.
- 🔖 **Smart Bookmarks**: Custom bookmark groups, website shortcuts with domain monograms/favicons, instant fuzzy search, and import/export capabilities.
- 📝 **Notes & Knowledge**: Quick notes with color tags, freeform floating sticky notes, vocabulary flashcard manager, curated resource library, and safe Markdown rendering.
- 🎨 **Customization Studio**: Full visual drag-and-drop 12-column grid editor, dynamic themes (Light, Dark, Custom accents), widget opacity/blur sliders, and custom wallpaper support.
- 🗂️ **Multi-Workspace Engine**: Switch seamlessly between dedicated workspaces (e.g., *Study*, *Development*, *Personal*) with independent layouts and configurations.
- 🔒 **Local-First & Privacy-Focused**: Zero mandatory accounts, zero cloud dependencies, zero telemetry. 100% of your data remains in your browser's local IndexedDB.

---

## 🛠️ Technology Stack

- **Extension Framework**: [WXT](https://wxt.dev/) (Next-generation web extension framework built on Vite)
- **UI Framework**: React + TypeScript (Strict mode)
- **Styling**: Tailwind CSS + CSS Variables for dynamic design tokens
- **Icons**: Lucide React
- **State Management**: Zustand (UI state)
- **Local Database**: IndexedDB wrapped with Dexie.js
- **Grid Layout Engine**: `react-grid-layout`
- **Validation**: Zod
- **Testing**: Vitest + React Testing Library

---

## 📁 Repository Structure

```
nookspace-extension/
├── docs/                      # Architectural and project documentation
│   ├── PRD.md                 # Product Requirements Document
│   ├── ARCHITECTURE.md        # Technical Architecture & Schema
│   ├── ROADMAP.md             # Development Phases & Milestones
│   ├── PROJECT_CONTEXT.md     # Current State & Decisions
│   └── CHANGELOG.md           # Version History
├── entrypoints/               # WXT Extension Entrypoints
│   ├── newtab/                # Main New Tab Application
│   ├── popup/                 # Quick Extension Action Popup
│   └── background.ts          # Background Service Worker / Alarms
├── src/
│   ├── components/ui/         # Design System UI Primitives
│   ├── features/              # Feature Modules (Todo, Pomodoro, etc.)
│   ├── widgets/               # Pluggable Widget Implementations
│   ├── services/              # Platform & Domain Services (DB, Browser API)
│   ├── stores/                # Zustand UI Stores
│   ├── types/                 # Shared TypeScript Interfaces & Schemas
│   └── utils/                 # Utility Functions
├── tests/                     # Unit, Integration & Component Tests
├── AGENTS.md                  # Development Conventions for AI & Contributors
├── README.md                  # Project Readme
└── wxt.config.ts              # WXT Configuration
```

---

## 📄 Documentation Links
- [Product Requirements Document (PRD)](./docs/PRD.md)
- [Architecture & Technical Design](./docs/ARCHITECTURE.md)
- [Development Roadmap](./docs/ROADMAP.md)
- [Agent & Contributor Guidelines](./AGENTS.md)
