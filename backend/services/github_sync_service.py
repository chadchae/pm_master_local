"""GitHub sync service for syncing backend/data/ to a private GitHub repo."""

import base64
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional

import httpx

DATA_DIR = Path(__file__).parent.parent / "data"
CONFIG_FILE = DATA_DIR / "github_sync_config.json"

# Files that must never be synced (sensitive or machine-local)
SKIP_FILES = {"auth.json", "tokens.json", "github_sync_config.json"}

# Subdirectories to sync (project-keyed JSON collections)
SYNC_SUBDIRS = ["todos", "issues", "schedules", "subtasks", "logs"]

# Top-level JSON files to sync
SYNC_TOP_LEVEL = ["people.json", "plans.json", "card_order.json"]

GITHUB_API = "https://api.github.com"

# Repo names that contain app code — syncing data to/from these would be wrong
CODE_REPOS = {"pm_master_local", "pm_master_online", "pm-master-local", "pm-master-online"}


# ── Config ────────────────────────────────────────────────────────────────────

def _default_config() -> dict:
    return {
        "enabled": False,
        "machine_role": "main",  # "main" or "laptop"
        "repo_owner": "",
        "repo_name": "",
        "token": "",
        "branch": "main",
        "auto_pull_on_start": True,
        "last_synced_at": "",
        "last_sync_result": "",
    }


def load_config() -> dict:
    if not CONFIG_FILE.exists():
        cfg = _default_config()
        save_config(cfg)
        return cfg
    try:
        return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    except Exception:
        return _default_config()


def save_config(cfg: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_FILE.write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding="utf-8")


# ── GitHub API helpers ─────────────────────────────────────────────────────────

def _headers(token: str) -> dict:
    return {
        "Authorization": f"token {token.strip()}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def _get_remote_file(owner: str, repo: str, path: str, token: str, branch: str) -> Optional[dict]:
    """Fetch file metadata (sha + content) from GitHub. Returns None if not found."""
    url = f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}"
    try:
        r = httpx.get(url, headers=_headers(token), params={"ref": branch}, timeout=15)
        if r.status_code == 200:
            return r.json()
        return None
    except Exception:
        return None


def _list_remote_dir(owner: str, repo: str, path: str, token: str, branch: str) -> list[dict]:
    """List files in a remote directory. Returns [] if not found."""
    url = f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}"
    try:
        r = httpx.get(url, headers=_headers(token), params={"ref": branch}, timeout=15)
        if r.status_code == 200:
            items = r.json()
            if isinstance(items, list):
                return [i for i in items if i.get("type") == "file"]
        return []
    except Exception:
        return []


# ── Test connection ────────────────────────────────────────────────────────────

def test_connection(token: str, owner: str, repo: str) -> dict:
    """Test GitHub token + repo access."""
    url = f"{GITHUB_API}/repos/{owner}/{repo}"
    try:
        r = httpx.get(url, headers=_headers(token), timeout=10)
        if r.status_code == 200:
            data = r.json()
            return {"ok": True, "message": f"Connected: {data.get('full_name')} ({'private' if data.get('private') else 'public'})"}
        elif r.status_code == 404:
            return {"ok": False, "message": "Repository not found. Check owner/repo name."}
        elif r.status_code == 401:
            return {"ok": False, "message": "Invalid token. Check your Personal Access Token."}
        else:
            return {"ok": False, "message": f"HTTP {r.status_code}: {r.text[:100]}"}
    except httpx.TimeoutException:
        return {"ok": False, "message": "Connection timed out."}
    except Exception as e:
        return {"ok": False, "message": str(e)}


# ── Push ──────────────────────────────────────────────────────────────────────

def _push_file(local_path: Path, remote_path: str, cfg: dict) -> dict:
    """Push a single local file to GitHub."""
    owner, repo, token, branch = cfg["repo_owner"], cfg["repo_name"], cfg["token"], cfg["branch"]
    if not local_path.exists():
        return {"path": remote_path, "status": "skipped", "reason": "local file missing"}

    content = local_path.read_bytes()
    encoded = base64.b64encode(content).decode("utf-8")

    # Get existing SHA if file already exists on remote
    existing = _get_remote_file(owner, repo, remote_path, token, branch)
    sha = existing["sha"] if existing else None

    url = f"{GITHUB_API}/repos/{owner}/{repo}/contents/{remote_path}"
    payload = {
        "message": f"sync: update {remote_path}",
        "content": encoded,
        "branch": branch,
    }
    if sha:
        payload["sha"] = sha

    try:
        r = httpx.put(url, headers=_headers(token), json=payload, timeout=30)
        if r.status_code in (200, 201):
            return {"path": remote_path, "status": "ok"}
        return {"path": remote_path, "status": "error", "reason": f"HTTP {r.status_code}: {r.text[:100]}"}
    except Exception as e:
        return {"path": remote_path, "status": "error", "reason": str(e)}


