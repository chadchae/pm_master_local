"""Document browser and search endpoints."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from services import document_service, log_service

router = APIRouter(prefix="/api", tags=["documents"])


def _extract_hwp_text(filepath: str) -> str:
    """Extract text from HWP/HWPX files using olefile."""
    import re
    ext = filepath.rsplit(".", 1)[-1].lower()

    if ext == "hwpx":
        # HWPX is ZIP-based XML
        import zipfile
        try:
            with zipfile.ZipFile(filepath) as z:
                texts = []
                for name in sorted(z.namelist()):
                    if "section" in name.lower() and name.endswith(".xml"):
                        from lxml import etree
                        tree = etree.parse(z.open(name))
                        for elem in tree.iter():
                            if elem.text and elem.text.strip():
                                texts.append(elem.text.strip())
                return "\n".join(texts) if texts else "(HWPX: no text extracted)"
        except Exception as e:
            return f"(HWPX preview failed: {e})"

    # HWP (OLE format)
    try:
        import olefile
        ole = olefile.OleFileIO(filepath)
        texts = []
        for stream in ole.listdir():
            path = "/".join(stream)
            if "BodyText" in path or "Section" in path:
                data = ole.openstream(stream).read()
                decoded = data.decode("utf-16-le", errors="replace")
                clean = re.sub(
                    r"[^\uAC00-\uD7A3\u3131-\u3163\u1100-\u11FF"
                    r"a-zA-Z0-9\s.,!?()/:;@#$%^&*\-_+=\[\]{}\"\\'<>~\n\r\t]",
                    "", decoded
                )
                clean = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", clean)
                clean = re.sub(r"\s{3,}", "\n", clean).strip()
                if clean and len(clean) > 3:
                    texts.append(clean)
        ole.close()
        return "\n\n".join(texts) if texts else "(HWP: no text extracted)"
    except Exception as e:
        return f"(HWP preview failed: {e})"


@router.get("/projects/{project_name}/docs")
def list_project_docs(project_name: str, subpath: str = ""):
    """List files in a project's docs/ directory (with optional subfolder)."""
    docs = document_service.list_docs(project_name, subpath)
    return {"docs": docs}


@router.get("/projects/{project_name}/docs-tree")
def list_project_doc_folders(project_name: str):
    """List all subfolder paths under a project's docs/ directory."""
    folders = document_service.list_doc_folders(project_name)
    return {"folders": folders}


@router.get("/projects/{project_name}/docs/{filename:path}")
def read_project_doc(project_name: str, filename: str):
    """Read a text file from a project's docs/ directory."""
    # Binary files -> serve as FileResponse
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    MEDIA_TYPES = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        # Video
        "mp4": "video/mp4", "webm": "video/webm", "mov": "video/quicktime",
        "avi": "video/x-msvideo", "mkv": "video/x-matroska",
        "m4v": "video/x-m4v", "flv": "video/x-flv", "wmv": "video/x-ms-wmv",
        "3gp": "video/3gpp", "ogv": "video/ogg", "ts": "video/mp2t",
        # Audio
        "mp3": "audio/mpeg", "wav": "audio/wav", "ogg": "audio/ogg",
        "m4a": "audio/mp4", "aac": "audio/aac", "flac": "audio/flac",
        "wma": "audio/x-ms-wma", "opus": "audio/opus", "aiff": "audio/aiff",
        "mid": "audio/midi", "midi": "audio/midi", "weba": "audio/webm",
        # Image
        "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
        "gif": "image/gif", "webp": "image/webp", "bmp": "image/bmp",
        "ico": "image/x-icon", "svg": "image/svg+xml", "tiff": "image/tiff",
    }
    if ext in MEDIA_TYPES:
        filepath = document_service.read_doc_binary(project_name, filename)
        if filepath is None:
            raise HTTPException(status_code=404, detail="Document not found")
        return FileResponse(str(filepath), media_type=MEDIA_TYPES[ext], filename=filepath.name)

    # HWP/HWPX: extract text preview
    if ext in ("hwp", "hwpx"):
        filepath = document_service.read_doc_binary(project_name, filename)
        if filepath is None:
            raise HTTPException(status_code=404, detail="Document not found")
        text = _extract_hwp_text(str(filepath))
        return {"content": text, "filename": filename, "hwp_preview": True}

    content = document_service.read_doc(project_name, filename)
    if content is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"content": content, "filename": filename}


class SaveDocRequest(BaseModel):
    content: str


@router.put("/projects/{project_name}/docs/{filename:path}")
def save_project_doc(project_name: str, filename: str, body: SaveDocRequest):
    """Save/update a markdown file in a project's docs/ directory."""
    result = document_service.write_doc(project_name, filename, body.content)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    log_service.auto_log(project_name, "update", f"Document saved: {filename}")
    return result


@router.delete("/projects/{project_name}/docs/{filename:path}")
def delete_project_doc(project_name: str, filename: str):
    """Delete a document from a project's docs/ directory."""
    result = document_service.delete_doc(project_name, filename)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    log_service.auto_log(project_name, "delete", f"Document deleted: {filename}")
    return result


class RenameRequest(BaseModel):
    new_name: str


class MoveDocRequest(BaseModel):
    files: list[str]
    dest_folder: str


@router.post("/projects/{project_name}/docs-move")
def move_project_docs(project_name: str, body: MoveDocRequest):
    """Move files/folders to a different subfolder within docs/."""
    results = []
    for f in body.files:
        result = document_service.move_doc(project_name, f, body.dest_folder)
        results.append({"file": f, **result})
    failed = [r for r in results if not r["success"]]
    if failed:
        return {"success": False, "results": results}
    return {"success": True, "results": results}


@router.patch("/projects/{project_name}/docs/{filename:path}")
def rename_project_doc(project_name: str, filename: str, body: RenameRequest):
    """Rename a file or folder in a project's docs/ directory."""
    result = document_service.rename_doc(project_name, filename, body.new_name)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


class FolderRequest(BaseModel):
    folder_name: str


@router.post("/projects/{project_name}/folders")
def create_folder(project_name: str, body: FolderRequest):
    """Create a subfolder in a project's docs/ directory."""
    result = document_service.create_folder(project_name, body.folder_name)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.delete("/projects/{project_name}/folders/{folder_name}")
def delete_folder(project_name: str, folder_name: str):
    """Delete a subfolder from a project's docs/ directory."""
    result = document_service.delete_folder(project_name, folder_name)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.post("/projects/{project_name}/docs-open/{filename:path}")
def open_doc_in_system(project_name: str, filename: str):
    """Open a document with the system default application (macOS `open`)."""
    import subprocess

    filepath = document_service._resolve_file_path(project_name, filename)
    if filepath is None:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        subprocess.Popen(["open", str(filepath)])
        return {"success": True, "message": f"Opened {filepath.name}"}
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Failed to open: {e}")


@router.get("/search")
def search_docs(q: str = ""):
    """Full-text search across all project docs."""
    results = document_service.search_docs(q)
    return {"query": q, "results": results}
