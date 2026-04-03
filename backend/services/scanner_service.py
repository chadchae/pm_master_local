"""Project scanner service for discovering and managing projects."""

import logging
import os
import re
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any

import yaml

PROJECTS_ROOT = Path(os.environ.get("PROJECTS_ROOT", os.path.expanduser("~/Projects")))

# Stage folder mapping
STAGE_FOLDERS = {
    "0": "0_project_development_documents",
    "1": "1_idea_stage",
    "2": "2_initiation_stage",
    "3": "3_in_development",
    "4": "4_in_testing",
    "5": "5_completed",
    "6": "6_archived",
    "7": "7_series",
    "8": "8_operation",
    "9": "9_discarded",
}

# Reverse mapping: folder name -> stage number
FOLDER_TO_STAGE: dict[str, str] = {}
for stage_num, folder_name in STAGE_FOLDERS.items():
    FOLDER_TO_STAGE[folder_name] = stage_num

# Common folders to exclude from project listing
COMMON_FOLDERS = {"_notes", "_learning", "_issues_common", "_guideline"}


def _parse_yaml_frontmatter(content: str) -> tuple[dict[str, Any], str]:
    """Parse YAML frontmatter from markdown content.

    Returns (metadata_dict, body_after_frontmatter).
    """
    if not content.startswith("---"):
        return {}, content

    lines = content.split("\n")
    end_idx = -1
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end_idx = i
            break

    if end_idx < 0:
        return {}, content

    yaml_str = "\n".join(lines[1:end_idx])
    body = "\n".join(lines[end_idx + 1:])

    try:
        data = yaml.safe_load(yaml_str)
        if isinstance(data, dict):
            # Convert all values to strings for consistency
            metadata: dict[str, Any] = {}
            for k, v in data.items():
                if isinstance(v, list):
                    metadata[k] = v  # Keep lists (for subtasks)
                elif v is not None:
                    metadata[k] = str(v)
            return metadata, body
    except yaml.YAMLError:
        pass
    return {}, content


def _parse_idea_note(filepath: Path) -> dict[str, Any]:
    """Parse metadata from _아이디어노트.md.

    Supports YAML frontmatter (priority) and blockquote format (fallback).
    """
    metadata: dict[str, Any] = {}
    try:
        content = filepath.read_text(encoding="utf-8")

        # Try YAML frontmatter first
        yaml_meta, body = _parse_yaml_frontmatter(content)
        if yaml_meta:
            metadata = yaml_meta
            # Extract description from body: first non-empty paragraph
            for line in body.splitlines():
                stripped = line.strip()
                if stripped and not stripped.startswith("#") and stripped != "---":
                    metadata.setdefault("description", stripped)
                    break
            return metadata

        # Fallback: blockquote format
        lines = content.splitlines()
        for line in lines:
            stripped = line.strip()
            if stripped.startswith(">"):
                cleaned = stripped.lstrip(">").strip()
                match = re.match(r"^(.+?):\s*(.+)$", cleaned)
                if match:
                    key = match.group(1).strip()
                    value = match.group(2).strip()
                    metadata[key] = value

        # Extract description from ## 한 줄 요약
        desc_lines: list[str] = []
        in_desc = False
        for line in lines:
            stripped = line.strip()
            if stripped == "## 한 줄 요약":
                in_desc = True
                continue
            if in_desc:
                if stripped.startswith("##") or stripped == "---":
                    break
                if stripped:
                    desc_lines.append(stripped)
        if desc_lines:
            metadata["description"] = " ".join(desc_lines)

    except (OSError, UnicodeDecodeError):
        pass
    return metadata


def _parse_readme(project_path: Path) -> tuple[str | None, str | None]:
    """Extract description and title from README.md.

    Returns (description, title) tuple.
    Title: first # heading text.
    Description: first non-heading, non-empty paragraph after title.
    """
    readme = project_path / "README.md"
    if not readme.is_file():
        return None, None

    try:
        content = readme.read_text(encoding="utf-8")
        lines = content.splitlines()
        title = None
        desc_lines: list[str] = []
        found_title = False
        collecting_desc = False

        for line in lines:
            stripped = line.strip()
            if not found_title and stripped.startswith("# "):
                title = stripped[2:].strip()
                # Remove markdown formatting like **text** or _text_
                title = re.sub(r"[*_`]", "", title).strip()
                found_title = True
                collecting_desc = True
                continue
            if collecting_desc:
                if not stripped:
                    if desc_lines:
                        break  # End of description paragraph
                    continue
                if stripped.startswith("#") or stripped == "---":
                    break
                # Skip badge lines and links-only lines
                if stripped.startswith("![") or stripped.startswith("[!") or stripped.startswith("[!["):
                    continue
                # Blockquote description
                if stripped.startswith(">"):
                    desc_lines.append(stripped.lstrip(">").strip())
                else:
                    desc_lines.append(stripped)

        description = " ".join(desc_lines) if desc_lines else None
        return description, title
    except (OSError, UnicodeDecodeError):
        return None, None


def _parse_idea_note_title(project_path: Path) -> str | None:
    """Extract title from _아이디어노트.md first # heading.

    Checks docs/아이디어/_아이디어노트.md first, falls back to docs/_아이디어노트.md.
    """
    idea_note = project_path / "docs" / "아이디어" / "_아이디어노트.md"
    if not idea_note.is_file():
        idea_note = project_path / "docs" / "_아이디어노트.md"
    if not idea_note.is_file():
        return None

    try:
        content = idea_note.read_text(encoding="utf-8")
        for line in content.splitlines():
            stripped = line.strip()
            if stripped.startswith("# "):
                title = stripped[2:].strip()
                # Remove suffix like "— 아이디어노트"
                title = re.sub(r"\s*[—\-]\s*(아이디어노트|아이디어).*$", "", title).strip()
                if title:
                    return title
        return None
    except (OSError, UnicodeDecodeError):
        return None


def _get_last_modified(project_path: Path) -> str | None:
    """Get project modification time using directory and key file mtimes.

    Uses lightweight check (dir mtime + docs/ mtime) instead of recursive walk.
    """
    latest = 0.0
    try:
        latest = project_path.stat().st_mtime
        # Also check docs/ dir mtime for document-level changes
        docs_dir = project_path / "docs"
        if docs_dir.is_dir():
            docs_mtime = docs_dir.stat().st_mtime
            if docs_mtime > latest:
                latest = docs_mtime
    except OSError:
        return None

    if latest == 0.0:
        return None
    return datetime.fromtimestamp(latest).isoformat()


_scan_cache: dict[str, Any] = {"data": None, "time": 0.0}
_SCAN_CACHE_TTL = 5.0  # seconds


def scan_projects() -> list[dict[str, Any]]:
    """Scan ~/Projects/{0-7}_*/ folders and return project list (cached 5s)."""
    import time
    now = time.time()
    if _scan_cache["data"] is not None and (now - _scan_cache["time"]) < _SCAN_CACHE_TTL:
        return _scan_cache["data"]
    result = _scan_projects_uncached()
    _scan_cache["data"] = result
    _scan_cache["time"] = now
    return result


