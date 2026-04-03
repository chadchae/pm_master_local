"use client";

import React from "react";
import { Plus, X, History } from "lucide-react";

interface LogEntry {
  id: string;
  type: string;
  title: string;
  description: string;
  created_at: string;
  tags: string[];
}

interface ProjectLogsTabProps {
  logs: LogEntry[];
  showLogForm: boolean;
  setShowLogForm: (v: boolean) => void;
  newLogType: string;
  setNewLogType: (v: string) => void;
  newLogTitle: string;
  setNewLogTitle: (v: string) => void;
  newLogDesc: string;
  setNewLogDesc: (v: string) => void;
  newLogTags: string;
  setNewLogTags: (v: string) => void;
  onCreateLog: () => void;
  onDeleteLog: (logId: string) => void;
  t: (key: string) => string;
}

export function ProjectLogsTab({
  logs,
  showLogForm,
  setShowLogForm,
  newLogType,
  setNewLogType,
  newLogTitle,
  setNewLogTitle,
  newLogDesc,
  setNewLogDesc,
  newLogTags,
  setNewLogTags,
  onCreateLog,
  onDeleteLog,
  t,
}: ProjectLogsTabProps) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
      {/* Header + Add button */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-500" />
          {t("project.logs")}
          <span className="text-xs font-normal text-neutral-400">({logs.length})</span>
        </h3>
        <button
          onClick={() => setShowLogForm(!showLogForm)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          {showLogForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showLogForm ? t("action.cancel") : "Add"}
        </button>
      </div>

      {/* Add form */}
      {showLogForm && (
        <div className="mb-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg space-y-3">
          <div className="flex gap-2">
            <select
              value={newLogType}
              onChange={(e) => setNewLogType(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="note">Note</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="milestone">Milestone</option>
            </select>
            <input
              type="text"
              value={newLogTitle}
              onChange={(e) => setNewLogTitle(e.target.value)}
              placeholder="What happened?"
              className="flex-1 px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && newLogTitle.trim()) {
                  e.preventDefault();
                  onCreateLog();
                }
              }}
            />
          </div>
          <textarea
            value={newLogDesc}
            onChange={(e) => setNewLogDesc(e.target.value)}
            rows={2}
            placeholder="Details (optional)"
            className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newLogTags}
              onChange={(e) => setNewLogTags(e.target.value)}
              placeholder="Tags (comma separated)"
              className="flex-1 px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              onClick={onCreateLog}
              disabled={!newLogTitle.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {logs.length === 0 ? (
        <div className="text-center py-12 text-neutral-400">
          <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No log entries yet</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-indigo-200 dark:border-indigo-800 ml-3 space-y-4">
          {logs.map((entry) => {
            const typeColors: Record<string, string> = {
              create: "bg-green-500",
              update: "bg-blue-500",
              delete: "bg-red-500",
              milestone: "bg-amber-500",
              note: "bg-indigo-500",
            };
            const typeLabels: Record<string, string> = {
              create: "Created",
              update: "Updated",
              delete: "Deleted",
              milestone: "Milestone",
              note: "Note",
            };
            return (
              <div key={entry.id} className="relative pl-6 group">
                <div className={`absolute -left-[9px] top-2 w-4 h-4 rounded-full border-2 border-white dark:border-neutral-900 ${typeColors[entry.type] || typeColors.note}`} />
                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium text-white ${typeColors[entry.type] || typeColors.note}`}>
                          {typeLabels[entry.type] || entry.type}
                        </span>
                        <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{entry.title}</span>
                      </div>
                      {entry.description && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 whitespace-pre-wrap">{entry.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-[11px] text-neutral-400">{entry.created_at}</span>
                        {entry.tags.map((tag) => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteLog(entry.id)}
                      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-neutral-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all ml-2 flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
