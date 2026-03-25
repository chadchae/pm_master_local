# Changelog

## [2.2.0] - 2026-03-24

### Added
- Plans page: card and rail (kanban) views with drag-and-drop between stage columns
- Plans page: action icons on hover (view, edit, delete, JSON export) for cards and rows
- Plans page: mandalart (LayoutGrid) and diagram (Map) indicator icons on cards — active/inactive state
- Plans page: related person navigation — click person in view tab navigates to `/dashboard/people?highlight={id}`
- People page: highlight and scroll-to on `?highlight={id}` query param (3s ring animation)
- Sidebar: Plans menu item (Map icon)
- Sidebar: Portfolio menu item (Briefcase icon) — placeholder for future development
- Portfolio page (`/dashboard/portfolio`) — "추후 개발 예정" placeholder
- Plans detail: save button at bottom of settings tab with "저장 완료" message, auto-navigates to view tab after 2.5s
- i18n: `sidebar.plans`, `sidebar.portfolio` (ko/en)

### Fixed
- Korean IME 자모분리 in description textarea: local `descDraft` state + `onBlur` sync prevents re-render during composition
- Korean IME 자모분리 in Enter key handlers: `e.nativeEvent.isComposing` guard added to title, PlanBuilder node/edge, MandalartBuilder cell
- PlanEdge model mismatch: backend `source`/`target` fields updated to `fromId`/`toId`/`fromPort`/`toPort`/`label` to match frontend (was causing 422 on plans with edges)

### Changed
- `StageBadge` and `StarRating` extracted as reusable components (removed 3–4 duplicate implementations)
- Backend plan endpoints: added `-> dict` return type hints
- Version bump: 1.4.0 → 2.2.0

---

## [1.4.0] - 2026-03-22

### Added
- Project Notes tab: project-specific notes stored in `_settings/project_note/`
- Global Todo kanban page (`/dashboard/todos`) with 5 columns (Todo, In Progress, Done, Waiting, Archive)
- Quick Todo sidebar panel for cross-project todo overview
- Starred/favorite toggle on todos (synced across project detail, sidebar panel, and todos page)
- Related Projects field with dropdown selector and pill UI on project/idea creation and settings
- Project Status page (`/dashboard/status`) with sortable list view (label, progress, todo, issues, schedule)
- Project Status filters: stage and type checkbox filters with show/hide toggle
- Progress widget in project detail header (subtask completion bar between title and action buttons)
- `RelatedProjectsInput` component (dropdown + pill pattern, matches PeopleTagInput)
- `TodoPanel` sidebar component for quick todo management
- `sync_related_projects_rename()` backend utility for cross-project reference updates
- Todo edit form: assignee, due date, starred fields
- Sidebar navigation: "Todo" and "Status" main menu items
- Sidebar bottom: renamed to "Quick Todo", "Quick Exec", "Quick Status"
- i18n: todo.waiting, todo.archive, subtask.progress, sidebar.todos, sidebar.status

### Fixed
- Markdown viewer text color in light theme (dynamic `data-color-mode` via next-themes)
- Hydration mismatch from `useTheme()` with mounted state guard
- Document creation in Notes tab (auto-create parent directories)
- Duplicate project keys in TodoPanel dropdown (deduplication)
- Todo JSON corruption recovery for ai-work-chagne

### Changed
- Todo columns expanded from 3 to 5: added "waiting" and "archive"
- Backend `/api/todos/all` supports `include_done` parameter and returns label/location/columns
- Version bump: 1.2.0 -> 1.4.0

---

## [1.2.0] - 2026-03-22

### Added
- Focus Mode for dashboard: 2-step workflow (select up to 3 cards, then start focus)
  - Toggle button in header with i18n support (ko/en)
  - Card selection with numbered badges (1, 2, 3)
  - Focus view hides unselected cards while allowing normal navigation
  - State persisted in localStorage via FocusProvider context
- HTML file rendering in document viewer (iframe-based, allows script execution for Chart.js, D3, Mermaid, etc.)
- Mermaid diagram rendering in Markdown viewer (dynamically loaded)
- KaTeX math formula rendering in Markdown viewer (dynamically loaded)
- KaTeX CSS via CDN in root layout
- New npm dependencies: mermaid, katex