def _scan_projects_uncached() -> list[dict[str, Any]]:
    """Scan ~/Projects/{0-7}_*/ folders and return project list."""
    projects: list[dict[str, Any]] = []

    for stage_num, stage_folder in sorted(STAGE_FOLDERS.items()):
        stage_path = PROJECTS_ROOT / stage_folder
        if not stage_path.is_dir():
            continue

        for item in sorted(stage_path.iterdir()):
            if not item.is_dir():
                continue
            if item.name.startswith("."):
                continue
            # Skip common folders and _prefixed folders (meta folders)
            if item.name in COMMON_FOLDERS or item.name.startswith("_"):
                continue

            project: dict[str, Any] = {
                "name": item.name,
                "stage": stage_folder,
                "stage_number": stage_num,
                "path": str(item),
            }

            # Check for docs/_project.yaml first, fall back to docs/_아이디어노트.md
            project_yaml = item / "docs" / "_project.yaml"
            if project_yaml.exists():
                project["metadata"] = _read_project_yaml(item)
            else:
                idea_note = item / "docs" / "_아이디어노트.md"
                if idea_note.exists():
                    metadata = _parse_idea_note(idea_note)
                    project["metadata"] = metadata
                else:
                    project["metadata"] = {}

            # Extract description from 아이디어/_아이디어노트.md body (new structure)
            if not project["metadata"].get("description"):
                new_idea = item / "docs" / "아이디어" / "_아이디어노트.md"
                if new_idea.is_file():
                    try:
                        body_content = new_idea.read_text(encoding="utf-8")
                        for bline in body_content.splitlines():
                            bstripped = bline.strip()
                            if bstripped and not bstripped.startswith("#"):
                                project["metadata"]["description"] = bstripped
                                break
                    except (OSError, UnicodeDecodeError):
                        pass

            # Fallback: if no description, try README.md
            if not project["metadata"].get("description"):
                readme_desc, readme_title = _parse_readme(item)
                if readme_desc:
                    project["metadata"]["description"] = readme_desc
                if readme_title:
                    project["metadata"].setdefault("label", readme_title)

            # If still no label, check if _아이디어노트 title (# line) has one
            if not project["metadata"].get("label"):
                label = _parse_idea_note_title(item)
                if label:
                    project["metadata"]["label"] = label

            # Check has_docs and count
            docs_dir = item / "docs"
            project["has_docs"] = docs_dir.is_dir() and any(docs_dir.iterdir()) if docs_dir.is_dir() else False
            project["doc_count"] = len([f for f in docs_dir.iterdir() if f.is_file()]) if docs_dir.is_dir() else 0

            # Get last modified
            project["last_modified"] = _get_last_modified(item)

            # Inject real subtask counts (overrides metadata values)
            try:
                from services import subtask_service
                counts = subtask_service.get_counts(item.name)
                project["metadata"]["subtasks_total"] = str(counts.get("total", 0))
                project["metadata"]["subtasks_done"] = str(counts.get("done", 0))
            except Exception:
                logging.debug("Failed to load subtask counts for project", exc_info=True)

            projects.append(project)

    # Also scan _system folder for system projects
    system_path = PROJECTS_ROOT / "_system"
    if system_path.is_dir():
        for item in sorted(system_path.iterdir()):
            if not item.is_dir() or item.name.startswith("."):
                continue
            project: dict[str, Any] = {
                "name": item.name,
                "stage": "_system",
                "stage_number": "S",
                "path": str(item),
            }
            project_yaml = item / "docs" / "_project.yaml"
            if project_yaml.exists():
                project["metadata"] = _read_project_yaml(item)
            else:
                project["metadata"] = {}
            if not project["metadata"].get("description"):
                readme_desc, readme_title = _parse_readme(item)
                if readme_desc:
                    project["metadata"]["description"] = readme_desc
                if readme_title:
                    project["metadata"].setdefault("label", readme_title)
            docs_dir = item / "docs"
            project["has_docs"] = docs_dir.is_dir() and any(docs_dir.iterdir()) if docs_dir.is_dir() else False
            project["doc_count"] = len([f for f in docs_dir.iterdir() if f.is_file()]) if docs_dir.is_dir() else 0
            project["last_modified"] = _get_last_modified(item)
            projects.append(project)

    return projects


def find_project_path(project_name: str) -> Path | None:
    """Find a project path across all stage folders.

    Prefer paths that have docs/_project.yaml or docs/_아이디어노트.md to avoid residual folders.
    """
    fallback = None
    for stage_folder in STAGE_FOLDERS.values():
        candidate = PROJECTS_ROOT / stage_folder / project_name
        if candidate.is_dir():
            if (candidate / "docs" / "_project.yaml").is_file():
                return candidate
            if (candidate / "docs" / "_아이디어노트.md").is_file():
                return candidate
            if fallback is None:
                fallback = candidate
    # Also check _system folder
    system_candidate = PROJECTS_ROOT / "_system" / project_name
    if system_candidate.is_dir():
        if fallback is None:
            fallback = system_candidate
    return fallback


# Allowed metadata keys for update
EDITABLE_META_KEYS = {
    "중요도", "위급도", "긴급도", "협업", "주도", "오너", "label",
    "유형", "포트", "상태",
    "목표종료일", "실제종료일", "subtasks_total", "subtasks_done",
    "related_people", "연관프로젝트",
    "github_url", "github_pages_url", "gdrive_url",
}


def update_metadata(project_name: str, updates: dict[str, str]) -> dict[str, Any]:
    """Update metadata fields in a project's docs/_project.yaml (or legacy _아이디어노트.md).

    Writes to docs/_project.yaml (pure YAML, no frontmatter wrapper).
    Auto-creates _project.yaml if missing.
    """
    project_path = find_project_path(project_name)
    if project_path is None:
        return {"success": False, "message": f"Project not found: {project_name}"}

    project_yaml = project_path / "docs" / "_project.yaml"

    # Auto-create if doesn't exist
    if not project_yaml.exists():
        # Try reading existing metadata from old structure
        existing_meta = _read_project_yaml(project_path)
        if not existing_meta:
            from datetime import date
            existing_meta = {"label": project_name, "작성일": date.today().isoformat(), "오너": "채충일"}

        safe = {k: v for k, v in updates.items() if k in EDITABLE_META_KEYS and v}
        existing_meta.update(safe)
        existing_meta.pop("description", None)
        _write_project_yaml(project_path, existing_meta)

        # Also create 아이디어/ and 토의록/ directories
        (project_path / "docs" / "아이디어").mkdir(parents=True, exist_ok=True)
        (project_path / "docs" / "토의록").mkdir(parents=True, exist_ok=True)

        return {"success": True, "message": "Created and saved", "updated": list(safe.keys())}

    safe_updates = {k: v for k, v in updates.items() if k in EDITABLE_META_KEYS}
    if not safe_updates:
        return {"success": False, "message": "No valid metadata keys provided"}

    try:
        # Read existing metadata from _project.yaml
        existing_meta = _read_project_yaml(project_path)
        for k, v in safe_updates.items():
            if v:
                existing_meta[k] = v
            elif k in existing_meta:
                del existing_meta[k]

        _write_project_yaml(project_path, existing_meta)
        return {"success": True, "message": "Metadata updated", "updated": list(safe_updates.keys())}
    except OSError as e:
        return {"success": False, "message": f"Failed to update: {e}"}


def rename_type_all(old_type: str, new_type: str) -> int:
    """Rename a project type across all projects. Returns count of updated projects."""
    projects = scan_projects()
    count = 0
    for proj in projects:
        if proj.get("metadata", {}).get("유형") == old_type:
            result = update_metadata(proj["name"], {"유형": new_type})
            if result.get("success"):
                count += 1
    return count


