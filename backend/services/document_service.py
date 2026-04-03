"""Document browser service for reading/writing project markdown files."""

import os
import subprocess
from pathlib import Path
from typing import Any

PROJECTS_ROOT = Path(os.environ.get("PROJECTS_ROOT", os.path.expanduser("~/Projects")))

# Allowed prefixes for resolved macOS alias targets
ALLOWED_ALIAS_TARGETS = ("/Volumes/",)


def _resolve_macos_alias(alias_path: Path) -> Path | None:
    """Resolve a macOS Finder alias file to its target path."""
    if not alias_path.is_file():
        return None
    try:
        result = subprocess.run(
            [
                "osascript", "-e",
                f'tell application "Finder" to get POSIX path of '
                f'(original item of alias file (POSIX file "{alias_path}") as alias)',
            ],
            capture_output=True, text=True, timeout=5,
        )
        if result.returncode == 0 and result.stdout.strip():
            target = Path(result.stdout.strip())
            if target.is_dir() and any(str(target).startswith(p) for p in ALLOWED_ALIAS_TARGETS):
                return target
    except (subprocess.TimeoutExpired, OSError):
        pass
    return None


def _resolve_alias_in_path(docs_dir: Path, subpath: str) -> Path | None:
    """If subpath starts with an alias folder name, resolve to the real target path."""
    if not subpath:
        return None
    parts = subpath.split("/", 1)
    first = parts[0]
    remainder = parts[1] if len(parts) > 1 else ""

    # Check if first component matches an alias file in docs_dir
    alias_file = docs_dir / first
    if alias_file.is_file():
        target = _resolve_macos_alias(alias_file)
        if target:
            return target / remainder if remainder else target

    # Also try with " alias" suffix stripped (in case subpath was cleaned)
    return None

# Stage folder names for scanning
STAGE_PREFIXES = [
    "0_project_development_documents",
    "1_idea_stage",
    "2_initiation_stage",
    "3_in_development",
    "4_in_testing",
    "5_completed",
    "6_archived",
    "7_series",
    "8_operation",
    "9_discarded",
]


def _find_project_path(project_name: str) -> Path | None:
    """Find a project by name across all stage folders."""
    for stage in STAGE_PREFIXES:
        candidate = PROJECTS_ROOT / stage / project_name
        if candidate.is_dir():
            return candidate
    return None


def _list_dir_entries(target: Path, is_alias_root: bool = False) -> list[dict[str, Any]]:
    """List directory entries from a target path, shared by normal and alias listing."""
    files: list[dict[str, Any]] = []
    for item in sorted(target.iterdir()):
        if item.name.startswith("."):
            continue
        if item.is_dir():
            files.append({
                "filename": item.name,
                "size": 0,
                "last_modified": item.stat().st_mtime if item.exists() else 0,
                "is_folder": True,
                "is_alias": is_alias_root,
            })
        elif item.is_file():
            # Check if it's a macOS alias file pointing to an external folder
            if _is_alias_file(item):
                alias_target = _resolve_macos_alias(item)
                if alias_target:
                    files.append({
                        "filename": item.name,
                        "size": 0,
                        "last_modified": item.stat().st_mtime,
                        "is_folder": True,
                        "is_alias": True,
                        "alias_target": str(alias_target),
                    })
                    continue

            try:
                stat = item.stat()
                files.append({
                    "filename": item.name,
                    "size": stat.st_size,
                    "last_modified": stat.st_mtime,
                    "is_folder": False,
                    "is_alias": False,
                })
            except OSError:
                continue
    return files


def _is_alias_file(path: Path) -> bool:
    """Check if a file is a macOS Finder alias."""
    try:
        if not path.is_file() or path.stat().st_size > 10_000:
            return False
        # Use macOS `file` command to detect alias files
        result = subprocess.run(
            ["file", "--brief", str(path)],
            capture_output=True, text=True, timeout=3,
        )
        if result.returncode == 0 and "MacOS Alias" in result.stdout:
            return True
    except (subprocess.TimeoutExpired, OSError):
        pass
    # Fallback: name heuristic
    return path.name.endswith(" alias")


BROWSABLE_EXTENSIONS = {
    ".md", ".markdown", ".txt", ".pdf", ".docx", ".hwp", ".hwpx", ".csv",
    ".py", ".r", ".rmd", ".qmd",
    ".js", ".ts", ".jsx", ".tsx", ".json", ".yaml", ".yml",
    ".sh", ".bash", ".zsh",
    ".html", ".css", ".xml", ".svg",
    ".sql", ".toml", ".ini", ".cfg", ".conf", ".env",
    ".tex", ".bib", ".rst",
    ".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v", ".flv", ".wmv", ".3gp", ".ogv", ".ts",
    ".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac", ".wma", ".opus", ".aiff", ".mid", ".midi", ".weba",
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".ico", ".tiff",
}


