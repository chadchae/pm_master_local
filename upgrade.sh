#!/bin/bash

# ==============================================================================
# PM Master Local — Upgrade Script
# ==============================================================================
# Pulls latest code from GitHub and restarts the app.
# Data (backend/data/) is gitignored — never overwritten.
#
# Usage:
#   ./upgrade.sh          # pull + restart
#   ./upgrade.sh --pull   # pull only (no restart)

set -uo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PULL_ONLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pull) PULL_ONLY=true; shift ;;
    *) shift ;;
  esac
done

echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}PM Master Local — Upgrade${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

cd "$SCRIPT_DIR"

# ── Step 1: Pull from GitHub ───────────────────────────────────────────────────

echo -e "${BLUE}[1/3] Pulling latest code from GitHub...${NC}"

if ! git remote -v | grep -q "pm_master_local"; then
  echo -e "${RED}ERROR: git remote not configured.${NC}"
  echo -e "  Run: git remote add origin https://<token>@github.com/chadchae/pm_master_local.git"
  exit 1
fi

BEFORE=$(git rev-parse HEAD 2>/dev/null || echo "none")
git pull origin main 2>&1
AFTER=$(git rev-parse HEAD 2>/dev/null || echo "none")

if [ "$BEFORE" = "$AFTER" ]; then
  echo -e "  ${YELLOW}→ Already up to date.${NC}"
  if [ "$PULL_ONLY" = true ]; then
    echo ""
    echo -e "${GREEN}No changes to apply.${NC}"
    exit 0
  fi
else
  echo -e "  ${GREEN}✓ Updated: $BEFORE → $AFTER${NC}"
  # Show changed files
  git diff --name-only "$BEFORE" "$AFTER" 2>/dev/null | head -20 | while read f; do
    echo -e "    ${GREEN}↑${NC} $f"
  done
fi

if [ "$PULL_ONLY" = true ]; then
  echo ""
  echo -e "${GREEN}Pull complete. App not restarted.${NC}"
  exit 0
fi

# ── Step 2: Install new dependencies if changed ───────────────────────────────

echo ""
echo -e "${BLUE}[2/3] Checking dependencies...${NC}"

REQS_CHANGED=$(git diff --name-only "$BEFORE" "$AFTER" 2>/dev/null | grep -c "requirements.txt" || true)
PKG_CHANGED=$(git diff --name-only "$BEFORE" "$AFTER" 2>/dev/null | grep -c "frontend/package.json" || true)

if [ "$REQS_CHANGED" -gt 0 ]; then
  echo -e "  ${YELLOW}→ requirements.txt changed, installing...${NC}"
  backend/venv/bin/pip install -r backend/requirements.txt -q
  echo -e "  ${GREEN}✓ Python deps updated${NC}"
else
  echo -e "  → Python deps unchanged"
fi

if [ "$PKG_CHANGED" -gt 0 ]; then
  echo -e "  ${YELLOW}→ package.json changed, installing...${NC}"
  (cd frontend && npm install --silent)
  echo -e "  ${GREEN}✓ npm deps updated${NC}"
else
  echo -e "  → npm deps unchanged"
fi

# ── Step 3: Restart app ───────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}[3/3] Restarting app...${NC}"
bash "$SCRIPT_DIR/run.sh" restart 2>&1 | grep -E "✓|ERROR|port" || true

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}Upgrade complete!${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo -e "  Commit : ${YELLOW}$(git rev-parse --short HEAD)${NC}"
echo -e "  URL    : ${BLUE}http://localhost:3001${NC}"