def delete_type_all(type_name: str) -> int:
    """Clear a project type from all projects. Returns count of updated projects."""
    projects = scan_projects()
    count = 0
    for proj in projects:
        if proj.get("metadata", {}).get("유형") == type_name:
            result = update_metadata(proj["name"], {"유형": ""})
            if result.get("success"):
                count += 1
    return count


def sync_related_projects_rename(old_name: str, new_name: str) -> int:
    """Update 연관프로젝트 references across all projects when a folder is renamed.

    Scans every project's metadata and replaces occurrences of *old_name*
    with *new_name* in the comma-separated 연관프로젝트 field.

    Returns the number of projects whose metadata was updated.
    """
    count = 0
    for stage_folder in STAGE_FOLDERS.values():
        stage_path = PROJECTS_ROOT / stage_folder
        if not stage_path.is_dir():
            continue
        for item in stage_path.iterdir():
            if not item.is_dir() or item.name.startswith("."):
                continue
            meta = _read_project_yaml(item)
            related = meta.get("연관프로젝트", "")
            if not related:
                continue
            names = [n.strip() for n in related.split(",") if n.strip()]
            if old_name in names:
                new_names = [new_name if n == old_name else n for n in names]
                update_metadata(item.name, {"연관프로젝트": ", ".join(new_names)})
                count += 1
    return count


def _remove_project_from_all_related(project_name: str, project_label: str = "") -> None:
    """Remove a deleted project from all other projects' 연관프로젝트 field."""
    for stage_folder in STAGE_FOLDERS.values():
        stage_path = PROJECTS_ROOT / stage_folder
        if not stage_path.is_dir():
            continue
        for item in stage_path.iterdir():
            if not item.is_dir() or item.name.startswith("."):
                continue
            meta = _read_project_yaml(item)
            related = meta.get("연관프로젝트", "")
            if not related:
                continue
            names = [n.strip() for n in related.split(",") if n.strip()]
            new_names = [n for n in names if n != project_name and n != project_label]
            if len(new_names) != len(names):
                update_metadata(item.name, {"연관프로젝트": ", ".join(new_names)})


def _build_yaml_frontmatter(metadata: dict[str, Any]) -> str:
    """Build YAML frontmatter string from metadata dict."""
    if not metadata:
        return ""
    # Order keys for readability
    key_order = [
        "label", "작성일", "상태", "유형", "포트",
        "중요도", "위급도", "긴급도", "협업", "주도", "오너",
        "목표종료일", "실제종료일", "subtasks_total", "subtasks_done",
        "related_people",
    ]
    ordered: dict[str, Any] = {}
    for k in key_order:
        if k in metadata:
            ordered[k] = metadata[k]
    for k, v in metadata.items():
        if k not in ordered:
            ordered[k] = v

    yaml_str = yaml.dump(ordered, allow_unicode=True, default_flow_style=False, sort_keys=False)
    return f"---\n{yaml_str}---\n"


def _build_pure_yaml(metadata: dict[str, Any]) -> str:
    """Build pure YAML string (no --- delimiters) from metadata dict."""
    if not metadata:
        return ""
    # Order keys for readability (same as _build_yaml_frontmatter)
    key_order = [
        "label", "작성일", "상태", "유형", "포트",
        "중요도", "위급도", "긴급도", "협업", "주도", "오너",
        "목표종료일", "실제종료일", "subtasks_total", "subtasks_done",
        "related_people",
    ]
    ordered: dict[str, Any] = {}
    for k in key_order:
        if k in metadata:
            ordered[k] = metadata[k]
    for k, v in metadata.items():
        if k not in ordered:
            ordered[k] = v

    return yaml.dump(ordered, allow_unicode=True, default_flow_style=False, sort_keys=False)


def _read_project_yaml(project_path: Path) -> dict[str, Any]:
    """Read project metadata from docs/_project.yaml (new structure).

    Falls back to _parse_idea_note() for old structure (docs/_아이디어노트.md).
    """
    project_yaml = project_path / "docs" / "_project.yaml"
    if project_yaml.is_file():
        try:
            content = project_yaml.read_text(encoding="utf-8")
            data = yaml.safe_load(content)
            if isinstance(data, dict):
                metadata: dict[str, Any] = {}
                for k, v in data.items():
                    if isinstance(v, list):
                        metadata[k] = v
                    elif v is not None:
                        metadata[k] = str(v)
                return metadata
        except (OSError, UnicodeDecodeError, yaml.YAMLError):
            pass

    # Fallback: old structure
    idea_note = project_path / "docs" / "_아이디어노트.md"
    if idea_note.is_file():
        return _parse_idea_note(idea_note)

    return {}


def _write_project_yaml(project_path: Path, metadata: dict[str, Any]) -> None:
    """Write pure YAML to docs/_project.yaml (no --- delimiters)."""
    project_yaml = project_path / "docs" / "_project.yaml"
    project_yaml.parent.mkdir(parents=True, exist_ok=True)
    # Remove description from metadata (lives in body/아이디어노트)
    clean = {k: v for k, v in metadata.items() if k != "description"}
    project_yaml.write_text(_build_pure_yaml(clean), encoding="utf-8")