def push_all() -> dict:
    """Push all data files to GitHub."""
    cfg = load_config()
    if not cfg.get("enabled") or not cfg.get("token"):
        return {"ok": False, "message": "Sync not configured or disabled."}

    repo_name = cfg.get("repo_name", "")
    if repo_name in CODE_REPOS:
        return {
            "ok": False,
            "message": f"Safety check failed: repo_name '{repo_name}' looks like a code repo, not a data sync repo. "
                       "Set repo_name to 'pm_master_sync' in Settings.",
        }

    # Collect all (local_path, remote_path) pairs
    tasks = []
    for fname in SYNC_TOP_LEVEL:
        local = DATA_DIR / fname
        if local.exists():
            tasks.append((local, f"data/{fname}"))
    for subdir in SYNC_SUBDIRS:
        local_dir = DATA_DIR / subdir
        if not local_dir.exists():
            continue
        for f in sorted(local_dir.glob("*.json")):
            if f.name in SKIP_FILES:
                continue
            tasks.append((f, f"data/{subdir}/{f.name}"))

    # Push all files in parallel (max 8 concurrent)
    results = []
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(_push_file, local, remote, cfg): remote for local, remote in tasks}
        for future in as_completed(futures):
            results.append(future.result())

    errors = sum(1 for r in results if r["status"] == "error")

    now = time.strftime("%Y-%m-%d %H:%M:%S")
    cfg["last_synced_at"] = now
    cfg["last_sync_result"] = f"push: {len(results)} files, {errors} errors"
    save_config(cfg)

    return {
        "ok": errors == 0,
        "pushed": len(results),
        "errors": errors,
        "synced_at": now,
        "details": results,
    }


# ── Pull ──────────────────────────────────────────────────────────────────────

def _pull_file(remote_path: str, local_path: Path, cfg: dict) -> dict:
    """Pull a single file from GitHub to local."""
    owner, repo, token, branch = cfg["repo_owner"], cfg["repo_name"], cfg["token"], cfg["branch"]
    remote = _get_remote_file(owner, repo, remote_path, token, branch)
    if not remote:
        return {"path": remote_path, "status": "skipped", "reason": "not found on remote"}

    try:
        content = base64.b64decode(remote["content"])
        local_path.parent.mkdir(parents=True, exist_ok=True)
        local_path.write_bytes(content)
        return {"path": remote_path, "status": "ok"}
    except Exception as e:
        return {"path": remote_path, "status": "error", "reason": str(e)}


def pull_all() -> dict:
    """Pull all data files from GitHub to local."""
    cfg = load_config()
    if not cfg.get("enabled") or not cfg.get("token"):
        return {"ok": False, "message": "Sync not configured or disabled."}

    repo_name = cfg.get("repo_name", "")
    if repo_name in CODE_REPOS:
        return {
            "ok": False,
            "message": f"Safety check failed: repo_name '{repo_name}' looks like a code repo, not a data sync repo. "
                       "Set repo_name to 'pm_master_sync' in Settings.",
        }

    owner, repo, token, branch = cfg["repo_owner"], cfg["repo_name"], cfg["token"], cfg["branch"]
    results = []
    errors = 0

    # Top-level files
    for fname in SYNC_TOP_LEVEL:
        r = _pull_file(f"data/{fname}", DATA_DIR / fname, cfg)
        results.append(r)
        if r["status"] == "error":
            errors += 1

    # Subdirectories: list remote dir, pull each file
    for subdir in SYNC_SUBDIRS:
        remote_files = _list_remote_dir(owner, repo, f"data/{subdir}", token, branch)
        for rf in remote_files:
            fname = rf["name"]
            if fname in SKIP_FILES:
                continue
            r = _pull_file(f"data/{subdir}/{fname}", DATA_DIR / subdir / fname, cfg)
            results.append(r)
            if r["status"] == "error":
                errors += 1

    now = time.strftime("%Y-%m-%d %H:%M:%S")
    cfg["last_synced_at"] = now
    cfg["last_sync_result"] = f"pull: {len(results)} files, {errors} errors"
    save_config(cfg)

    return {
        "ok": errors == 0,
        "pulled": len(results),
        "errors": errors,
        "synced_at": now,
        "details": results,
    }


# ── Status ────────────────────────────────────────────────────────────────────

def get_status() -> dict:
    cfg = load_config()
    return {
        "enabled": cfg.get("enabled", False),
        "machine_role": cfg.get("machine_role", "main"),
        "repo_owner": cfg.get("repo_owner", ""),
        "repo_name": cfg.get("repo_name", ""),
        "branch": cfg.get("branch", "main"),
        "auto_pull_on_start": cfg.get("auto_pull_on_start", True),
        "last_synced_at": cfg.get("last_synced_at", ""),
        "last_sync_result": cfg.get("last_sync_result", ""),
        "token_set": bool(cfg.get("token")),
    }
