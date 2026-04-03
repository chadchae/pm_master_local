"use client";

import React from "react";
import {
  Loader2,
  Save,
  Star,
  AlertTriangle,
  Clock,
  Users,
  User,
  Crown,
  GripVertical,
  CheckCircle,
  XCircle,
  Circle,
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
  Ban,
} from "lucide-react";
import { MetaTags } from "@/components/MetaTags";
import { ProgressBar } from "@/components/ProgressBar";
import { PeopleTagInput } from "@/components/PeopleTagInput";
import { RelatedProjectsInput } from "@/components/RelatedProjectsInput";
import type { Project } from "@/lib/api";

interface Subtask {
  id: string;
  title: string;
  description: string;
  status: "pending" | "done" | "cancelled";
  order: number;
  created_at: string;
  completed_at: string;
}

interface MetaDraft {
  label: string;
  상태: string;
  유형: string;
  포트: string;
  중요도: string;
  위급도: string;
  긴급도: string;
  협업: string;
  주도: string;
  오너: string;
  연관프로젝트: string;
  목표종료일: string;
  실제종료일: string;
  related_people: string;
  github_url: string;
  github_pages_url: string;
  gdrive_url: string;
}

interface ProjectSettingsTabProps {
  project: Project;
  stageLabel: string;
  allTypes: string[];
  metaDraft: MetaDraft;
  setMetaDraft: React.Dispatch<React.SetStateAction<MetaDraft>>;
  savingMeta: boolean;
  subtasks: Subtask[];
  newSubtaskTitle: string;
  setNewSubtaskTitle: (v: string) => void;
  newSubtaskDesc: string;
  setNewSubtaskDesc: (v: string) => void;
  editingSubtaskId: string | null;
  setEditingSubtaskId: (id: string | null) => void;
  editSubtaskTitle: string;
  setEditSubtaskTitle: (v: string) => void;
  editSubtaskDesc: string;
  setEditSubtaskDesc: (v: string) => void;
  dragSubtaskId: string | null;
  onSaveMetadata: () => void;
  onAddSubtask: () => void;
  onToggleSubtask: (id: string, status: "pending" | "done" | "cancelled") => void;
  onUpdateSubtask: (id: string) => void;
  onDeleteSubtask: (id: string) => void;
  onSubtaskDragStart: (id: string) => void;
  onSubtaskDragOver: (e: React.DragEvent, targetId: string) => void;
  onSubtaskDragEnd: () => void;
  onRenameTypePrompt: (currentType: string) => void;
  onDeleteTypePrompt: (currentType: string) => void;
  t: (key: string) => string;
}

