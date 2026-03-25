# Codemaps — Architecture Overview

---

## System Architecture (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          BROWSER (localhost:3001)                        │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  Kanban      │  │  Project     │  │  Timeline    │  │  Terminal  │  │
│  │  Dashboard   │  │  Detail      │  │  Gantt       │  │  (xterm.js)│  │
│  │  (7 stages)  │  │  (8 tabs)    │  │  (D3)        │  │            │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  │
│         │                 │                 │                 │         │
│  ┌──────┴─────────────────┴─────────────────┘                │         │
│  │           lib/api.ts (typed fetch client)                  │         │
│  │           useAuth.ts (JWT from localStorage)               │         │
│  └────────────────────────┬──────────────────────────────────┤         │
│                           │ HTTP /api/*                       │ WS      │
└───────────────────────────┼───────────────────────────────────┼─────────┘
                            │ next.config.js rewrites            │
                            ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         FastAPI (localhost:8001)                         │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                        Routers (8)                               │   │
│  │  auth │ projects │ documents │ misc │ common │ people │ plans    │   │
│  │  servers                                                         │   │
│  └──────────────────────────┬───────────────────────────────────────┘   │
│                             │                                           │
│  ┌──────────────────────────▼───────────────────────────────────────┐   │
│  │                       Services (12)                              │   │
│  │  scanner │ auth │ schedule │ todo │ issue │ subtask │ people     │   │
│  │  plans │ document │ project │ server │ token                     │   │
│  └────────┬───────────────────────────────────────────┬────────────┘   │
│           │                                           │                 │
│           ▼                                           ▼                 │
│  ┌──────────────────┐                    ┌────────────────────────┐    │
│  │  backend/data/   │                    │   ~/Projects/          │    │
│  │  JSON files      │                    │   **/_project.yaml     │    │
│  │  (todos, issues, │                    │   **/README.md         │    │
│  │   schedules,     │                    │   (filesystem scan)    │    │
│  │   people, plans, │                    └────────────────────────┘    │
│  │   auth, tokens)  │                                                  │
│  └──────────────────┘                                                  │
│                                                                         │
│  ┌─────────────────────────────────────────┐                           │
│  │  WebSocket /ws/terminal                 │                           │
│  │  pty.fork() → shell in project dir      │                           │
│  └─────────────────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## System Boundaries

| Boundary | In Scope | Out of Scope |
|---|---|---|
| **Network** | `localhost` only | Internet, LAN, cloud APIs |
| **Storage** | `backend/data/` JSON + `~/Projects/` YAML | Databases, object storage |
| **Auth** | Single bcrypt password → JWT | OAuth, SSO, multi-user |
| **OS** | macOS (POSIX PTY) | Windows, containerized environments |
| **Process** | Two processes (frontend dev + backend) | Microservices, message queues |

---

## Design Patterns

### Services Layer (Backend)

All business logic is encapsulated in service modules. Routers are thin — they parse request/response and delegate immediately to a service. Services own all JSON read/write operations.

```
Router → validate input → call service → return response
Service → read JSON → apply logic → write JSON → return result
```

### Repository-Style JSON Access

Each service holds the path to its JSON file and exposes CRUD methods. There is no ORM — services use Python `json.load` / `json.dump` directly. File locking is implicit (single-process Uvicorn).

### Hook-Based Frontend State

Each tab panel manages its own state with `useState` and `useEffect`. Data is fetched on mount and on user action. There is no global store. The JWT token is shared via the `useAuth` hook (localStorage).

### Filesystem-First Project Identity

The project name is derived from the folder name in `~/Projects/`. This is the primary key across all JSON data files. Renaming a folder breaks all associated data (intentional limitation).

### Proxy Rewrite for API Transparency

The browser never sees port 8001. All API calls use relative paths (`/api/...`) which Next.js rewrites at the edge. This eliminates CORS headers and makes the frontend portable.

---

## Component Interaction Summary

```
User navigates to /dashboard
    → dashboard/page.tsx fetches GET /api/projects
    → KanbanBoard renders StageColumn × 7
    → Each card click → router.push(/dashboard/projects/[name])

User opens project detail
    → [name]/page.tsx mounts 8 tabs
    → Each tab is a lazy component; data fetched on tab activation
    → Documents tab: GET /api/documents/[name]
    → Todos tab: GET /api/todos?project=[name]
    → Terminal tab: WebSocket connect → PTY fork in project dir

User saves a document
    → MarkdownEditor onChange → debounced PUT /api/documents/[name]/[path]
    → document_service writes file to ~/Projects/[name]/[path]
    → Response 200 → no state update needed (file is source of truth)
```
