# PM Master Local — Laptop Setup Context

> **For Claude on the laptop**: Read this entire file before doing anything.
> This explains exactly how this app works, what's synced, and what's broken.

---

## 1. What This App Is

PM Master Local is a personal project management app.
- **Frontend**: Next.js on port 3001
- **Backend**: FastAPI on port 8001
- **Data**: JSON files in `backend/data/` (NOT a real database)
- **Default login password**: `admin`

---

## 2. Directory Structure (on main computer)

```
~/Projects/                          ← All actual project files live here
├── _notes/                          ← Quick notes (app's "Notes" menu)
├── _learning/                       ← Learning logs (app's "Learning" menu)
├── _issues_common/                  ← Shared issue docs
├── _guideline/                      ← Guidelines
├── _people/                         ← People photos
├── _system/
│   └── pm-master-chad/              ← RUNNING INSTANCE (this laptop's equivalent)
└── 5_completed/
    └── pm-master-local/             ← DEVELOPMENT SOURCE (where code changes are made)

backend/data/                        ← App's JSON database
├── todos/{project}.json
├── issues/{project}.json
├── schedules/{project}.json
├── subtasks/{project}.json
├── logs/{project}.json
├── people.json
├── plans.json
├── card_order.json
├── auth.json                        ← password hash (NOT synced)
├── tokens.json                      ← session tokens (NOT synced)
└── github_sync_config.json          ← sync config (NOT synced)
```

---

## 3. Two Separate Sync Systems

### System A — GitHub Data Sync (pm_master_sync)
Syncs the JSON database across machines.

- **Repo**: `github.com/chadchae/pm_master_sync` (private)
- **PAT Token**: stored in `backend/data/github_sync_config.json` → `token` field (ask Chad for value)
- **What syncs**: todos, issues, schedules, subtasks, logs, people, plans, card_order
- **What does NOT sync**: auth.json, tokens.json, github_sync_config.json
- **How**: Settings page → GitHub Data Sync section → Push / Pull buttons
- **Machine roles**: Main = push freely, Laptop = pull freely (push requires confirm)

### System B — Code Git (pm_master_local)
Syncs the app's source code.

- **Repo**: `github.com/chadchae/pm_master_local` (private)
- **Development dir**: `~/Projects/5_completed/pm-master-local/`
- **Running dir**: wherever this app is installed on laptop
- **How to upgrade**: `./upgrade.sh` (does git pull + restart)

---

## 4. What Works on Laptop (Fresh Install)

| Feature | Status | Reason |
|---------|--------|--------|
| Dashboard Kanban | ✅ After data sync | Reads from backend/data/ |
| Todos | ✅ After data sync | Reads from backend/data/todos/ |
| Issues | ✅ After data sync | Reads from backend/data/issues/ |
| Schedules | ✅ After data sync | Reads from backend/data/schedules/ |
| People | ✅ After data sync | Reads from backend/data/people.json |
| Plans | ✅ After data sync | Reads from backend/data/plans.json |
| Projects list | ⚠️ Empty | Needs ~/Projects/ folders to exist |
| **Notes** | ❌ Broken | Needs ~/Projects/_notes/ to exist |
| **Learning** | ❌ Broken | Needs ~/Projects/_learning/ to exist |
| **Guidelines** | ❌ Broken | Needs ~/Projects/_guideline/ to exist |
| **Issue Docs** | ❌ Broken | Needs ~/Projects/_issues_common/ to exist |

---

## 5. Why Notes Sync Is Broken (Root Cause)

The Notes/Learning/Guidelines menus read files from `~/Projects/` on the local filesystem.

```python
# backend/services/common_folder_service.py
PROJECTS_ROOT = Path(os.environ.get("PROJECTS_ROOT", os.path.expanduser("~/Projects")))

FOLDER_TYPE_MAP = {
    "notes":     "_notes",       # → ~/Projects/_notes/
    "learning":  "_learning",    # → ~/Projects/_learning/
    "guideline": "_guideline",   # → ~/Projects/_guideline/
}
```

On the laptop, `~/Projects/_notes/` does **not exist** → the app returns empty or errors.

This is **by design** — Notes are filesystem-based, not database-based.
They are **not included** in the GitHub data sync (pm_master_sync).

---

## 6. Fix Options for Notes on Laptop

### Option A — Create empty folders (quick fix)
```bash
mkdir -p ~/Projects/_notes
mkdir -p ~/Projects/_learning
mkdir -p ~/Projects/_guideline
mkdir -p ~/Projects/_issues_common
```
Notes section will work but will be empty (no content from main computer).

### Option B — Rsync from main computer (full fix)
If on same network as main computer:
```bash
rsync -a chadchae@[MAIN_IP]:~/Projects/_notes/ ~/Projects/_notes/
rsync -a chadchae@[MAIN_IP]:~/Projects/_learning/ ~/Projects/_learning/
rsync -a chadchae@[MAIN_IP]:~/Projects/_guideline/ ~/Projects/_guideline/
```

### Option C — Add Notes to GitHub sync (code change needed)
Would require modifying `backend/services/github_sync_service.py` to also sync common folder markdown files. This is a bigger change — ask on main computer.

---

## 7. GitHub Data Sync Setup (if not done yet)

1. Go to `http://localhost:3001/dashboard/settings`
2. Set **Machine Role** → `Laptop`
3. Fill in:
   - GitHub Username: `chadchae`
   - Repository: `pm_master_sync`
   - Token: (ask Chad — same PAT used for pm_master_local repo)
4. **Test Connection** → **Save** → **Pull from GitHub**

---

## 8. Upgrade App Code (when main computer has updates)

```bash
cd [app install directory]
./upgrade.sh
```

This does:
1. `git pull origin main` from `github.com/chadchae/pm_master_local`
2. Installs new dependencies if requirements.txt or package.json changed
3. Restarts the app automatically

---

## 9. Key File Paths Summary

| File | Purpose |
|------|---------|
| `backend/data/github_sync_config.json` | Sync settings (machine role, token, repo) |
| `backend/data/auth.json` | Password hash |
| `backend/data/todos/*.json` | Per-project todo boards |
| `backend/data/people.json` | All people/collaborators |
| `backend/data/plans.json` | Plans list |
| `backend/data/card_order.json` | Kanban column ordering |
| `upgrade.sh` | Pull latest code + restart |
| `run.sh` | Start/stop/restart app |
| `install.sh` | First-time setup (venv, npm install) |

---

## 10. Ports

| Service | Port |
|---------|------|
| Frontend | 3001 |
| Backend API | 8001 |

If ports conflict, check `run.sh` or set `FRONTEND_PORT` / `BACKEND_PORT` env vars.

---

*Generated: 2026-03-25 | Main computer: chadchae@gmail.com*