export function ProjectSettingsTab({
  project,
  stageLabel,
  allTypes,
  metaDraft,
  setMetaDraft,
  savingMeta,
  subtasks,
  newSubtaskTitle,
  setNewSubtaskTitle,
  newSubtaskDesc,
  setNewSubtaskDesc,
  editingSubtaskId,
  setEditingSubtaskId,
  editSubtaskTitle,
  setEditSubtaskTitle,
  editSubtaskDesc,
  setEditSubtaskDesc,
  dragSubtaskId,
  onSaveMetadata,
  onAddSubtask,
  onToggleSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
  onSubtaskDragStart,
  onSubtaskDragOver,
  onSubtaskDragEnd,
  onRenameTypePrompt,
  onDeleteTypePrompt,
  t,
}: ProjectSettingsTabProps) {
  return (
    <div className="space-y-6">
      {/* Project Info (read-only) */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">
          Project Information
        </h3>
        <dl className="space-y-3">
          <div className="flex items-center gap-2">
            <dt className="text-sm text-neutral-500 dark:text-neutral-400 w-24">Path</dt>
            <dd className="text-sm text-neutral-800 dark:text-neutral-200 font-mono text-xs">{project.path}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="text-sm text-neutral-500 dark:text-neutral-400 w-24">Stage</dt>
            <dd className="text-sm text-neutral-800 dark:text-neutral-200">{stageLabel}</dd>
          </div>
          {project.metadata?.유형 && (
            <div className="flex items-center gap-2">
              <dt className="text-sm text-neutral-500 dark:text-neutral-400 w-24">Type</dt>
              <dd className="text-sm text-neutral-800 dark:text-neutral-200">{project.metadata.유형}</dd>
            </div>
          )}
          {project.metadata?.포트 && (
            <div className="flex items-center gap-2">
              <dt className="text-sm text-neutral-500 dark:text-neutral-400 w-24">Port</dt>
              <dd className="text-sm text-neutral-800 dark:text-neutral-200">{project.metadata.포트}</dd>
            </div>
          )}
          {project.metadata?.작성일 && (
            <div className="flex items-center gap-2">
              <dt className="text-sm text-neutral-500 dark:text-neutral-400 w-24">Created</dt>
              <dd className="text-sm text-neutral-800 dark:text-neutral-200">{project.metadata.작성일}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Meta Tags (editable) */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Tags & Priority</h3>
          <div className="flex items-center gap-2">
            <MetaTags metadata={project.metadata} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {/* Type */}
          <div>
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">Type</label>
            <select
              value={metaDraft.유형 || ""}
              onChange={(e) => {
                if (e.target.value === "__custom__") {
                  // handled by parent via prompt
                  onRenameTypePrompt("__custom__");
                } else {
                  setMetaDraft((d) => ({ ...d, 유형: e.target.value }));
                }
              }}
              className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Not set</option>
              {allTypes.map((tp) => (<option key={tp} value={tp}>{tp}</option>))}
              {metaDraft.유형 && !allTypes.includes(metaDraft.유형) && (
                <option value={metaDraft.유형}>{metaDraft.유형}</option>
              )}
              <option value="__custom__">+ 직접 입력</option>
            </select>
            {metaDraft.유형 && (
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  onClick={() => onRenameTypePrompt(metaDraft.유형)}
                  className="text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-0.5"
                >
                  <Pencil className="w-3 h-3" /> Rename All
                </button>
                <button
                  onClick={() => onDeleteTypePrompt(metaDraft.유형)}
                  className="text-xs text-red-400 hover:text-red-600 flex items-center gap-0.5"
                >
                  <Trash2 className="w-3 h-3" /> Delete All
                </button>
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">상태 (Status)</label>
            <input
              type="text"
              value={metaDraft.상태 || ""}
              onChange={(e) => setMetaDraft((d) => ({ ...d, 상태: e.target.value }))}
              placeholder="초기화, 개발 중, 진행중, 분석완료, 보관..."
              className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Port */}
          <div>
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">Port</label>
            <input
              type="text"
              value={metaDraft.포트 || ""}
              onChange={(e) => setMetaDraft((d) => ({ ...d, 포트: e.target.value }))}
              placeholder="8000/3000"
              className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Importance */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              Importance
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setMetaDraft((d) => ({ ...d, 중요도: d.중요도 === String(n) ? "" : String(n) }))}
                  className="p-1 rounded hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                >
                  <Star className={`w-5 h-5 ${parseInt(metaDraft.중요도 || "0") >= n ? "text-amber-400 fill-amber-400" : "text-neutral-300 dark:text-neutral-600"}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Severity */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
              Severity
            </label>
            <select
              value={metaDraft.위급도}
              onChange={(e) => setMetaDraft((d) => ({ ...d, 위급도: e.target.value }))}
              className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">None</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Urgency */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              Urgency
            </label>
            <select
              value={metaDraft.긴급도}
              onChange={(e) => setMetaDraft((d) => ({ ...d, 긴급도: e.target.value }))}
              className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">None</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Collaboration */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
              <Users className="w-3.5 h-3.5 text-blue-500" />
              Collaboration
            </label>
            <select
              value={metaDraft.협업}
              onChange={(e) => setMetaDraft((d) => ({ ...d, 협업: e.target.value }))}
              className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Not set</option>
              <option value="personal">Personal</option>
              <option value="collaboration">Collaboration</option>
            </select>
          </div>

          {/* Role (only if collaboration) */}
          {metaDraft.협업 === "collaboration" && (
            <>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
                  <Crown className="w-3.5 h-3.5 text-violet-500" />
                  My Role
                </label>
                <select
                  value={metaDraft.주도}
                  onChange={(e) => setMetaDraft((d) => ({ ...d, 주도: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Not set</option>
                  <option value="lead">Lead</option>
                  <option value="member">Member</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
                  <User className="w-3.5 h-3.5 text-neutral-500" />
                  Project Owner
                </label>
                <input
                  type="text"
                  value={metaDraft.오너}
                  onChange={(e) => setMetaDraft((d) => ({ ...d, 오너: e.target.value }))}
                  placeholder="Owner name..."
                  className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </>
          )}

          {/* Related Projects */}
          <div>
            <RelatedProjectsInput
              value={metaDraft["연관프로젝트"] ? metaDraft["연관프로젝트"].split(",").map((s: string) => s.trim()).filter(Boolean) : []}
              onChange={(v) => setMetaDraft((d) => ({ ...d, "연관프로젝트": v.join(", ") }))}
            />
          </div>
        </div>

        {/* Related People */}
        <div className="mt-4 pb-40">
          <PeopleTagInput
            value={metaDraft.related_people ? metaDraft.related_people.split(",").map((s) => s.trim()).filter(Boolean) : []}
            onChange={(names) => setMetaDraft((d) => ({ ...d, related_people: names.join(", ") }))}
            label="Related People"
            projectLabel={project?.metadata?.label || project?.name}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onSaveMetadata}
            disabled={savingMeta}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-40 transition-colors flex items-center gap-2"
          >
            {savingMeta ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Tags
          </button>
        </div>
      </div>

      {/* Timeline & Progress */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">
          {t("project.timelineProgress")}
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">{t("project.targetEndDate")}</label>
            <input
              type="date"
              value={metaDraft.목표종료일}
              onChange={(e) => setMetaDraft((d) => ({ ...d, 목표종료일: e.target.value }))}
              className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">{t("project.actualEndDate")}</label>
            <input
              type="date"
              value={metaDraft.실제종료일}
              onChange={(e) => setMetaDraft((d) => ({ ...d, 실제종료일: e.target.value }))}
              className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">{t("project.today")}</label>
            <p className="px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-300">{new Date().toISOString().split("T")[0]}</p>
          </div>
        </div>

        {/* External Links */}
        <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">External Links</h4>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google Drive
              </label>
              <div className="flex gap-2">
                <input value={metaDraft.gdrive_url} onChange={(e) => setMetaDraft((d) => ({ ...d, gdrive_url: e.target.value }))} placeholder="https://drive.google.com/drive/folders/..." className="flex-1 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                {metaDraft.gdrive_url && (
                  <a href={metaDraft.gdrive_url} target="_blank" rel="noopener noreferrer" className="px-2 py-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 rounded-md transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                  </a>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                GitHub Repository
              </label>
              <div className="flex gap-2">
                <input value={metaDraft.github_url} onChange={(e) => setMetaDraft((d) => ({ ...d, github_url: e.target.value }))} placeholder="https://github.com/ChadResearch/..." className="flex-1 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                {metaDraft.github_url && (
                  <a href={metaDraft.github_url} target="_blank" rel="noopener noreferrer" className="px-2 py-1.5 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                  </a>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
                GitHub Pages
              </label>
              <div className="flex gap-2">
                <input value={metaDraft.github_pages_url} onChange={(e) => setMetaDraft((d) => ({ ...d, github_pages_url: e.target.value }))} placeholder="https://chadresearch.github.io/..." className="flex-1 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                {metaDraft.github_pages_url && (
                  <a href={metaDraft.github_pages_url} target="_blank" rel="noopener noreferrer" className="px-2 py-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onSaveMetadata}
            disabled={savingMeta}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-40 transition-colors flex items-center gap-2"
          >
            {savingMeta ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t("action.save")}
          </button>
        </div>

        {/* Progress bar from real subtask data */}
        {subtasks.length > 0 && (
          <div className="mt-5">
            <ProgressBar
              metadata={{
                subtasks_total: String(subtasks.length),
                subtasks_done: String(subtasks.filter((s) => s.status === "done").length),
              }}
            />
          </div>
        )}

        {/* Subtask counts */}
        <div className="mt-4 mb-3">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {subtasks.length} {t("subtask.subtasks")}:{" "}
            <span className="text-green-600 dark:text-green-400">{subtasks.filter((s) => s.status === "done").length} {t("subtask.done")}</span>,{" "}
            <span className="text-red-500 dark:text-red-400">{subtasks.filter((s) => s.status === "cancelled").length} {t("subtask.cancelled")}</span>,{" "}
            <span className="text-neutral-600 dark:text-neutral-300">{subtasks.filter((s) => s.status === "pending").length} {t("subtask.pending")}</span>
          </p>
        </div>

        {/* Subtask list */}
        <div className="space-y-1">
          {subtasks.length === 0 && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 py-2">{t("subtask.noSubtasks")}</p>
          )}
          {subtasks.map((st) => (
            <div
              key={st.id}
              draggable
              onDragStart={() => onSubtaskDragStart(st.id)}
              onDragOver={(e) => onSubtaskDragOver(e, st.id)}
              onDragEnd={onSubtaskDragEnd}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-colors group ${
                dragSubtaskId === st.id
                  ? "opacity-50 border-indigo-300 dark:border-indigo-600"
                  : "border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              } ${st.status === "cancelled" ? "opacity-60" : ""}`}
            >
              <GripVertical className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 cursor-grab shrink-0" />
              {st.status === "done" ? (
                <button onClick={() => onToggleSubtask(st.id, "pending")} className="shrink-0 text-green-500 hover:text-green-600" title={t("subtask.done")}>
                  <CheckCircle className="w-4 h-4" />
                </button>
              ) : st.status === "cancelled" ? (
                <button onClick={() => onToggleSubtask(st.id, "pending")} className="shrink-0 text-red-400 hover:text-red-500" title={t("subtask.cancelled")}>
                  <XCircle className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={() => onToggleSubtask(st.id, "done")} className="shrink-0 text-neutral-300 dark:text-neutral-600 hover:text-green-500" title={t("subtask.pending")}>
                  <Circle className="w-4 h-4" />
                </button>
              )}
              {editingSubtaskId === st.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    value={editSubtaskTitle}
                    onChange={(e) => setEditSubtaskTitle(e.target.value)}
                    className="flex-1 px-2 py-0.5 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") onUpdateSubtask(st.id); if (e.key === "Escape") setEditingSubtaskId(null); }}
                  />
                  <input
                    value={editSubtaskDesc}
                    onChange={(e) => setEditSubtaskDesc(e.target.value)}
                    placeholder={t("subtask.description")}
                    className="flex-1 px-2 py-0.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    onKeyDown={(e) => { if (e.key === "Enter") onUpdateSubtask(st.id); if (e.key === "Escape") setEditingSubtaskId(null); }}
                  />
                  <button onClick={() => onUpdateSubtask(st.id)} className="text-green-500 hover:text-green-600"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setEditingSubtaskId(null)} className="text-neutral-400 hover:text-neutral-600"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${st.status === "cancelled" ? "line-through text-neutral-400 dark:text-neutral-500" : st.status === "done" ? "line-through text-neutral-500 dark:text-neutral-400" : "text-neutral-800 dark:text-neutral-200"}`}>
                    {st.title}
                  </span>
                  {st.description && (
                    <span className="ml-2 text-xs text-neutral-400 dark:text-neutral-500 truncate">{st.description}</span>
                  )}
                </div>
              )}
              {editingSubtaskId !== st.id && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {st.status === "pending" && (
                    <button onClick={() => onToggleSubtask(st.id, "cancelled")} className="p-0.5 text-neutral-400 hover:text-red-500" title={t("subtask.cancelled")}>
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => { setEditingSubtaskId(st.id); setEditSubtaskTitle(st.title); setEditSubtaskDesc(st.description); }}
                    className="p-0.5 text-neutral-400 hover:text-indigo-500"
                    title={t("action.edit")}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onDeleteSubtask(st.id)} className="p-0.5 text-neutral-400 hover:text-red-500" title={t("action.delete")}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add subtask form */}
        <div className="mt-3 flex items-center gap-2">
          <input
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            placeholder={t("subtask.title")}
            className="flex-1 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            onKeyDown={(e) => { if (e.key === "Enter" && newSubtaskTitle.trim()) onAddSubtask(); }}
          />
          <input
            value={newSubtaskDesc}
            onChange={(e) => setNewSubtaskDesc(e.target.value)}
            placeholder={`${t("subtask.description")} (${t("todo.description")})`}
            className="flex-1 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            onKeyDown={(e) => { if (e.key === "Enter" && newSubtaskTitle.trim()) onAddSubtask(); }}
          />
          <button
            onClick={onAddSubtask}
            disabled={!newSubtaskTitle.trim()}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-40 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("subtask.addSubtask")}
          </button>
        </div>
      </div>
    </div>
  );
}
