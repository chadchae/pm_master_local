#!/bin/bash

# ==============================================================================
# PM Master Local — Data Export + Package Script
# ==============================================================================
# Usage:
#   ./export.sh                          # full export (default)
#   ./export.sh --mode app-only          # app code + DB, no ~/Projects
#   ./export.sh --mode no-media          # full, excluding women-leadership & media files
#   ./export.sh --mode app-only --out ~/Desktop
#
# Options:
#   --mode app-only   App code + backend data only (빈 프로젝트)
#   --mode no-media   Full export minus women-leadership & video/audio/rdata files
#   --out DIR         Output directory (default: ~/Desktop)

set -uo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$HOME/Desktop"
MODE="full"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode) MODE="$2"; shift 2 ;;
    --out)  OUTPUT_DIR="$2"; shift 2 ;;
    *)      OUTPUT_DIR="$1"; shift ;;
  esac
done

case "$MODE" in
  app-only)
    ARCHIVE="$OUTPUT_DIR/pm-master-local-app-only.tar.gz"
    LABEL="App Only (빈 프로젝트)"
    ;;
  no-media)
    ARCHIVE="$OUTPUT_DIR/pm-master-local-no-media.tar.gz"
    LABEL="No Media (여성리더십·영상·오디오 제외)"
    ;;
  *)
    ARCHIVE="$OUTPUT_DIR/pm-master-local-export.tar.gz"
    LABEL="Full Export"
    ;;
esac

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
PACKAGE_NAME="pm-master-local-${TIMESTAMP}"
PACKAGE_DIR="$OUTPUT_DIR/$PACKAGE_NAME"
PROJECTS_ROOT="${PROJECTS_ROOT:-$HOME/Projects}"

echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}PM Master Local — Export [$LABEL]${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# ── Step 1: Create package directory structure ────────────────────────────────

echo -e "${BLUE}[1/4] Creating package directory...${NC}"
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR/app"
mkdir -p "$PACKAGE_DIR/data/backend"
mkdir -p "$PACKAGE_DIR/data/projects"

# ── Step 2: Copy app code ─────────────────────────────────────────────────────

echo -e "${BLUE}[2/4] Copying app code...${NC}"
(cd "$SCRIPT_DIR" && tar -c \
  --exclude="./.git" \
  --exclude="./node_modules" \
  --exclude="./frontend/node_modules" \
  --exclude="./frontend/.next" \
  --exclude="./backend/venv" \
  --exclude="./backend/__pycache__" \
  --exclude="./backend/temp_uploads" \
  --exclude="./backend/routers/__pycache__" \
  --exclude="./backend/services/__pycache__" \
  --exclude="*.pyc" \
  --exclude="*.log" \
  . ) | (cd "$PACKAGE_DIR/app" && tar -x)
echo -e "  ${GREEN}✓ App code copied${NC}"

# ── Step 3: Export data ───────────────────────────────────────────────────────

echo -e "${BLUE}[3/4] Exporting data...${NC}"

# Backend DB (JSON) — always included
cp -r "$SCRIPT_DIR/backend/data/." "$PACKAGE_DIR/data/backend/"
echo -e "  ${GREEN}✓ Backend DB (JSON) included${NC}"

if [ "$MODE" = "app-only" ]; then
  echo -e "  ${YELLOW}→ app-only mode: ~/Projects 제외${NC}"
else
  # Media extensions to exclude in no-media mode
  MEDIA_EXCLUDES=(
    --exclude="*.mp4" --exclude="*.mp3" --exclude="*.wav" --exclude="*.m4a"
    --exclude="*.aac" --exclude="*.flac" --exclude="*.wma" --exclude="*.ogg"
    --exclude="*.avi" --exclude="*.mov" --exclude="*.mkv" --exclude="*.wmv"
    --exclude="*.m4v" --exclude="*.webm" --exclude="*.3gp" --exclude="*.ts"
    --exclude="*.RData" --exclude="*.rds" --exclude="*.rda"
  )

  echo -e "  Exporting project directories from $PROJECTS_ROOT..."
  PROJECTS_EXPORTED=0

  for stage_dir in "$PROJECTS_ROOT"/*/; do
    [ -d "$stage_dir" ] || continue
    dirname="$(basename "$stage_dir")"
    case "$dirname" in
      _notes|_learning|_issues_common|_guideline|_people|_system|node_modules) continue ;;
    esac

    mkdir -p "$PACKAGE_DIR/data/projects/$dirname"

    if [ "$MODE" = "no-media" ]; then
      (cd "$stage_dir" && tar -c \
        --exclude="./.git" --exclude="./node_modules" --exclude="./.next" \
        --exclude="./__pycache__" --exclude="./venv" \
        --exclude="./rp_2024_02_women-leadership" \
        --exclude="./ai-work-chagne" \
        --exclude="./gabqca" \
        "${MEDIA_EXCLUDES[@]}" \
        . 2>/dev/null || true) | (cd "$PACKAGE_DIR/data/projects/$dirname" && tar -x 2>/dev/null || true)
    else
      (cd "$stage_dir" && tar -c \
        --exclude="./.git" --exclude="./node_modules" --exclude="./.next" \
        --exclude="./__pycache__" --exclude="./venv" \
        . 2>/dev/null || true) | (cd "$PACKAGE_DIR/data/projects/$dirname" && tar -x 2>/dev/null || true)
    fi

    PROJECTS_EXPORTED=$((PROJECTS_EXPORTED + 1))
  done

  echo -e "  ${GREEN}✓ $PROJECTS_EXPORTED project stage directories exported${NC}"
  [ "$MODE" = "no-media" ] && echo -e "  ${YELLOW}→ 여성리더십 프로젝트 및 영상/오디오/RData 파일 제외됨${NC}"

  # Common folders
  for common in _notes _learning _issues_common _guideline _people; do
    if [ -d "$PROJECTS_ROOT/$common" ]; then
      mkdir -p "$PACKAGE_DIR/data/projects/$common"
      (cd "$PROJECTS_ROOT/$common" && tar -c . 2>/dev/null || true) | \
        (cd "$PACKAGE_DIR/data/projects/$common" && tar -x 2>/dev/null || true)
      echo -e "  ${GREEN}✓ $common exported${NC}"
    fi
  done
fi

# ── Step 4: Create archive ────────────────────────────────────────────────────

echo -e "${BLUE}[4/4] Creating archive...${NC}"
cd "$OUTPUT_DIR"
tar -czf "$ARCHIVE" --ignore-failed-read "$PACKAGE_NAME/" 2>/dev/null || \
  tar -czf "$ARCHIVE" "$PACKAGE_NAME/" 2>/dev/null || true
rm -rf "$PACKAGE_DIR"

SIZE="$(du -sh "$ARCHIVE" | cut -f1)"
echo -e "  ${GREEN}✓ $ARCHIVE ($SIZE)${NC}"

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}Export complete! [$LABEL]${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo -e "  Package : ${YELLOW}$ARCHIVE${NC}"
echo -e "  Size    : ${YELLOW}$SIZE${NC}"
