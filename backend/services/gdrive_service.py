"""Google Drive service for creating research project files (gdoc/gsheet)."""

import json
import sqlite3
from pathlib import Path
from typing import Any

# Template files to create in each research project folder
RESEARCH_TEMPLATES = [
    {"name": "00_Proposal", "mimeType": "application/vnd.google-apps.document"},
    {"name": "01_Draft", "mimeType": "application/vnd.google-apps.document"},
    {"name": "02_Idea_and_Thought", "mimeType": "application/vnd.google-apps.document"},
    {"name": "03_Research_Log", "mimeType": "application/vnd.google-apps.document"},
    {"name": "04_Meeting_Log", "mimeType": "application/vnd.google-apps.document"},
    {"name": "05_Question_and_Answer", "mimeType": "application/vnd.google-apps.document"},
    {"name": "06_Quote_and_Paraphrasing", "mimeType": "application/vnd.google-apps.document"},
    {"name": "07_Literature_Table", "mimeType": "application/vnd.google-apps.spreadsheet"},
]


def _get_credentials():
    """Get Google credentials from drive_token.json (OAuth with Drive scope)."""
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request

    token_path = Path.home() / ".config" / "gcloud" / "drive_token.json"
    if not token_path.exists():
        raise FileNotFoundError("drive_token.json not found. Run OAuth flow first.")

    creds = Credentials.from_authorized_user_file(
        str(token_path),
        scopes=["https://www.googleapis.com/auth/drive"],
    )

    # Refresh if expired
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        token_path.write_text(creds.to_json())

    return creds


def _get_drive_service():
    """Build Google Drive API service."""
    from googleapiclient.discovery import build

    creds = _get_credentials()
    return build("drive", "v3", credentials=creds)


def find_folder_id(folder_name: str, parent_id: str | None = None) -> str | None:
    """Find a folder ID by name in Google Drive."""
    service = _get_drive_service()
    query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    if parent_id:
        query += f" and '{parent_id}' in parents"

    results = service.files().list(q=query, fields="files(id, name)", pageSize=5).execute()
    files = results.get("files", [])
    return files[0]["id"] if files else None


def create_folder(folder_name: str, parent_id: str | None = None) -> str:
    """Create a folder in Google Drive. Returns folder ID."""
    service = _get_drive_service()
    metadata: dict[str, Any] = {
        "name": folder_name,
        "mimeType": "application/vnd.google-apps.folder",
    }
    if parent_id:
        metadata["parents"] = [parent_id]

    folder = service.files().create(body=metadata, fields="id").execute()
    return folder["id"]


def create_research_files(folder_id: str, project_label: str = "") -> list[dict[str, str]]:
    """Create template gdoc/gsheet files in a Google Drive folder.

    Returns list of created files with name, id, mimeType.
    """
    service = _get_drive_service()
    created = []

    for tmpl in RESEARCH_TEMPLATES:
        file_name = tmpl["name"]
        if project_label:
            # Prepend project label context
            file_name = f"{tmpl['name']}"

        metadata: dict[str, Any] = {
            "name": file_name,
            "mimeType": tmpl["mimeType"],
            "parents": [folder_id],
        }

        try:
            f = service.files().create(body=metadata, fields="id,name,mimeType,webViewLink").execute()
            created.append({
                "name": f.get("name", ""),
                "id": f.get("id", ""),
                "mimeType": f.get("mimeType", ""),
                "link": f.get("webViewLink", ""),
            })
        except Exception as e:
            created.append({"name": file_name, "error": str(e)})

    return created


def setup_research_project_drive(
    project_folder_name: str,
    project_label: str = "",
    working_parent_id: str | None = None,
) -> dict[str, Any]:
    """Full setup: create GDrive folder + template files for a research project.

    Args:
        project_folder_name: Folder name to create
        project_label: Human-readable project label
        working_parent_id: Parent folder ID (Research project/Working). Auto-detected if None.

    Returns:
        dict with folder_id, folder_url, files created
    """
    try:
        # Find "Working" folder under "Research project"
        if not working_parent_id:
            rp_id = find_folder_id("Research project")
            if rp_id:
                working_parent_id = find_folder_id("Working", parent_id=rp_id)

        if not working_parent_id:
            return {"success": False, "message": "Could not find 'Research project/Working' folder in GDrive"}

        # Check if folder already exists
        existing_id = find_folder_id(project_folder_name, parent_id=working_parent_id)
        if existing_id:
            folder_id = existing_id
        else:
            folder_id = create_folder(project_folder_name, parent_id=working_parent_id)

        # Create template files
        files = create_research_files(folder_id, project_label)

        folder_url = f"https://drive.google.com/drive/folders/{folder_id}"

        return {
            "success": True,
            "folder_id": folder_id,
            "folder_url": folder_url,
            "files_created": len([f for f in files if "error" not in f]),
            "files": files,
        }
    except Exception as e:
        return {"success": False, "message": str(e)}