def update_description(project_name: str, description: str) -> dict[str, Any]:
    """Update the description in a project's docs/아이디어/_아이디어노트.md file.

    Falls back to docs/_아이디어노트.md for old structure.
    """
    project_path = find_project_path(project_name)
    if project_path is None:
        return {"success": False, "message": f"Project not found: {project_name}"}

    # New structure: docs/아이디어/_아이디어노트.md
    new_idea_note = project_path / "docs" / "아이디어" / "_아이디어노트.md"
    old_idea_note = project_path / "docs" / "_아이디어노트.md"

    # Determine which file to use
    if new_idea_note.exists():
        idea_note = new_idea_note
        is_new_structure = True
    elif old_idea_note.exists():
        idea_note = old_idea_note
        is_new_structure = False
    else:
        # Auto-create new structure
        new_idea_note.parent.mkdir(parents=True, exist_ok=True)
        display_name = project_name
        # Try to get label from _project.yaml
        meta = _read_project_yaml(project_path)
        if meta.get("label"):
            display_name = meta["label"]
        new_idea_note.write_text(
            f"# {display_name}\n\n{description}\n",
            encoding="utf-8",
        )
        # Ensure _project.yaml exists too
        if not (project_path / "docs" / "_project.yaml").exists():
            from datetime import date
            _write_project_yaml(project_path, {
                "label": display_name, "작성일": date.today().isoformat(), "오너": "채충일",
            })
        synced = ["아이디어/_아이디어노트.md (created)"]
        _sync_readme_description(project_path, display_name, description, synced)
        return {"success": True, "message": "Created and saved", "synced_to": synced}

    try:
        content = idea_note.read_text(encoding="utf-8")

        if is_new_structure:
            # New structure: pure markdown body, replace description paragraph
            body_lines = content.splitlines()
            new_body: list[str] = []
            replaced = False
            for line in body_lines:
                s = line.strip()
                if not replaced and s and not s.startswith("#"):
                    new_body.append(description)
                    replaced = True
                    continue
                new_body.append(line)
            if not replaced:
                new_body.append("")
                new_body.append(description)
            idea_note.write_text("\n".join(new_body), encoding="utf-8")
            synced = ["아이디어/_아이디어노트.md"]
            _sync_readme_description(project_path, project_name, description, synced)
            _sync_discussion_description(project_path, description, synced)
            return {"success": True, "message": "Description updated", "synced_to": synced}

        # Old structure: YAML frontmatter format
        yaml_meta, body = _parse_yaml_frontmatter(content)
        if yaml_meta:
            # Replace first non-heading, non-empty paragraph in body
            body_lines = body.splitlines()
            new_body: list[str] = []
            replaced = False
            for line in body_lines:
                s = line.strip()
                if not replaced and s and not s.startswith("#") and s != "---":
                    new_body.append(description)
                    replaced = True
                    continue
                new_body.append(line)
            if not replaced:
                new_body.append("")
                new_body.append(description)
            new_content = _build_yaml_frontmatter(yaml_meta) + "\n".join(new_body)
            idea_note.write_text(new_content, encoding="utf-8")
            synced = ["_아이디어노트.md"]
            _sync_readme_description(project_path, project_name, description, synced)
            _sync_discussion_description(project_path, description, synced)
            return {"success": True, "message": "Description updated", "synced_to": synced}

        # Legacy blockquote format
        lines = content.splitlines()
        new_lines: list[str] = []
        replaced = False
        i = 0

        while i < len(lines):
            line = lines[i]
            if line.strip() == "## 한 줄 요약":
                new_lines.append(line)
                i += 1
                # Skip blank lines after header
                while i < len(lines) and lines[i].strip() == "":
                    new_lines.append(lines[i])
                    i += 1
                # Replace old description lines until next --- or ##
                while i < len(lines):
                    stripped = lines[i].strip()
                    if stripped.startswith("##") or stripped == "---":
                        break
                    i += 1  # Skip old description
                # Insert new description
                new_lines.append(description)
                new_lines.append("")
                replaced = True
            else:
                new_lines.append(line)
                i += 1

        if not replaced:
            return {"success": False, "message": "No '## 한 줄 요약' section found"}

        idea_note.write_text("\n".join(new_lines), encoding="utf-8")

        # Sync to README.md if it exists
        synced: list[str] = ["_아이디어노트.md"]
        _sync_readme_description(project_path, project_name, description, synced)

        # Sync to _토의록.md header if it exists
        _sync_discussion_description(project_path, description, synced)

        return {"success": True, "message": "Description updated", "synced_to": synced}
    except OSError as e:
        return {"success": False, "message": f"Failed to update: {e}"}


def _sync_readme_description(
    project_path: Path, project_name: str, description: str, synced: list[str]
) -> None:
    """Sync description to README.md — update first paragraph after title."""
    for readme_name in ("README.md", "README_KO.md", "README_ZH.md"):
        readme = project_path / readme_name
        if not readme.is_file():
            continue

        try:
            content = readme.read_text(encoding="utf-8")
            lines = content.splitlines()
            new_lines: list[str] = []
            found_title = False
            replaced = False
            i = 0

            while i < len(lines):
                line = lines[i]
                # Find main title (# ProjectName)
                if not found_title and line.startswith("# "):
                    found_title = True
                    new_lines.append(line)
                    i += 1
                    # Skip blank lines after title
                    while i < len(lines) and lines[i].strip() == "":
                        new_lines.append(lines[i])
                        i += 1
                    # Check if next line is a description (not a heading/separator)
                    if i < len(lines):
                        next_stripped = lines[i].strip()
                        if next_stripped and not next_stripped.startswith("#") and next_stripped != "---":
                            # Replace old description line
                            new_lines.append(f"> {description}")
                            i += 1  # Skip old
                            replaced = True
                        else:
                            # Insert description before next section
                            new_lines.append(f"> {description}")
                            new_lines.append("")
                            replaced = True
                    continue
                new_lines.append(line)
                i += 1

            if replaced:
                readme.write_text("\n".join(new_lines), encoding="utf-8")
                synced.append(readme_name)
        except (OSError, UnicodeDecodeError):
            continue


def _sync_discussion_description(
    project_path: Path, description: str, synced: list[str]
) -> None:
    """Sync description to _토의록.md header comment if it exists.

    Checks docs/토의록/_토의록.md first, falls back to docs/_토의록.md.
    """
    discussion = project_path / "docs" / "토의록" / "_토의록.md"
    if not discussion.is_file():
        discussion = project_path / "docs" / "_토의록.md"
    if not discussion.is_file():
        return

    try:
        content = discussion.read_text(encoding="utf-8")
        lines = content.splitlines()

        # Look for existing '> 설명:' line or add after title
        new_lines: list[str] = []
        replaced = False
        for line in lines:
            stripped = line.strip()
            if stripped.startswith("> 설명:") or stripped.startswith("> 요약:"):
                new_lines.append(f"> 요약: {description}")
                replaced = True
            else:
                new_lines.append(line)

        if replaced:
            discussion.write_text("\n".join(new_lines), encoding="utf-8")
            # Report relative path from docs/
            rel_name = str(discussion.relative_to(project_path / "docs"))
            synced.append(rel_name)
    except (OSError, UnicodeDecodeError):
        pass


def migrate_to_yaml_frontmatter() -> dict[str, Any]:
    """Legacy alias for migrate_to_new_structure()."""
    return migrate_to_new_structure()


