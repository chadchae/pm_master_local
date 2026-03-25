# Codemaps — Module Reference

---

## Backend Routers (8)

All routers are mounted in `backend/main.py` with their respective prefixes.

| Router | File | Prefix | Responsibility |
|---|---|---|---|
| **auth** | `routers/auth.py` | `/api/auth` | Login, logout, token verification. Delegates to `auth_service` and `token_service`. |
| **projects** | `routers/projects.py` | `/api/projects` | List all projects, get single project, update stage, update metadata. Delegates to `project_service` and `scanner_service`. |
| **documents** | `routers/documents.py` | `/api/documents` | List files, read file content, write file content within a project folder. Delegates to `document_service`. |
| **misc** | `routers/misc.py` | `/api/misc` | Search across projects, tag management, and other cross-cutting endpoints. |
| **common** | `routers/common.py` | `/api` | Health check (`/api/health`), version info, rescan trigger. |
| **people** | `routers/people.py` | `/api/people` | People directory CRUD. Delegates to `people_service`. |
| **plans** | `routers/plans.py` | `/api/plans` | Plans CRUD. Delegates to `plans_service`. |
| **servers** | `routers/servers.py` | `/api/servers` | Local server port scanning and process identification. Delegates to `server_service`. |

---

## Backend Services (12)

Services contain all business logic and own their respective data files.

| Service | File | Data File | Responsibility |
|---|---|---|---|
| **scanner_service** | `services/scanner_service.py` | `~/Projects/` | Recursively walks `~/Projects/`, reads `_project.yaml` from each folder, builds an in-memory project index. Called at startup and on rescan requests. |
| **auth_service** | `services/auth_service.py` | `data/auth.json` | Reads stored bcrypt hash, verifies submitted password, signs JWT via PyJWT. |
| **token_service** | `services/token_service.py` | `data/tokens.json` | Tracks issued tokens and maintains revocation list. Called on logout. |
| **project_service** | `services/project_service.py` | `~/Projects/**/_project.yaml` | Reads and writes `_project.yaml` files for metadata and stage transitions. |
| **document_service** | `services/document_service.py` | `~/Projects/**/*` | Traverses project directory, reads/writes markdown and text files. Enforces path safety (no `..` traversal). |
| **todo_service** | `services/todo_service.py` | `data/todos.json` | Todo CRUD; each todo record includes `project` field for cross-project aggregation. |
| **subtask_service** | `services/subtask_service.py` | `data/subtasks.json` | Subtask records nested under todo or issue IDs. |
| **issue_service** | `services/issue_service.py` | `data/issues.json` | Issue tracker CRUD; fields: title, description, status, labels, project. |
| **schedule_service** | `services/schedule_service.py` | `data/schedules.json` | Gantt item CRUD; fields: project, name, start, end, dependencies, milestones. |
| **people_service** | `services/people_service.py` | `data/people.json` | People directory CRUD; linked to projects by name. |
| **plans_service** | `services/plans_service.py` | `data/plans.json` | Plans CRUD; high-level planning notes per project. |
| **server_service** | `services/server_service.py` | _(live scan)_ | Scans active ports using `psutil` or `lsof`, identifies running processes. |

---

## Frontend Components

### Layout Components

| Component | Location | Purpose |
|---|---|---|
| `DashboardLayout` | `app/dashboard/layout.tsx` | Shell wrapper: sidebar navigation + top header |
| `Sidebar` | `components/layout/Sidebar` | 7-stage nav links, active state, collapse toggle |
| `Header` | `components/layout/Header` | Project title, breadcrumb, user actions |

### Kanban

| Component | Location | Purpose |
|---|---|---|
| `KanbanBoard` | `components/kanban/KanbanBoard` | Root kanban container; renders 7 `StageColumn` instances |
| `StageColumn` | `components/kanban/StageColumn` | Single stage column; project card list + drop target |
| `KanbanCard` | `components/kanban/KanbanCard` | Individual project card; shows name, tags, priority, stage controls |

### Project Detail

| Component | Location | Purpose |
|---|---|---|
| `ProjectDetail` | `components/project/ProjectDetail` | Top-level 8-tab panel for a single project |
| `ProjectTabs` | `components/project/ProjectTabs` | Tab bar; controls which panel is active |
| `OverviewPanel` | `components/project/OverviewPanel` | Project metadata, README preview, quick stats |
| `DocumentsPanel` | `components/project/DocumentsPanel` | File tree + markdown editor integration |
| `TodoPanel` | `components/todos/TodoPanel` | Hierarchical todo list with subtasks |
| `IssuePanel` | `components/issues/IssuePanel` | Issue list with filters and detail view |
| `SchedulePanel` | `components/gantt/SchedulePanel` | Gantt chart wrapper |
| `PeoplePanel` | `components/people/PeoplePanel` | Project-scoped people list |
| `PlansPanel` | `components/project/PlansPanel` | Plans editor |
| `TerminalPanel` | `components/terminal/TerminalPanel` | xterm.js WebSocket terminal |

### Editor

| Component | Location | Purpose |
|---|---|---|
| `MarkdownEditor` | `components/editor/MarkdownEditor` | Wraps `@uiw/react-md-editor`; handles save state and debounce |

### Charts and Visualization

| Component | Location | Purpose |
|---|---|---|
| `GanttChart` | `components/gantt/GanttChart` | D3 SVG Gantt; drag-resize bars, milestone markers |
| `TimelineView` | `app/dashboard/timeline/page.tsx` | Cross-project timeline aggregation |

### Todos and Issues

| Component | Location | Purpose |
|---|---|---|
| `TodoList` | `components/todos/TodoList` | List of `TodoItem` with completion toggle |
| `TodoItem` | `components/todos/TodoItem` | Single todo row with subtask expand |
| `SubtaskList` | `components/todos/SubtaskList` | Nested subtask rows |
| `IssueList` | `components/issues/IssueList` | Filterable issue rows |
| `IssueForm` | `components/issues/IssueForm` | Create/edit issue modal |

### Shared UI Primitives

| Component | Location | Purpose |
|---|---|---|
| `Button`, `Badge`, `Modal` | `components/ui/` | Design system primitives |
| `StageTag` | `components/ui/StageTag` | Colored stage label using `stages.ts` definitions |

---

## Frontend Library Modules

| Module | File | Purpose |
|---|---|---|
| `api` | `lib/api.ts` | All fetch calls to the backend; typed request/response; attaches JWT header |
| `i18n` | `lib/i18n.tsx` | 280+ translation keys; `useTranslation()` hook; language detection |
| `stages` | `lib/stages.ts` | 7-stage definitions: id, label, color, order, icon |
| `useAuth` | `lib/useAuth.ts` | JWT state from localStorage; `login()`, `logout()`, `isAuthenticated` |
