# PM Master Local v1.1.0 Development Report

## Version Info

| Item | Value |
|------|-------|
| Version | v1.1.0 |
| Previous | v1.0.0 |
| Date | 2026-03-21 |
| Commits | 89 (since v1.0.0) |
| Changes | 67 files, +5,747 / -511 lines |

## Major Changes

### 1. Docs Structure Restructuring

Separated `_아이디어노트.md` (mixed metadata + idea body) into clean structure:

```
Before:                          After:
docs/                            docs/
  _아이디어노트.md (YAML FM+body)   _project.yaml        (pure YAML metadata)
  _토의록.md                        아이디어/
                                      _아이디어노트.md   (pure markdown body)
                                    토의록/
                                      _토의록.md
                                    작업지시/
                                      작업지시_YYYY-MM-DD.md
                                    _settings/
                                      _project_meta.md   (auto-generated)
```

- 45 projects migrated, 0 errors
- scanner_service.py: 14 functions modified/added
- Backward compatibility maintained (fallback to old structure)

### 2. Project Meta Snapshot System (`_project_meta.md`)

Auto-generated markdown snapshot containing all server-side data:
- Overview (metadata from `_project.yaml`)
- People (file paths to `~/Projects/_people/`)
- Documents (recursive tree with Unicode box-drawing)
- Todo, Issues, Schedule, Milestones, Subtasks

Triggers: 23 CUD endpoints auto-regenerate on change.

API: `POST /api/projects/{name}/generate-meta`, `POST /api/projects/generate-meta-all`

### 3. Network Diagram Enhancements

- Filter sync: checkbox filters on People page reflect in network
- Self card + network pinned at top regardless of filters/groups
- Edge source toggle: Both / connections / co-project

### 4. Terminal Tab in Project Detail

- New "Terminal" tab next to "Instructions"
- Session start: choose Shell (zsh) or Claude Code
- Session persists across tab switches (hidden, not destroyed)
- Restart / End buttons
- Dynamic height: fills to browser bottom - 5px, no scrollbar
- cwd set to project path

### 5. Quick Note Improvements

- Collapsible note content (click to expand/collapse)
- Inline edit mode with Save/Cancel
- Backend: `GET/PUT /api/quicknotes/{filename}`

### 6. Work Instruction Subfolder

- `docs/작업지시_*.md` → `docs/작업지시/작업지시_*.md`
- 19 existing files migrated
- Both `create_transition_note()` and `create_manual_instruction()` updated

### 7. README Purpose Section

Added project purpose: research/development incubator workflow — idea → maturation → promotion to executable project.

## Code Review Summary

Issues found and fixed:
- Duplicate `/api/people/network` route (dead wrapper function removed)
- Unused `Depends` import removed from main.py
- setTimeout memory leak in EmbeddedTerminal fixed (proper clearTimeout)
- Parent overflow restoration in terminal tab (saves original value)
- Projects page key collision fixed (`stage/name` composite key)

## Files Added

| File | Purpose |
|------|---------|
| `backend/services/project_meta_service.py` | Project meta snapshot generation |

## Files Modified

| File | Changes |
|------|---------|
| `backend/services/scanner_service.py` | Docs restructuring, new YAML parsers |
| `backend/services/server_service.py` | Port extraction from `_project.yaml` |
| `backend/services/common_folder_service.py` | Quick note read/update |
| `backend/main.py` | CUD triggers, terminal WebSocket, meta API, cleanup |
| `frontend/src/components/EmbeddedTerminal.tsx` | Dynamic height, visible prop, session model |
| `frontend/src/components/QuickNotePanel.tsx` | Collapsible content, edit mode |
| `frontend/src/components/PeopleNetwork.tsx` | filterNodeIds, visibleNodes |
| `frontend/src/components/MoveProjectModal.tsx` | Work instruction path hint |
| `frontend/src/app/dashboard/projects/[name]/page.tsx` | Terminal tab |
| `frontend/src/app/dashboard/people/page.tsx` | Self pinned, network filter |
| `frontend/src/app/dashboard/projects/page.tsx` | Key collision fix |
| `frontend/src/lib/i18n.tsx` | Terminal tab translations |
| `README_KO.md` | Purpose section |
| `.gitignore` | `docs/_settings/` excluded |
