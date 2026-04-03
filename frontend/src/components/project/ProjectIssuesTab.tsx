"use client";

import React from "react";
import {
  Loader2,
  Plus,
  User,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  CircleDot,
  CheckCircle,
  XCircle,
  Pencil,
  Trash2,
  Send,
} from "lucide-react";

export interface IssueComment {
  id: string;
  author: string;
  content: string;
  created_at: string;
}

export interface IssueItem {
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

interface ProjectIssuesTabProps {
  issues: IssueItem[];
  issueFilter: "all" | "open" | "in_progress" | "resolved" | "closed";
  setIssueFilter: (f: "all" | "open" | "in_progress" | "resolved" | "closed") => void;
  expandedIssue: string | null;
  setExpandedIssue: (id: string | null) => void;
  showNewIssue: boolean;
  setShowNewIssue: (v: boolean) => void;
  newIssueTitle: string;
  setNewIssueTitle: (v: string) => void;
  newIssueDesc: string;
  setNewIssueDesc: (v: string) => void;
  newIssuePriority: "low" | "medium" | "high" | "critical";
  setNewIssuePriority: (v: "low" | "medium" | "high" | "critical") => void;
  newIssueLabels: string;
  setNewIssueLabels: (v: string) => void;
  newIssueAssignee: string;
  setNewIssueAssignee: (v: string) => void;
  newCommentText: string;
  setNewCommentText: (v: string) => void;
  changingStatus: string | null;
  setChangingStatus: (id: string | null) => void;
  editingIssueId: string | null;
  setEditingIssueId: (id: string | null) => void;
  editIssueTitle: string;
  setEditIssueTitle: (v: string) => void;
  editIssueDesc: string;
  setEditIssueDesc: (v: string) => void;
  editIssuePriority: "low" | "medium" | "high" | "critical";
  setEditIssuePriority: (v: "low" | "medium" | "high" | "critical") => void;
  editIssueLabels: string;
  setEditIssueLabels: (v: string) => void;
  editIssueAssignee: string;
  setEditIssueAssignee: (v: string) => void;
  editingCommentId: string | null;
  setEditingCommentId: (id: string | null) => void;
  editCommentText: string;
  setEditCommentText: (v: string) => void;
  onCreateIssue: () => void;
  onUpdateIssueStatus: (issueId: string, status: string) => void;
  onResolveIssue: (issueId: string) => void;
  onDeleteIssue: (issueId: string) => void;
  onSaveEditIssue: (issueId: string) => void;
  onAddComment: (issueId: string) => void;
  onEditComment: (issueId: string, commentId: string) => void;
  onDeleteComment: (issueId: string, commentId: string) => void;
  t: (key: string) => string;
}

export function ProjectIssuesTab({
  issues,
  issueFilter,
  setIssueFilter,
  expandedIssue,
  setExpandedIssue,
  showNewIssue,
  setShowNewIssue,
  newIssueTitle,
  setNewIssueTitle,
  newIssueDesc,
  setNewIssueDesc,
  newIssuePriority,
  setNewIssuePriority,
  newIssueLabels,
  setNewIssueLabels,
  newIssueAssignee,
  setNewIssueAssignee,
  newCommentText,
  setNewCommentText,
  changingStatus,
  setChangingStatus,
  editingIssueId,
  setEditingIssueId,
  editIssueTitle,
  setEditIssueTitle,
  editIssueDesc,
  setEditIssueDesc,
  editIssuePriority,
  setEditIssuePriority,
  editIssueLabels,
  setEditIssueLabels,
  editIssueAssignee,
  setEditIssueAssignee,
  editingCommentId,
  setEditingCommentId,
  editCommentText,
  setEditCommentText,
  onCreateIssue,
  onUpdateIssueStatus,
  onResolveIssue,
  onDeleteIssue,
  onSaveEditIssue,
  onAddComment,
  onEditComment,
  onDeleteComment,
  t,
}: ProjectIssuesTabProps) {
  const filteredIssues = issues.filter((i) => {
    if (issueFilter === "all") return true;
    return i.status === issueFilter;
  });

  const issueStatusIcon = (status: string) => {
    switch (status) {
      case "open": return <CircleDot className="w-4 h-4 text-blue-500" />;
      case "in_progress": return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
      case "resolved": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "closed": return <XCircle className="w-4 h-4 text-neutral-400" />;
      default: return <CircleDot className="w-4 h-4 text-blue-500" />;
    }
  };

  const issueStatusLabel = (status: string) => {
    switch (status) {
      case "open": return t("issues.open");
      case "in_progress": return t("issues.inProgress");
      case "resolved": return t("issues.resolved");
      case "closed": return t("issues.closed");
      default: return status;
    }
  };

  const issuePriorityClasses = (p: string) => {
    switch (p) {
      case "low": return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400";
      case "medium": return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
      case "high": return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400";
      case "critical": return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
      default: return "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header: title + new issue button + filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{t("issues.title")}</h3>
        <div className="flex items-center gap-2">
          {/* Filter buttons */}
          {(["all", "open", "in_progress", "resolved", "closed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setIssueFilter(f)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                issueFilter === f
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400"
                  : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              {f === "all" ? t("issues.all") : f === "in_progress" ? t("issues.inProgress") : t(`issues.${f}`)}
              {" "}
              <span className="opacity-60">
                {f === "all" ? issues.length : issues.filter((i) => i.status === f).length}
              </span>
            </button>
          ))}
          <button
            onClick={() => setShowNewIssue(!showNewIssue)}
            className="ml-2 flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("issues.newIssue")}
          </button>
        </div>
      </div>

      {/* New issue form */}
      {showNewIssue && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
          <input
            value={newIssueTitle}
            onChange={(e) => setNewIssueTitle(e.target.value)}
            placeholder={t("todo.taskTitle")}
            className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <textarea
            value={newIssueDesc}
            onChange={(e) => setNewIssueDesc(e.target.value)}
            placeholder={t("issues.description")}
            rows={3}
            className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <div className="flex flex-wrap gap-3">
            <select
              value={newIssuePriority}
              onChange={(e) => setNewIssuePriority(e.target.value as "low" | "medium" | "high" | "critical")}
              className="px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none"
            >
              <option value="low">{t("todo.low")}</option>
              <option value="medium">{t("todo.medium")}</option>
              <option value="high">{t("todo.high")}</option>
              <option value="critical">Critical</option>
            </select>
            <input
              value={newIssueLabels}
              onChange={(e) => setNewIssueLabels(e.target.value)}
              placeholder={t("issues.labels") + " (comma separated)"}
              className="flex-1 min-w-[150px] px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none"
            />
            <input
              value={newIssueAssignee}
              onChange={(e) => setNewIssueAssignee(e.target.value)}
              placeholder={t("issues.assignee")}
              className="flex-1 min-w-[120px] px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowNewIssue(false)}
              className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              {t("action.cancel")}
            </button>
            <button
              onClick={onCreateIssue}
              className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {t("action.save")}
            </button>
          </div>
        </div>
      )}

      {/* Issue list */}
      {filteredIssues.length === 0 ? (
        <div className="text-center py-12 text-neutral-400 dark:text-neutral-500 text-sm">
          {t("issues.noIssues")}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
            >
              {/* Issue card header */}
              <button
                onClick={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
                className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
              >
                <div className="mt-0.5">{issueStatusIcon(issue.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-neutral-900 dark:text-white">{issue.title}</span>
                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${issuePriorityClasses(issue.priority)}`}>
                      {issue.priority}
                    </span>
                    {issue.labels.map((label) => (
                      <span
                        key={label}
                        className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                  {issue.description && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                      {issue.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                    {issue.assignee && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {issue.assignee}
                      </span>
                    )}
                    <span>{issue.created_at}</span>
                    {issue.comments.length > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {issue.comments.length}
                      </span>
                    )}
                  </div>
                </div>
                {expandedIssue === issue.id ? (
                  <ChevronUp className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                )}
              </button>

              {/* Expanded issue view */}
              {expandedIssue === issue.id && (
                <div className="border-t border-neutral-200 dark:border-neutral-800 px-4 py-4 space-y-4">
                  {/* Edit issue form */}
                  {editingIssueId === issue.id ? (
                    <div className="space-y-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
                      <input type="text" value={editIssueTitle} onChange={(e) => setEditIssueTitle(e.target.value)} className="w-full px-2 py-1.5 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                      <textarea value={editIssueDesc} onChange={(e) => setEditIssueDesc(e.target.value)} rows={3} className="w-full px-2 py-1.5 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                      <div className="grid grid-cols-3 gap-2">
                        <select value={editIssuePriority} onChange={(e) => setEditIssuePriority(e.target.value as "low" | "medium" | "high" | "critical")} className="px-2 py-1.5 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded">
                          <option value="low">{t("todo.low")}</option>
                          <option value="medium">{t("todo.medium")}</option>
                          <option value="high">{t("todo.high")}</option>
                          <option value="critical">Critical</option>
                        </select>
                        <input type="text" value={editIssueLabels} onChange={(e) => setEditIssueLabels(e.target.value)} placeholder={t("issues.labels")} className="px-2 py-1.5 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded" />
                        <input type="text" value={editIssueAssignee} onChange={(e) => setEditIssueAssignee(e.target.value)} placeholder={t("issues.assignee")} className="px-2 py-1.5 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded" />
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => onSaveEditIssue(issue.id)} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">{t("action.save")}</button>
                        <button onClick={() => setEditingIssueId(null)} className="px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded">{t("action.cancel")}</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {issue.description && (
                        <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                          {issue.description}
                        </p>
                      )}
                    </>
                  )}

                  {/* Status change + actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <button
                        onClick={() => setChangingStatus(changingStatus === issue.id ? null : issue.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                      >
                        {issueStatusIcon(issue.status)}
                        {issueStatusLabel(issue.status)}
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {changingStatus === issue.id && (
                        <div className="absolute top-full left-0 mt-1 z-10 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1 min-w-[140px]">
                          {(["open", "in_progress", "resolved", "closed"] as const).map((s) => (
                            <button
                              key={s}
                              onClick={() => onUpdateIssueStatus(issue.id, s)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            >
                              {issueStatusIcon(s)}
                              {issueStatusLabel(s)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {issue.status !== "resolved" && issue.status !== "closed" && (
                      <button
                        onClick={() => onResolveIssue(issue.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        {t("issues.resolve")}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingIssueId(issue.id);
                        setEditIssueTitle(issue.title);
                        setEditIssueDesc(issue.description);
                        setEditIssuePriority(issue.priority);
                        setEditIssueLabels(issue.labels.join(", "));
                        setEditIssueAssignee(issue.assignee);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors ml-auto"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      {t("action.edit")}
                    </button>
                    <button
                      onClick={() => onDeleteIssue(issue.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t("action.delete")}
                    </button>
                  </div>

                  {/* Comments thread */}
                  {issue.comments.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        {t("issues.comments")} ({issue.comments.length})
                      </h4>
                      {issue.comments.map((c) => (
                        <div
                          key={c.id}
                          className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg px-3 py-2.5 group/comment"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{c.author}</span>
                              <span className="text-[10px] text-neutral-400">{c.created_at}</span>
                              {(c as unknown as { edited_at?: string }).edited_at && <span className="text-[10px] text-neutral-400">(edited)</span>}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                              <button
                                onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.content); }}
                                className="p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                                title={t("action.edit")}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => onDeleteComment(issue.id, c.id)}
                                className="p-0.5 text-neutral-400 hover:text-red-500"
                                title={t("action.delete")}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          {editingCommentId === c.id ? (
                            <div className="space-y-1.5">
                              <textarea
                                value={editCommentText}
                                onChange={(e) => setEditCommentText(e.target.value)}
                                rows={2}
                                className="w-full px-2 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                                autoFocus
                              />
                              <div className="flex gap-1">
                                <button onClick={() => onEditComment(issue.id, c.id)} className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">{t("action.save")}</button>
                                <button onClick={() => setEditingCommentId(null)} className="px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded">{t("action.cancel")}</button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">{c.content}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add comment */}
                  <div className="flex gap-2">
                    <textarea
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder={t("issues.addComment") + "..."}
                      rows={2}
                      className="flex-1 px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                    <button
                      onClick={() => onAddComment(issue.id)}
                      disabled={!newCommentText.trim()}
                      className="self-end px-3 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
