# PM Master Local — Product Definition

**Version:** 2.2.0
**Type:** Full-stack web application (Next.js 15 + FastAPI)
**Status:** Active

---

## Project Description

PM Master Local is a privacy-first, local-only personal project management system for researchers and developers. It treats the `~/Projects/` directory as its database — no cloud sync, no external services, no accounts. The application scans your filesystem at startup, surfaces your project portfolio in a structured 7-stage lifecycle, and provides full task, issue, document, and timeline management from a single browser tab.

---

## Target Audience

**Primary:** Researchers and developers who:
- Work across many self-contained project folders
- Need project tracking without cloud exposure
- Prefer a local-first, single-machine workflow
- Use macOS as their primary development environment

**Secondary:** Power users who want a unified dashboard over an existing `~/Projects/` folder structure without restructuring their files.

---

## Core Features

### Project Lifecycle Management
- 7-stage kanban: Idea → Initiation → Development → Testing → Completed → Archived → Discarded
- Per-stage project cards with metadata, tags, priority, and progress
- Drag-and-drop stage transitions
- Bulk stage operations

### Project Detail (8-tab panel)
- **Overview** — Project metadata, README preview, quick stats
- **Documents** — Full markdown editor with preview (@ uiw/react-md-editor), file tree navigation
- **Todos** — Hierarchical todo list with subtasks, due dates, priority
- **Issues** — Issue tracker with status, labels, assignee, and comments
- **Schedule** — Gantt chart built with D3 (timeline, milestones, dependencies)
- **People** — Team member profiles linked to project
- **Plans** — High-level planning notes and milestones
- **Terminal** — Embedded xterm.js terminal with WebSocket PTY (runs in project root)

### Dashboard Views
- `/dashboard` — 7-stage kanban board (all projects)
- `/dashboard/ideas` — Idea stage filtered view
- `/dashboard/projects` — List/grid view of all projects
- `/dashboard/todos` — Global todo aggregation across projects
- `/dashboard/status` — Status and activity overview
- `/dashboard/people` — People directory
- `/dashboard/timeline` — Cross-project Gantt/timeline
- `/dashboard/servers` — Local server status monitoring
- `/dashboard/plans` — Plans overview
- `/dashboard/portfolio` — Portfolio summary view
- `/dashboard/trash` — Discarded/archived projects

### Authentication
- Single shared-password model (suitable for single-user local use)
- bcrypt hashing, JWT token, localStorage persistence
- No multi-user or role-based access control

### Data Storage
- Zero-database architecture — all data stored as JSON files in `backend/data/`
- Project metadata stored as `_project.yaml` frontmatter within each project folder
- Filesystem scan at startup via `scanner_service`

### Internationalization
- 280+ i18n keys managed in `frontend/src/lib/i18n.tsx`
- Multi-language UI support

### Embedded Terminal
- xterm.js frontend + WebSocket backend PTY
- Opens in the context of the selected project directory
- Full terminal emulation (resize, color, keyboard shortcuts)

### Markdown & Diagrams
- `@uiw/react-md-editor` for split-pane editing
- Mermaid diagram rendering (flowcharts, sequence, Gantt)
- KaTeX math rendering

---

## Non-Goals / Out of Scope

| Item | Reason |
|---|---|
| Cloud sync or remote access | Local-only by design; privacy requirement |
| Multi-user collaboration | Single-user architecture; no user accounts |
| Mobile / tablet UI | Desktop-first; not optimized for small screens |
| Windows / Linux support | macOS-targeted; PTY and path conventions assume POSIX |
| Real-time collaboration | No websocket multi-user or conflict resolution |
| Plugin ecosystem | No extension API |
| Database (SQL/NoSQL) | Intentionally file-based for portability |
| CI/CD integrations | Out of scope for personal-use tool |

---

## Key Constraints

| Constraint | Detail |
|---|---|
| **Local-only** | No network requests to external services; all API calls go to `localhost` |
| **Single-user** | One shared password; JWT has no per-user identity |
| **macOS** | PTY via `pty` Python module; shell defaults to `/bin/zsh`; paths assume POSIX |
| **Filesystem as DB** | `~/Projects/` folder structure is canonical; renaming a folder changes the project identity |
| **No migration tooling** | No schema migrations; JSON files are append/overwrite only |
| **Port conventions** | Frontend: `3001`, Backend: `8001` (Local); different ports for Online variant |
