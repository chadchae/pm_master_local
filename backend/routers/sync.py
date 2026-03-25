"""GitHub sync endpoints."""

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from services import github_sync_service

router = APIRouter(prefix="/api/sync", tags=["sync"])


class SyncConfigRequest(BaseModel):
    enabled: bool
    machine_role: str = "main"  # "main" or "laptop"
    repo_owner: str
    repo_name: str
    token: str = ""
    branch: str = "main"
    auto_pull_on_start: bool = True


class TestConnectionRequest(BaseModel):
    token: str
    repo_owner: str
    repo_name: str


@router.get("/status")
def get_sync_status():
    """Get sync configuration and last sync status."""
    return github_sync_service.get_status()


@router.post("/config")
def save_sync_config(body: SyncConfigRequest):
    """Save sync configuration."""
    cfg = github_sync_service.load_config()
    cfg["enabled"] = body.enabled
    cfg["machine_role"] = body.machine_role
    cfg["repo_owner"] = body.repo_owner
    cfg["repo_name"] = body.repo_name
    cfg["branch"] = body.branch
    cfg["auto_pull_on_start"] = body.auto_pull_on_start
    # Only overwrite token if a new one is provided
    if body.token:
        cfg["token"] = body.token.strip()
    github_sync_service.save_config(cfg)
    return {"ok": True, "message": "Configuration saved."}


@router.post("/test")
def test_connection(body: TestConnectionRequest):
    """Test GitHub token and repo access.

    If token is blank, falls back to the saved token in config.
    """
    token = body.token.strip()
    if not token:
        cfg = github_sync_service.load_config()
        token = cfg.get("token", "")
    if not token:
        return {"ok": False, "message": "No token provided and no saved token found."}
    result = github_sync_service.test_connection(token, body.repo_owner, body.repo_name)
    return result


@router.post("/push")
def push_to_github(force: bool = Query(False)):
    """Push all local data files to GitHub.

    Laptop machines require force=true to prevent accidental overwrites.
    """
    cfg = github_sync_service.load_config()
    role = cfg.get("machine_role", "main")

    if role == "laptop" and not force:
        return JSONResponse(
            status_code=409,
            content={
                "ok": False,
                "warning": True,
                "message": (
                    "This is configured as a Laptop. "
                    "Pushing will overwrite the Main computer's data on GitHub. "
                    "Confirm to proceed."
                ),
            },
        )

    result = github_sync_service.push_all()
    if not result.get("ok"):
        return JSONResponse(status_code=400, content=result)
    return result


@router.post("/pull")
def pull_from_github(force: bool = Query(False)):
    """Pull all data files from GitHub to local.

    Main machines require force=true to prevent accidental overwrites.
    """
    cfg = github_sync_service.load_config()
    role = cfg.get("machine_role", "main")

    if role == "main" and not force:
        return JSONResponse(
            status_code=409,
            content={
                "ok": False,
                "warning": True,
                "message": (
                    "This is configured as Main. "
                    "Pulling will overwrite local data with GitHub data. "
                    "Confirm to proceed."
                ),
            },
        )

    result = github_sync_service.pull_all()
    if not result.get("ok") and result.get("errors", 0) > 0:
        return JSONResponse(status_code=400, content=result)
    return result
