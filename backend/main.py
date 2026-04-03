"""Project Manager Backend - FastAPI application."""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from services import auth_service, github_sync_service
from routers import auth, projects, documents, common, servers, people, misc, plans, sync


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: pull from GitHub on startup if configured."""
    cfg = github_sync_service.load_config()
    if cfg.get("enabled") and cfg.get("auto_pull_on_start") and cfg.get("token"):
        repo_name = cfg.get("repo_name", "")
        if repo_name in github_sync_service.CODE_REPOS:
            logging.warning(
                "[sync] Skipping auto-pull: repo_name '%s' looks like a code repo. "
                "Update repo_name to 'pm_master_sync' in Settings.", repo_name
            )
        else:
            loop = asyncio.get_event_loop()
            loop.run_in_executor(None, github_sync_service.pull_all)
    yield


app = FastAPI(title="Project Manager", version="1.1.0", lifespan=lifespan)

_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:3003",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Auth middleware ---

# Routes that don't require authentication
PUBLIC_PATHS = {"/api/auth/login", "/api/health", "/docs", "/openapi.json", "/redoc"}


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    """Protect all /api/* routes except public ones."""
    path = request.url.path

    # Allow public paths
    if path in PUBLIC_PATHS or path.startswith("/api/people/photos/") or path.startswith("/api/people/network"):
        return await call_next(request)

    # Only protect /api/* routes
    if not path.startswith("/api/"):
        return await call_next(request)

    # Check authorization header or query token (for downloads)
    auth_header = request.headers.get("Authorization", "")
    token = ""
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    elif "token" in request.query_params:
        token = request.query_params["token"]

    if not token:
        return JSONResponse(
            status_code=401,
            content={"detail": "Missing or invalid authorization header"},
        )
    if not auth_service.verify_token(token):
        return JSONResponse(
            status_code=401,
            content={"detail": "Invalid or expired token"},
        )

    return await call_next(request)


# --- Health ---

@app.get("/api/health")
def health():
    """Health check endpoint."""
    return {"status": "ok", "app": "Project Manager"}


# --- Include routers ---

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(documents.router)
app.include_router(common.router)
app.include_router(servers.router)
app.include_router(people.router)
app.include_router(misc.router)
app.include_router(plans.router)
app.include_router(sync.router)


# --- WebSocket (registered directly on app) ---

@app.websocket("/ws/terminal")
async def ws_terminal(ws: WebSocket):
    """WebSocket endpoint for embedded terminal with PTY."""
    await misc.websocket_terminal(ws)