def migrate_to_new_structure() -> dict[str, Any]:
    """Migrate projects from old structure (docs/_아이디어노트.md with YAML frontmatter)
    to new structure:
      - docs/_project.yaml (pure YAML metadata)
      - docs/아이디어/_아이디어노트.md (pure markdown body)
      - docs/아이디어/ directory (always created)
      - docs/토의록/ directory (always created)
      - docs/_토의록.md moved to docs/토의록/_토의록.md
    """
    migrated: list[str] = []
    skipped: list[str] = []
    errors: list[str] = []

    for stage_folder in STAGE_FOLDERS.values():
        stage_path = PROJECTS_ROOT / stage_folder
        if not stage_path.is_dir():
            continue

        for item in stage_path.iterdir():
            if not item.is_dir() or item.name.startswith("."):
                continue
            if item.name in COMMON_FOLDERS or item.name.startswith("_"):
                continue

            docs_dir = item / "docs"
            idea_note = docs_dir / "_아이디어노트.md"
            project_yaml = docs_dir / "_project.yaml"

            # Always ensure 아이디어/ and 토의록/ directories exist
            (docs_dir / "아이디어").mkdir(parents=True, exist_ok=True)
            (docs_dir / "토의록").mkdir(parents=True, exist_ok=True)

            # Skip if already migrated (has _project.yaml, no old _아이디어노트.md)
            if project_yaml.is_file() and not idea_note.is_file():
                skipped.append(item.name)
                continue

            if not idea_note.is_file():
                skipped.append(item.name)
                continue

            try:
                content = idea_note.read_text(encoding="utf-8")

                lines = content.splitlines()

                # Parse YAML frontmatter if present
                if content.startswith("---"):
                    yaml_meta, body = _parse_yaml_frontmatter(content)
                    body_lines_raw = body.splitlines()
                else:
                    yaml_meta = {}
                    body_lines_raw = lines

                # Collect all blockquote metadata from body
                metadata: dict[str, Any] = dict(yaml_meta)
                body_lines: list[str] = []
                skip_next_separator = False

                for line in body_lines_raw:
                    stripped = line.strip()
                    # Parse blockquote metadata lines anywhere
                    if stripped.startswith(">"):
                        cleaned = stripped.lstrip(">").strip()
                        m = re.match(r"^(.+?):\s*(.+)$", cleaned)
                        if m:
                            metadata[m.group(1).strip()] = m.group(2).strip()
                            continue
                        # Skip standalone > lines
                        continue
                    # Skip --- separators that immediately follow removed blockquotes
                    if skip_next_separator and stripped == "---":
                        skip_next_separator = False
                        continue
                    if stripped == "":
                        if body_lines and body_lines[-1:] == [""]:
                            skip_next_separator = True
                        body_lines.append(line)
                        continue
                    skip_next_separator = False
                    body_lines.append(line)

                # Extract label from # heading if not set
                for line in body_lines:
                    stripped = line.strip()
                    if stripped.startswith("# "):
                        title = stripped[2:].strip()
                        title = re.sub(r"\s*[—\-]\s*(아이디어노트|아이디어).*$", "", title).strip()
                        if title:
                            metadata.setdefault("label", title)
                        break

                # Remove description from metadata (lives in body)
                metadata.pop("description", None)

                # Clean body: remove leading/trailing empty lines
                while body_lines and body_lines[0].strip() == "":
                    body_lines.pop(0)
                while body_lines and body_lines[-1].strip() == "":
                    body_lines.pop()

                # (a) Write docs/_project.yaml (pure YAML, no --- delimiters)
                _write_project_yaml(item, metadata)

                # (b) Write docs/아이디어/_아이디어노트.md (pure markdown body)
                new_idea_note = docs_dir / "아이디어" / "_아이디어노트.md"
                new_idea_note.write_text("\n".join(body_lines) + "\n", encoding="utf-8")

                # (d) Move docs/_토의록.md to docs/토의록/_토의록.md if exists
                old_discussion = docs_dir / "_토의록.md"
                new_discussion = docs_dir / "토의록" / "_토의록.md"
                if old_discussion.is_file() and not new_discussion.is_file():
                    shutil.move(str(old_discussion), str(new_discussion))

                # (e) Delete original docs/_아이디어노트.md
                idea_note.unlink()

                # (f) Delete original docs/_토의록.md if it was moved
                # (already handled by shutil.move above)

                migrated.append(item.name)

            except (OSError, UnicodeDecodeError) as e:
                errors.append(f"{item.name}: {e}")

    return {
        "success": True,
        "migrated": migrated,
        "skipped": skipped,
        "errors": errors,
        "summary": f"Migrated: {len(migrated)}, Skipped: {len(skipped)}, Errors: {len(errors)}",
    }


def delete_project(project_name: str) -> dict[str, Any]:
    """Permanently delete a project folder. Only allowed from 9_discarded."""
    project_path = PROJECTS_ROOT / "9_discarded" / project_name

    if not project_path.exists():
        return {"success": False, "message": f"Project not found in trash: {project_name}"}

    # Security: verify it's actually in 9_discarded
    resolved = project_path.resolve()
    discarded_root = (PROJECTS_ROOT / "9_discarded").resolve()
    if not resolved.is_relative_to(discarded_root):
        return {"success": False, "message": "Invalid project path"}

    # Read project label before deletion to clean up people references
    project_meta = _read_project_yaml(project_path)
    project_label = project_meta.get("label", project_name)

    try:
        shutil.rmtree(str(project_path))
    except OSError as e:
        return {"success": False, "message": f"Failed to delete: {e}"}

    # Remove project from all people's projects list
    from services.people_service import remove_project_from_all_people
    remove_project_from_all_people(project_label, project_name)

    # Remove project from other projects' 연관프로젝트
    _remove_project_from_all_related(project_name, project_label)

    return {"success": True, "message": f"Permanently deleted {project_name}"}


def create_project(
    folder_name: str,
    label: str = "",
    description: str = "",
    project_type: str = "",
    stage: str = "1_idea_stage",
    related_projects: str = "",
) -> dict[str, Any]:
    """Create a new project folder with new docs structure.

    Creates:
      - docs/_project.yaml (pure YAML metadata)
      - docs/아이디어/ directory
      - docs/아이디어/_아이디어노트.md (pure markdown body)
      - docs/토의록/ directory
    """
    stage_path = PROJECTS_ROOT / stage
    if not stage_path.is_dir():
        stage_path.mkdir(parents=True, exist_ok=True)

    project_path = stage_path / folder_name
    if project_path.exists():
        return {"success": False, "message": f"Project '{folder_name}' already exists"}

    try:
        project_path.mkdir(parents=True)
        docs_dir = project_path / "docs"
        docs_dir.mkdir()

        from datetime import date
        today = date.today().isoformat()
        display_name = label or folder_name

        meta: dict[str, Any] = {
            "label": display_name,
            "작성일": today,
            "상태": "아이디어 단계" if stage == "1_idea_stage" else "초기화",
            "오너": "채충일",
        }
        if project_type:
            meta["유형"] = project_type
        if related_projects:
            meta["연관프로젝트"] = related_projects

        # Write docs/_project.yaml (pure YAML, no --- delimiters)
        _write_project_yaml(project_path, meta)

        # Create docs/아이디어/ directory and _아이디어노트.md
        idea_dir = docs_dir / "아이디어"
        idea_dir.mkdir()
        body = f"# {display_name}\n\n"
        if description:
            body += f"{description}\n"
        (idea_dir / "_아이디어노트.md").write_text(body, encoding="utf-8")

        # Create docs/토의록/ directory
        (docs_dir / "토의록").mkdir()

        # Create docs/_settings/project_note/ directory
        settings_dir = docs_dir / "_settings"
        settings_dir.mkdir(exist_ok=True)
        (settings_dir / "project_note").mkdir()

        return {
            "success": True,
            "message": f"Created {folder_name}",
            "path": str(project_path),
        }
    except OSError as e:
        return {"success": False, "message": f"Failed: {e}"}