def list_docs(project_name: str, subpath: str = "") -> list[dict[str, Any]]:
    """List files in a project's docs/ directory (with optional subfolder).
    Supports macOS Finder alias files that point to external volumes."""
    project_path = _find_project_path(project_name)
    if project_path is None:
        return []

    docs_dir = project_path / "docs"

    # Check if subpath navigates through an alias
    if subpath:
        alias_target = _resolve_alias_in_path(docs_dir, subpath)
        if alias_target and alias_target.is_dir():
            return _list_dir_entries(alias_target, is_alias_root=True)

    target = docs_dir / subpath if subpath else docs_dir

    # Security check for non-alias paths
    try:
        resolved = target.resolve()
        if not resolved.is_relative_to(docs_dir.resolve()):
            return []
    except (OSError, ValueError):
        return []

    if not target.is_dir():
        return []

    return _list_dir_entries(target)


def _resolve_file_path(project_name: str, filename: str) -> Path | None:
    """Resolve a file path, handling alias folders. Returns the real Path or None."""
    project_path = _find_project_path(project_name)
    if project_path is None:
        return None

    docs_dir = project_path / "docs"

    # Check if path goes through an alias folder
    alias_target = _resolve_alias_in_path(docs_dir, filename)
    if alias_target and alias_target.is_file():
        return alias_target

    # Normal path resolution
    filepath = docs_dir / filename
    try:
        filepath = filepath.resolve()
        resolved_docs = docs_dir.resolve()
        if not filepath.is_relative_to(resolved_docs):
            return None
    except (OSError, ValueError):
        return None

    if not filepath.is_file():
        return None
    return filepath


def read_doc(project_name: str, filename: str) -> str | None:
    """Read a text file from a project's docs/ directory."""
    filepath = _resolve_file_path(project_name, filename)
    if filepath is None:
        return None

    for enc in ("utf-8", "euc-kr", "cp949", "utf-16", "latin-1"):
        try:
            return filepath.read_text(encoding=enc)
        except (UnicodeDecodeError, UnicodeError):
            continue
        except OSError:
            return None
    return None


BINARY_EXTENSIONS = {
    ".pdf", ".docx",
    ".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v", ".flv", ".wmv", ".3gp", ".ogv", ".ts",
    ".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac", ".wma", ".opus", ".aiff", ".mid", ".midi", ".weba",
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".ico", ".tiff",
}


def read_doc_binary(project_name: str, filename: str) -> Path | None:
    """Return the resolved file path for a binary document."""
    filepath = _resolve_file_path(project_name, filename)
    if filepath is None:
        return None

    if filepath.suffix.lower() not in BINARY_EXTENSIONS:
        return None

    return filepath


def _resolve_writable_path(project_name: str, filename: str) -> Path | None:
    """Resolve a writable file path, handling alias folders."""
    project_path = _find_project_path(project_name)
    if project_path is None:
        return None

    docs_dir = project_path / "docs"

    # Check if path goes through an alias folder
    alias_target = _resolve_alias_in_path(docs_dir, filename)
    if alias_target:
        # Verify the parent dir is under an allowed alias target
        parent = alias_target.parent if not alias_target.is_dir() else alias_target
        if any(str(parent).startswith(p) for p in ALLOWED_ALIAS_TARGETS):
            return alias_target

    # Normal path
    docs_dir.mkdir(parents=True, exist_ok=True)
    filepath = docs_dir / filename
    try:
        filepath = filepath.resolve()
        resolved_docs = docs_dir.resolve()
        if not filepath.is_relative_to(resolved_docs):
            return None
    except (OSError, ValueError):
        return None
    return filepath


def write_doc(project_name: str, filename: str, content: str) -> dict[str, Any]:
    """Write/update a markdown file in a project's docs/ directory."""
    filepath = _resolve_writable_path(project_name, filename)
    if filepath is None:
        return {"success": False, "message": "Project not found or invalid path"}

    try:
        filepath.parent.mkdir(parents=True, exist_ok=True)
        filepath.write_text(content, encoding="utf-8")
        return {"success": True, "message": f"Saved {filename}"}
    except OSError as e:
        return {"success": False, "message": f"Failed to save: {e}"}


