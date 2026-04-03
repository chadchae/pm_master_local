"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { apiFetch, apiFetchBlob, Project, FileItem } from "@/lib/api";
import { getStageBadgeClasses, getStageByFolder } from "@/lib/stages";
import {
  Loader2,
  Calendar,
  Tag,
  Monitor,
  Save,
  Edit3,
  X,
  Trash2,
  ChevronLeft,
  Download,
  Copy,
  TerminalSquare,
  RotateCcw,
  Bot,
} from "lucide-react";

import { TodoBoard } from "@/components/project/TodoBoard";
import { ProjectDocumentsTab } from "@/components/project/ProjectDocumentsTab";
import { ProjectInstructionsTab } from "@/components/project/ProjectInstructionsTab";
import { ProjectLogsTab } from "@/components/project/ProjectLogsTab";
import { ProjectIssuesTab } from "@/components/project/ProjectIssuesTab";
import { ProjectScheduleTab } from "@/components/project/ProjectScheduleTab";
import { ProjectSettingsTab } from "@/components/project/ProjectSettingsTab";
import { ConfirmDialog, PromptDialog } from "@/components/AppDialogs";
import dynamic from "next/dynamic";
const EmbeddedTerminal = dynamic(() => import("@/components/EmbeddedTerminal").then(m => ({ default: m.EmbeddedTerminal })), { ssr: false });
import toast from "react-hot-toast";
import { useTheme } from "next-themes";
import { useLocale } from "@/lib/i18n";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLocale();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const colorMode = mounted && resolvedTheme === "dark" ? "dark" : "light";
  const name = decodeURIComponent(params.name as string);

  const [project, setProject] = useState<Project | null>(null);
  const [allTypes, setAllTypes] = useState<string[]>([]);
  const [docs, setDocs] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as "documents" | "notes" | "instructions" | "todo" | "issues" | "schedule" | "settings" | "terminal" | "logs") || "settings";
  const [activeTab, setActiveTab] = useState<"documents" | "notes" | "instructions" | "todo" | "issues" | "schedule" | "settings" | "terminal" | "logs">(initialTab);
  const [terminalMode, setTerminalMode] = useState<"shell" | "claude" | null>(null);
  const [terminalSessionKey, setTerminalSessionKey] = useState(0);
  const [newInstruction, setNewInstruction] = useState("");
  const [newChecklist, setNewChecklist] = useState("");
  const [savingInstruction, setSavingInstruction] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState(false);
  const [docSelectMode, setDocSelectMode] = useState(false);
  const [docSelected, setDocSelected] = useState<Set<string>>(new Set());
  const [docSortKey, setDocSortKey] = useState<"name" | "type">("name");
  const [renamingDoc, setRenamingDoc] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showMovePanel, setShowMovePanel] = useState(false);
  const [moveFolders, setMoveFolders] = useState<string[]>([]);
  const [moveSelectedFolder, setMoveSelectedFolder] = useState("");
  const [moveExpandedFolders, setMoveExpandedFolders] = useState<Set<string>>(new Set());
  const [loadingMoveFolders, setLoadingMoveFolders] = useState(false);
  const [movingDocs, setMovingDocs] = useState(false);
  const [docSortDir, setDocSortDir] = useState<"asc" | "desc">("asc");
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [showNewDocMenu, setShowNewDocMenu] = useState(false);
  const [showNewDocFolder, setShowNewDocFolder] = useState(false);
  const [newDocFolderName, setNewDocFolderName] = useState("");
  const [newDocName, setNewDocName] = useState("");
  const [newDocContent, setNewDocContent] = useState("");
  const [creatingDoc, setCreatingDoc] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [docPath, setDocPath] = useState("");  // current subfolder path
  const docBasePath = activeTab === "notes" ? "_settings/project_note" : "";
  const getApiDocPath = (relativePath: string): string => {
    if (!docBasePath) return relativePath;
    return relativePath ? `${docBasePath}/${relativePath}` : docBasePath;
  };
  const [docContent, setDocContent] = useState("");
  const [docBlobUrl, setDocBlobUrl] = useState<string | null>(null);
  const [docHtml, setDocHtml] = useState<string | null>(null);
  const [docFullscreen, setDocFullscreen] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const [memoLineNumbers, setMemoLineNumbers] = useState(false);
  const [memoContent, setMemoContent] = useState("");
  const [memoSaving, setMemoSaving] = useState(false);
  const memoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const getMemoFilename = (fn: string) => {
    const dot = fn.lastIndexOf(".");
    return dot > 0 ? `${fn.slice(0, dot)}_메모.md` : `${fn}_메모.md`;
  };
  const openMemo = async () => {
    if (!selectedDoc) return;
    const memoName = getMemoFilename(selectedDoc);
    const memoPath = docPath ? `${docPath}/${memoName}` : memoName;
    const apiPath = `/api/projects/${encodeURIComponent(name)}/docs/${encodeURIComponent(getApiDocPath(memoPath))}`;
    try {
      const data = await apiFetch<{ content: string }>(apiPath);
      setMemoContent(data.content);
    } catch {
      await apiFetch(apiPath, { method: "PUT", body: JSON.stringify({ content: "" }) });
      setMemoContent("");
      loadDocs(docPath);
    }
    setMemoOpen(true);
  };
  const viewMemo = async () => {
    if (!selectedDoc) return;
    const memoName = getMemoFilename(selectedDoc);
    const memoPath = docPath ? `${docPath}/${memoName}` : memoName;
    const apiPath = `/api/projects/${encodeURIComponent(name)}/docs/${encodeURIComponent(getApiDocPath(memoPath))}`;
    try {
      const data = await apiFetch<{ content: string }>(apiPath);
      setMemoContent(data.content);
      setMemoOpen(true);
    } catch {
      toast(t("memo.notFound") || "이전에 생성한 메모가 없습니다.", { icon: "📝" });
    }
  };
  const saveMemo = async (content: string) => {
    if (!selectedDoc) return;
    const memoName = getMemoFilename(selectedDoc);
    const memoPath = docPath ? `${docPath}/${memoName}` : memoName;
    const apiPath = `/api/projects/${encodeURIComponent(name)}/docs/${encodeURIComponent(getApiDocPath(memoPath))}`;
    setMemoSaving(true);
    try {
      await apiFetch(apiPath, { method: "PUT", body: JSON.stringify({ content }) });
    } catch { /* silent */ }
    setMemoSaving(false);
  };
  const onMemoChange = (v: string) => {
    setMemoContent(v);
    if (memoTimerRef.current) clearTimeout(memoTimerRef.current);
    memoTimerRef.current = setTimeout(() => saveMemo(v), 1000);
  };
  const flushMemo = () => {
    if (memoTimerRef.current) {
      clearTimeout(memoTimerRef.current);
      memoTimerRef.current = null;
      saveMemo(memoContent);
    }
  };
  useEffect(() => {
    if (!docFullscreen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setDocFullscreen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [docFullscreen]);
  // Reset document state when switching between documents and notes tabs
  const prevTabRef = useRef(activeTab);
  useEffect(() => {
    const prev = prevTabRef.current;
    prevTabRef.current = activeTab;
    const docTabs = ["documents", "notes"] as const;
    if (docTabs.includes(activeTab as 'documents' | 'notes') && prev !== activeTab) {
      setDocPath("");
      setSelectedDoc(null);
      setDocContent("");
      setDocBlobUrl(null);
      setDocHtml(null);
      setIsEditing(false);
      setShowNewDoc(false);
      loadDocs("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);
  const [isEditing, setIsEditing] = useState(false);
  // Keyboard navigation & delete for files in document/notes viewer
  useEffect(() => {
    if (!selectedDoc || isEditing || docSelectMode) return;
    if (activeTab !== "documents" && activeTab !== "notes") return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        setConfirmDialog({
          message: `Delete "${selectedDoc}"?`,
          onConfirm: () => {
            setConfirmDialog(null);
            setDeletingDoc(true);
            const fp = docPath ? `${docPath}/${selectedDoc}` : selectedDoc;
            apiFetch(`/api/projects/${encodeURIComponent(name)}/docs/${encodeURIComponent(getApiDocPath(fp))}`, { method: "DELETE" })
              .then(() => { setDocs((p) => p.filter((d) => d.filename !== selectedDoc)); setSelectedDoc(null); setDocContent(""); setDocBlobUrl(null); setDocHtml(null); setMemoOpen(false); toast.success("Deleted"); })
              .catch((err) => toast.error(err instanceof Error ? err.message : "Failed"))
              .finally(() => setDeletingDoc(false));
          },
        });
        return;
      }
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      const getExt = (n: string) => { const i = n.lastIndexOf("."); return i > 0 ? n.slice(i + 1).toLowerCase() : ""; };
      const sorted = [...docs].sort((a, b) => {
        const aF = (a as FileItem & { is_folder?: boolean }).is_folder ? 1 : 0;
        const bF = (b as FileItem & { is_folder?: boolean }).is_folder ? 1 : 0;
        if (aF !== bF) return bF - aF;
        const dir = docSortDir === "asc" ? 1 : -1;
        if (docSortKey === "type") {
          const aE = aF ? "" : getExt(a.filename);
          const bE = bF ? "" : getExt(b.filename);
          const cmp = aE.localeCompare(bE);
          return cmp !== 0 ? cmp * dir : a.filename.localeCompare(b.filename) * dir;
        }
        return a.filename.localeCompare(b.filename) * dir;
      });
      const fileOnly = sorted.filter((d) => !(d as FileItem & { is_folder?: boolean }).is_folder);
      const idx = fileOnly.findIndex((d) => d.filename === selectedDoc);
      if (idx < 0) return;
      const next = e.key === "ArrowUp" ? idx - 1 : idx + 1;
      if (next >= 0 && next < fileOnly.length) {
        loadDoc(fileOnly[next].filename);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedDoc, docs, docSortDir, docSortKey, isEditing, docSelectMode, activeTab]);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [savingDesc, setSavingDesc] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState("");
  const [savingLabel, setSavingLabel] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaDraft, setMetaDraft] = useState({
    label: "",
    상태: "",
    유형: "",
    포트: "",
    중요도: "",
    위급도: "",
    긴급도: "",
    협업: "",
    주도: "",
    오너: "",
    연관프로젝트: "",
    목표종료일: "",
    실제종료일: "",
    related_people: "",
    github_url: "",
    github_pages_url: "",
    gdrive_url: "",
  });
  const [metaInitialized, setMetaInitialized] = useState(false);

  // Subtask state
  interface Subtask {
    id: string;
    title: string;
    description: string;
    status: "pending" | "done" | "cancelled";
    order: number;
    created_at: string;
    completed_at: string;
  }
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskDesc, setNewSubtaskDesc] = useState("");
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState("");
  const [editSubtaskDesc, setEditSubtaskDesc] = useState("");
  const [dragSubtaskId, setDragSubtaskId] = useState<string | null>(null);
  const subtasksRef = useRef(subtasks);
  useEffect(() => { subtasksRef.current = subtasks; }, [subtasks]);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [promptDialog, setPromptDialog] = useState<{ title: string; message?: string; placeholder?: string; defaultValue?: string; onConfirm: (value: string) => void } | null>(null);

  // Log state
  interface LogEntry {
    id: string;
    type: string;
    title: string;
    description: string;
    created_at: string;
    tags: string[];
  }
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [newLogTitle, setNewLogTitle] = useState("");
  const [newLogDesc, setNewLogDesc] = useState("");
  const [newLogType, setNewLogType] = useState("note");
  const [newLogTags, setNewLogTags] = useState("");
  const [showLogForm, setShowLogForm] = useState(false);

  // Todo state
  interface TodoItem {
    id: string;
    title: string;
    description: string;
    column: string;
    priority: "low" | "medium" | "high";
    assignee: string;
    due_date: string;
    created_at: string;
    updated_at: string;
    completed_at: string;
    order: number;
  }
  interface ProjectSummary {
    todo: { total: number; todo: number; in_progress: number; done: number; progress_pct: number };
    issues: { total: number; open: number; resolved: number; critical: number };
    schedule: { total: number; planned: number; in_progress: number; done: number; overdue: number; upcoming_milestones: number };
    subtasks: { total: number; done: number; pending: number; cancelled: number };
  }
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todoColumns] = useState(["todo", "in_progress", "done", "waiting", "archive"]);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [addingInColumn, setAddingInColumn] = useState<string | null>(null);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoDesc, setNewTodoDesc] = useState("");
  const [newTodoPriority, setNewTodoPriority] = useState<"low" | "medium" | "high">("medium");
  const [newTodoAssignee, setNewTodoAssignee] = useState("");
  const [newTodoDueDate, setNewTodoDueDate] = useState("");
  const [editingTodo, setEditingTodo] = useState<string | null>(null);
  const [editTodoTitle, setEditTodoTitle] = useState("");
  const [editTodoDesc, setEditTodoDesc] = useState("");
  const [editTodoPriority, setEditTodoPriority] = useState<"low" | "medium" | "high">("medium");
  const [editTodoAssignee, setEditTodoAssignee] = useState("");
  const [editTodoDueDate, setEditTodoDueDate] = useState("");
  const [draggedTodo, setDraggedTodo] = useState<string | null>(null);

  const loadSummary = async () => {
    try {
      const res = await apiFetch<ProjectSummary>(
        `/api/projects/${encodeURIComponent(name)}/summary`
      );
      setSummary(res);
    } catch {}
  };

  const loadTodos = async () => {
    try {
      const res = await apiFetch<{ columns: string[]; items: TodoItem[] }>(
        `/api/projects/${encodeURIComponent(name)}/todos`
      );
      setTodos(res.items || []);
      loadSummary();
    } catch {}
  };

  const todoCreatingRef = useRef(false);
  const createTodo = async (column: string) => {
    if (!newTodoTitle.trim() || todoCreatingRef.current) return;
    todoCreatingRef.current = true;
    const title = newTodoTitle.trim();
    setNewTodoTitle("");
    setAddingInColumn(null);
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/todos`, {
        method: "POST",
        body: JSON.stringify({
          title,
          description: newTodoDesc.trim(),
          column,
          priority: newTodoPriority,
          assignee: newTodoAssignee,
          due_date: newTodoDueDate,
        }),
      });
      setNewTodoDesc("");
      setNewTodoPriority("medium");
      setNewTodoAssignee("");
      setNewTodoDueDate("");
      loadTodos();
    } catch {
      toast.error(t("toast.failedToCreate"));
    } finally {
      todoCreatingRef.current = false;
    }
  };

  const updateTodo = async (todoId: string) => {
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/todos/${todoId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editTodoTitle.trim(),
          description: editTodoDesc.trim(),
          priority: editTodoPriority,
          assignee: editTodoAssignee.trim(),
          due_date: editTodoDueDate,
        }),
      });
      setEditingTodo(null);
      loadTodos();
    } catch {
      toast.error(t("toast.failedToSave"));
    }
  };

  const toggleStar = async (todoId: string, starred: boolean) => {
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/todos/${todoId}`, {
        method: "PUT",
        body: JSON.stringify({ starred }),
      });
      loadTodos();
    } catch {
      toast.error(t("toast.failedToSave"));
    }
  };

  const deleteTodo = (todoId: string) => {
    setConfirmDialog({
      message: t("action.delete") + "?",
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await apiFetch(`/api/projects/${encodeURIComponent(name)}/todos/${todoId}`, {
            method: "DELETE",
          });
          loadTodos();
        } catch {
          toast.error(t("toast.failedToDelete"));
        }
      },
    });
  };

  const moveTodo = async (todoId: string, column: string, order: number) => {
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/todos/${todoId}/move`, {
        method: "PUT",
        body: JSON.stringify({ column, order }),
      });
      loadTodos();
    } catch {
      toast.error(t("toast.failedToMove"));
    }
  };

  const handleDragStart = (todoId: string) => {
    setDraggedTodo(todoId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnColumn = (column: string) => {
    if (!draggedTodo) return;
    const columnItems = todos.filter((t) => t.column === column);
    moveTodo(draggedTodo, column, columnItems.length);
    setDraggedTodo(null);
  };

  const handleDropOnCard = (column: string, order: number) => {
    if (!draggedTodo) return;
    moveTodo(draggedTodo, column, order);
    setDraggedTodo(null);
  };

  const columnLabel = (col: string) => {
    if (col === "todo") return t("todo.todo");
    if (col === "in_progress") return t("todo.inProgress");
    if (col === "done") return t("todo.done");
    if (col === "waiting") return t("todo.waiting");
    if (col === "archive") return t("todo.archive");
    return col;
  };

  const priorityClasses = (p: string) => {
    if (p === "low") return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400";
    if (p === "high") return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
  };

  const priorityLabel = (p: string) => {
    if (p === "low") return t("todo.low");
    if (p === "high") return t("todo.high");
    return t("todo.medium");
  };

  // Issue state
  interface IssueComment {
    id: string;
    author: string;
    content: string;
    created_at: string;
  }
  interface IssueItem {
    id: string;
    title: string;
    description: string;
    status: "open" | "in_progress" | "resolved" | "closed";
    priority: "low" | "medium" | "high" | "critical";
    labels: string[];
    assignee: string;
    created_at: string;
    updated_at: string;
    resolved_at: string;
    comments: IssueComment[];
  }
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [issueFilter, setIssueFilter] = useState<"all" | "open" | "in_progress" | "resolved" | "closed">("all");
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [showNewIssue, setShowNewIssue] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [newIssueDesc, setNewIssueDesc] = useState("");
  const [newIssuePriority, setNewIssuePriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [newIssueLabels, setNewIssueLabels] = useState("");
  const [newIssueAssignee, setNewIssueAssignee] = useState("");
  const [newCommentText, setNewCommentText] = useState("");
  const [changingStatus, setChangingStatus] = useState<string | null>(null);
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [editIssueTitle, setEditIssueTitle] = useState("");
  const [editIssueDesc, setEditIssueDesc] = useState("");
  const [editIssuePriority, setEditIssuePriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [editIssueLabels, setEditIssueLabels] = useState("");
  const [editIssueAssignee, setEditIssueAssignee] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");

  // Schedule state
  interface ScheduleTask {
    id: string;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    duration_days: number;
    assignee: string;
    status: string;
    depends_on: string[];
    parent_id: string;
    category: string;
    progress_pct: number;
    order: number;
  }
  interface ScheduleCategory {
    name: string;
    color: string;
  }
  interface Milestone {
    id: string;
    title: string;
    date: string;
    description: string;
    linked_tasks: string[];
    status: string;
  }
  const [scheduleTasks, setScheduleTasks] = useState<ScheduleTask[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [scheduleView, setScheduleView] = useState<"table" | "gantt">("table");
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newSchedTitle, setNewSchedTitle] = useState("");
  const [newSchedStart, setNewSchedStart] = useState("");
  const [newSchedEnd, setNewSchedEnd] = useState("");
  const [newSchedAssignee, setNewSchedAssignee] = useState("");
  const [newSchedStatus, setNewSchedStatus] = useState("planned");
  const [newSchedParent, setNewSchedParent] = useState("");
  const [newSchedDepends, setNewSchedDepends] = useState<string[]>([]);
  const [newSchedCategory, setNewSchedCategory] = useState("");
  // Edit task inline state
  const [editingSchedId, setEditingSchedId] = useState<string | null>(null);
  const [editSchedTitle, setEditSchedTitle] = useState("");
  const [editSchedStart, setEditSchedStart] = useState("");
  const [editSchedEnd, setEditSchedEnd] = useState("");
  const [editSchedAssignee, setEditSchedAssignee] = useState("");
  const [editSchedStatus, setEditSchedStatus] = useState("");
  const [editSchedCategory, setEditSchedCategory] = useState("");
  const [editSchedParent, setEditSchedParent] = useState("");
  const [editSchedDepends, setEditSchedDepends] = useState<string[]>([]);
  const [editSchedProgress, setEditSchedProgress] = useState(0);
  // Category state
  const [categories, setCategories] = useState<ScheduleCategory[]>([]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  // Gantt responsive state
  const [ganttRange, setGanttRange] = useState<number>(21);
  const [newMsTitle, setNewMsTitle] = useState("");
  const [newMsDate, setNewMsDate] = useState("");
  const [newMsDesc, setNewMsDesc] = useState("");
  const [newMsLinked, setNewMsLinked] = useState<string[]>([]);
  // Milestone edit state
  const [editingMsId, setEditingMsId] = useState<string | null>(null);
  const [editMsTitle, setEditMsTitle] = useState("");
  const [editMsDate, setEditMsDate] = useState("");
  const [editMsDesc, setEditMsDesc] = useState("");
  const [editMsLinked, setEditMsLinked] = useState<string[]>([]);

  const loadSchedule = async () => {
    try {
      const res = await apiFetch<{ tasks: ScheduleTask[]; milestones: Milestone[]; categories: ScheduleCategory[] }>(
        `/api/projects/${encodeURIComponent(name)}/schedule`
      );
      setScheduleTasks(res.tasks || []);
      setMilestones(res.milestones || []);
      setCategories(res.categories || [{ name: "General", color: "#6b7280" }]);
    } catch {}
  };

  const createScheduleTask = async () => {
    if (!newSchedTitle.trim()) return;
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/schedule/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: newSchedTitle.trim(),
          start_date: newSchedStart,
          end_date: newSchedEnd,
          assignee: newSchedAssignee.trim(),
          status: newSchedStatus,
          parent_id: newSchedParent,
          depends_on: newSchedDepends,
          category: newSchedCategory,
        }),
      });
      setNewSchedTitle("");
      setNewSchedStart("");
      setNewSchedEnd("");
      setNewSchedAssignee("");
      setNewSchedStatus("planned");
      setNewSchedParent("");
      setNewSchedDepends([]);
      setNewSchedCategory("");
      setShowAddTask(false);
      loadSchedule();
      loadSummary();
    } catch {
      toast.error(t("toast.failedToCreate"));
    }
  };

  const deleteScheduleTask = async (taskId: string) => {
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/schedule/tasks/${taskId}`, {
        method: "DELETE",
      });
      loadSchedule();
      loadSummary();
    } catch {
      toast.error(t("toast.failedToDelete"));
    }
  };

  const updateScheduleTask = async (taskId: string, updates: Partial<ScheduleTask>) => {
    try {
      if (updates.status === "done") updates.progress_pct = 100;
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/schedule/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
      loadSchedule();
      loadSummary();
    } catch {
      toast.error(t("toast.failedToSave"));
    }
  };

  const createMilestone = async () => {
    if (!newMsTitle.trim()) return;
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/schedule/milestones`, {
        method: "POST",
        body: JSON.stringify({
          title: newMsTitle.trim(),
          date: newMsDate,
          description: newMsDesc.trim(),
          linked_tasks: newMsLinked,
        }),
      });
      setNewMsTitle("");
      setNewMsDate("");
      setNewMsDesc("");
      setNewMsLinked([]);
      setShowAddMilestone(false);
      loadSchedule();
    } catch {
      toast.error(t("toast.failedToCreate"));
    }
  };

  const deleteMilestone = async (msId: string) => {
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/schedule/milestones/${msId}`, {
        method: "DELETE",
      });
      loadSchedule();
    } catch {
      toast.error(t("toast.failedToDelete"));
    }
  };

  const startEditMilestone = (ms: Milestone) => {
    setEditingMsId(ms.id);
    setEditMsTitle(ms.title);
    setEditMsDate(ms.date);
    setEditMsDesc(ms.description || "");
    setEditMsLinked(ms.linked_tasks || []);
  };

  const saveEditMilestone = async () => {
    if (!editingMsId || !editMsTitle.trim()) return;
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/schedule/milestones/${editingMsId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editMsTitle.trim(),
          date: editMsDate,
          description: editMsDesc.trim(),
          linked_tasks: editMsLinked,
        }),
      });
      setEditingMsId(null);
      loadSchedule();
    } catch {
      toast.error(t("toast.failedToSave"));
    }
  };

  // Save inline edit for schedule task
  const saveEditScheduleTask = async () => {
    if (!editingSchedId || !editSchedTitle.trim()) return;
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/schedule/tasks/${editingSchedId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editSchedTitle.trim(),
          start_date: editSchedStart,
          end_date: editSchedEnd,
          assignee: editSchedAssignee.trim(),
          status: editSchedStatus,
          category: editSchedCategory,
          parent_id: editSchedParent,
          depends_on: editSchedDepends,
          progress_pct: editSchedStatus === "done" ? 100 : editSchedProgress,
        }),
      });
      setEditingSchedId(null);
      loadSchedule();
      loadSummary();
    } catch {
      toast.error(t("toast.failedToSave"));
    }
  };

  // Start editing a schedule task
  const startEditScheduleTask = (task: ScheduleTask) => {
    setEditingSchedId(task.id);
    setEditSchedTitle(task.title);
    setEditSchedStart(task.start_date);
    setEditSchedEnd(task.end_date);
    setEditSchedAssignee(task.assignee);
    setEditSchedStatus(task.status);
    setEditSchedCategory(task.category || "");
    setEditSchedParent(task.parent_id);
    setEditSchedDepends([...task.depends_on]);
    setEditSchedProgress(task.progress_pct);
  };

  // Check if task has unfinished dependencies
  const hasUnfinishedDeps = (task: ScheduleTask): boolean => {
    if (!task.depends_on || task.depends_on.length === 0) return false;
    return task.depends_on.some((depId) => {
      const depTask = scheduleTasks.find((t2) => t2.id === depId);
      return depTask && depTask.status !== "done";
    });
  };

  // 30 category color palette — auto-assigned sequentially
  const CATEGORY_COLORS = [
    "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
    "#f43f5e", "#ef4444", "#f97316", "#f59e0b", "#eab308",
    "#84cc16", "#22c55e", "#10b981", "#14b8a6", "#06b6d4",
    "#0ea5e9", "#3b82f6", "#6d28d9", "#7c3aed", "#c026d3",
    "#e11d48", "#ea580c", "#ca8a04", "#65a30d", "#059669",
    "#0891b2", "#2563eb", "#4f46e5", "#9333ea", "#db2777",
  ];

  const getNextCategoryColor = (): string => {
    const usedColors = categories.map((c) => c.color);
    const available = CATEGORY_COLORS.find((c) => !usedColors.includes(c));
    return available || CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length];
  };

  // Category CRUD
  const createCategory = async () => {
    if (!newCatName.trim()) return;
    const createdName = newCatName.trim();
    const autoColor = getNextCategoryColor();
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/schedule/categories`, {
        method: "POST",
        body: JSON.stringify({ name: createdName, color: autoColor }),
      });
      setNewCatName("");
      setShowNewCategory(false);
      loadSchedule();
      if (editingSchedId) {
        setEditSchedCategory(createdName);
      } else {
        setNewSchedCategory(createdName);
      }
    } catch {
      toast.error(t("toast.failedToCreate"));
    }
  };

  const deleteCategory = async (catName: string) => {
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/schedule/categories/${encodeURIComponent(catName)}`, {
        method: "DELETE",
      });
      loadSchedule();
    } catch {
      toast.error(t("toast.failedToDelete"));
    }
  };

  const loadLogs = async () => {
    try {
      const res = await apiFetch<{ entries: LogEntry[] }>(`/api/projects/${encodeURIComponent(name)}/logs`);
      setLogs(res.entries || []);
    } catch {}
  };

  const createLog = async () => {
    if (!newLogTitle.trim()) return;
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/logs`, {
        method: "POST",
        body: JSON.stringify({
          type: newLogType,
          title: newLogTitle.trim(),
          description: newLogDesc.trim(),
          tags: newLogTags ? newLogTags.split(",").map(t => t.trim()).filter(Boolean) : [],
        }),
      });
      setNewLogTitle(""); setNewLogDesc(""); setNewLogType("note"); setNewLogTags("");
      setShowLogForm(false);
      loadLogs();
    } catch {
      toast.error(t("toast.failedToCreate"));
    }
  };

  const deleteLog = async (logId: string) => {
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/logs/${logId}`, { method: "DELETE" });
      loadLogs();
    } catch {
      toast.error(t("toast.failedToDelete"));
    }
  };

  const loadIssues = async () => {
    try {
      const res = await apiFetch<{ issues: IssueItem[] }>(
        `/api/projects/${encodeURIComponent(name)}/issues`
      );
      setIssues(res.issues || []);
      loadSummary();
    } catch {}
  };

  const createIssue = async () => {
    if (!newIssueTitle.trim()) return;
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/issues`, {
        method: "POST",
        body: JSON.stringify({
          title: newIssueTitle.trim(),
          description: newIssueDesc.trim(),
          priority: newIssuePriority,
          labels: newIssueLabels.split(",").map((l) => l.trim()).filter(Boolean),
          assignee: newIssueAssignee.trim(),
        }),
      });
      setNewIssueTitle("");
      setNewIssueDesc("");
      setNewIssuePriority("medium");
      setNewIssueLabels("");
      setNewIssueAssignee("");
      setShowNewIssue(false);
      loadIssues();
      toast.success(t("toast.created"));
    } catch {
      toast.error(t("toast.failedToCreate"));
    }
  };

  const updateIssueStatus = async (issueId: string, status: string) => {
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/issues/${issueId}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      setChangingStatus(null);
      loadIssues();
    } catch {
      toast.error(t("toast.failedToSave"));
    }
  };

  const resolveIssue = async (issueId: string) => {
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/issues/${issueId}/resolve`, {
        method: "POST",
      });
      loadIssues();
    } catch {
      toast.error(t("toast.failedToSave"));
    }
  };

  const deleteIssue = async (issueId: string) => {
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/issues/${issueId}`, {
        method: "DELETE",
      });
      setExpandedIssue(null);
      loadIssues();
      toast.success(t("toast.deleted"));
    } catch {
      toast.error(t("toast.failedToDelete"));
    }
  };

  const addComment = async (issueId: string) => {
    if (!newCommentText.trim()) return;
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/issues/${issueId}/comments`, {
        method: "POST",
        body: JSON.stringify({ author: "Chad", content: newCommentText.trim() }),
      });
      setNewCommentText("");
      loadIssues();
    } catch {
      toast.error(t("toast.failedToSave"));
    }
  };

  const saveEditIssue = async (issueId: string) => {
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/issues/${issueId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editIssueTitle,
          description: editIssueDesc,
          priority: editIssuePriority,
          labels: editIssueLabels.split(",").map((l) => l.trim()).filter(Boolean),
          assignee: editIssueAssignee,
        }),
      });
      setEditingIssueId(null);
      loadIssues();
      toast.success(t("toast.saved"));
    } catch {
      toast.error(t("toast.failedToSave"));
    }
  };

  const editComment = async (issueId: string, commentId: string) => {
    if (!editCommentText.trim()) return;
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/issues/${issueId}/comments/${commentId}`, {
        method: "PUT",
        body: JSON.stringify({ content: editCommentText.trim() }),
      });
      setEditingCommentId(null);
      loadIssues();
    } catch {
      toast.error(t("toast.failedToSave"));
    }
  };

  const deleteComment = (issueId: string, commentId: string) => {
    setConfirmDialog({
      message: t("action.delete") + "?",
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await apiFetch(`/api/projects/${encodeURIComponent(name)}/issues/${issueId}/comments/${commentId}`, {
            method: "DELETE",
          });
          loadIssues();
        } catch {
          toast.error(t("toast.failedToDelete"));
        }
      },
    });
  };





  useEffect(() => {
    loadProject();
  }, [name]);

  useEffect(() => {
    if (activeTab === "todo") loadTodos();
    if (activeTab === "issues") loadIssues();
    if (activeTab === "schedule") loadSchedule();
    if (activeTab === "logs") loadLogs();
  }, [activeTab]);


  const loadDocs = async (path: string = docPath) => {
    const fullPath = getApiDocPath(path);
    const q = fullPath ? `?subpath=${encodeURIComponent(fullPath)}` : "";
    try {
      const res = await apiFetch<{ docs: FileItem[] }>(`/api/projects/${encodeURIComponent(name)}/docs${q}`);
      setDocs(res.docs || []);
    } catch {}
  };

  const loadProject = async () => {
    try {
      const [projectsRes, docsRes] = await Promise.all([
        apiFetch<{ projects: Project[] }>("/api/projects"),
        apiFetch<{ docs: FileItem[] }>(`/api/projects/${encodeURIComponent(name)}/docs`).catch(() => ({ docs: [] })),
      ]);
      const allProjects = projectsRes.projects || [];
      const proj = allProjects.find((p) => p.name === name);
      setProject(proj || null);
      const PREDEFINED_TYPES = ["개인", "연구", "개발", "리뷰", "리딩", "학습", "강의", "기획", "운영", "관리", "협업", "사업"];
      const dynamicTypes = allProjects.map((p) => p.metadata?.["유형"] || "").filter(Boolean);
      setAllTypes([...new Set([...PREDEFINED_TYPES, ...dynamicTypes])].sort());
      setDocs(docsRes.docs || []);
      loadSummary();
    } catch {
      toast.error(t("toast.failedToLoadProject"));
    } finally {
      setLoading(false);
    }
  };

  const loadDoc = async (filename: string) => {
    // Folder click → drill down
    const doc = docs.find((d) => d.filename === filename);
    if (doc && (doc as FileItem & { is_folder?: boolean }).is_folder) {
      const newPath = docPath ? `${docPath}/${filename}` : filename;
      setDocPath(newPath);
      setShowNewDoc(false);
      setShowNewDocFolder(false);
      loadDocs(newPath);
      return;
    }
    // File click
    const filePath = docPath ? `${docPath}/${filename}` : filename;
    const apiFilePath = getApiDocPath(filePath);
    setSelectedDoc(filename);
    setIsEditing(false);
    flushMemo();
    setMemoOpen(false);
    setShowNewDoc(false);
    setShowNewDocFolder(false);
    // Clean up previous blob URL
    if (docBlobUrl) { URL.revokeObjectURL(docBlobUrl); setDocBlobUrl(null); }
    setDocHtml(null);
    setDocContent("");

    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const apiPath = `/api/projects/${encodeURIComponent(name)}/docs/${encodeURIComponent(apiFilePath)}`;
    const videoExts = ["mp4","webm","mov","avi","mkv","m4v","flv","wmv","3gp","ogv","ts"];
    const audioExts = ["mp3","wav","ogg","m4a","aac","flac","wma","opus","aiff","mid","midi","weba"];
    const imageExts = ["png","jpg","jpeg","gif","webp","bmp","ico","tiff"];

    try {
      if (ext === "pdf") {
        const buf = await apiFetchBlob(apiPath);
        const blob = new Blob([buf], { type: "application/pdf" });
        setDocBlobUrl(URL.createObjectURL(blob));
      } else if (ext === "docx") {
        const mammoth = (await import("mammoth")).default;
        const buf = await apiFetchBlob(apiPath);
        const result = await mammoth.convertToHtml({ arrayBuffer: buf });
        setDocHtml(result.value);
      } else if (ext === "html" || ext === "htm") {
        const data = await apiFetch<{ content: string }>(apiPath);
        const blob = new Blob([data.content], { type: "text/html;charset=utf-8" });
        setDocBlobUrl(URL.createObjectURL(blob));
      } else if (videoExts.includes(ext) || audioExts.includes(ext) || imageExts.includes(ext)) {
        const buf = await apiFetchBlob(apiPath);
        const mimeMap: Record<string,string> = {
          mp4:"video/mp4",webm:"video/webm",mov:"video/quicktime",avi:"video/x-msvideo",mkv:"video/x-matroska",m4v:"video/x-m4v",flv:"video/x-flv",wmv:"video/x-ms-wmv","3gp":"video/3gpp",ogv:"video/ogg",ts:"video/mp2t",
          mp3:"audio/mpeg",wav:"audio/wav",ogg:"audio/ogg",m4a:"audio/mp4",aac:"audio/aac",flac:"audio/flac",wma:"audio/x-ms-wma",opus:"audio/opus",aiff:"audio/aiff",mid:"audio/midi",midi:"audio/midi",weba:"audio/webm",
          png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",gif:"image/gif",webp:"image/webp",bmp:"image/bmp",ico:"image/x-icon",tiff:"image/tiff",
        };
        const blob = new Blob([buf], { type: mimeMap[ext] || "application/octet-stream" });
        setDocBlobUrl(URL.createObjectURL(blob));
      } else {
        const data = await apiFetch<{ content: string }>(apiPath);
        setDocContent(data.content);
      }
    } catch {
      toast.error(t("toast.failedToLoadDocument"));
    }
  };

  const openMovePanel = async () => {
    setShowMovePanel(true);
    setMoveSelectedFolder("");
    setMoveExpandedFolders(new Set());
    setLoadingMoveFolders(true);
    try {
      const res = await apiFetch<{ folders: string[] }>(`/api/projects/${encodeURIComponent(name)}/docs-tree`);
      setMoveFolders(res.folders || [""]);
    } catch { setMoveFolders([""]); }
    finally { setLoadingMoveFolders(false); }
  };

  const moveSelectedDocs = async () => {
    if (docSelected.size === 0) return;
    setMovingDocs(true);
    const files = Array.from(docSelected).map((f) => docPath ? `${docPath}/${f}` : f);
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/docs-move`, {
        method: "POST",
        body: JSON.stringify({ files, dest_folder: moveSelectedFolder }),
      });
      toast.success(`Moved ${docSelected.size} item(s)`);
      setShowMovePanel(false);
      setDocSelected(new Set());
      setDocSelectMode(false);
      if (selectedDoc && docSelected.has(selectedDoc)) { setSelectedDoc(null); setDocContent(""); setDocBlobUrl(null); setDocHtml(null); }
      loadDocs(docPath);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to move");
    } finally { setMovingDocs(false); }
  };


  const toggleMoveFolder = (folder: string) => {
    setMoveExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folder)) { next.delete(folder); } else { next.add(folder); }
      return next;
    });
  };

  const renameDoc = async (oldName: string, newName: string) => {
    if (!newName.trim() || newName === oldName) { setRenamingDoc(null); return; }
    const oldPath = getApiDocPath(docPath ? `${docPath}/${oldName}` : oldName);
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/docs/${encodeURIComponent(oldPath)}`, {
        method: "PATCH",
        body: JSON.stringify({ new_name: newName.trim() }),
      });
      setDocs((prev) => prev.map((d) => d.filename === oldName ? { ...d, filename: newName.trim() } : d));
      if (selectedDoc === oldName) setSelectedDoc(newName.trim());
      toast.success(`Renamed to ${newName.trim()}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to rename");
    }
    setRenamingDoc(null);
  };

  const saveDoc = async () => {
    if (!selectedDoc) return;
    setSaving(true);
    try {
      await apiFetch(
        `/api/projects/${encodeURIComponent(name)}/docs/${encodeURIComponent(getApiDocPath(docPath ? `${docPath}/${selectedDoc}` : selectedDoc))}`,
        {
          method: "PUT",
          body: JSON.stringify({ content: editContent }),
        }
      );
      setDocContent(editContent);
      setIsEditing(false);
      toast.success(t("toast.documentSaved"));
    } catch {
      toast.error(t("toast.failedToSaveDocument"));
    } finally {
      setSaving(false);
    }
  };

  // Initialize meta draft when project loads
  useEffect(() => {
    if (project && !metaInitialized) {
      setMetaDraft({
        label: project.metadata?.label || "",
        상태: project.metadata?.["상태"] || "",
        유형: project.metadata?.["유형"] || "",
        포트: project.metadata?.["포트"]?.toString() || "",
        중요도: project.metadata?.["중요도"] || "",
        위급도: project.metadata?.["위급도"] || "",
        긴급도: project.metadata?.["긴급도"] || "",
        협업: project.metadata?.["협업"] || "",
        주도: project.metadata?.["주도"] || "",
        오너: project.metadata?.["오너"] || "채충일",
        연관프로젝트: project.metadata?.["연관프로젝트"] || "",
        목표종료일: project.metadata?.["목표종료일"] || "",
        실제종료일: project.metadata?.["실제종료일"] || "",
        related_people: project.metadata?.related_people || "채충일",
        github_url: project.metadata?.github_url || "",
        github_pages_url: project.metadata?.github_pages_url || "",
        gdrive_url: project.metadata?.gdrive_url || "",
      });
      setMetaInitialized(true);
    }
  }, [project, metaInitialized]);

  const saveMetadata = async () => {
    setSavingMeta(true);
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/metadata`, {
        method: "PUT",
        body: JSON.stringify({ metadata: metaDraft }),
      });
      setProject((prev) =>
        prev ? { ...prev, metadata: { ...prev.metadata, ...metaDraft } as unknown as Project["metadata"] } : prev
      );
      toast.success(t("toast.metadataSaved"));
    } catch {
      toast.error(t("toast.failedToSave"));
    } finally {
      setSavingMeta(false);
    }
  };

  // --- Subtask API functions ---
  const loadSubtasks = async () => {
    try {
      const data = await apiFetch<{ subtasks: Subtask[] }>(
        `/api/projects/${encodeURIComponent(name)}/subtasks`
      );
      setSubtasks(data.subtasks || []);
    } catch {
      // Silently fail on initial load
    }
  };

  const addingRef = { current: false };
  const addSubtask = async () => {
    if (!newSubtaskTitle.trim() || addingRef.current) return;
    addingRef.current = true;
    try {
      await apiFetch(
        `/api/projects/${encodeURIComponent(name)}/subtasks`,
        {
          method: "POST",
          body: JSON.stringify({ title: newSubtaskTitle.trim(), description: newSubtaskDesc.trim() }),
        }
      );
      setNewSubtaskTitle("");
      setNewSubtaskDesc("");
      await loadSubtasks();
    } catch {
      toast.error(t("toast.failedToCreate"));
    } finally {
      addingRef.current = false;
    }
  };

  const toggleSubtask = async (subtaskId: string, status: "pending" | "done" | "cancelled") => {
    try {
      const updated = await apiFetch<Subtask>(
        `/api/projects/${encodeURIComponent(name)}/subtasks/${subtaskId}/toggle`,
        {
          method: "PUT",
          body: JSON.stringify({ status }),
        }
      );
      setSubtasks((prev) => prev.map((s) => (s.id === subtaskId ? updated : s)));
    } catch {
      toast.error(t("toast.failedToSave"));
    }
  };

  const updateSubtask = async (subtaskId: string) => {
    try {
      const updated = await apiFetch<Subtask>(
        `/api/projects/${encodeURIComponent(name)}/subtasks/${subtaskId}`,
        {
          method: "PUT",
          body: JSON.stringify({ title: editSubtaskTitle, description: editSubtaskDesc }),
        }
      );
      setSubtasks((prev) => prev.map((s) => (s.id === subtaskId ? updated : s)));
      setEditingSubtaskId(null);
    } catch {
      toast.error(t("toast.failedToSave"));
    }
  };

  const deleteSubtask = (subtaskId: string) => {
    setConfirmDialog({
      message: t("subtask.deleteConfirm"),
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await apiFetch(
            `/api/projects/${encodeURIComponent(name)}/subtasks/${subtaskId}`,
            { method: "DELETE" }
          );
          await loadSubtasks();
        } catch {
          toast.error(t("toast.failedToDelete"));
        }
      },
    });
  };

  const handleSubtaskDragStart = (subtaskId: string) => {
    setDragSubtaskId(subtaskId);
  };

  const handleSubtaskDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragSubtaskId || dragSubtaskId === targetId) return;
    setSubtasks((prev) => {
      const items = [...prev];
      const fromIdx = items.findIndex((s) => s.id === dragSubtaskId);
      const toIdx = items.findIndex((s) => s.id === targetId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const [moved] = items.splice(fromIdx, 1);
      items.splice(toIdx, 0, moved);
      return items;
    });
  };

  const handleSubtaskDragEnd = async () => {
    if (!dragSubtaskId) return;
    setDragSubtaskId(null);
    const orderedIds = subtasksRef.current.map((s) => s.id);
    try {
      await apiFetch(
        `/api/projects/${encodeURIComponent(name)}/subtasks/reorder`,
        {
          method: "PUT",
          body: JSON.stringify({ ordered_ids: orderedIds }),
        }
      );
    } catch {
      loadSubtasks();
    }
  };

  // Load subtasks when project loads or settings tab activates
  useEffect(() => {
    if (project && activeTab === "settings") {
      loadSubtasks();
    }
  }, [project, activeTab]);

  const saveLabel = async () => {
    setSavingLabel(true);
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/metadata`, {
        method: "PUT",
        body: JSON.stringify({ metadata: { label: labelDraft } }),
      });
      setProject((prev) =>
        prev ? { ...prev, metadata: { ...prev.metadata, label: labelDraft } } : prev
      );
      setMetaDraft((d) => ({ ...d, label: labelDraft }));
      setEditingLabel(false);
      toast.success(t("toast.nameUpdated"));
    } catch {
      toast.error(t("toast.failedToSave"));
    } finally {
      setSavingLabel(false);
    }
  };

  const saveDescription = async () => {
    setSavingDesc(true);
    try {
      const res = await apiFetch<{ synced_to?: string[] }>(
        `/api/projects/${encodeURIComponent(name)}/description`,
        {
          method: "PUT",
          body: JSON.stringify({ description: descDraft }),
        }
      );
      setProject((prev) =>
        prev ? { ...prev, metadata: { ...prev.metadata, description: descDraft } } : prev
      );
      setEditingDesc(false);
      const synced = res.synced_to || [];
      toast.success(`${t("toast.descriptionUpdated")} (${synced.join(", ")})`);
    } catch {
      toast.error(t("toast.failedToSave"));
    } finally {
      setSavingDesc(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500">{t("project.notFound")}</p>
      </div>
    );
  }

  const getExt = (name: string) => { const i = name.lastIndexOf("."); return i > 0 ? name.slice(i + 1).toLowerCase() : ""; };
  const sortedDocs = [...docs].sort((a, b) => {
    const aFolder = (a as FileItem & { is_folder?: boolean }).is_folder ? 1 : 0;
    const bFolder = (b as FileItem & { is_folder?: boolean }).is_folder ? 1 : 0;
    if (aFolder !== bFolder) return bFolder - aFolder; // folders first
    const dir = docSortDir === "asc" ? 1 : -1;
    if (docSortKey === "type") {
      const aExt = aFolder ? "" : getExt(a.filename);
      const bExt = bFolder ? "" : getExt(b.filename);
      const cmp = aExt.localeCompare(bExt);
      return cmp !== 0 ? cmp * dir : a.filename.localeCompare(b.filename) * dir;
    }
    return a.filename.localeCompare(b.filename) * dir;
  });
  const toggleDocSort = (key: "name" | "type") => {
    if (docSortKey === key) setDocSortDir(docSortDir === "asc" ? "desc" : "asc");
    else { setDocSortKey(key); setDocSortDir("asc"); }
  };

  const stage = getStageByFolder(project.stage);

  return (
    <div className={docFullscreen ? "fixed inset-0 z-50 bg-neutral-50 dark:bg-neutral-950 p-4 flex flex-col" : "space-y-6"}>
      {/* Project Header */}
      <div className={`bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 ${docFullscreen ? "hidden" : ""}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Back + Display Name */}
            <div className="group flex items-center gap-2">
              <button
                onClick={() => router.back()}
                className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors flex-shrink-0"
                title="Back"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              {editingLabel ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={labelDraft}
                    onChange={(e) => setLabelDraft(e.target.value)}
                    className="text-xl font-bold bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md px-2 py-1 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setEditingLabel(false);
                      if (e.key === "Enter") saveLabel();
                    }}
                  />
                  <button onClick={saveLabel} disabled={savingLabel} className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-indigo-600 dark:text-indigo-400">
                    {savingLabel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setEditingLabel(false)} className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <h1
                    onClick={() => {
                      setLabelDraft(project.metadata?.label || project.name);
                      setEditingLabel(true);
                    }}
                    className="text-xl font-bold text-neutral-900 dark:text-white cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    title={t("project.clickToRename")}
                  >
                    {project.metadata?.label || project.name}
                    <Edit3 className="inline-block w-3.5 h-3.5 ml-2 opacity-0 group-hover:opacity-40 transition-opacity" />
                  </h1>
                </>
              )}
            </div>
            {/* Local path */}
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono pl-9 mt-0.5 truncate">{project.path}</p>
            {/* Description - editable */}
            <div className="mt-1 group pl-9">
              {editingDesc ? (
                <div className="flex items-start gap-2">
                  <textarea
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    rows={2}
                    className="flex-1 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-700 dark:text-neutral-300 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setEditingDesc(false);
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        saveDescription();
                      }
                    }}
                  />
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={saveDescription}
                      disabled={savingDesc}
                      className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-indigo-600 dark:text-indigo-400 transition-colors"
                      title="Save"
                    >
                      {savingDesc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setEditingDesc(false)}
                      className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition-colors"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  onClick={() => {
                    setDescDraft(project.metadata?.description || "");
                    setEditingDesc(true);
                  }}
                  className="text-sm text-neutral-500 dark:text-neutral-400 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors leading-relaxed"
                  title={t("project.clickToAddDesc")}
                >
                  {project.metadata?.description || (
                    <span className="italic text-neutral-400 dark:text-neutral-600">{t("project.clickToAddDesc")}...</span>
                  )}
                  <Edit3 className="inline-block w-3 h-3 ml-1.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2 pl-9">
              <span className={`text-xs px-2.5 py-1 rounded-full ${getStageBadgeClasses(project.stage)}`}>
                {stage?.label || project.stage}
              </span>
              {project.metadata?.유형 && (
                <span className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
                  <Tag className="w-3.5 h-3.5" />
                  {project.metadata.유형}
                </span>
              )}
              {project.metadata?.포트 && (
                <span className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
                  <Monitor className="w-3.5 h-3.5" />
                  Port {project.metadata.포트}
                </span>
              )}
              {project.metadata?.작성일 && (
                <span className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
                  <Calendar className="w-3.5 h-3.5" />
                  {project.metadata.작성일}
                </span>
              )}
            </div>
          </div>

          {/* Progress widget (before action buttons) */}
          {summary && summary.subtasks.total > 0 && (() => {
            const pct = Math.round(summary.subtasks.done / summary.subtasks.total * 100);
            return (
              <div className="flex-1 min-w-[120px] ml-1">
                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 text-center h-full flex flex-col justify-center">
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2 text-left">{t("subtask.progress")} {summary.subtasks.done}/{summary.subtasks.total}</p>
                  <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-neutral-400 mt-2">
                    <span>{pct}%</span>
                    <span>{summary.subtasks.pending} left</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Action buttons */}
          <div className="flex items-center gap-1 mb-2 ml-4">
            <button
              onClick={() => { const tk = localStorage.getItem("pm_token") || ""; window.open(`/api/projects/${encodeURIComponent(name)}/download?token=${tk}`, "_blank"); }}
              className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30 text-neutral-400 hover:text-blue-500 transition-colors"
              title={t("action.download")}
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                apiFetch(`/api/projects/${encodeURIComponent(name)}/clone`, { method: "POST" })
                  .then(() => { toast.success("Cloned"); router.push("/dashboard"); })
                  .catch(() => toast.error("Failed to clone"));
              }}
              className="p-1.5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-neutral-400 hover:text-indigo-500 transition-colors"
              title="Clone"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setConfirmDialog({
                  message: `Move "${project.metadata?.label || name}" to trash?`,
                  onConfirm: () => {
                    setConfirmDialog(null);
                    apiFetch("/api/projects/move", {
                      method: "POST",
                      body: JSON.stringify({ project_name: name, from_stage: project.stage, to_stage: "9_discarded", instruction: "" }),
                    }).then(() => { router.push("/dashboard"); toast.success("Moved to trash"); }).catch(() => toast.error("Failed"));
                  },
                });
              }}
              className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-neutral-400 hover:text-red-500 transition-colors"
              title={t("action.delete")}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Summary widgets (right side) */}
          {summary && (
            <div className="flex gap-3 ml-4 flex-shrink-0">
              {/* Todo summary */}
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 min-w-[120px] text-center">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">{t("todo.title")}</p>
                <p className="text-lg font-bold text-neutral-900 dark:text-white">{summary.todo.done}/{summary.todo.total}</p>
                <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${summary.todo.progress_pct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-neutral-400 mt-1">
                  <span>{summary.todo.todo} todo</span>
                  <span>{summary.todo.in_progress} wip</span>
                </div>
              </div>

              {/* Issues summary */}
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 min-w-[120px] text-center">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">{t("issues.title")}</p>
                <p className={`text-lg font-bold ${summary.issues.critical > 0 ? "text-red-600 dark:text-red-400" : "text-neutral-900 dark:text-white"}`}>{summary.issues.open}/{summary.issues.total}</p>
                <div className="flex justify-between text-xs text-neutral-400 mt-1">
                  <span>{summary.issues.critical > 0 ? <span className="text-red-500 font-medium">{summary.issues.critical} critical</span> : `${summary.issues.open} open`}</span>
                  <span>{summary.issues.resolved} done</span>
                </div>
              </div>

              {/* Schedule summary */}
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 min-w-[120px] text-center">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">{t("schedule.title")}</p>
                <p className="text-lg font-bold text-neutral-900 dark:text-white">{summary.schedule.done}/{summary.schedule.total}</p>
                <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${summary.schedule.total > 0 ? Math.round(summary.schedule.done / summary.schedule.total * 100) : 0}%` }} />
                </div>
                <div className="flex justify-between text-xs text-neutral-400 mt-1">
                  <span>{summary.schedule.in_progress} wip</span>
                  <span>{summary.schedule.overdue > 0 ? <span className="text-red-500">{summary.schedule.overdue} late</span> : `${summary.schedule.planned} plan`}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className={`border-b border-neutral-200 dark:border-neutral-800 ${docFullscreen ? "hidden" : ""}`}>
        <nav className="flex gap-4">
          {(["settings", "documents", "notes", "todo", "schedule", "issues", "instructions", "terminal", "logs"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                  : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              {t(`project.${tab}`)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {(activeTab === "documents" || activeTab === "notes") && (
        <ProjectDocumentsTab
          projectName={name}
          docs={docs}
          setDocs={setDocs}
          selectedDoc={selectedDoc}
          setSelectedDoc={setSelectedDoc}
          docContent={docContent}
          setDocContent={setDocContent}
          docBlobUrl={docBlobUrl}
          setDocBlobUrl={setDocBlobUrl}
          docHtml={docHtml}
          setDocHtml={setDocHtml}
          docPath={docPath}
          setDocPath={setDocPath}
          docFullscreen={docFullscreen}
          setDocFullscreen={setDocFullscreen}
          showNewDoc={showNewDoc}
          setShowNewDoc={setShowNewDoc}
          showNewDocMenu={showNewDocMenu}
          setShowNewDocMenu={setShowNewDocMenu}
          showNewDocFolder={showNewDocFolder}
          setShowNewDocFolder={setShowNewDocFolder}
          newDocFolderName={newDocFolderName}
          setNewDocFolderName={setNewDocFolderName}
          newDocName={newDocName}
          setNewDocName={setNewDocName}
          newDocContent={newDocContent}
          setNewDocContent={setNewDocContent}
          creatingDoc={creatingDoc}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          editContent={editContent}
          setEditContent={setEditContent}
          saving={saving}
          deletingDoc={deletingDoc}
          setDeletingDoc={setDeletingDoc}
          docSelectMode={docSelectMode}
          setDocSelectMode={setDocSelectMode}
          docSelected={docSelected}
          setDocSelected={setDocSelected}
          docSortKey={docSortKey}
          docSortDir={docSortDir}
          sortedDocs={sortedDocs}
          renamingDoc={renamingDoc}
          setRenamingDoc={setRenamingDoc}
          renameValue={renameValue}
          setRenameValue={setRenameValue}
          showMovePanel={showMovePanel}
          setShowMovePanel={setShowMovePanel}
          moveFolders={moveFolders}
          moveSelectedFolder={moveSelectedFolder}
          setMoveSelectedFolder={setMoveSelectedFolder}
          moveExpandedFolders={moveExpandedFolders}
          loadingMoveFolders={loadingMoveFolders}
          movingDocs={movingDocs}
          memoOpen={memoOpen}
          setMemoOpen={setMemoOpen}
          memoContent={memoContent}
          setMemoContent={setMemoContent}
          memoSaving={memoSaving}
          memoLineNumbers={memoLineNumbers}
          setMemoLineNumbers={setMemoLineNumbers}
          showLineNumbers={showLineNumbers}
          setShowLineNumbers={setShowLineNumbers}
          colorMode={colorMode}
          onLoadDocs={loadDocs}
          onLoadDoc={loadDoc}
          onSaveDoc={saveDoc}
          onRenameDoc={renameDoc}
          onOpenMovePanel={openMovePanel}
          onMoveSelectedDocs={moveSelectedDocs}
          onToggleMoveFolder={toggleMoveFolder}
          onToggleDocSort={toggleDocSort}
          onOpenMemo={openMemo}
          onViewMemo={viewMemo}
          onFlushMemo={flushMemo}
          onMemoChange={onMemoChange}
          getMemoFilename={getMemoFilename}
          getApiDocPath={getApiDocPath}
          getExt={getExt}
          onConfirmDelete={(message, onConfirm) => setConfirmDialog({ message, onConfirm: () => { setConfirmDialog(null); onConfirm(); } })}
          onToastSuccess={(msg) => toast.success(msg)}
          onToastError={(msg) => toast.error(msg)}
          onCreateFolder={(folderPath) => {
            apiFetch(`/api/projects/${encodeURIComponent(name)}/folders`, { method: "POST", body: JSON.stringify({ folder_name: folderPath }) })
              .then(async () => { const res = await apiFetch<{ docs: FileItem[] }>(`/api/projects/${encodeURIComponent(name)}/docs${getApiDocPath(docPath) ? `?subpath=${encodeURIComponent(getApiDocPath(docPath))}` : ""}`); setDocs(res.docs || []); setShowNewDocFolder(false); setNewDocFolderName(""); toast.success("Folder created"); })
              .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"));
          }}
          onCreateDoc={(filePath, content) => {
            const fn = filePath.split("/").pop() || filePath;
            setCreatingDoc(true);
            apiFetch(`/api/projects/${encodeURIComponent(name)}/docs/${encodeURIComponent(filePath)}`, { method: "PUT", body: JSON.stringify({ content }) })
              .then(async () => { const res = await apiFetch<{ docs: FileItem[] }>(`/api/projects/${encodeURIComponent(name)}/docs${getApiDocPath(docPath) ? `?subpath=${encodeURIComponent(getApiDocPath(docPath))}` : ""}`); setDocs(res.docs || []); setShowNewDoc(false); setSelectedDoc(fn); setDocContent(content); setNewDocName(""); setNewDocContent(""); toast.success(`Created ${fn}`); })
              .catch(() => toast.error("Failed"))
              .finally(() => setCreatingDoc(false));
          }}
          t={t}
        />
      )}
      {activeTab === "instructions" && (
        <ProjectInstructionsTab
          newInstruction={newInstruction}
          setNewInstruction={setNewInstruction}
          newChecklist={newChecklist}
          setNewChecklist={setNewChecklist}
          savingInstruction={savingInstruction}
          onCreateInstruction={async () => {
            if (!newInstruction.trim()) return;
            setSavingInstruction(true);
            try {
              const checklist = newChecklist.trim()
                ? newChecklist.split("\n").map((l) => l.trim()).filter(Boolean)
                : [];
              await apiFetch(`/api/projects/${encodeURIComponent(name)}/work-instruction`, {
                method: "POST",
                body: JSON.stringify({ instruction: newInstruction, checklist }),
              });
              toast.success("Work instruction created");
              setNewInstruction("");
              setNewChecklist("");
            } catch {
              toast.error("Failed to create instruction");
            } finally {
              setSavingInstruction(false);
            }
          }}
        />
      )}

      {/* Terminal tab — session persists across tab switches */}
      {activeTab === "terminal" && !terminalMode && (
        <div className="flex flex-col items-center justify-center h-[400px] gap-6">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {project?.path}
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => setTerminalMode("shell")}
              className="flex flex-col items-center gap-3 px-8 py-6 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all group"
            >
              <TerminalSquare className="w-10 h-10 text-neutral-400 group-hover:text-amber-500 transition-colors" />
              <div className="text-center">
                <p className="font-semibold text-sm">Terminal</p>
                <p className="text-xs text-neutral-400 mt-1">bash/zsh shell</p>
              </div>
            </button>
            <button
              onClick={() => setTerminalMode("claude")}
              className="flex flex-col items-center gap-3 px-8 py-6 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all group"
            >
              <Bot className="w-10 h-10 text-neutral-400 group-hover:text-indigo-500 transition-colors" />
              <div className="text-center">
                <p className="font-semibold text-sm">Claude Code</p>
                <p className="text-xs text-neutral-400 mt-1">AI-assisted dev</p>
              </div>
            </button>
          </div>
        </div>
      )}
      {terminalMode && project?.path && (
        <div className={activeTab === "terminal" ? "overflow-hidden" : "hidden"}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-neutral-400">
              {terminalMode === "claude" ? "Claude Code" : "Shell"} — {project.path}
            </span>
            <div className="flex-1" />
            <button
              onClick={() => { setTerminalSessionKey((k) => k + 1); }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Restart
            </button>
            <button
              onClick={() => { setTerminalMode(null); setTerminalSessionKey((k) => k + 1); }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
            >
              <X className="w-3 h-3" />
              End
            </button>
          </div>
          <EmbeddedTerminal
            key={terminalSessionKey}
            projectPath={project.path}
            command={terminalMode === "claude" ? "claude" : ""}
            visible={activeTab === "terminal"}
            onClose={() => { setTerminalMode(null); }}
          />
        </div>
      )}

      {activeTab === "logs" && (
        <ProjectLogsTab
          logs={logs}
          showLogForm={showLogForm}
          setShowLogForm={setShowLogForm}
          newLogType={newLogType}
          setNewLogType={setNewLogType}
          newLogTitle={newLogTitle}
          setNewLogTitle={setNewLogTitle}
          newLogDesc={newLogDesc}
          setNewLogDesc={setNewLogDesc}
          newLogTags={newLogTags}
          setNewLogTags={setNewLogTags}
          onCreateLog={createLog}
          onDeleteLog={deleteLog}
          t={t}
        />
      )}

      {activeTab === "todo" && (
        <TodoBoard
          todos={todos}
          todoColumns={todoColumns}
          addingInColumn={addingInColumn}
          setAddingInColumn={setAddingInColumn}
          newTodoTitle={newTodoTitle}
          setNewTodoTitle={setNewTodoTitle}
          newTodoDesc={newTodoDesc}
          setNewTodoDesc={setNewTodoDesc}
          newTodoPriority={newTodoPriority}
          setNewTodoPriority={setNewTodoPriority}
          newTodoAssignee={newTodoAssignee}
          setNewTodoAssignee={setNewTodoAssignee}
          newTodoDueDate={newTodoDueDate}
          setNewTodoDueDate={setNewTodoDueDate}
          editingTodo={editingTodo}
          setEditingTodo={setEditingTodo}
          editTodoTitle={editTodoTitle}
          setEditTodoTitle={setEditTodoTitle}
          editTodoDesc={editTodoDesc}
          setEditTodoDesc={setEditTodoDesc}
          editTodoPriority={editTodoPriority}
          setEditTodoPriority={setEditTodoPriority}
          editTodoAssignee={editTodoAssignee}
          setEditTodoAssignee={setEditTodoAssignee}
          editTodoDueDate={editTodoDueDate}
          setEditTodoDueDate={setEditTodoDueDate}
          draggedTodo={draggedTodo}
          createTodo={createTodo}
          updateTodo={updateTodo}
          deleteTodo={deleteTodo}
          moveTodo={moveTodo}
          handleDragStart={handleDragStart}
          handleDragOver={handleDragOver}
          handleDropOnColumn={handleDropOnColumn}
          handleDropOnCard={handleDropOnCard}
          toggleStar={toggleStar}
          columnLabel={columnLabel}
          priorityClasses={priorityClasses}
          priorityLabel={priorityLabel}
          t={t}
        />
      )}

      {activeTab === "issues" && (
        <ProjectIssuesTab
          issues={issues}
          issueFilter={issueFilter}
          setIssueFilter={setIssueFilter}
          expandedIssue={expandedIssue}
          setExpandedIssue={setExpandedIssue}
          showNewIssue={showNewIssue}
          setShowNewIssue={setShowNewIssue}
          newIssueTitle={newIssueTitle}
          setNewIssueTitle={setNewIssueTitle}
          newIssueDesc={newIssueDesc}
          setNewIssueDesc={setNewIssueDesc}
          newIssuePriority={newIssuePriority}
          setNewIssuePriority={setNewIssuePriority}
          newIssueLabels={newIssueLabels}
          setNewIssueLabels={setNewIssueLabels}
          newIssueAssignee={newIssueAssignee}
          setNewIssueAssignee={setNewIssueAssignee}
          newCommentText={newCommentText}
          setNewCommentText={setNewCommentText}
          changingStatus={changingStatus}
          setChangingStatus={setChangingStatus}
          editingIssueId={editingIssueId}
          setEditingIssueId={setEditingIssueId}
          editIssueTitle={editIssueTitle}
          setEditIssueTitle={setEditIssueTitle}
          editIssueDesc={editIssueDesc}
          setEditIssueDesc={setEditIssueDesc}
          editIssuePriority={editIssuePriority}
          setEditIssuePriority={setEditIssuePriority}
          editIssueLabels={editIssueLabels}
          setEditIssueLabels={setEditIssueLabels}
          editIssueAssignee={editIssueAssignee}
          setEditIssueAssignee={setEditIssueAssignee}
          editingCommentId={editingCommentId}
          setEditingCommentId={setEditingCommentId}
          editCommentText={editCommentText}
          setEditCommentText={setEditCommentText}
          onCreateIssue={createIssue}
          onUpdateIssueStatus={updateIssueStatus}
          onResolveIssue={resolveIssue}
          onDeleteIssue={deleteIssue}
          onSaveEditIssue={saveEditIssue}
          onAddComment={addComment}
          onEditComment={editComment}
          onDeleteComment={deleteComment}
          t={t}
        />
      )}

      {activeTab === "schedule" && (
        <ProjectScheduleTab
          scheduleTasks={scheduleTasks}
          milestones={milestones}
          categories={categories}
          scheduleView={scheduleView}
          setScheduleView={setScheduleView}
          showAddTask={showAddTask}
          setShowAddTask={setShowAddTask}
          showAddMilestone={showAddMilestone}
          setShowAddMilestone={setShowAddMilestone}
          newSchedTitle={newSchedTitle}
          setNewSchedTitle={setNewSchedTitle}
          newSchedStart={newSchedStart}
          setNewSchedStart={setNewSchedStart}
          newSchedEnd={newSchedEnd}
          setNewSchedEnd={setNewSchedEnd}
          newSchedAssignee={newSchedAssignee}
          setNewSchedAssignee={setNewSchedAssignee}
          newSchedStatus={newSchedStatus}
          setNewSchedStatus={setNewSchedStatus}
          newSchedParent={newSchedParent}
          setNewSchedParent={setNewSchedParent}
          newSchedDepends={newSchedDepends}
          setNewSchedDepends={setNewSchedDepends}
          newSchedCategory={newSchedCategory}
          setNewSchedCategory={setNewSchedCategory}
          editingSchedId={editingSchedId}
          setEditingSchedId={setEditingSchedId}
          editSchedTitle={editSchedTitle}
          setEditSchedTitle={setEditSchedTitle}
          editSchedStart={editSchedStart}
          setEditSchedStart={setEditSchedStart}
          editSchedEnd={editSchedEnd}
          setEditSchedEnd={setEditSchedEnd}
          editSchedAssignee={editSchedAssignee}
          setEditSchedAssignee={setEditSchedAssignee}
          editSchedStatus={editSchedStatus}
          setEditSchedStatus={setEditSchedStatus}
          editSchedCategory={editSchedCategory}
          setEditSchedCategory={setEditSchedCategory}
          editSchedParent={editSchedParent}
          setEditSchedParent={setEditSchedParent}
          editSchedDepends={editSchedDepends}
          setEditSchedDepends={setEditSchedDepends}
          editSchedProgress={editSchedProgress}
          setEditSchedProgress={setEditSchedProgress}
          showNewCategory={showNewCategory}
          setShowNewCategory={setShowNewCategory}
          newCatName={newCatName}
          setNewCatName={setNewCatName}
          editingMsId={editingMsId}
          setEditingMsId={setEditingMsId}
          editMsTitle={editMsTitle}
          setEditMsTitle={setEditMsTitle}
          editMsDate={editMsDate}
          setEditMsDate={setEditMsDate}
          editMsDesc={editMsDesc}
          setEditMsDesc={setEditMsDesc}
          editMsLinked={editMsLinked}
          setEditMsLinked={setEditMsLinked}
          newMsTitle={newMsTitle}
          setNewMsTitle={setNewMsTitle}
          newMsDate={newMsDate}
          setNewMsDate={setNewMsDate}
          newMsDesc={newMsDesc}
          setNewMsDesc={setNewMsDesc}
          newMsLinked={newMsLinked}
          setNewMsLinked={setNewMsLinked}
          ganttRange={ganttRange}
          setGanttRange={setGanttRange}
          onCreateScheduleTask={createScheduleTask}
          onDeleteScheduleTask={deleteScheduleTask}
          onUpdateScheduleTask={updateScheduleTask}
          onSaveEditScheduleTask={saveEditScheduleTask}
          onStartEditScheduleTask={startEditScheduleTask}
          onCreateMilestone={createMilestone}
          onDeleteMilestone={deleteMilestone}
          onStartEditMilestone={startEditMilestone}
          onSaveEditMilestone={saveEditMilestone}
          onCreateCategory={createCategory}
          onDeleteCategory={deleteCategory}
          onRenameCategoryPrompt={(cat) =>
            setPromptDialog({
              title: "Rename Category",
              message: `"${cat.name}"`,
              defaultValue: cat.name,
              onConfirm: async (newName) => {
                setPromptDialog(null);
                if (newName.trim() && newName.trim() !== cat.name) {
                  try {
                    await apiFetch(`/api/projects/${encodeURIComponent(name)}/schedule/categories/${encodeURIComponent(cat.name)}`, {
                      method: "PUT",
                      body: JSON.stringify({ new_name: newName.trim() }),
                    });
                    loadSchedule();
                  } catch { toast.error(t("toast.failedToSave")); }
                }
              },
            })
          }
          getNextCategoryColor={getNextCategoryColor}
          hasUnfinishedDeps={hasUnfinishedDeps}
          projectLabel={project?.metadata?.label || project?.name || ""}
          toastError={(msg) => toast.error(msg)}
          t={t}
        />
      )}

      {activeTab === "settings" && project && (
        <ProjectSettingsTab
          project={project}
          stageLabel={stage?.label || project.stage}
          allTypes={allTypes}
          metaDraft={metaDraft}
          setMetaDraft={setMetaDraft}
          savingMeta={savingMeta}
          subtasks={subtasks}
          newSubtaskTitle={newSubtaskTitle}
          setNewSubtaskTitle={setNewSubtaskTitle}
          newSubtaskDesc={newSubtaskDesc}
          setNewSubtaskDesc={setNewSubtaskDesc}
          editingSubtaskId={editingSubtaskId}
          setEditingSubtaskId={setEditingSubtaskId}
          editSubtaskTitle={editSubtaskTitle}
          setEditSubtaskTitle={setEditSubtaskTitle}
          editSubtaskDesc={editSubtaskDesc}
          setEditSubtaskDesc={setEditSubtaskDesc}
          dragSubtaskId={dragSubtaskId}
          onSaveMetadata={saveMetadata}
          onAddSubtask={addSubtask}
          onToggleSubtask={toggleSubtask}
          onUpdateSubtask={updateSubtask}
          onDeleteSubtask={deleteSubtask}
          onSubtaskDragStart={handleSubtaskDragStart}
          onSubtaskDragOver={handleSubtaskDragOver}
          onSubtaskDragEnd={handleSubtaskDragEnd}
          onRenameTypePrompt={(currentType) =>
            setPromptDialog({
              title: `Rename Type "${currentType}"`,
              defaultValue: currentType,
              onConfirm: async (newName) => {
                setPromptDialog(null);
                if (newName.trim() && newName.trim() !== currentType) {
                  try {
                    await apiFetch("/api/projects/rename-type", {
                      method: "PUT",
                      body: JSON.stringify({ old_type: currentType, new_type: newName.trim() }),
                    });
                    setMetaDraft((d) => ({ ...d, 유형: newName.trim() }));
                    loadProject();
                    toast.success(`Renamed → "${newName.trim()}"`);
                  } catch { toast.error("Failed"); }
                }
              },
            })
          }
          onDeleteTypePrompt={(currentType) =>
            setConfirmDialog({
              message: `Delete type "${currentType}" from all projects?`,
              onConfirm: async () => {
                setConfirmDialog(null);
                try {
                  await apiFetch("/api/projects/delete-type", {
                    method: "DELETE",
                    body: JSON.stringify({ type: currentType }),
                  });
                  setMetaDraft((d) => ({ ...d, 유형: "" }));
                  loadProject();
                  toast.success(`Deleted type "${currentType}"`);
                } catch { toast.error("Failed"); }
              },
            })
          }
          t={t}
        />
      )}
      <ConfirmDialog
        open={!!confirmDialog}
        message={confirmDialog?.message || ""}
        variant="danger"
        confirmLabel="Delete"
        onConfirm={() => { confirmDialog?.onConfirm(); }}
        onCancel={() => setConfirmDialog(null)}
      />
      <PromptDialog
        open={!!promptDialog}
        title={promptDialog?.title}
        message={promptDialog?.message}
        placeholder={promptDialog?.placeholder}
        defaultValue={promptDialog?.defaultValue}
        onConfirm={(val) => { promptDialog?.onConfirm(val); }}
        onCancel={() => setPromptDialog(null)}
      />
    </div>
  );
}