def create_research_project(
    folder_name: str,
    label: str = "",
    description: str = "",
    stage: str = "1_idea_stage",
    owner: str = "채충일",
    collaboration: str = "personal",
    role: str = "lead",
    importance: str = "3",
    urgency: str = "low",
    priority: str = "low",
    deadline: str = "",
    related_people: str = "",
    related_projects: str = "",
) -> dict[str, Any]:
    """Create a research project with full folder structure.

    Based on kird_data_analysis reference structure:
    - docs/ (metadata + research folders)
    - public/ (Quarto Book for GitHub Pages)
    - _session/ (session continuity)
    """
    stage_path = PROJECTS_ROOT / stage
    stage_path.mkdir(parents=True, exist_ok=True)

    project_path = stage_path / folder_name
    if project_path.exists():
        return {"success": False, "message": f"Project '{folder_name}' already exists"}

    try:
        from datetime import date
        today = date.today().isoformat()
        display_name = label or folder_name

        project_path.mkdir(parents=True)

        # === 1. docs/ structure ===
        docs = project_path / "docs"
        docs.mkdir()

        # _project.yaml
        meta: dict[str, Any] = {
            "label": display_name,
            "작성일": today,
            "상태": "아이디어 단계" if stage == "1_idea_stage" else "초기화",
            "유형": "연구",
            "중요도": importance,
            "위급도": urgency,
            "긴급도": priority,
            "협업": collaboration,
            "주도": role,
            "오너": owner,
        }
        if deadline:
            meta["목표종료일"] = deadline
        if related_people:
            meta["related_people"] = related_people
        if related_projects:
            meta["연관프로젝트"] = related_projects

        _write_project_yaml(project_path, meta)

        # _settings/
        settings = docs / "_settings"
        settings.mkdir()
        (settings / "project_note").mkdir()

        # _템플릿/ (copy from Dropbox template if exists)
        template_src = PROJECTS_ROOT / "_system" / "_templates" / "00_Public_Template"
        draft_template_src = template_src.parent.parent.parent / "Project/_0000_00_TEMPLATE" / "Draft_Template"

        # Research folder structure
        research_dirs = [
            "00_연구설정",
            "01_기존자료/기존문서",
            "01_기존자료/기존분석",
            "01_기존자료/기존자료",
            "02_아이디어",
            "03_리터리쳐리뷰 프로세스/Article",
            "03_리터리쳐리뷰 프로세스/Conceptual Framework",
            "03_리터리쳐리뷰 프로세스/Literature Review",
            "03_리터리쳐리뷰 프로세스/ScholarRAG",
            "04_방법론",
            "05_분석/Analysis_Template",
            "05_분석/Data_Raw",
            "05_분석/Qual",
            "05_분석/Quan",
            "05_분석/분석결과",
            "06_라이팅 프로세스/00_Reference",
            "06_라이팅 프로세스/01_Planning",
            "06_라이팅 프로세스/02_Writing",
            "06_라이팅 프로세스/03_Analysis",
            "06_라이팅 프로세스/04_Proofreading",
            "06_라이팅 프로세스/05_Review",
            "06_라이팅 프로세스/06_Final",
            "06_라이팅 프로세스/드레프트",
            "07_Product",
            "08_Publication_Process/journal1",
            "08_Publication_Process/journal2",
            "08_Publication_Process/journal3",
            "08_Publication_Process/Published_Draft",
            "09_토의록_Discussion_Points",
            "10_회의록_Meeting_Log",
        ]
        for d in research_dirs:
            (docs / d).mkdir(parents=True, exist_ok=True)

        # Copy Draft template if exists
        draft_src = PROJECTS_ROOT / "_system" / "_templates" / "01_Draft_Template"
        if draft_src.is_dir():
            import shutil
            dest = docs / "_템플릿" / "Draft_Tempate"
            shutil.copytree(draft_src, dest, dirs_exist_ok=True)

        # === 2. public/ structure (Quarto Book) ===
        pub_src = template_src
        if pub_src.is_dir():
            import shutil
            pub_dest = project_path / "public"
            shutil.copytree(pub_src, pub_dest, dirs_exist_ok=True)

            # Update public/_quarto.yml with project info
            quarto_yml = pub_dest / "_quarto.yml"
            if quarto_yml.exists():
                content = quarto_yml.read_text(encoding="utf-8")
                content = content.replace('title: "TEMPLATE"', f'title: "{display_name}"')
                content = content.replace('subtitle: "working"', f'subtitle: "{description or "Research in Progress"}"')
                gh_name = folder_name.replace(" ", "-")
                content = content.replace('repo-url: ""', f'repo-url: https://github.com/ChadResearch/{gh_name}')
                # Update navbar github href
                import re
                content = re.sub(
                    r'(icon: github\s*\n\s*href: )"?"?',
                    f'\\1https://github.com/ChadResearch/{gh_name}',
                    content,
                )
                quarto_yml.write_text(content, encoding="utf-8")

            # Update public/index.qmd
            index_qmd = pub_dest / "index.qmd"
            if index_qmd.exists():
                index_content = f"""# {display_name} {{.unnumbered}}

## Project Details

| Item | Value |
|------|-------|
| Owner | {owner} |
| Type | Research |
| Status | {meta['상태']} |
| Created | {today} |
| Collaboration | {collaboration} |
"""
                if related_people:
                    index_content += f"| People | {related_people} |\n"
                if deadline:
                    index_content += f"| Deadline | {deadline} |\n"
                if description:
                    index_content += f"\n## Description\n\n{description}\n"
                index_qmd.write_text(index_content, encoding="utf-8")
        else:
            # Fallback: minimal public/
            pub_dest = project_path / "public"
            pub_dest.mkdir()

        # === 3. _session/ ===
        session_dir = project_path / "_session"
        session_dir.mkdir()
        (session_dir / "README.md").write_text(
            "# 세션 연속성 문서\n\n"
            "이 프로젝트에서 작업 시작 시 Claude가 자동으로 채웁니다.\n\n"
            "| 파일 | 상태 |\n|------|------|\n"
            "| `resume_prompt.md` | 첫 작업 세션 후 생성 |\n"
            "| `project_state.md` | 첫 작업 세션 후 생성 |\n"
            "| `key_files.md` | 첫 작업 세션 후 생성 |\n",
            encoding="utf-8",
        )

        # === 4. Auto-setup: GitHub repo + Pages + GDrive folder + URLs ===
        import subprocess
        gh_name = folder_name.replace(" ", "-")
        gh_repo = f"ChadResearch/{gh_name}"
        gh_url = f"https://github.com/{gh_repo}"
        pages_url = f"https://chadresearch.github.io/{gh_name}/"
        gdrive_root = "https://drive.google.com/drive/folders/10BeaOMwS_kDT2bd16tTEk9W-ucbO7jDs"

        auto_results: dict[str, Any] = {}

        # 4a. Create GitHub repo
        try:
            r = subprocess.run(
                ["gh", "repo", "create", gh_repo, "--public", "--description", display_name],
                capture_output=True, text=True, timeout=30,
            )
            auto_results["github_created"] = r.returncode == 0
        except Exception as e:
            auto_results["github_created"] = False
            auto_results["github_error"] = str(e)

        # 4b. Git init + push public/
        pub_path = project_path / "public"
        if pub_path.is_dir():
            try:
                subprocess.run(["git", "init"], cwd=str(pub_path), capture_output=True, timeout=10)
                subprocess.run(["git", "remote", "add", "origin", f"{gh_url}.git"], cwd=str(pub_path), capture_output=True, timeout=10)
                subprocess.run(["git", "add", "-A"], cwd=str(pub_path), capture_output=True, timeout=10)
                subprocess.run(["git", "commit", "-m", f"Initial sync: {display_name}"], cwd=str(pub_path), capture_output=True, timeout=10)
                subprocess.run(["git", "branch", "-M", "main"], cwd=str(pub_path), capture_output=True, timeout=10)
                r = subprocess.run(["git", "push", "-u", "origin", "main", "--force"], cwd=str(pub_path), capture_output=True, text=True, timeout=60)
                auto_results["git_pushed"] = r.returncode == 0
            except Exception as e:
                auto_results["git_pushed"] = False
                auto_results["git_error"] = str(e)

        # 4c. Enable GitHub Pages
        try:
            r = subprocess.run(
                ["gh", "api", "-X", "POST", f"repos/{gh_repo}/pages",
                 "-f", "build_type=legacy", "-f", "source[branch]=main", "-f", "source[path]=/docs"],
                capture_output=True, text=True, timeout=30,
            )
            auto_results["pages_enabled"] = r.returncode == 0
        except Exception as e:
            auto_results["pages_enabled"] = False

        # 4d. Create Google Drive folder + template gdoc/gsheet files via API
        gdrive_url_actual = gdrive_root
        try:
            from services.gdrive_service import setup_research_project_drive
            gdrive_result = setup_research_project_drive(folder_name, display_name)
            auto_results["gdrive_created"] = gdrive_result.get("success", False)
            auto_results["gdrive_files"] = gdrive_result.get("files_created", 0)
            if gdrive_result.get("folder_url"):
                gdrive_url_actual = gdrive_result["folder_url"]
        except Exception as e:
            auto_results["gdrive_created"] = False
            auto_results["gdrive_error"] = str(e)
            # Fallback: create local mount folder
            try:
                gdrive_local = Path.home() / "Library/CloudStorage/GoogleDrive-chadchae@gmail.com/My Drive/Research project/Working" / folder_name
                gdrive_local.mkdir(parents=True, exist_ok=True)
                auto_results["gdrive_local_fallback"] = True
            except Exception:
                pass

        # 4e. Save URLs to _project.yaml
        meta["github_url"] = gh_url
        meta["github_pages_url"] = pages_url
        meta["gdrive_url"] = gdrive_url_actual
        _write_project_yaml(project_path, meta)

        return {
            "success": True,
            "message": f"Research project created: {folder_name}",
            "path": str(project_path),
            "auto_setup": auto_results,
            "links": {"github": gh_url, "pages": pages_url, "gdrive": gdrive_root},
            "structure": {
                "docs_dirs": len(research_dirs),
                "has_public": True,
                "has_session": True,
                "has_draft_template": (docs / "_템플릿" / "Draft_Tempate").is_dir(),
            },
        }
    except OSError as e:
        return {"success": False, "message": f"Failed: {e}"}


