#!/bin/bash

# ==============================================================================
# PM Master Local — Install Script
# ==============================================================================
# Run this on the TARGET laptop after extracting the export package.
#
# Packages:
#   pm-master-local-app-only.tar.gz   → App + DB only (빈 프로젝트)
#   pm-master-local-no-media.tar.gz   → App + DB + Projects (여성리더십·미디어 제외)
#   pm-master-local-export.tar.gz     → Full export
#
# Extract and run:
#   tar -xzf <package>.tar.gz && cd pm-master-local-*/app && ./install.sh
#
# Options:
#   --projects-root PATH   Where to restore ~/Projects data (default: ~/Projects)
#
# Prerequisites:
#   - macOS or Linux
#   - Python 3.12+
#   - Node.js 18+

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECTS_ROOT="$HOME/Projects"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --projects-root) PROJECTS_ROOT="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: ./install.sh [--projects-root PATH]"
      echo "  --projects-root  Where to restore project data (default: ~/Projects)"
      exit 0 ;;
    *) echo -e "${RED}Unknown option: $1${NC}"; exit 1 ;;
  esac
done

echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}PM Master Local — Installation${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo -e "  Install dir   : ${YELLOW}$SCRIPT_DIR${NC}"
echo -e "  Projects root : ${YELLOW}$PROJECTS_ROOT${NC}"
echo ""

# ── Check prerequisites ───────────────────────────────────────────────────────

echo -e "${BLUE}[1/5] Checking prerequisites...${NC}"

if ! command -v python3 &>/dev/null; then
  echo -e "${RED}ERROR: Python 3 not found. Install from https://www.python.org/${NC}"
  exit 1
fi
PYTHON_VER="$(python3 --version 2>&1)"
echo -e "  ${GREEN}✓ $PYTHON_VER${NC}"

if ! command -v node &>/dev/null; then
  echo -e "${RED}ERROR: Node.js not found. Install from https://nodejs.org/${NC}"
  exit 1
fi
NODE_VER="$(node --version)"
echo -e "  ${GREEN}✓ Node.js $NODE_VER${NC}"

if ! command -v npm &>/dev/null; then
  echo -e "${RED}ERROR: npm not found.${NC}"
  exit 1
fi

# ── Backend setup ─────────────────────────────────────────────────────────────

echo -e "${BLUE}[2/5] Setting up backend...${NC}"
cd "$SCRIPT_DIR/backend"

if [ ! -d "venv" ]; then
  python3 -m venv venv
  echo -e "  ${GREEN}✓ Python venv created${NC}"
fi

./venv/bin/pip install --upgrade pip -q
./venv/bin/pip install -r requirements.txt -q
echo -e "  ${GREEN}✓ Python dependencies installed${NC}"

# ── Frontend setup ────────────────────────────────────────────────────────────

echo -e "${BLUE}[3/5] Setting up frontend...${NC}"
cd "$SCRIPT_DIR/frontend"
npm install --silent
echo -e "  ${GREEN}✓ npm packages installed${NC}"

# ── Restore data ──────────────────────────────────────────────────────────────

echo -e "${BLUE}[4/5] Restoring data...${NC}"

# Check if data export directory exists (sibling to app/)
DATA_DIR="$(dirname "$SCRIPT_DIR")/data"

if [ ! -d "$DATA_DIR" ]; then
  echo -e "  ${YELLOW}⚠ No data directory found at $DATA_DIR — skipping data restore${NC}"
  echo -e "  ${YELLOW}  (App will start fresh with empty data)${NC}"
else
  # Restore backend data
  if [ -d "$DATA_DIR/backend" ]; then
    rsync -a "$DATA_DIR/backend/" "$SCRIPT_DIR/backend/data/"
    echo -e "  ${GREEN}✓ Backend data restored${NC}"
  fi

  # Restore project directories to ~/Projects
  if [ -d "$DATA_DIR/projects" ]; then
    mkdir -p "$PROJECTS_ROOT"

    # Check for conflicts
    CONFLICTS=0
    for item in "$DATA_DIR/projects"/*/; do
      dirname="$(basename "$item")"
      if [ -d "$PROJECTS_ROOT/$dirname" ]; then
        echo -e "  ${YELLOW}⚠ Conflict: $PROJECTS_ROOT/$dirname already exists${NC}"
        CONFLICTS=$((CONFLICTS + 1))
      fi
    done

    if [ "$CONFLICTS" -gt 0 ]; then
      echo ""
      echo -e "${YELLOW}Found $CONFLICTS conflicting directories in $PROJECTS_ROOT.${NC}"
      read -r -p "Overwrite existing directories? [y/N] " response
      if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Skipping project data restore. You can manually copy from:${NC}"
        echo -e "  $DATA_DIR/projects/"
      else
        rsync -a "$DATA_DIR/projects/" "$PROJECTS_ROOT/"
        echo -e "  ${GREEN}✓ Project data restored to $PROJECTS_ROOT${NC}"
      fi
    else
      rsync -a "$DATA_DIR/projects/" "$PROJECTS_ROOT/"
      echo -e "  ${GREEN}✓ Project data restored to $PROJECTS_ROOT${NC}"
    fi
  fi
fi

# ── Git setup (for upgrade.sh to work) ───────────────────────────────────────

echo -e "${BLUE}[5/6] Setting up git for upgrades...${NC}"
cd "$SCRIPT_DIR"
if [ ! -d ".git" ]; then
  git init -q
  git remote add origin "https://github.com/chadchae/pm_master_local.git"
  git add -A
  git commit -q -m "install: initial commit" 2>/dev/null || true
  echo -e "  ${GREEN}✓ Git initialized (remote: pm_master_local)${NC}"
  echo -e "  ${YELLOW}  Run ./upgrade.sh any time to pull latest code from GitHub${NC}"
else
  echo -e "  ${YELLOW}⚠ .git already exists — skipping git init${NC}"
fi

# ── Projects root dirs (Notes/Learning/Guidelines) ────────────────────────────

echo -e "${BLUE}[6/6] Finalizing...${NC}"
cd "$SCRIPT_DIR"
chmod +x run.sh setup.sh install.sh export.sh upgrade.sh 2>/dev/null || true
echo -e "  ${GREEN}✓ Scripts are executable${NC}"

CREATED_DIRS=0
for dir in _notes _learning _guideline _issues_common; do
  if [ ! -d "$PROJECTS_ROOT/$dir" ]; then
    mkdir -p "$PROJECTS_ROOT/$dir"
    CREATED_DIRS=$((CREATED_DIRS + 1))
  fi
done
if [ "$CREATED_DIRS" -gt 0 ]; then
  echo -e "  ${GREEN}✓ Created $CREATED_DIRS missing project dirs in $PROJECTS_ROOT${NC}"
  echo -e "  ${YELLOW}  (Notes/Learning/Guidelines will work but start empty)${NC}"
  echo -e "  ${YELLOW}  To sync content from main computer: rsync from main's ~/Projects/_notes/ etc.${NC}"
else
  echo -e "  ${GREEN}✓ Project dirs already exist in $PROJECTS_ROOT${NC}"
fi

# ── Write clean GitHub sync config ────────────────────────────────────────────

SYNC_CONFIG="$SCRIPT_DIR/backend/data/github_sync_config.json"
if [ ! -f "$SYNC_CONFIG" ]; then
  cat > "$SYNC_CONFIG" <<'EOF'
{
  "enabled": false,
  "machine_role": "laptop",
  "repo_owner": "chadchae",
  "repo_name": "pm_master_sync",
  "token": "",
  "branch": "main",
  "auto_pull_on_start": true,
  "last_synced_at": "",
  "last_sync_result": ""
}
EOF
  echo -e "  ${GREEN}✓ Default sync config created (repo: pm_master_sync, role: laptop)${NC}"
  echo -e "  ${YELLOW}  → Add your GitHub token in Settings → GitHub Data Sync${NC}"
else
  echo -e "  ${YELLOW}⚠ Sync config already exists — not overwritten${NC}"
fi

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}Installation complete!${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo -e "To start PM Master Local:"
echo -e "  ${GREEN}cd $SCRIPT_DIR && ./run.sh start${NC}"
echo ""
echo -e "Then open: ${BLUE}http://localhost:3001${NC}"
echo ""
echo -e "Default login password: ${YELLOW}admin${NC}"
echo -e "${YELLOW}(Change it immediately in Settings after first login)${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. Go to Settings → GitHub Data Sync"
echo -e "  2. Set machine role: ${YELLOW}Laptop${NC}"
echo -e "  3. Add your GitHub token → Test → Save → Pull from GitHub"
