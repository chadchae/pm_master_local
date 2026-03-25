# PM Master Local — Directory Structure

---

## Root Layout

```
pm-master-local/
├── frontend/               # Next.js 15 application
├── backend/                # FastAPI application
├── run.sh                  # Unified process manager (start/stop/restart/status/live)
├── setup.sh                # One-time environment setup
├── install.sh              # Dependency installation
├── export.sh               # Data export utility
└── .moai/                  # MoAI project metadata (agents, specs, config)
```

---

## Frontend (`frontend/`)

```
frontend/
├── src/
│   ├── app/                        # Next.js App Router pages
│   │   ├── page.tsx                # Root redirect (→ /dashboard)
│   │   ├── layout.tsx              # Root layout (fonts, providers)
│   │   ├── globals.css             # Global TailwindCSS base styles
│   │   └── dashboard/              # All authenticated pages
│   │       ├── layout.tsx          # Dashboard shell (sidebar, header)
│   │       ├── page.tsx            # /dashboard — 7-stage kanban
│   │       ├── ideas/              # /dashboard/ideas
│   │       ├── projects/
│   │       │   ├── page.tsx        # /dashboard/projects — project list
│   │       │   └── [name]/         # /dashboard/projects/[name] — project detail
│   │       │       └── page.tsx    # 8-tab project detail view
│   │       ├── todos/              # /dashboard/todos — global todos
│   │       ├── status/             # /dashboard/status
│   │       ├── people/             # /dashboard/people
│   │       ├── timeline/           # /dashboard/timeline — Gantt
│   │       ├── servers/            # /dashboard/servers
│   │       ├── plans/              # /dashboard/plans
│   │       ├── portfolio/          # /dashboard/portfolio
│   │       ├── trash/              # /dashboard/trash
│   │       └── [type]/             # /dashboard/[type] — dynamic catch-all
│   │
│   ├── components/                 # 40+ React components
│   │   ├── kanban/                 # KanbanBoard, KanbanCard, StageColumn
│   │   ├── project/                # ProjectDetail, ProjectTabs, tab panels
│   │   ├── editor/                 # MarkdownEditor wrapper
│   │   ├── terminal/               # TerminalPanel (xterm.js)
│   │   ├── gantt/                  # GanttChart (D3-based)
│   │   ├── todos/                  # TodoList, TodoItem, SubtaskList
│   │   ├── issues/                 # IssueList, IssueDetail, IssueForm
│   │   ├── people/                 # PeopleList, PersonCard
│   │   ├── ui/                     # Shared primitives (Button, Modal, Badge, etc.)
│   │   └── layout/                 # Sidebar, Header, Breadcrumb
│   │
│   └── lib/                        # Shared utilities and hooks
│       ├── api.ts                  # Typed API client (all fetch calls)
│       ├── i18n.tsx                # 280+ i18n keys, useTranslation hook
│       ├── stages.ts               # 7-stage definitions, colors, ordering
│       └── useAuth.ts              # JWT auth hook (localStorage)
│
├── next.config.js                  # Next.js config + API rewrite rules
├── tailwind.config.ts              # TailwindCSS theme and plugins
├── tsconfig.json                   # TypeScript compiler options
└── package.json                    # NPM dependencies and scripts
```

### Key Frontend Files

| File | Purpose |
|---|---|
| `app/dashboard/page.tsx` | Main kanban board — entry point for daily use |
| `app/dashboard/projects/[name]/page.tsx` | 8-tab project detail view |
| `components/terminal/TerminalPanel` | xterm.js + WebSocket PTY integration |
| `components/gantt/GanttChart` | D3-powered Gantt with drag handles |
| `lib/api.ts` | Central API client; all backend communication |
| `lib/i18n.tsx` | All UI strings; language switching |
| `lib/useAuth.ts` | JWT token management, login/logout |
| `next.config.js` | `rewrites` that proxy `/api/*` and `/ws/*` to FastAPI |

---

## Backend (`backend/`)