def clone_project(project_name: str) -> dict[str, Any]:
    """Clone a project: copy folder with 'copy-' prefix, label with '[COPY]' prefix."""
    import shutil

    project_path = find_project_path(project_name)
    if project_path is None:
        return {"success": False, "message": f"Project not found: {project_name}"}

    stage_dir = project_path.parent
    clone_name = f"copy-{project_name}"
    clone_path = stage_dir / clone_name

    # Avoid collision
    counter = 1
    while clone_path.exists():
        clone_name = f"copy-{counter}-{project_name}"
        clone_path = stage_dir / clone_name
        counter += 1

    try:
        shutil.copytree(project_path, clone_path)

        # Update label in cloned project's metadata
        clone_project_yaml = clone_path / "docs" / "_project.yaml"
        if clone_project_yaml.exists():
            # New structure: update _project.yaml
            clone_meta = _read_project_yaml(clone_path)
            old_label = clone_meta.get("label", project_name)
            clone_meta["label"] = f"[COPY] {old_label}"
            _write_project_yaml(clone_path, clone_meta)
        else:
            # Fallback: old structure with _아이디어노트.md
            idea_note = clone_path / "docs" / "_아이디어노트.md"
            if idea_note.exists():
                content = idea_note.read_text(encoding="utf-8")
                yaml_meta, body = _parse_yaml_frontmatter(content)
                if yaml_meta:
                    old_label = yaml_meta.get("label", project_name)
                    yaml_meta["label"] = f"[COPY] {old_label}"
                    new_content = _build_yaml_frontmatter(yaml_meta) + body
                    idea_note.write_text(new_content, encoding="utf-8")

        return {
            "success": True,
            "message": f"Cloned to {clone_name}",
            "clone_name": clone_name,
            "path": str(clone_path),
        }
    except OSError as e:
        return {"success": False, "message": f"Failed to clone: {e}"}


def move_project(project_name: str, from_stage: str, to_stage: str) -> dict[str, Any]:
    """Move a project folder from one stage to another.

    Args:
        project_name: Name of the project folder
        from_stage: Source stage folder name (e.g., "2_initiation_stage")
        to_stage: Target stage folder name (e.g., "3_in_development")

    Returns:
        Dict with success status and message
    """
    from_path = PROJECTS_ROOT / from_stage / project_name
    to_dir = PROJECTS_ROOT / to_stage
    to_path = to_dir / project_name

    if not from_path.exists():
        return {"success": False, "message": f"Project not found: {from_path}"}

    if not to_dir.exists():
        return {"success": False, "message": f"Target stage folder not found: {to_dir}"}

    if to_path.exists():
        return {"success": False, "message": f"Project already exists in target: {to_path}"}

    try:
        # Step 1: Stop running servers before moving
        run_sh = from_path / "run.sh"
        if run_sh.exists():
            import subprocess
            subprocess.run(
                ["bash", str(run_sh), "stop"],
                cwd=str(from_path),
                timeout=15,
                capture_output=True,
            )

        # Step 2: Remove .run_ports to prevent stale port refs
        ports_file = from_path / ".run_ports"
        if ports_file.exists():
            ports_file.unlink()

        # Step 3: Move the project
        shutil.move(str(from_path), str(to_path))

        # Step 4: Force remove source if it still exists (shutil.move can leave residual on cross-device)
        if from_path.exists():
            shutil.rmtree(from_path, ignore_errors=True)

        return {
            "success": True,
            "message": f"Moved {project_name} from {from_stage} to {to_stage}",
            "new_path": str(to_path),
        }
    except OSError as e:
        return {"success": False, "message": f"Failed to move project: {e}"}


def create_transition_note(
    project_name: str, from_stage: str, to_stage: str, instruction: str
) -> dict[str, Any]:
    """Create a work instruction note when project transitions between stages."""
    project_path = find_project_path(project_name)
    if project_path is None:
        return {"success": False, "message": "Project not found after move"}

    instruction_dir = project_path / "docs" / "작업지시"
    instruction_dir.mkdir(parents=True, exist_ok=True)

    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M")
    filename = f"작업지시_{date_str}.md"

    filepath = instruction_dir / filename

    # Stage label mapping
    stage_labels = {v: v.split("_", 1)[1].replace("_", " ").title() if "_" in v else v
                    for v in STAGE_FOLDERS.values()}
    from_label = stage_labels.get(from_stage, from_stage)
    to_label = stage_labels.get(to_stage, to_stage)

    note_content = f"""---
type: transition
date: "{date_str}"
time: "{time_str}"
from: "{from_stage}"
to: "{to_stage}"
---

# Work Instruction — {project_name}

**Transition**: {from_label} → {to_label}
**Date**: {date_str} {time_str}

---

## Instruction

{instruction.strip()}

---

## Checklist

- [ ] Review instruction above
- [ ] Execute tasks
- [ ] Update project status
- [ ] Update work instruction status upon completion
"""

    try:
        # If file already exists (multiple transitions same day), append
        if filepath.is_file():
            existing = filepath.read_text(encoding="utf-8")
            append = f"""

---

## Transition: {from_label} → {to_label} ({time_str})

{instruction.strip()}

- [ ] Review instruction
- [ ] Execute tasks
- [ ] Update status
- [ ] Update work instruction status upon completion
"""
            filepath.write_text(existing + append, encoding="utf-8")
        else:
            filepath.write_text(note_content, encoding="utf-8")

        return {"success": True, "filename": filename}
    except OSError as e:
        return {"success": False, "message": f"Failed to create note: {e}"}


