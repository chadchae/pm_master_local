"use client";

import React, { Suspense, lazy } from "react";
import {
  Loader2,
  Plus,
  X,
  Trash2,
  Pencil,
  FileText,
  Folder,
  FolderSymlink,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Square,
  Save,
  Download,
  Printer,
  Hash,
  StickyNote,
  BookOpen,
  Maximize2,
  Minimize2,
  Edit3,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { FileItem } from "@/lib/api";

interface DocEntry extends FileItem {
  is_folder?: boolean;
  is_alias?: boolean;
}
import { DocumentViewer } from "@/components/project/DocumentViewer";
import { MemoEditor } from "@/components/project/MemoEditor";

const MDEditor = lazy(() => import("@uiw/react-md-editor"));

function MoveFolderTree({ folders, selectedFolder, expandedFolders, onSelect, onToggle }: {
  folders: string[]; selectedFolder: string; expandedFolders: Set<string>;
  onSelect: (f: string) => void; onToggle: (f: string) => void;
}) {
  const tree: Record<string, string[]> = {};
  for (const f of folders) {
    if (f === "") continue;
    const parts = f.split("/");
    const parent = parts.length === 1 ? "" : parts.slice(0, -1).join("/");
    if (!tree[parent]) tree[parent] = [];
    tree[parent].push(f);
  }
  const renderNode = (path: string, depth: number): React.ReactNode => {
    const children = tree[path] || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedFolders.has(path);
    const isSelected = selectedFolder === path;
    const label = path === "" ? "/ (docs root)" : path.split("/").pop();
    return (
      <div key={path}>
        <div
          className={`flex items-center text-xs cursor-pointer transition-colors ${isSelected ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300" : "hover:bg-neutral-100 dark:hover:bg-neutral-700/50 text-neutral-700 dark:text-neutral-300"}`}
          style={{ paddingLeft: `${4 + depth * 14}px` }}
        >
          {hasChildren ? (
            <button onClick={() => onToggle(path)} className="p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded">
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <button onClick={() => onSelect(path)} className="flex-1 flex items-center gap-1 py-1 text-left min-w-0">
            <Folder className={`w-3 h-3 flex-shrink-0 ${path === "" ? "text-indigo-500" : "text-amber-500"}`} />
            <span className="truncate">{label}</span>
          </button>
        </div>
        {hasChildren && isExpanded && children.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };
  return (
    <div className="max-h-48 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 py-0.5">
      {renderNode("", 0)}
    </div>
  );
}

interface ProjectDocumentsTabProps {
  projectName: string;
  docs: DocEntry[];
  setDocs: React.Dispatch<React.SetStateAction<FileItem[]>>;
  selectedDoc: string | null;
  setSelectedDoc: (v: string | null) => void;
  docContent: string;
  setDocContent: (v: string) => void;
  docBlobUrl: string | null;
  setDocBlobUrl: (v: string | null) => void;
  docHtml: string | null;
  setDocHtml: (v: string | null) => void;
  docPath: string;
  setDocPath: (v: string) => void;
  docFullscreen: boolean;
  setDocFullscreen: (v: boolean) => void;
  showNewDoc: boolean;
  setShowNewDoc: (v: boolean) => void;
  showNewDocMenu: boolean;
  setShowNewDocMenu: (v: boolean) => void;
  showNewDocFolder: boolean;
  setShowNewDocFolder: (v: boolean) => void;
  newDocFolderName: string;
  setNewDocFolderName: (v: string) => void;
  newDocName: string;
  setNewDocName: (v: string) => void;
  newDocContent: string;
  setNewDocContent: (v: string) => void;
  creatingDoc: boolean;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  editContent: string;
  setEditContent: (v: string) => void;
  saving: boolean;
  deletingDoc: boolean;
  setDeletingDoc: (v: boolean) => void;
  docSelectMode: boolean;
  setDocSelectMode: (v: boolean) => void;
  docSelected: Set<string>;
  setDocSelected: React.Dispatch<React.SetStateAction<Set<string>>>;
  docSortKey: "name" | "type";
  docSortDir: "asc" | "desc";
  sortedDocs: DocEntry[];
  renamingDoc: string | null;
  setRenamingDoc: (v: string | null) => void;
  renameValue: string;
  setRenameValue: (v: string) => void;
  showMovePanel: boolean;
  setShowMovePanel: (v: boolean) => void;
  moveFolders: string[];
  moveSelectedFolder: string;
  setMoveSelectedFolder: (v: string) => void;
  moveExpandedFolders: Set<string>;
  loadingMoveFolders: boolean;
  movingDocs: boolean;
  memoOpen: boolean;
  setMemoOpen: (v: boolean) => void;
  memoContent: string;
  setMemoContent: (v: string) => void;
  memoSaving: boolean;
  memoLineNumbers: boolean;
  setMemoLineNumbers: (v: boolean) => void;
  showLineNumbers: boolean;
  setShowLineNumbers: (v: boolean) => void;
  colorMode: "light" | "dark";
  onLoadDocs: (path: string) => void;
  onLoadDoc: (filename: string) => void;
  onSaveDoc: () => void;
  onRenameDoc: (oldName: string, newName: string) => void;
  onOpenMovePanel: () => void;
  onMoveSelectedDocs: () => void;
  onToggleMoveFolder: (folder: string) => void;
  onToggleDocSort: (key: "name" | "type") => void;
  onOpenMemo: () => void;
  onViewMemo: () => void;
  onFlushMemo: () => void;
  onMemoChange: (v: string) => void;
  getMemoFilename: (fn: string) => string;
  getApiDocPath: (relativePath: string) => string;
  getExt: (name: string) => string;
  onConfirmDelete: (message: string, onConfirm: () => void) => void;
  onToastSuccess: (msg: string) => void;
  onToastError: (msg: string) => void;
  onCreateFolder: (folderPath: string) => void;
  onCreateDoc: (filename: string, content: string) => void;
  t: (key: string) => string;
}

export function ProjectDocumentsTab({
  projectName,
  docs,
  setDocs,
  selectedDoc,
  setSelectedDoc,
  docContent,
  setDocContent,
  docBlobUrl,
  setDocBlobUrl,
  docHtml,
  setDocHtml,
  docPath,
  setDocPath,
  docFullscreen,
  setDocFullscreen,
  showNewDoc,
  setShowNewDoc,
  showNewDocMenu,
  setShowNewDocMenu,
  showNewDocFolder,
  setShowNewDocFolder,
  newDocFolderName,
  setNewDocFolderName,
  newDocName,
  setNewDocName,
  newDocContent,
  setNewDocContent,
  creatingDoc,
  isEditing,
  setIsEditing,
  editContent,
  setEditContent,
  saving,
  deletingDoc,
  setDeletingDoc,
  docSelectMode,
  setDocSelectMode,
  docSelected,
  setDocSelected,
  docSortKey,
  docSortDir,
  sortedDocs,
  renamingDoc,
  setRenamingDoc,
  renameValue,
  setRenameValue,
  showMovePanel,
  setShowMovePanel,
  moveFolders,
  moveSelectedFolder,
  setMoveSelectedFolder,
  moveExpandedFolders,
  loadingMoveFolders,
  movingDocs,
  memoOpen,
  setMemoOpen,
  memoContent,
  setMemoContent,
  memoSaving,
  memoLineNumbers,
  setMemoLineNumbers,
  showLineNumbers,
  setShowLineNumbers,
  colorMode,
  onLoadDocs,
  onLoadDoc,
  onSaveDoc,
  onRenameDoc,
  onOpenMovePanel,
  onMoveSelectedDocs,
  onToggleMoveFolder,
  onToggleDocSort,
  onOpenMemo,
  onViewMemo,
  onFlushMemo,
  onMemoChange,
  getMemoFilename,
  getApiDocPath,
  getExt,
  onConfirmDelete,
  onToastSuccess,
  onToastError,
  onCreateFolder,
  onCreateDoc,
  t,
}: ProjectDocumentsTabProps) {
  return (
    <div className={docFullscreen ? "flex gap-4 flex-1 min-h-0" : "flex gap-4 h-[calc(100vh-22rem)]"}>
      {/* File List */}
      <div className={`w-72 flex-shrink-0 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden ${docFullscreen ? "hidden" : ""}`}>
        {/* Path bar */}
        {docPath && (
          <button
            onClick={() => {
              const parts = docPath.split("/");
              parts.pop();
              const parent = parts.join("/");
              setDocPath(parent);
              onLoadDocs(parent);
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-b border-neutral-100 dark:border-neutral-800 w-full"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="truncate font-mono">{docPath}</span>
          </button>
        )}

        {/* Toolbar */}
        <div className="p-2 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-1">
          <div className="relative">
            <button
              onClick={() => setShowNewDocMenu(!showNewDocMenu)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> New
            </button>
            {showNewDocMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowNewDocMenu(false)} />
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-20 w-32 overflow-hidden">
                  <button onClick={() => { setShowNewDoc(true); setShowNewDocFolder(false); setSelectedDoc(null); setShowNewDocMenu(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" /> File
                  </button>
                  <button onClick={() => { setShowNewDocFolder(true); setShowNewDoc(false); setSelectedDoc(null); setShowNewDocMenu(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-2">
                    <Folder className="w-3.5 h-3.5 text-amber-500" /> Folder
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => { setDocSelectMode(!docSelectMode); if (docSelectMode) setDocSelected(new Set()); }}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
              docSelectMode ? "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30" : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" /> Select
          </button>
          {docSelectMode && docSelected.size > 0 && (
            <>
              <button
                onClick={() => {
                  onConfirmDelete(`Delete ${docSelected.size} file(s)?`, async () => {
                    for (const f of docSelected) {
                      try { await fetch(`/api/projects/${encodeURIComponent(projectName)}/docs/${encodeURIComponent(getApiDocPath(docPath ? `${docPath}/${f}` : f))}`, { method: "DELETE" }); } catch {}
                    }
                    setDocs((prev) => prev.filter((d) => !docSelected.has(d.filename)));
                    if (selectedDoc && docSelected.has(selectedDoc)) { setSelectedDoc(null); setDocContent(""); setDocBlobUrl(null); setDocHtml(null); }
                    onToastSuccess(`Deleted ${docSelected.size} file(s)`);
                    setDocSelected(new Set()); setDocSelectMode(false);
                  });
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 rounded"
              >
                <Trash2 className="w-3.5 h-3.5" /> ({docSelected.size})
              </button>
              <button
                onClick={onOpenMovePanel}
                className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30 rounded"
              >
                <FolderSymlink className="w-3.5 h-3.5" /> Move
              </button>
            </>
          )}
          {docSelectMode && (
            <button
              onClick={() => setDocSelected(docSelected.size === docs.length ? new Set() : new Set(docs.map(d => d.filename)))}
              className="text-xs text-neutral-400 hover:text-neutral-600 ml-auto px-1"
            >
              {docSelected.size === docs.length ? "None" : "All"}
            </button>
          )}
        </div>

        {/* Move panel */}
        {showMovePanel && (
          <div className="p-2 border-b border-neutral-200 dark:border-neutral-700 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Move {docSelected.size} item(s) to:</span>
              <button onClick={() => setShowMovePanel(false)} className="p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700">
                <X className="w-3.5 h-3.5 text-neutral-500" />
              </button>
            </div>
            {loadingMoveFolders ? (
              <div className="flex items-center gap-1.5 text-xs text-neutral-400"><Loader2 className="w-3 h-3 animate-spin" /> Loading...</div>
            ) : (
              <MoveFolderTree
                folders={moveFolders}
                selectedFolder={moveSelectedFolder}
                expandedFolders={moveExpandedFolders}
                onSelect={setMoveSelectedFolder}
                onToggle={onToggleMoveFolder}
              />
            )}
            <div className="flex justify-end">
              <button
                onClick={onMoveSelectedDocs}
                disabled={movingDocs}
                className="px-2.5 py-1 bg-indigo-500 text-white rounded text-xs hover:bg-indigo-600 disabled:opacity-40 flex items-center gap-1"
              >
                {movingDocs ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderSymlink className="w-3 h-3" />}
                Move
              </button>
            </div>
          </div>
        )}

        {/* Sort header */}
        <div className="flex items-center border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 text-xs text-neutral-500 dark:text-neutral-400">
          <button onClick={() => onToggleDocSort("name")} className="flex-1 flex items-center gap-1 px-3 py-1.5 hover:text-neutral-700 dark:hover:text-neutral-200">
            Name {docSortKey === "name" ? (docSortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
          </button>
          <button onClick={() => onToggleDocSort("type")} className="w-16 flex items-center gap-1 px-2 py-1.5 hover:text-neutral-700 dark:hover:text-neutral-200">
            Type {docSortKey === "type" ? (docSortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
          </button>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
          {sortedDocs.map((doc) => (
            <div key={doc.filename} className={`flex items-center group ${selectedDoc === doc.filename ? "bg-indigo-50 dark:bg-indigo-950" : "hover:bg-neutral-50 dark:hover:bg-neutral-800"}`}>
              {docSelectMode && (
                <button onClick={() => setDocSelected((prev) => { const n = new Set(prev); if (n.has(doc.filename)) { n.delete(doc.filename); } else { n.add(doc.filename); }; return n; })} className="pl-3 pr-1 py-2">
                  {docSelected.has(doc.filename) ? <CheckSquare className="w-4 h-4 text-red-500" /> : <Square className="w-4 h-4 text-neutral-400" />}
                </button>
              )}
              <button
                onClick={() => { if (docSelectMode) { setDocSelected((prev) => { const n = new Set(prev); if (n.has(doc.filename)) { n.delete(doc.filename); } else { n.add(doc.filename); }; return n; }); } else { onLoadDoc(doc.filename); setShowNewDoc(false); } }}
                onDoubleClick={() => { if (docSelectMode || doc.is_folder) return; const fp = docPath ? `${docPath}/${doc.filename}` : doc.filename; fetch(`/api/projects/${encodeURIComponent(projectName)}/docs-open/${encodeURIComponent(fp)}`, { method: "POST" }).catch(() => {}); }}
                className={`flex-1 text-left px-3 py-2 text-sm flex items-center gap-2 ${selectedDoc === doc.filename ? "text-indigo-700 dark:text-indigo-300" : "text-neutral-700 dark:text-neutral-300"}`}
              >
                {(() => {
                  const e = doc.filename.split(".").pop()?.toLowerCase() || "";
                  if (doc.is_folder && doc.is_alias) return <FolderSymlink className="w-4 h-4 flex-shrink-0 text-teal-500" />;
                  if (doc.is_folder) return <Folder className="w-4 h-4 flex-shrink-0 text-amber-500" />;
                  if (e === "pdf") return <FileText className="w-4 h-4 flex-shrink-0 text-red-500" />;
                  if (e === "docx") return <FileText className="w-4 h-4 flex-shrink-0 text-blue-500" />;
                  if (e === "csv") return <FileText className="w-4 h-4 flex-shrink-0 text-green-500" />;
                  if (["mp4","webm","mov","avi","mkv","m4v","flv","wmv","3gp","ogv","ts"].includes(e)) return <FileText className="w-4 h-4 flex-shrink-0 text-purple-500" />;
                  if (["mp3","wav","ogg","m4a","aac","flac","wma","opus","aiff","mid","midi","weba"].includes(e)) return <FileText className="w-4 h-4 flex-shrink-0 text-pink-500" />;
                  if (["png","jpg","jpeg","gif","webp","bmp","ico","tiff"].includes(e)) return <FileText className="w-4 h-4 flex-shrink-0 text-cyan-500" />;
                  return <FileText className="w-4 h-4 flex-shrink-0" />;
                })()}
                {renamingDoc === doc.filename ? (
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => onRenameDoc(doc.filename, renameValue)}
                    onKeyDown={(e) => { if (e.key === "Enter") onRenameDoc(doc.filename, renameValue); if (e.key === "Escape") setRenamingDoc(null); }}
                    className="flex-1 px-1 py-0.5 text-sm bg-white dark:bg-neutral-800 border border-indigo-400 rounded outline-none"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="truncate flex-1">{doc.filename}</span>
                )}
                <span className="w-12 text-xs text-neutral-400 text-right flex-shrink-0">{doc.is_folder ? "folder" : getExt(doc.filename) || "file"}</span>
              </button>
              {!docSelectMode && (
                <>
                <button
                  onClick={(e) => { e.stopPropagation(); setRenamingDoc(doc.filename); setRenameValue(doc.filename); }}
                  className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Rename"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    const isFolder = doc.is_folder;
                    const msg = isFolder ? `Delete folder "${doc.filename}" and all contents?` : `Delete "${doc.filename}"?`;
                    onConfirmDelete(msg, () => {
                      const path = getApiDocPath(docPath ? `${docPath}/${doc.filename}` : doc.filename);
                      const url = isFolder
                        ? `/api/projects/${encodeURIComponent(projectName)}/folders/${encodeURIComponent(path)}`
                        : `/api/projects/${encodeURIComponent(projectName)}/docs/${encodeURIComponent(path)}`;
                      fetch(url, { method: "DELETE" })
                        .then(() => { setDocs((p) => p.filter((d) => d.filename !== doc.filename)); if (selectedDoc === doc.filename) { setSelectedDoc(null); setDocContent(""); setDocBlobUrl(null); setDocHtml(null); } onToastSuccess("Deleted"); })
                        .catch((e) => onToastError(e instanceof Error ? e.message : "Failed"));
                    });
                  }}
                  className="p-1.5 mr-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-400 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                </>
              )}
            </div>
          ))}
          {docs.length === 0 && <p className="px-3 py-6 text-sm text-neutral-400 text-center">{t("project.noDocuments")}</p>}
        </div>

        <div className="px-3 py-2 border-t border-neutral-100 dark:border-neutral-800">
          <span className="text-xs text-neutral-400">{docs.length} file{docs.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Content Panel */}
      <div className="flex-1 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden">
        {showNewDocFolder ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-80 space-y-3">
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">New Folder</h3>
              <input type="text" value={newDocFolderName} onChange={(e) => setNewDocFolderName(e.target.value)} placeholder="folder-name" className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500" autoFocus onKeyDown={(e) => {
                if (e.key === "Enter" && newDocFolderName.trim()) {
                  onCreateFolder(getApiDocPath(docPath ? `${docPath}/${newDocFolderName.trim()}` : newDocFolderName.trim()));
                }
                if (e.key === "Escape") setShowNewDocFolder(false);
              }} />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowNewDocFolder(false)} className="px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg">Cancel</button>
                <button onClick={() => {
                  if (!newDocFolderName.trim()) return;
                  onCreateFolder(getApiDocPath(docPath ? `${docPath}/${newDocFolderName.trim()}` : newDocFolderName.trim()));
                }} disabled={!newDocFolderName.trim()} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-40">
                  <Folder className="w-4 h-4" /> Create
                </button>
              </div>
            </div>
          </div>
        ) : showNewDoc ? (
          <>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">New Document</span>
              <button onClick={() => setShowNewDoc(false)} className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-3 border-b border-neutral-100 dark:border-neutral-800">
              <input type="text" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} placeholder="filename.md" className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" autoFocus onKeyDown={(e) => { if (e.key === "Enter" && newDocName.trim()) { const fn = newDocName.endsWith(".md") ? newDocName : `${newDocName}.md`; onCreateDoc(getApiDocPath(docPath ? `${docPath}/${fn}` : fn), newDocContent || `# ${newDocName.replace(/\.md$/, "")}\n\n`); } }} />
            </div>
            <div className="flex-1 overflow-hidden" data-color-mode={colorMode}>
              <Suspense fallback={<div className="p-4"><Loader2 className="w-5 h-5 animate-spin text-neutral-400" /></div>}>
                <MDEditor value={newDocContent} onChange={(v) => setNewDocContent(v || "")} height="100%" preview="edit" />
              </Suspense>
            </div>
            <div className="flex justify-end gap-2 px-4 py-2.5 border-t border-neutral-100 dark:border-neutral-800">
              <button onClick={() => setShowNewDoc(false)} className="px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg">Cancel</button>
              <button
                onClick={() => { const fn = newDocName.endsWith(".md") ? newDocName : `${newDocName}.md`; onCreateDoc(getApiDocPath(docPath ? `${docPath}/${fn}` : fn), newDocContent || `# ${newDocName.replace(/\.md$/, "")}\n\n`); }}
                disabled={creatingDoc || !newDocName.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-40"
              >
                {creatingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
              </button>
            </div>
          </>
        ) : selectedDoc ? (
          <>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{selectedDoc}</span>
              <div className="flex items-center gap-1">
                {isEditing ? (
                  <>
                    <button onClick={() => setIsEditing(false)} className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500" title="Cancel"><X className="w-4 h-4" /></button>
                    <button onClick={onSaveDoc} disabled={saving} className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-indigo-600 dark:text-indigo-400" title="Save">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </button>
                  </>
                ) : (
                  <>
                    {(() => {
                      const binaryExts = ["pdf","docx","mp4","webm","mov","avi","mkv","m4v","flv","wmv","3gp","ogv","ts","mp3","wav","ogg","m4a","aac","flac","wma","opus","aiff","mid","midi","weba","png","jpg","jpeg","gif","webp","bmp","ico","tiff"];
                      const ext = selectedDoc.split(".").pop()?.toLowerCase() || "";
                      return binaryExts.includes(ext) ? null : (
                        <button onClick={() => { setEditContent(docContent); setIsEditing(true); }} className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500" title="Edit"><Edit3 className="w-4 h-4" /></button>
                      );
                    })()}
                    {(() => {
                      const binaryExts = ["pdf","docx","mp4","webm","mov","avi","mkv","m4v","flv","wmv","3gp","ogv","ts","mp3","wav","ogg","m4a","aac","flac","wma","opus","aiff","mid","midi","weba","png","jpg","jpeg","gif","webp","bmp","ico","tiff"];
                      const ext = selectedDoc.split(".").pop()?.toLowerCase() || "";
                      return binaryExts.includes(ext);
                    })() ? (
                      <a
                        href={`/api/projects/${encodeURIComponent(projectName)}/docs/${encodeURIComponent(getApiDocPath(docPath ? `${docPath}/${selectedDoc}` : selectedDoc))}`}
                        download={selectedDoc}
                        className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    ) : (
                      <button
                        onClick={() => {
                          const printWin = window.open("", "_blank");
                          if (!printWin) return;
                          const contentEl = document.querySelector("[data-color-mode] .wmde-markdown") as HTMLElement;
                          const rawContent = contentEl?.innerHTML || `<pre style="white-space:pre-wrap;font-family:monospace;">${docContent.replace(/</g,"&lt;")}</pre>`;
                          printWin.document.write(`<!DOCTYPE html><html><head><title>${selectedDoc}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#1a1a1a;line-height:1.6}h1,h2,h3{margin-top:1.5em}pre{background:#f5f5f5;padding:12px;border-radius:6px;overflow-x:auto}code{background:#f5f5f5;padding:2px 4px;border-radius:3px;font-size:0.9em}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}img{max-width:100%}@media print{body{margin:0}}</style></head><body>${rawContent}</body></html>`);
                          printWin.document.close();
                          setTimeout(() => { printWin.print(); }, 300);
                        }}
                        className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
                        title="Print / Save as PDF"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    )}
                    {(() => {
                      const textExts = ["md","rmd","qmd","txt","py","js","ts","tsx","jsx","json","yaml","yml","toml","ini","cfg","conf","sh","bash","zsh","html","htm","css","scss","less","xml","svg","sql","r","rmd","qmd","java","c","cpp","h","hpp","go","rs","rb","php","pl","lua","vim","dockerfile","makefile","cmake","env","gitignore","editorconfig","hwp","hwpx"];
                      const ext = selectedDoc?.split(".").pop()?.toLowerCase() || "";
                      const isText = textExts.includes(ext) || (!docBlobUrl && !docHtml);
                      return isText ? (
                        <button
                          onClick={() => setShowLineNumbers(!showLineNumbers)}
                          className={`p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 ${showLineNumbers ? "text-indigo-500" : "text-neutral-500"}`}
                          title={showLineNumbers ? "Hide Line Numbers" : "Show Line Numbers"}
                        >
                          <Hash className="w-4 h-4" />
                        </button>
                      ) : null;
                    })()}
                    <button
                      onClick={() => { if (memoOpen) { onFlushMemo(); setMemoOpen(false); } else { onOpenMemo(); } }}
                      className={`p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 ${memoOpen ? "text-amber-500" : "text-neutral-500"}`}
                      title={memoOpen ? "Close Memo" : "Memo"}
                    >
                      <StickyNote className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { if (memoOpen) { onFlushMemo(); setMemoOpen(false); } else { onViewMemo(); } }}
                      className={`p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 ${memoOpen ? "text-amber-500" : "text-neutral-500"}`}
                      title={memoOpen ? "Close Memo" : "View Memo"}
                    >
                      <BookOpen className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDocFullscreen(!docFullscreen)}
                      className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
                      title={docFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    >
                      {docFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => {
                        onConfirmDelete(`Delete "${selectedDoc}"?`, () => {
                          setDeletingDoc(true);
                          fetch(`/api/projects/${encodeURIComponent(projectName)}/docs/${encodeURIComponent(getApiDocPath(docPath ? `${docPath}/${selectedDoc}` : selectedDoc))}`, { method: "DELETE" })
                            .then(() => { setDocs((p) => p.filter((d) => d.filename !== selectedDoc)); setSelectedDoc(null); setDocContent(""); setDocBlobUrl(null); setDocHtml(null); onToastSuccess("Deleted"); })
                            .catch((e) => onToastError(e instanceof Error ? e.message : "Failed"))
                            .finally(() => setDeletingDoc(false));
                        });
                      }}
                      disabled={deletingDoc}
                      className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-neutral-400 hover:text-red-500" title="Delete"
                    >
                      {deletingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 flex overflow-hidden">
              <div className={`${memoOpen ? "w-3/4" : "w-full"} overflow-auto`} data-color-mode={colorMode}>
                {isEditing ? (
                  <Suspense fallback={<div className="p-4"><Loader2 className="w-5 h-5 animate-spin" /></div>}>
                    <MDEditor value={editContent} onChange={(v) => setEditContent(v || "")} height="100%" preview="live" />
                  </Suspense>
                ) : (
                  <DocumentViewer
                    selectedDoc={selectedDoc!}
                    docContent={docContent}
                    docBlobUrl={docBlobUrl}
                    docHtml={docHtml}
                    showLineNumbers={showLineNumbers}
                  />
                )}
              </div>
              {memoOpen && selectedDoc && (
                <div className="w-1/4 border-l border-neutral-200 dark:border-neutral-700 flex flex-col bg-amber-50/30 dark:bg-amber-950/10">
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-200 dark:border-neutral-700">
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1 truncate">
                      <StickyNote className="w-3 h-3 flex-shrink-0" /> {getMemoFilename(selectedDoc)}
                    </span>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {memoSaving && <span className="text-[10px] text-neutral-400 mr-1">saving...</span>}
                      <button
                        onClick={() => setMemoLineNumbers(!memoLineNumbers)}
                        className={`p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 ${memoLineNumbers ? "text-indigo-500" : "text-neutral-400"}`}
                        title={memoLineNumbers ? "Hide Line Numbers" : "Show Line Numbers"}
                      >
                        <Hash className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          onConfirmDelete(`Delete memo "${getMemoFilename(selectedDoc)}"?`, () => {
                            const memoName = getMemoFilename(selectedDoc);
                            const memoPath = docPath ? `${docPath}/${memoName}` : memoName;
                            fetch(`/api/projects/${encodeURIComponent(projectName)}/docs/${encodeURIComponent(getApiDocPath(memoPath))}`, { method: "DELETE" })
                              .then(() => { setMemoOpen(false); setMemoContent(""); onLoadDocs(docPath); onToastSuccess("Memo deleted"); })
                              .catch(() => onToastError("Failed to delete memo"));
                          });
                        }}
                        className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-neutral-400 hover:text-red-500"
                        title="Delete memo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <button onClick={() => { onFlushMemo(); setMemoOpen(false); }} className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400" title="Close memo">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <MemoEditor
                    value={memoContent}
                    onChange={onMemoChange}
                    showLineNumbers={memoLineNumbers}
                    placeholder="Write memo here..."
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-neutral-400">{t("project.selectFileOrCreate")}</div>
        )}
      </div>
    </div>
  );
}
