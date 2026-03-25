# Codemaps — Dependencies

---

## Frontend Dependencies (npm)

### Core Framework

| Package | Role |
|---|---|
| `next` (15.x) | App Router, SSR/SSG, API proxy rewrites |
| `react` (19.x) | UI component model |
| `react-dom` (19.x) | DOM rendering |
| `typescript` (5.x) | Type safety |

### Styling

| Package | Role |
|---|---|
| `tailwindcss` (3.4) | Utility-first CSS |
| `postcss` | CSS processing pipeline for Tailwind |
| `autoprefixer` | Vendor prefix injection |

### Editors and Visualization

| Package | Role |
|---|---|
| `@uiw/react-md-editor` | Split-pane markdown editor with preview |
| `xterm` | Terminal emulator (WebSocket PTY) |
| `@xterm/addon-fit` | xterm.js resize addon |
| `d3` (7.x) | Gantt chart SVG rendering |
| `mermaid` (10.x) | Diagram rendering within markdown preview |
| `katex` | Math formula rendering (LaTeX) |

### Utilities

| Package | Role |
|---|---|
| `@types/node`, `@types/react`, `@types/react-dom`, `@types/d3` | TypeScript type definitions |
| `eslint`, `eslint-config-next` | Linting |

---

## Backend Dependencies (pip)

### Core Framework

| Package | Role |
|---|---|
| `fastapi` | Async REST API + WebSocket support |
| `uvicorn[standard]` | ASGI server (with uvloop and httptools) |
| `pydantic` (v2) | Request/response model validation |

### Auth

| Package | Role |
|---|---|
| `PyJWT` (2.x) | JWT token encoding and decoding |
| `bcrypt` (4.x) | Password hashing (cost factor ~12) |
| `python-multipart` | Form data parsing (login endpoint) |

### Data Handling

| Package | Role |
|---|---|
| `pyyaml` (6.x) | Parse `_project.yaml` frontmatter files |
| `aiofiles` | Async file I/O for document read/write |

### System

| Package | Role |
|---|---|
| `psutil` | Process inspection for server monitoring |
| `pty` (stdlib) | PTY fork for terminal sessions |
| `websockets` | WebSocket protocol support |

---

## Internal Module Dependency Graph

### Backend

```
main.py
├── routers/auth.py
│   ├── services/auth_service.py  → data/auth.json
│   └── services/token_service.py → data/tokens.json
│
├── routers/projects.py
│   ├── services/scanner_service.py → ~/Projects/ (filesystem scan)
│   └── services/project_service.py → ~/Projects/**/_project.yaml
│
├── routers/documents.py
│   └── services/document_service.py → ~/Projects/**/* (file I/O)
│
├── routers/people.py
│   └── services/people_service.py → data/people.json
│
├── routers/plans.py
│   └── services/plans_service.py → data/plans.json
│
├── routers/servers.py
│   └── services/server_service.py → (live port scan)
│
├── routers/misc.py (cross-service: scanner + project)
├── routers/common.py (health, scanner trigger)
│
└── WebSocket /ws/terminal
    └── pty.fork() → shell process
```

### Frontend

```
app/dashboard/page.tsx
└── lib/api.ts
    └── lib/useAuth.ts → localStorage

components/kanban/KanbanBoard
└── components/kanban/StageColumn
    └── components/kanban/KanbanCard
        └── lib/stages.ts

app/dashboard/projects/[name]/page.tsx
└── components/project/ProjectDetail
    ├── components/project/ProjectTabs
    ├── components/project/OverviewPanel
    ├── components/editor/MarkdownEditor
    │   └── @uiw/react-md-editor
    ├── components/todos/TodoPanel
    │   └── components/todos/TodoItem
    │       └── components/todos/SubtaskList
    ├── components/issues/IssuePanel
    ├── components/gantt/SchedulePanel
    │   └── components/gantt/GanttChart
    │       └── d3
    ├── components/terminal/TerminalPanel
    │   └── xterm + WebSocket
    └── components/people/PeoplePanel
```

---

## Critical Dependency Notes

### pty (Python stdlib)

The embedded terminal depends on `pty.fork()` which is POSIX-only. This is not available on Windows. The WebSocket terminal feature is macOS/Linux only.

### xterm.js + WebSocket protocol

`TerminalPanel` opens a raw WebSocket to `/ws/terminal`. The message protocol is binary (PTY output bytes) in one direction and text commands in the other. The xterm `FitAddon` must be attached before the terminal is opened to avoid resize glitches.

### D3 and React 19

D3 mutates the DOM directly (SVG elements). The `GanttChart` component uses a `useRef` to a container div and hands it to D3. This bypasses React's virtual DOM for the chart area. Updates require explicit D3 re-render calls, not React re-renders.

### @uiw/react-md-editor and Next.js SSR

The markdown editor uses `window` APIs and must be loaded with `dynamic(() => import(...), { ssr: false })` in Next.js to avoid hydration errors.

### bcrypt and Python 3.12

`bcrypt` 4.x is compatible with Python 3.12. Earlier versions (3.x) have issues with Python 3.12's removed legacy APIs. Pin to 4.x minimum.

### PyJWT secret persistence

If `JWT_SECRET` is not set as an environment variable, the application generates a random secret on startup. This invalidates all existing tokens on every restart. Set `JWT_SECRET` explicitly in the shell environment for persistent sessions.
