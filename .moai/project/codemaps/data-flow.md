# Codemaps — Data Flow

---

## 1. Authentication Flow (Login)

```
User enters password in LoginModal
    │
    ▼
lib/useAuth.ts: login(password)
    │
    ▼
lib/api.ts: POST /api/auth/login  { password }
    │  (Next.js rewrite → http://localhost:8001/api/auth/login)
    ▼
FastAPI: routers/auth.py → auth_service.verify_password(password)
    │
    ├── Read backend/data/auth.json  (bcrypt hash)
    ├── bcrypt.checkpw(password, hash)
    └── if valid → PyJWT.encode({ sub: "user", exp: ... }, JWT_SECRET)
    │
    ▼
Response: { token: "eyJ..." }
    │
    ▼
useAuth.ts: localStorage.setItem("pm_token", token)
    │
    ▼
All subsequent requests: lib/api.ts adds
    Authorization: Bearer <token>
```

---

## 2. Project Load Flow (Kanban Dashboard)

```
Browser navigates to /dashboard
    │
    ▼
app/dashboard/page.tsx: useEffect → api.getProjects()
    │
    ▼
lib/api.ts: GET /api/projects
    │
    ▼
FastAPI: routers/projects.py → scanner_service.get_projects()
    │
    ├── Check in-memory cache (populated at startup)
    ├── If stale or empty: walk ~/Projects/
    │     For each folder:
    │       Read _project.yaml (pyyaml)
    │       Build ProjectRecord { name, stage, tags, description, priority }
    └── Return List[ProjectRecord]
    │
    ▼
Response: [ { name, stage, tags, ... }, ... ]
    │
    ▼
KanbanBoard: group by stage → render 7 × StageColumn
    │
    ▼
StageColumn: render KanbanCard for each project
    └── KanbanCard: shows name, stage color (lib/stages.ts), tags
```

---

## 3. Document Save Flow

```
User edits in MarkdownEditor (split-pane)
    │
    ▼
MarkdownEditor: onChange event (debounced 800ms)
    │
    ▼
lib/api.ts: PUT /api/documents/{project}/{path}
    Body: { content: "# My Document..." }
    │
    ▼
FastAPI: routers/documents.py → document_service.write_file(project, path, content)
    │
    ├── Validate path (no ".." traversal, no absolute paths)
    ├── Resolve full path: ~/Projects/{project}/{path}
    └── aiofiles.open(full_path, "w") → write content
    │
    ▼
Response: { success: true }
    │
    ▼
MarkdownEditor: update "saved" indicator (no React state change needed;
                file on disk is source of truth)
```

---

## 4. Todo Create Flow

```
User clicks "Add Todo" in TodoPanel
    │
    ▼
TodoForm component: submit { text, project, due_date, priority }
    │
    ▼
lib/api.ts: POST /api/todos
    Body: { text, project, due_date, priority, done: false }
    │
    ▼
FastAPI: routers (todos router) → todo_service.create_todo(data)
    │
    ├── Read backend/data/todos.json
    ├── Append new todo record: { id: uuid4, text, project, ... }
    └── Write backend/data/todos.json (full overwrite)
    │
    ▼
Response: { id, text, project, ... }
    │
    ▼
TodoPanel: append to local state via useState setter
           (no full refetch needed)
```

---

## 5. WebSocket Terminal Flow

```
User clicks "Terminal" tab on project detail
    │
    ▼
TerminalPanel: mounts xterm.js Terminal instance
    │
    ▼
xterm FitAddon.fit() → calculate rows/cols from DOM size
    │
    ▼
WebSocket: new WebSocket("ws://localhost:3001/ws/terminal")
    │  (Next.js rewrite → ws://localhost:8001/ws/terminal)
    ▼
FastAPI WebSocket handler in main.py
    │
    ├── Receive initial message: { project: "my-research" }
    ├── Resolve project path: ~/Projects/my-research
    ├── pty.fork() → child process
    │     child: exec /bin/zsh in project directory
    │     parent: fd for read/write
    │
    ▼ Loop:
    ├── PTY output → WebSocket.send(bytes) → xterm.write(data)
    └── WebSocket.receive(text) → PTY write (keystrokes)

Resize event:
    xterm onResize → WebSocket.send({ type: "resize", cols, rows })
    FastAPI → pty.set_size(fd, rows, cols)

Tab close / disconnect:
    WebSocket close → PTY fd close → SIGHUP to shell process
```

---

## 6. Stage Transition Flow

```
User drags KanbanCard to new stage column
    │
    ▼
StageColumn: onDrop → api.updateProjectStage(name, newStage)
    │
    ▼
lib/api.ts: PUT /api/projects/{name}/stage
    Body: { stage: "development" }
    │
    ▼
FastAPI: routers/projects.py → project_service.update_stage(name, stage)
    │
    ├── Resolve path: ~/Projects/{name}/_project.yaml
    ├── pyyaml.safe_load existing YAML
    ├── Update stage field
    └── pyyaml.dump updated YAML → write file
    │
    ▼
Response: { success: true, name, stage }
    │
    ▼
KanbanBoard: update local state (move card to new column)
             No full refetch; optimistic update in React state
```

---

## State Management Patterns

### Local Component State (useState)

Each page and tab panel owns its data. Pattern:

```
const [items, setItems] = useState([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  api.getItems().then(data => {
    setItems(data)
    setLoading(false)
  })
}, [projectName])  // re-fetch when project changes
```

No global state manager. Data is fetched on mount and on explicit user actions.

### Auth State (useAuth hook)

```
// lib/useAuth.ts
const token = localStorage.getItem("pm_token")
// Validates JWT expiry locally; redirects to login if expired
// Attaches token to all api.ts fetch calls via Authorization header
```

### Optimistic Updates

For fast UI feedback (stage transitions, todo toggling), the frontend updates local React state immediately after the API call returns successfully, without re-fetching the full list.

### No Server-Side State

There is no server-side session. The backend is stateless per-request (JWT in header). The scanner cache in memory is the only mutable server-side state, and it is rebuilt on rescan.

---

## Data Storage Paths Summary

| Data Type | Storage Location | Format |
|---|---|---|
| Project list | `~/Projects/` (filesystem scan) | Directories |
| Project metadata | `~/Projects/{name}/_project.yaml` | YAML |
| Project documents | `~/Projects/{name}/**/*.md` | Markdown files |
| Todos | `backend/data/todos.json` | JSON array |
| Subtasks | `backend/data/subtasks.json` | JSON array |
| Issues | `backend/data/issues.json` | JSON array |
| Schedules | `backend/data/schedules.json` | JSON array |
| People | `backend/data/people.json` | JSON array |
| Plans | `backend/data/plans.json` | JSON array |
| Auth config | `backend/data/auth.json` | JSON object (bcrypt hash) |
| Active tokens | `backend/data/tokens.json` | JSON object (revocation list) |
| Session token | `localStorage` (browser) | JWT string |