def create_folder(project_name: str, folder_name: str) -> dict[str, Any]:
    """Create a subfolder in a project's docs/ directory."""
    project_path = _find_project_path(project_name)
    if project_path is None:
        return {"success": False, "message": "Project not found"}

    folder_path = project_path / "docs" / folder_name
    try:
        resolved = folder_path.resolve()
        docs_dir = (project_path / "docs").resolve()
        if not resolved.is_relative_to(docs_dir):
            return {"success": False, "message": "Invalid folder name"}
    except (OSError, ValueError):
        return {"success": False, "message": "Invalid folder name"}

    if folder_path.exists():
        return {"success": False, "message": "Folder already exists"}

    try:
        folder_path.mkdir(parents=True, exist_ok=True)
        return {"success": True, "message": f"Created folder {folder_name}"}
    except OSError as e:
        return {"success": False, "message": f"Failed: {e}"}


def delete_folder(project_name: str, folder_name: str) -> dict[str, Any]:
    """Delete a subfolder from a project's docs/ directory."""
    import shutil
    project_path = _find_project_path(project_name)
    if project_path is None:
        return {"success": False, "message": "Project not found"}

    folder_path = project_path / "docs" / folder_name
    try:
        resolved = folder_path.resolve()
        docs_dir = (project_path / "docs").resolve()
        if not resolved.is_relative_to(docs_dir) or resolved == docs_dir:
            return {"success": False, "message": "Invalid folder name"}
    except (OSError, ValueError):
        return {"success": False, "message": "Invalid folder name"}

    if not folder_path.is_dir():
        return {"success": False, "message": "Folder not found"}

    try:
        shutil.rmtree(str(folder_path))
        return {"success": True, "message": f"Deleted folder {folder_name}"}
    except OSError as e:
        return {"success": False, "message": f"Failed: {e}"}


def move_doc(project_name: str, src_path: str, dest_folder: str) -> dict[str, Any]:
    """Move a file or folder to a different subfolder within docs/."""
    import shutil
    project_path = _find_project_path(project_name)
    if project_path is None:
        return {"success": False, "message": "Project not found"}

    docs_dir = (project_path / "docs").resolve()
    src = (project_path / "docs" / src_path).resolve()
    if not src.is_relative_to(docs_dir) or src == docs_dir or not src.exists():
        return {"success": False, "message": "Source not found"}

    dst_dir = (project_path / "docs" / dest_folder).resolve() if dest_folder else docs_dir
    if not dst_dir.is_relative_to(docs_dir):
        return {"success": False, "message": "Invalid destination"}
    dst_dir.mkdir(parents=True, exist_ok=True)

    dst = dst_dir / src.name
    if dst.exists():
        return {"success": False, "message": f"{src.name} already exists in destination"}
    # Prevent moving a folder into itself
    if src.is_dir() and dst_dir.is_relative_to(src):
        return {"success": False, "message": "Cannot move folder into itself"}

    try:
        shutil.move(str(src), str(dst))
        return {"success": True, "message": f"Moved to {dest_folder or '/'}" }
    except OSError as e:
        return {"success": False, "message": f"Failed: {e}"}


def rename_doc(project_name: str, old_path: str, new_name: str) -> dict[str, Any]:
    """Rename a file or folder in a project's docs/ directory."""
    project_path = _find_project_path(project_name)
    if project_path is None:
        return {"success": False, "message": "Project not found"}

    docs_dir = (project_path / "docs").resolve()
    src = (project_path / "docs" / old_path).resolve()
    if not src.is_relative_to(docs_dir) or src == docs_dir:
        return {"success": False, "message": "Invalid path"}
    if not src.exists():
        return {"success": False, "message": "Not found"}

    # new_name is just the basename, no slashes allowed
    if "/" in new_name or "\\" in new_name or not new_name.strip():
        return {"success": False, "message": "Invalid name"}

    dst = src.parent / new_name.strip()
    if dst.exists():
        return {"success": False, "message": "Name already exists"}

    try:
        src.rename(dst)
        return {"success": True, "message": f"Renamed to {new_name}"}
    except OSError as e:
        return {"success": False, "message": f"Failed: {e}"}


def delete_doc(project_name: str, filename: str) -> dict[str, Any]:
    """Delete a file from a project's docs/ directory."""
    filepath = _resolve_file_path(project_name, filename)
    if filepath is None:
        return {"success": False, "message": "File not found"}

    try:
        filepath.unlink()
        return {"success": True, "message": f"Deleted {filename}"}
    except OSError as e:
        return {"success": False, "message": f"Failed to delete: {e}"}


