# PM Master Local — Installation Guide

## Packaging and Moving to Another Laptop

### On the Source Laptop (Current Machine)

Run the export script to create a portable package on your Desktop:

```bash
cd /path/to/pm-master-local
./export.sh
```

This creates `~/Desktop/pm-master-local-export.tar.gz` which includes:
- All app code (frontend + backend)
- All backend data (`backend/data/` — plans, people, todos, issues, etc.)
- All project directories from `~/Projects/`
- Common folders (`_notes`, `_learning`, `_issues_common`, `_guideline`, `_people`)

**Tip:** The archive excludes `node_modules`, `venv`, `.next`, `.git`, and logs — these are rebuilt on the target machine.

---

### Transfer to Target Laptop

Options:
- USB drive / external SSD
- AirDrop (macOS to macOS)
- Google Drive / iCloud / Dropbox
- `scp` over SSH

---

### On the Target Laptop

#### Prerequisites

Install these before running the install script:

| Tool | Version | Download |
|------|---------|----------|
| Python | 3.12+ | https://www.python.org/downloads/ |
| Node.js | 18+ | https://nodejs.org/ |

**macOS Quick Install (Homebrew):**
```bash
brew install python@3.12 node
```

#### Installation Steps

```bash
# 1. Extract the archive
tar -xzf pm-master-local-export.tar.gz
cd pm-master-local-*/app

# 2. Run the install script
./install.sh

# 3. Start the app
./run.sh start
```

Open http://localhost:3001 in your browser.

**Default password:** `admin` — change it immediately in Settings.

#### Custom Projects Root

If you want to restore project data to a different location:
```bash
./install.sh --projects-root /path/to/my/Projects
```

---

## Starting and Stopping

```bash
./run.sh start    # Start backend + frontend
./run.sh stop     # Stop all servers
./run.sh restart  # Restart
./run.sh status   # Check if running
./run.sh live     # Stream live logs
```

---

## Data Locations

| Data | Location |
|------|----------|
| Plans, People, Todos, Issues | `backend/data/` |
| Project files | `~/Projects/{stage}/{project-name}/` |
| Notes | `~/Projects/_notes/` |
| Learning | `~/Projects/_learning/` |
| Issue docs | `~/Projects/_issues_common/` |
| Guidelines | `~/Projects/_guideline/` |
| People photos | `~/Projects/_people/photos/` |

---

## Updating / Re-exporting

Run `./export.sh` again anytime to create a fresh snapshot with latest data.

The export filename always includes a timestamp: `pm-master-local-export.tar.gz` (overwrites previous export on Desktop).
