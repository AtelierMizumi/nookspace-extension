# NookSpace — Product Requirements Document (PRD)

## 1. Product Overview
- **Name**: NookSpace
- **Tagline**: Your Space. Your Workflow.
- **Repository**: `nookspace-extension`
- **Target Environments**: Google Chrome, Microsoft Edge, Brave, Chromium-based browsers, and Mozilla Firefox (Desktop).
- **Core Proposition**: A customizable, privacy-first personal productivity workspace that turns the browser's New Tab page into an organized studio for studying, deep work, task management, knowledge capture, and smart website navigation.

---

## 2. Target Persona & Use Cases
1. **The Focused Student / Lifelong Learner**: Needs study tracking, vocabulary management, Pomodoro sessions, and quick access to course materials and reference sites without distractions.
2. **The Software Developer / Knowledge Worker**: Needs a streamlined New Tab dashboard with quick scratch notes, terminal/cheat-sheet resources, GitHub shortcuts, prioritized daily todos, and a clean minimalist aesthetic.
3. **The Organization Enthusiast**: Loves Notion and Linear aesthetics, desires fine-grained control over widget placement, custom themes, wallpapers, and multiple dedicated workspaces (Work, Study, Personal, Side-project).

---

## 3. Product Principles
1. **Customization as Foundation**: Users are not bound to rigid templates. Every widget can be added, removed, configured, rearranged, or resized.
2. **Local-First & Zero Trust**: All notes, tasks, bookmarks, and settings reside in the user's browser IndexedDB. No mandatory login, no tracking, no external API keys required.
3. **Speed & Lightweight Performance**: New Tab must render instantly (< 100ms perceptually). Zero layout shifts, lazy loading for heavy dialogs.
4. **Refined Minimalist Aesthetics**: Inspired by Linear and Notion with subtle borders, intentional typography, smooth micro-interactions, dark/light themes, and custom accent tokens.

---

## 4. Functional Requirements

### Module A: Study & Productivity Dashboard
- **A1. Clock & Dynamic Greeting**: Digital 12h/24h clock, current date, day of week, time-aware greeting ("Good morning", "Good afternoon", "Good evening"), configurable timezone or user display name.
- **A2. Pomodoro Timer**: 25m Focus / 5m Short Break / 15m Long Break intervals (customizable); Start, Pause, Resume, Reset; background alarm support for notifications; daily focus history and minute counts.
- **A3. Study Timer / Stopwatch**: Categorized study sessions (e.g. Coding, Reading, Language, Research), live stopwatch, persist session logs, daily/weekly aggregated summaries.
- **A4. Todo List**: Tasks with Title, Status (`todo`, `in_progress`, `completed`), Priority (`low`, `medium`, `high`, `urgent`), Due Date, Category tags, filtering (All, Active, Completed, Today), sort by date or priority.
- **A5. Calendar & Events**: Local calendar with monthly and weekly agenda views; event creation with color codes, time ranges, and study schedule tagging.
- **A6. Daily Goals & Targets**: Daily quantifiable goals (e.g., "Read 20 pages", "Write 200 lines of code"), target vs completed values, percentage progress bar.
- **A7. Daily Progress & Streaks**: Aggregate completion formula combining completed tasks, daily goals, and focus sessions; streak calculation based on verifiable activity timestamps.

### Module B: Smart Bookmarks
- **B1. Bookmark Groups**: Organized folders/collections with custom titles, icons, and accent colors.
- **B2. Website Shortcuts**: URL validation, custom title, auto-generated domain monogram or favicon, one-click open in new tab, drag-and-drop ordering.
- **B3. Default Categories**: Pre-packaged starter presets (Programming, Learning, Tools, Personal).
- **B4. Utilities**: Quick search bar with instant substring matching, duplicate URL detection, browser bookmark import/export (JSON and standard Netscape bookmark HTML format).

### Module C: Notes & Knowledge
- **C1. Quick Notes**: Fast-capture notes, tags, search query filter, pin to top, custom color tags, autosave with debounced IndexedDB writes.
- **C2. Sticky Notes**: Floating movable cards with freeform canvas coordinates, custom pastel/monochrome tones, resizable boundaries, layered above or beside the grid without disrupting main layout.
- **C3. Vocabulary Manager**: Language learning manager with fields (`word`, `reading`, `meaning`, `exampleSentence`, `exampleTranslation`, `category`, `status: new | learning | mastered`).
- **C4. Resource Library**: Curated URL library with titles, markdown descriptions, tags, and category filters.
- **C5. Safe Markdown Note Editor**: Clean typographic formatting (bold, italic, code blocks, lists, quotes) rendered safely through AST-based sanitization (no unsafe `innerHTML`).

### Module D: Customization Studio
- **D1. Edit Mode**: Dedicated visual editing environment with toggle switch, visual bounding boxes, drag handles, resize edges, widget controls (Settings, Remove), Save and Revert actions.
- **D2. Grid Layout Engine**: Responsive 12-column grid engine supporting snap-to-grid, collision resolution, drag-and-drop, and height/width resizing.
- **D3. Widget Registry & Library**: Central registry defining widget metadata, category (`productivity`, `organization`, `learning`, `personal`, `utilities`), default dimensions, min/max dimensions, and configuration components.
- **D4. Appearance Studio**:
  - Theme: Light, Dark, System auto-detection.
  - Colors: Custom accent presets (Zinc, Violet, Indigo, Emerald, Rose, Amber) and custom hex picker.
  - Typography: System default, Inter, JetBrains Mono, Serif.
  - Transparency & Glassmorphism: Adjustable widget background opacity and backdrop blur.
  - Wallpapers: Curated gradients, clean solid colors, custom user image upload (stored as compressed Blob in IndexedDB).
- **D5. Layout Presets**: Out-of-the-box presets (Minimal, Deep Study, Developer, Balanced Dashboard) with custom layout export and snapshot restoration.

### Module E: Workspace Management
- Multiple independent workspaces (e.g. "Work", "Study", "Personal").
- Separate widget layout, distinct appearance/wallpaper overrides, and filtered productivity views.
- Workspace switcher with modal/dropdown in header.
- Workspace CRUD: Create, Rename, Duplicate, Delete, Reorder.

### Module F: Data Management & Backup
- Complete JSON Export containing all Dexie stores (workspaces, widgets, layouts, todos, notes, bookmarks, sessions).
- JSON Import with strict Zod schema validation, duplicate resolution strategies (overwrite, merge, abort), and automatic pre-import safety backup.

---

## 5. Non-Functional Requirements
- **Privacy & Security**: Zero remote scripts, strict Content Security Policy (CSP), local storage only.
- **Accessibility**: Keyboard navigable widgets, high-contrast text ratios conforming to WCAG AA, `prefers-reduced-motion` compliance.
- **Cross-Browser Parity**: Identical user experience on Chrome, Edge, Brave, and Firefox Desktop.