def create_manual_instruction(
    project_name: str, instruction: str, checklist: list[str] | None = None
) -> dict[str, Any]:
    """Create a manual work instruction note (not from stage transition)."""
    project_path = find_project_path(project_name)
    if project_path is None:
        return {"success": False, "message": f"Project not found: {project_name}"}

    instruction_dir = project_path / "docs" / "작업지시"
    instruction_dir.mkdir(parents=True, exist_ok=True)

    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M")
    filename = f"작업지시_{date_str}.md"
    filepath = instruction_dir / filename

    default_checklist = ["Review instruction", "Execute tasks", "Update status", "Update work instruction status upon completion"]
    checklist_items = checklist if checklist else default_checklist
    # Always append the status update item if custom checklist provided
    if checklist and "Update work instruction status upon completion" not in checklist:
        checklist_items.append("Update work instruction status upon completion")
    checklist_md = "\n".join(f"- [ ] {item}" for item in checklist_items)

    try:
        if filepath.is_file():
            existing = filepath.read_text(encoding="utf-8")
            append = f"""

---

## Manual Instruction ({time_str})

{instruction.strip()}

{checklist_md}
"""
            filepath.write_text(existing + append, encoding="utf-8")
        else:
            content = f"""---
type: manual
date: "{date_str}"
time: "{time_str}"
---

# Work Instruction — {project_name}

**Date**: {date_str} {time_str}

---

## Instruction

{instruction.strip()}

---

## Checklist

{checklist_md}
"""
            filepath.write_text(content, encoding="utf-8")

        return {"success": True, "filename": filename}
    except OSError as e:
        return {"success": False, "message": f"Failed: {e}"}


def scan_discussions() -> list[dict[str, Any]]:
    """Scan all projects for _토의록.md and extract discussion entries."""
    discussions: list[dict[str, Any]] = []

    for stage_folder in STAGE_FOLDERS.values():
        stage_path = PROJECTS_ROOT / stage_folder
        if not stage_path.is_dir():
            continue

        for item in sorted(stage_path.iterdir()):
            if not item.is_dir() or item.name.startswith("."):
                continue
            if item.name in COMMON_FOLDERS:
                continue

            # Check new path first, fall back to old path
            discussion_file = item / "docs" / "토의록" / "_토의록.md"
            if not discussion_file.is_file():
                discussion_file = item / "docs" / "_토의록.md"
            if not discussion_file.is_file():
                continue

            try:
                content = discussion_file.read_text(encoding="utf-8")
                _parse_discussion_entries(content, item.name, discussions)
            except (OSError, UnicodeDecodeError):
                continue

    # Sort by date descending
    discussions.sort(key=lambda d: d.get("date", ""), reverse=True)
    return discussions


def _parse_discussion_entries(
    content: str, project_name: str, discussions: list[dict[str, Any]]
) -> None:
    """Parse ## YYYY-MM-DD entries from _토의록.md content."""
    lines = content.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        # Match ## YYYY-MM-DD with optional (N) and title
        heading_match = re.match(
            r"^##\s+(\d{4}-\d{2}-\d{2})\s*(?:\(\d+\))?\s*(.*)", line.strip()
        )
        if heading_match:
            date_str = heading_match.group(1)
            title = heading_match.group(2).strip()

            # Scan subsequent lines for metadata fields
            time_val = ""
            topic_val = ""
            j = i + 1
            while j < len(lines):
                sub = lines[j].strip()
                # Stop at next heading or empty section boundary
                if sub.startswith("## ") or sub.startswith("# "):
                    break
                time_match = re.match(r"\*\*시간\*\*:\s*(.*)", sub)
                if time_match:
                    time_val = time_match.group(1).strip()
                topic_match = re.match(r"\*\*주제\*\*:\s*(.*)", sub)
                if topic_match:
                    topic_val = topic_match.group(1).strip()
                j += 1

            discussions.append({
                "project_name": project_name,
                "date": date_str,
                "title": title,
                "time": time_val,
                "topic": topic_val,
            })
        i += 1


def scan_work_instructions() -> list[dict[str, Any]]:
    """Scan all projects for pending work instructions (unchecked items)."""
    instructions: list[dict[str, Any]] = []

    for stage_folder in STAGE_FOLDERS.values():
        stage_path = PROJECTS_ROOT / stage_folder
        if not stage_path.is_dir():
            continue

        for item in sorted(stage_path.iterdir()):
            if not item.is_dir() or item.name.startswith("."):
                continue
            if item.name in COMMON_FOLDERS:
                continue

            docs_dir = item / "docs"
            if not docs_dir.is_dir():
                continue

            # Find 작업지시_*.md files
            for f in sorted(docs_dir.glob("작업지시_*.md"), reverse=True):
                try:
                    content = f.read_text(encoding="utf-8")
                    unchecked = []
                    checked = []
                    # Extract all checklist items
                    for line in content.splitlines():
                        stripped = line.strip()
                        if stripped.startswith("- [ ]"):
                            unchecked.append(stripped[5:].strip())
                        elif stripped.startswith("- [x]") or stripped.startswith("- [X]"):
                            checked.append(stripped[5:].strip())

                    if not unchecked:
                        continue  # All done, skip

                    # Extract instruction blocks
                    blocks: list[dict[str, str]] = []
                    current_instruction = ""
                    current_time = ""
                    in_instruction = False

                    for line in content.splitlines():
                        stripped = line.strip()
                        if stripped.startswith("## Instruction"):
                            in_instruction = True
                            continue
                        if stripped.startswith("## Transition:"):
                            # Extract time from "## Transition: X → Y (HH:MM)"
                            m = re.search(r"\((\d{2}:\d{2})\)", stripped)
                            current_time = m.group(1) if m else ""
                            in_instruction = True
                            continue
                        if in_instruction and (stripped.startswith("##") or stripped == "---"):
                            if current_instruction.strip():
                                blocks.append({
                                    "time": current_time,
                                    "text": current_instruction.strip(),
                                })
                            current_instruction = ""
                            in_instruction = stripped.startswith("## Instruction") or stripped.startswith("## Transition:")
                            if not in_instruction:
                                continue
                        if in_instruction and stripped and not stripped.startswith("- ["):
                            current_instruction += stripped + "\n"

                    if current_instruction.strip():
                        blocks.append({
                            "time": current_time,
                            "text": current_instruction.strip(),
                        })

                    # Extract date from filename
                    date_match = re.search(r"작업지시_(\d{4}-\d{2}-\d{2})", f.name)
                    date_str = date_match.group(1) if date_match else ""

                    instructions.append({
                        "project": item.name,
                        "stage": stage_folder,
                        "path": str(item),
                        "filename": f.name,
                        "date": date_str,
                        "blocks": blocks,
                        "unchecked": unchecked,
                        "checked": checked,
                        "total": len(unchecked) + len(checked),
                        "done": len(checked),
                    })
                except (OSError, UnicodeDecodeError):
                    continue

    return instructions


def mark_instruction_done(
    project_name: str, filename: str, item_text: str, project_path_str: str = ""
) -> dict[str, Any]:
    """Mark a checklist item as done in a work instruction file."""
    # Use explicit path if provided, otherwise search
    if project_path_str:
        project_path = Path(project_path_str)
    else:
        project_path = find_project_path(project_name)
    if project_path is None or not project_path.is_dir():
        return {"success": False, "message": "Project not found"}

    filepath = project_path / "docs" / filename
    if not filepath.is_file():
        return {"success": False, "message": "File not found"}

    try:
        content = filepath.read_text(encoding="utf-8")
        # Replace first matching unchecked item
        old = f"- [ ] {item_text}"
        new = f"- [x] {item_text}"
        if old in content:
            content = content.replace(old, new, 1)
            filepath.write_text(content, encoding="utf-8")
            return {"success": True, "message": f"Marked done: {item_text}"}
        return {"success": False, "message": "Item not found"}
    except OSError as e:
        return {"success": False, "message": f"Failed: {e}"}
