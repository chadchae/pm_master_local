# Codemaps — Entry Points

---

## Application Entry Points

| Process | Entry Point | Command |
|---|---|---|
| Frontend (dev) | `frontend/src/app/layout.tsx` | `npm run dev` (port 3001) |
| Frontend (prod) | `frontend/.next/` | `npm run start` |
| Backend | `backend/main.py` → `app = FastAPI()` | `uvicorn main:app --port 8001` |
| Unified | `run.sh start` | Starts both frontend and backend |

---

## CLI Commands (run.sh)

| Command | Effect |
|---|---|
| `./run.sh start` | Starts frontend (`npm run dev`) and backend (`uvicorn`) in background. Stores PIDs in `/tmp/pm-master-*.pid`. |
| `./run.sh stop` | Reads PID files, sends SIGTERM to both processes, removes PID files. |
| `./run.sh restart` | Runs stop then start sequentially. |
| `./run.sh status` | Checks if PIDs are alive; prints port binding status for 3001 and 8001. |
| `./run.sh live` | Tails both process log files simultaneously (combined output). |
| `./setup.sh` | One-time: creates `~/Projects/` structure, writes default `backend/data/auth.json`. |
| `./install.sh` | Runs `npm ci` in `frontend/` and `pip install -r requirements.txt` in `backend/`. |
| `./export.sh` | Archives `backend/data/` to a timestamped `.tar.gz` backup file. |

---

## Frontend Pages

All pages are under `frontend/src/app/`. Next.js App Router file-system routing.

| URL | File | Description |
|---|---|---|
| `/` | `app/page.tsx` | Root — redirects to `/dashboard` |
| `/dashboard` | `app/dashboard/page.tsx` | Main 7-stage kanban board |
| `/dashboard/ideas` | `app/dashboard/ideas/page.tsx` | Idea-stage filtered project view |
| `/dashboard/projects` | `app/dashboard/projects/page.tsx` | All projects list/grid view |
| `/dashboard/projects/[name]` | `app/dashboard/projects/[name]/page.tsx` | Project detail (8-tab panel) |
| `/dashboard/todos` | `app/dashboard/todos/page.tsx` | Global todo aggregation across all projects |
| `/dashboard/status` | `app/dashboard/status/page.tsx` | Activity and status overview |
| `/dashboard/people` | `app/dashboard/people/page.tsx` | People directory |
| `/dashboard/timeline` | `app/dashboard/timeline/page.tsx` | Cross-project Gantt/timeline |
| `/dashboard/servers` | `app/dashboard/servers/page.tsx` | Local running server status |
| `/dashboard/plans` | `app/dashboard/plans/page.tsx` | Plans overview |
| `/dashboard/portfolio` | `app/dashboard/portfolio/page.tsx` | Portfolio summary view |
| `/dashboard/trash` | `app/dashboard/trash/page.tsx` | Archived and discarded projects |
| `/dashboard/[type]` | `app/dashboard/[type]/page.tsx` | Dynamic catch-all for stage-filtered views |

---

## Backend API Routes

### Auth (`/api/auth`)

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Accepts `{ password }`, verifies bcrypt hash, returns JWT token |
| POST | `/api/auth/logout` | Revokes current JWT token |
| GET | `/api/auth/verify` | Validates current JWT; returns user info |

### Projects (`/api/projects`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/projects` | List all projects (from scanner cache); supports `?stage=` filter |
| GET | `/api/projects/{name}` | Get single project metadata |
| PUT | `/api/projects/{name}/stage` | Update project stage; writes `_project.yaml` |
| PUT | `/api/projects/{name}` | Update project metadata (tags, description, priority) |
| POST | `/api/projects/rescan` | Trigger filesystem rescan via `scanner_service` |

### Documents (`/api/documents`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/documents/{project}` | List all files in project folder |
| GET | `/api/documents/{project}/{path}` | Read file content |
| PUT | `/api/documents/{project}/{path}` | Write file content |
| DELETE | `/api/documents/{project}/{path}` | Delete file |

### Todos (`/api/todos` — inferred from service)

| Method | Path | Description |
|---|---|---|
| GET | `/api/todos` | List todos; `?project=` for per-project |
| POST | `/api/todos` | Create todo |
| PUT | `/api/todos/{id}` | Update todo (text, done, due date, priority) |
| DELETE | `/api/todos/{id}` | Delete todo |
| GET | `/api/todos/{id}/subtasks` | List subtasks |
| POST | `/api/todos/{id}/subtasks` | Create subtask |

### Issues (`/api/issues` — inferred from service)

| Method | Path | Description |
|---|---|---|
| GET | `/api/issues` | List issues; `?project=` filter |
| POST | `/api/issues` | Create issue |
| PUT | `/api/issues/{id}` | Update issue |
| DELETE | `/api/issues/{id}` | Delete issue |

### Schedules (`/api/schedules` — inferred from service)

| Method | Path | Description |
|---|---|---|
| GET | `/api/schedules` | List schedule items; `?project=` filter |
| POST | `/api/schedules` | Create schedule item |
| PUT | `/api/schedules/{id}` | Update schedule item |
| DELETE | `/api/schedules/{id}` | Delete schedule item |

### People (`/api/people`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/people` | List all people |
| POST | `/api/people` | Create person |
| PUT | `/api/people/{id}` | Update person |
| DELETE | `/api/people/{id}` | Delete person |

### Plans (`/api/plans`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/plans` | List plans; `?project=` filter |
| POST | `/api/plans` | Create plan |
| PUT | `/api/plans/{id}` | Update plan |
| DELETE | `/api/plans/{id}` | Delete plan |

### Common (`/api`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check; returns `{ status: "ok", version }` |

### Servers (`/api/servers`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/servers` | List detected local servers (port, PID, process name) |

### WebSocket

| Protocol | Path | Description |
|---|---|---|
| WS | `/ws/terminal` | Opens PTY in specified project directory; binary I/O |