### Files
- `frontend/src/lib/focusMode.tsx` (new)
- `frontend/src/lib/i18n.tsx`
- `frontend/src/components/PageHeader.tsx`
- `frontend/src/app/dashboard/layout.tsx`
- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/app/dashboard/projects/[name]/page.tsx`
- `frontend/src/app/dashboard/[type]/page.tsx`
- `frontend/src/app/layout.tsx`
- `frontend/package.json`

---

## [1.0.0] - 2026-03-20

### Milestone
- Official v1.0.0 release
- PM Master Local: Desktop local-only personal project management

### Core Features
- 7-stage project lifecycle (Idea → Initiation → Development → Testing → Completed → Archived → Discarded)
- Dashboard with kanban board + list view + 4 theme variations (A/B/C/D for light/dark)
- Project detail: 6 tabs (Settings, Documents, Todo, Issues, Schedule, Work Orders)
- Schedule/Gantt with milestones, categories (30-color palette), dependencies, today line
- Ideas page with card/list view, drag-drop reorder, type filter
- Server control with card view, dual port status, bulk actions, inline log panel
- People directory with card/list view, inline edit, sortable columns
- In-app modal dialogs (ConfirmDialog, PromptDialog, NewProjectDialog)
- Document viewer with markdown rendering, print/PDF export
- List export (Print/MD/CSV) for all list views
- Type management (rename/delete across all projects)
- Category management (rename/delete with auto-color palette)
- Multi-language (Korean/English), dark/light themes
- One-command setup (setup.sh + run.sh)

---

## v0.3.0 (2026-03-20)

### Added
- Schedule summary widget with real data on dashboard (replaces "Coming soon" placeholder)
- Document print/PDF export button (window.open + window.print)
- AppDialogs system replacing all browser prompt/confirm/alert with in-app modals
- localStorage-based filter persistence for type filters across navigation
- Schedule milestones visible on gantt chart
- Dependency auto-date calculation (start/end derived from dependencies)
- Custom type input in schedule type dropdown
- Dependency tag X-button removal in schedule edit form

### Fixed
- Gantt today line positioned at left edge of day column (was centered due to `dayWidth / 2`)
- Gantt today line renders in front of task bars (DOM order fix, z-20)
- Gantt auto-scroll positions today line at left edge (not center)
- Schedule duration calculation now inclusive (+1 day for correct range)
- Gantt uncategorized task ordering and milestone edit button
- Dashboard filters/sorting, tab order, schedule category/parent-task, gantt labels
- Filter persistence: always show 4 types, split tag columns for sorting
- Milestone top:-2 clipping fixed (overflow-hidden container)

### Changed
- Schedule edit form rendered as card instead of inline
- Wider dependencies column in schedule table
- Gantt date range calculation puts today at left edge

---

## v0.2.0 (2026-03-19)

### Added
- Schedule system with table view, gantt chart, and milestones
- Schedule edit with categories, dependencies enforcement, type filters, project counts
- Subtask system with CRUD, drag reorder, done/cancel status
- Issue tracker with discussion timeline, threaded comments CRUD, status, labels, filter counts
- Issue edit with comment CRUD, filter counts, due date on cards
- Todo kanban with checkbox, assignee, due date, summary widgets
- Project download as ZIP archive
- Card actions (edit/delete/download)
- New project creation buttons
- V1 sync, version labels
- Kanban sublabels (research context: Discussion / Data & Lit Review / Analysis / Writing / Submitted)
- Server log viewer
- Folder drill-down navigation in documents
- Comprehensive development specification document

### Fixed
- Subtask double creation and delete not working
- Card progress bar synced with real subtask counts
- Folder delete in document management

---

## v0.1.0 (2026-03-18)

### Added
- Session export/import (full ZIP backup and restore)
- Password change in user profile modal
- UserSettings saved to backend API (not just sessionStorage)
- Session-scoped LLM settings (provider/model/API key per session)
- Landing page shows login and register forms always visible

---

## v0.0.1 (2026-03-17)

- Initial public release
- macOS bash 3.2 compatibility fix (run.sh)
- Python 3.12.8 migration
- DB seed automation (admin/guest accounts via setup.sh)
- dev.db removed from git tracking
- Copyright footer with auto-version from git tags
- setup.sh one-command installation
- Port allocation: lsof-only (no stale file issue)