def move_quicknote_to_project(
    filename: str, project_name: str, target_folder: str
) -> dict[str, Any]:
    """Move a project memo from _project_memo/ to a project's docs/ folder as a standalone file."""
    temp_path = Path(os.path.expanduser("~/Projects/_notes/_project_memo"))
    src = (temp_path / filename).resolve()
    if not src.is_relative_to(temp_path.resolve()) or not src.is_file():
        return {"success": False, "message": "Source file not found"}

    project_path = _find_project_path(project_name)
    if project_path is None:
        return {"success": False, "message": "Project not found"}

    docs_dir = project_path / "docs"
    docs_dir.mkdir(parents=True, exist_ok=True)
    dest_dir = docs_dir / target_folder if target_folder else docs_dir

    try:
        resolved = dest_dir.resolve()
        if not resolved.is_relative_to(docs_dir.resolve()):
            return {"success": False, "message": "Invalid target folder"}
    except (OSError, ValueError):
        return {"success": False, "message": "Invalid target folder"}

    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / filename
    if dest.exists():
        stem = filename.rsplit(".", 1)[0] if "." in filename else filename
        ext = f".{filename.rsplit('.', 1)[1]}" if "." in filename else ""
        counter = 1
        while dest.exists():
            dest = dest_dir / f"{stem}_{counter}{ext}"
            counter += 1

    try:
        import shutil
        shutil.move(str(src), str(dest))
        return {"success": True, "message": f"Moved to {project_name}/docs/{target_folder}"}
    except OSError as e:
        return {"success": False, "message": f"Failed: {e}"}


def list_doc_folders(project_name: str) -> list[str]:
    """Recursively list all subfolder paths under a project's docs/ directory in depth-first sorted order.
    Includes macOS alias folders (shallow: only top-level alias, not recursive)."""
    project_path = _find_project_path(project_name)
    if project_path is None:
        return []

    docs_dir = project_path / "docs"
    if not docs_dir.is_dir():
        return []

    folders: list[str] = [""]  # root = ""

    def _scan(parent: Path, prefix: str, max_depth: int = 50) -> None:
        if max_depth <= 0:
            return
        try:
            children = sorted(parent.iterdir(), key=lambda p: p.name)
        except OSError:
            return
        for child in children:
            if child.name.startswith("."):
                continue
            if child.is_dir():
                rel = f"{prefix}/{child.name}" if prefix else child.name
                folders.append(rel)
                _scan(child, rel, max_depth - 1)
            elif child.is_file() and _is_alias_file(child):
                alias_target = _resolve_macos_alias(child)
                if alias_target:
                    rel = f"{prefix}/{child.name}" if prefix else child.name
                    folders.append(rel)
                    # Shallow scan alias targets (1 level only to avoid huge trees)
                    try:
                        for sub in sorted(alias_target.iterdir()):
                            if sub.is_dir() and not sub.name.startswith("."):
                                folders.append(f"{rel}/{sub.name}")
                    except OSError:
                        pass

    _scan(docs_dir, "")
    return folders


def search_docs(query: str) -> list[dict[str, Any]]:
    """Full-text search across all project docs."""
    if not query or len(query.strip()) < 2:
        return []

    query_lower = query.lower().strip()
    results: list[dict[str, Any]] = []

    for stage in STAGE_PREFIXES:
        stage_path = PROJECTS_ROOT / stage
        if not stage_path.is_dir():
            continue

        for project_dir in stage_path.iterdir():
            if not project_dir.is_dir() or project_dir.name.startswith("."):
                continue

            docs_dir = project_dir / "docs"
            if not docs_dir.is_dir():
                continue

            for doc_file in docs_dir.iterdir():
                if not doc_file.is_file():
                    continue
                if doc_file.suffix.lower() not in (".md", ".markdown", ".txt"):
                    continue

                try:
                    content = doc_file.read_text(encoding="utf-8")
                except (OSError, UnicodeDecodeError):
                    continue

                if query_lower in content.lower():
                    # Find matching lines for context
                    matching_lines: list[str] = []
                    for line in content.splitlines():
                        if query_lower in line.lower():
                            matching_lines.append(line.strip())
                            if len(matching_lines) >= 3:
                                break

                    results.append({
                        "project_name": project_dir.name,
                        "stage": stage,
                        "filename": doc_file.name,
                        "matches": matching_lines,
                    })

    return results