```
backend/
├── main.py                     # FastAPI app factory, router registration, CORS
├── routers/                    # Route handlers (thin controllers)
│   ├── auth.py                 # POST /api/auth/login, /logout, /verify
│   ├── projects.py             # CRUD for projects, stage transitions
│   ├── documents.py            # File read/write inside project folders
│   ├── misc.py                 # Miscellaneous endpoints (search, tags)
│   ├── common.py               # Shared endpoints (health, version)
│   ├── people.py               # People CRUD
│   ├── plans.py                # Plans CRUD
│   └── servers.py              # Local server status monitoring
│
├── services/                   # Business logic layer
│   ├── scanner_service.py      # Scans ~/Projects/ and builds project index
│   ├── auth_service.py         # Password verify, JWT sign/verify
│   ├── schedule_service.py     # Schedule/Gantt data management
│   ├── todo_service.py         # Todo CRUD operations
│   ├── issue_service.py        # Issue tracker CRUD
│   ├── subtask_service.py      # Subtask management (nested under todos/issues)
│   ├── people_service.py       # People directory CRUD
│   ├── plans_service.py        # Plans management
│   ├── document_service.py     # Filesystem document read/write
│   ├── project_service.py      # Project metadata, stage management
│   ├── server_service.py       # Port scanning and process detection
│   └── token_service.py        # JWT token storage and revocation list
│
├── data/                       # Runtime JSON data files (gitignored)
│   ├── auth.json               # Hashed password
│   ├── tokens.json             # Active/revoked JWT tokens
│   ├── todos.json              # All todos across projects
│   ├── issues.json             # All issues across projects
│   ├── schedules.json          # Gantt/schedule data
│   ├── subtasks.json           # Subtask records
│   ├── people.json             # People directory
│   └── plans.json              # Plans data
│
├── requirements.txt            # Python dependencies
└── .env (optional)             # Environment overrides (JWT_SECRET, etc.)
```

### Key Backend Files

| File | Purpose |
|---|---|
| `main.py` | App factory; mounts all routers; CORS; WebSocket route for PTY |
| `services/scanner_service.py` | Recursively walks `~/Projects/`, reads `_project.yaml`, builds in-memory index |
| `services/auth_service.py` | bcrypt verify + PyJWT encode/decode |
| `services/document_service.py` | Safe path traversal for reading/writing markdown files |
| `data/` | All application state; wiping this directory resets app data |

---

## Project Folder Convention (`~/Projects/`)

Each project folder may contain a `_project.yaml` file that PM Master reads:

```
~/Projects/
├── my-research/
│   ├── _project.yaml           # PM metadata (stage, tags, description, priority)
│   ├── README.md
│   └── ...
├── tool-xyz/
│   └── _project.yaml
└── _system/                    # System-level projects (pm-master-local lives here)
    └── pm-master-local/
```

`_project.yaml` structure:
```yaml
stage: development              # idea | initiation | development | testing | completed | archived | discarded
tags: [python, research]
description: "Short description"
priority: high                  # low | medium | high
created: 2024-01-01
```

---

## Data Flow Paths

```
User Action → Next.js page component
           → lib/api.ts (fetch + JWT header)
           → next.config.js rewrite: /api/* → http://localhost:8001/api/*
           → FastAPI router (auth check via dependency)
           → Service layer (business logic)
           → JSON file in backend/data/ OR ~/Projects/**/_project.yaml
           → Response JSON → React state (useState)
           → Re-render
```

Terminal flow:
```
TerminalPanel (xterm.js) → WebSocket /ws/terminal
                         → FastAPI WebSocket handler in main.py
                         → Python pty.fork() in project directory
                         → Shell I/O forwarded over WebSocket
```

---

## Configuration Files

| File | Purpose |
|---|---|
| `frontend/next.config.js` | API proxy rewrites, image domains |
| `frontend/tailwind.config.ts` | Color palette, typography, dark mode |
| `frontend/tsconfig.json` | TypeScript strict mode, path aliases (`@/`) |
| `backend/requirements.txt` | Python package pins |
| `run.sh` | Process management; PID files in `/tmp/` |
| `.moai/config/sections/` | MoAI agent configuration (quality, language, user) |
