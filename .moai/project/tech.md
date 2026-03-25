# PM Master Local — Technical Reference

---

## Tech Stack

### Frontend

| Technology | Version | Role |
|---|---|---|
| Next.js | 15.x | App Router, SSR/SSG, API proxy rewrites |
| React | 19.x | UI component model |
| TypeScript | 5.x | Type safety across all components and API calls |
| TailwindCSS | 3.4 | Utility-first styling |
| @uiw/react-md-editor | latest | Split-pane markdown editor with preview |
| xterm.js | 5.x | Terminal emulator (WebSocket PTY) |
| D3 | 7.x | Gantt chart rendering (SVG-based) |
| Mermaid | 10.x | Diagram rendering in markdown preview |
| KaTeX | 0.x | Math formula rendering |

### Backend

| Technology | Version | Role |
|---|---|---|
| Python | 3.12+ | Runtime |
| FastAPI | 0.x | Async REST API framework + WebSocket support |
| Uvicorn | 0.x | ASGI server |
| PyJWT | 2.x | JWT token encoding and decoding |
| bcrypt | 4.x | Password hashing |
| pyyaml | 6.x | YAML frontmatter parsing for `_project.yaml` |
| pty (stdlib) | — | PTY fork for terminal sessions |

### Storage

| Layer | Mechanism |
|---|---|
| Application data | JSON files in `backend/data/` |
| Project metadata | YAML frontmatter in `~/Projects/**/_project.yaml` |
| Auth state | `backend/data/auth.json` (bcrypt hash) + `tokens.json` (JWT revocation) |
| Session state | Browser `localStorage` (JWT token) |

---

## Architecture Decisions

### Why no database?

Portability and zero-setup. Users can copy the `backend/data/` directory to back up all state. No migration scripts, no DB server, no connection strings. Acceptable for single-user, local-only usage where datasets are small (hundreds of projects, thousands of todos).

### Why filesystem as the project source of truth?

The `~/Projects/` folder is where developers already work. Treating it as the database means no import/export step — the project list always reflects reality. `scanner_service` re-scans on demand and caches in memory.

### Why Next.js App Router with proxy rewrites?

Keeps the frontend on port 3001 and backend on 8001 as separate processes, but eliminates CORS complexity in the browser. All `/api/*` and `/ws/*` calls are silently rewritten to the backend URL in `next.config.js`.

### Why JWT + localStorage?

Single-user local app. The threat model does not require httpOnly cookies or refresh token rotation. Simplicity is preferred. If the machine is compromised, local files are already accessible regardless of token storage.

### Why useState over Redux/Zustand?

The app is tab-based, not deeply nested. Each tab panel owns its own state and fetches its data independently. Cross-tab state sharing is minimal (project name from URL, auth token from hook). Adding a global store would add complexity without benefit at this scale.

---

## Dev Environment Requirements

| Requirement | Minimum | Recommended |
|---|---|---|
| macOS | 12 Monterey | 14 Sonoma or later |
| Node.js | 18.x | 20.x LTS |
| Python | 3.12 | 3.12 |
| npm | 9.x | 10.x |
| pip | 23.x | 24.x |

Optional:
- `zsh` shell (used by default PTY sessions)
- `~/Projects/` directory (created by setup.sh if absent)

---

## Build and Run Commands

### Initial Setup

```bash
./setup.sh          # Creates ~/Projects/ structure, writes default auth.json
./install.sh        # npm ci (frontend) + pip install -r requirements.txt (backend)
```

### Development (run.sh)

```bash
./run.sh start      # Start both frontend and backend
./run.sh stop       # Stop both processes
./run.sh restart    # Stop + start
./run.sh status     # Show PID and port status
./run.sh live       # Tail logs from both processes
```

Processes run in background with PIDs stored in `/tmp/pm-master-*.pid`.

### Frontend only

```bash
cd frontend
npm run dev         # Development server on port 3001 (hot reload)
npm run build       # Production build
npm run start       # Start production build
npm run lint        # ESLint check
```

### Backend only

```bash
cd backend
uvicorn main:app --reload --port 8001   # Development with auto-reload
uvicorn main:app --port 8001            # Production
```

### Data Export

```bash
./export.sh         # Copies backend/data/ to timestamped backup archive
```

---

## Environment Variables

Backend environment variables (set in shell or `backend/.env`):

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | auto-generated on first run | Secret key for JWT signing. Set explicitly for persistent tokens across restarts. |
| `PROJECTS_DIR` | `~/Projects` | Root directory for project scanning |
| `DATA_DIR` | `./backend/data` | Path to JSON data files |
| `PORT` | `8001` | Backend server port |

Frontend environment variables (`frontend/.env.local`):

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8001` | Backend base URL (used by next.config.js rewrites) |

---

## Port Configuration

| Service | Port | Notes |
|---|---|---|
| Frontend (dev) | 3001 | `npm run dev` |
| Backend | 8001 | Uvicorn |
| WebSocket (terminal) | 8001 | Same port as backend, path `/ws/terminal` |

PM Master Online variant uses 3002 / 8002 to run alongside Local without conflicts.

---

## Key API Proxy Configuration

In `frontend/next.config.js`:

```js
async rewrites() {
  return [
    { source: '/api/:path*', destination: 'http://localhost:8001/api/:path*' },
    { source: '/ws/:path*',  destination: 'http://localhost:8001/ws/:path*' }
  ]
}
```

This means all frontend `fetch('/api/...')` calls transparently reach the FastAPI backend.
