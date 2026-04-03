"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  Plus,
  X,
  AlertTriangle,
  Calendar,
  Pencil,
  Trash2,
} from "lucide-react";
import { ListExportBar, generateMD, generateCSV, downloadFile, printList } from "@/components/ListExportBar";

export interface ScheduleTask {
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

export interface ScheduleCategory {
  name: string;
  color: string;
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  description: string;
  linked_tasks: string[];
  status: string;
}

interface ProjectScheduleTabProps {
  scheduleTasks: ScheduleTask[];
  milestones: Milestone[];
  categories: ScheduleCategory[];
  scheduleView: "table" | "gantt";
  setScheduleView: (v: "table" | "gantt") => void;
  showAddTask: boolean;
  setShowAddTask: (v: boolean) => void;
  showAddMilestone: boolean;
  setShowAddMilestone: (v: boolean) => void;
  newSchedTitle: string;
  setNewSchedTitle: (v: string) => void;
  newSchedStart: string;
  setNewSchedStart: (v: string) => void;
  newSchedEnd: string;
  setNewSchedEnd: (v: string) => void;
  newSchedAssignee: string;
  setNewSchedAssignee: (v: string) => void;
  newSchedStatus: string;
  setNewSchedStatus: (v: string) => void;
  newSchedParent: string;
  setNewSchedParent: (v: string) => void;
  newSchedDepends: string[];
  setNewSchedDepends: (v: string[]) => void;
  newSchedCategory: string;
  setNewSchedCategory: (v: string) => void;
  editingSchedId: string | null;
  setEditingSchedId: (id: string | null) => void;
  editSchedTitle: string;
  setEditSchedTitle: (v: string) => void;
  editSchedStart: string;
  setEditSchedStart: (v: string) => void;
  editSchedEnd: string;
  setEditSchedEnd: (v: string) => void;
  editSchedAssignee: string;
  setEditSchedAssignee: (v: string) => void;
  editSchedStatus: string;
  setEditSchedStatus: (v: string) => void;
  editSchedCategory: string;
  setEditSchedCategory: (v: string) => void;
  editSchedParent: string;
  setEditSchedParent: (v: string) => void;
  editSchedDepends: string[];
  setEditSchedDepends: (v: string[]) => void;
  editSchedProgress: number;
  setEditSchedProgress: (v: number) => void;
  showNewCategory: boolean;
  setShowNewCategory: (v: boolean) => void;
  newCatName: string;
  setNewCatName: (v: string) => void;
  editingMsId: string | null;
  setEditingMsId: (id: string | null) => void;
  editMsTitle: string;
  setEditMsTitle: (v: string) => void;
  editMsDate: string;
  setEditMsDate: (v: string) => void;
  editMsDesc: string;
  setEditMsDesc: (v: string) => void;
  editMsLinked: string[];
  setEditMsLinked: (v: string[]) => void;
  newMsTitle: string;
  setNewMsTitle: (v: string) => void;
  newMsDate: string;
  setNewMsDate: (v: string) => void;
  newMsDesc: string;
  setNewMsDesc: (v: string) => void;
  newMsLinked: string[];
  setNewMsLinked: (v: string[]) => void;
  ganttRange: number;
  setGanttRange: (v: number) => void;
  onCreateScheduleTask: () => void;
  onDeleteScheduleTask: (taskId: string) => void;
  onUpdateScheduleTask: (taskId: string, updates: Partial<ScheduleTask>) => void;
  onSaveEditScheduleTask: () => void;
  onStartEditScheduleTask: (task: ScheduleTask) => void;
  onCreateMilestone: () => void;
  onDeleteMilestone: (msId: string) => void;
  onStartEditMilestone: (ms: Milestone) => void;
  onSaveEditMilestone: () => void;
  onCreateCategory: () => void;
  onDeleteCategory: (catName: string) => void;
  onRenameCategoryPrompt: (cat: ScheduleCategory) => void;
  getNextCategoryColor: () => string;
  hasUnfinishedDeps: (task: ScheduleTask) => boolean;
  projectLabel: string;
  toastError: (msg: string) => void;
  t: (key: string) => string;
}

export function ProjectScheduleTab({
  scheduleTasks,
  milestones,
  categories,
  scheduleView,
  setScheduleView,
  showAddTask,
  setShowAddTask,
  showAddMilestone,
  setShowAddMilestone,
  newSchedTitle,
  setNewSchedTitle,
  newSchedStart,
  setNewSchedStart,
  newSchedEnd,
  setNewSchedEnd,
  newSchedAssignee,
  setNewSchedAssignee,
  newSchedStatus,
  setNewSchedStatus,
  newSchedParent,
  setNewSchedParent,
  newSchedDepends,
  setNewSchedDepends,
  newSchedCategory,
  setNewSchedCategory,
  editingSchedId,
  setEditingSchedId,
  editSchedTitle,
  setEditSchedTitle,
  editSchedStart,
  setEditSchedStart,
  editSchedEnd,
  setEditSchedEnd,
  editSchedAssignee,
  setEditSchedAssignee,
  editSchedStatus,
  setEditSchedStatus,
  editSchedCategory,
  setEditSchedCategory,
  editSchedParent,
  setEditSchedParent,
  editSchedDepends,
  setEditSchedDepends,
  editSchedProgress,
  setEditSchedProgress,
  showNewCategory,
  setShowNewCategory,
  newCatName,
  setNewCatName,
  editingMsId,
  setEditingMsId,
  editMsTitle,
  setEditMsTitle,
  editMsDate,
  setEditMsDate,
  editMsDesc,
  setEditMsDesc,
  editMsLinked,
  setEditMsLinked,
  newMsTitle,
  setNewMsTitle,
  newMsDate,
  setNewMsDate,
  newMsDesc,
  setNewMsDesc,
  newMsLinked,
  setNewMsLinked,
  ganttRange,
  setGanttRange,
  onCreateScheduleTask,
  onDeleteScheduleTask,
  onUpdateScheduleTask,
  onSaveEditScheduleTask,
  onStartEditScheduleTask,
  onCreateMilestone,
  onDeleteMilestone,
  onStartEditMilestone,
  onSaveEditMilestone,
  onCreateCategory,
  onDeleteCategory,
  onRenameCategoryPrompt,
  getNextCategoryColor,
  hasUnfinishedDeps,
  projectLabel,
  toastError,
  t,
}: ProjectScheduleTabProps) {
  const ganttContainerRef = useRef<HTMLDivElement>(null);
  const [ganttContainerWidth, setGanttContainerWidth] = useState(800);

  useEffect(() => {
    const el = ganttContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setGanttContainerWidth(entry.contentRect.width);
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [scheduleView]);

  const statusColors: Record<string, string> = {
    planned: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    done: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{t("schedule.title")}</h3>
          {scheduleTasks.filter((st) => st.status === "overdue").length > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              {scheduleTasks.filter((st) => st.status === "overdue").length} {t("schedule.overdue")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <button
              onClick={() => setScheduleView("table")}
              className={`px-3 py-1.5 text-xs font-medium ${scheduleView === "table" ? "bg-indigo-600 text-white" : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50"}`}
            >
              {t("schedule.table")}
            </button>
            <button
              onClick={() => setScheduleView("gantt")}
              className={`px-3 py-1.5 text-xs font-medium ${scheduleView === "gantt" ? "bg-indigo-600 text-white" : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50"}`}
            >
              {t("schedule.gantt")}
            </button>
          </div>
          <button
            onClick={() => setShowAddTask(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("schedule.addTask")}
          </button>
          <button
            onClick={() => setShowAddMilestone(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("schedule.addMilestone")}
          </button>
        </div>
      </div>

      {/* Category pills */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">{t("schedule.category")}:</span>
          {categories.map((cat) => (
            <span key={cat.name} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
              <span className="text-neutral-700 dark:text-neutral-300">{cat.name}</span>
              <button onClick={() => onRenameCategoryPrompt(cat)} className="text-neutral-400 hover:text-indigo-500 transition-colors" title={t("action.edit")}>
                <Pencil className="w-2.5 h-2.5" />
              </button>
              <button
                onClick={() => onDeleteCategory(cat.name)}
                className="text-neutral-400 hover:text-red-500 transition-colors"
                title={t("action.delete")}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add Task Form */}
      {showAddTask && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={newSchedTitle} onChange={(e) => setNewSchedTitle(e.target.value)} placeholder={t("schedule.taskTitle")} className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white" />
            <input value={newSchedAssignee} onChange={(e) => setNewSchedAssignee(e.target.value)} placeholder={t("schedule.assignee")} className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white" />
            <select
              value={newSchedParent}
              onChange={(e) => {
                setNewSchedParent(e.target.value);
                if (e.target.value) {
                  const parent = scheduleTasks.find((st) => st.id === e.target.value);
                  if (parent?.end_date) {
                    const parentEnd = new Date(parent.end_date);
                    parentEnd.setDate(parentEnd.getDate() + 1);
                    setNewSchedStart(parentEnd.toISOString().split("T")[0]);
                  }
                }
              }}
              className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
            >
              <option value="">{t("schedule.parentTask")} (--)</option>
              {scheduleTasks.filter((st) => !st.parent_id).map((st) => (
                <option key={st.id} value={st.id}>{st.title}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <select
                value={newSchedCategory}
                onChange={(e) => {
                  if (e.target.value === "__new__") { setShowNewCategory(true); }
                  else { setNewSchedCategory(e.target.value); }
                }}
                className="flex-1 px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              >
                <option value="">{t("schedule.category")} (--)</option>
                {categories.map((cat) => (<option key={cat.name} value={cat.name}>{cat.name}</option>))}
                <option value="__new__">+ {t("schedule.newCategory")}</option>
              </select>
            </div>
            <input type="date" value={newSchedStart} onChange={(e) => setNewSchedStart(e.target.value)} className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white" />
            <input type="date" value={newSchedEnd} onChange={(e) => setNewSchedEnd(e.target.value)} className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white" />
            <select value={newSchedStatus} onChange={(e) => setNewSchedStatus(e.target.value)} className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white">
              <option value="planned">{t("schedule.planned")}</option>
              <option value="in_progress">{t("schedule.inProgress")}</option>
              <option value="done">{t("schedule.done")}</option>
            </select>
          </div>
          {showNewCategory && (
            <div className="flex items-center gap-2">
              <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder={t("schedule.newCategory")} className="px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white" />
              <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: getNextCategoryColor() }} title="Auto color" />
              <button onClick={onCreateCategory} className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{t("action.create")}</button>
              <button onClick={() => setShowNewCategory(false)} className="px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-700">{t("action.cancel")}</button>
            </div>
          )}
          <div>
            <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">{t("schedule.dependencies")}</label>
            <div className="flex flex-wrap gap-1">
              {scheduleTasks.map((st) => (
                <button
                  key={st.id}
                  onClick={() => { if (!newSchedDepends.includes(st.id)) setNewSchedDepends([...newSchedDepends, st.id]); }}
                  className={`px-2 py-0.5 text-xs rounded-full border flex items-center gap-1 ${newSchedDepends.includes(st.id) ? "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300" : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"}`}
                >
                  {st.title}
                  {newSchedDepends.includes(st.id) && (
                    <span onClick={(e) => { e.stopPropagation(); setNewSchedDepends(newSchedDepends.filter((d) => d !== st.id)); }} className="hover:text-red-500 cursor-pointer">×</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onCreateScheduleTask} className="px-4 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{t("action.create")}</button>
            <button onClick={() => setShowAddTask(false)} className="px-4 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800">{t("action.cancel")}</button>
          </div>
        </div>
      )}

      {/* Add Milestone Form */}
      {showAddMilestone && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={newMsTitle} onChange={(e) => setNewMsTitle(e.target.value)} placeholder={t("schedule.milestone")} className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white" />
            <input type="date" value={newMsDate} onChange={(e) => setNewMsDate(e.target.value)} className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white" />
          </div>
          <input value={newMsDesc} onChange={(e) => setNewMsDesc(e.target.value)} placeholder={t("schedule.description")} className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white" />
          <div>
            <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">{t("schedule.dependencies")}</label>
            <div className="flex flex-wrap gap-1">
              {scheduleTasks.map((st) => (
                <button
                  key={st.id}
                  onClick={() => setNewMsLinked(newMsLinked.includes(st.id) ? newMsLinked.filter((d) => d !== st.id) : [...newMsLinked, st.id])}
                  className={`px-2 py-0.5 text-xs rounded-full border ${newMsLinked.includes(st.id) ? "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300" : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"}`}
                >
                  {st.title}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onCreateMilestone} className="px-4 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{t("action.create")}</button>
            <button onClick={() => setShowAddMilestone(false)} className="px-4 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800">{t("action.cancel")}</button>
          </div>
        </div>
      )}

      {/* Edit Task Form */}
      {editingSchedId && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-indigo-200 dark:border-indigo-800 p-4 space-y-3 mb-3">
          <h4 className="text-sm font-medium text-neutral-900 dark:text-white">Edit Task</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={editSchedTitle} onChange={(e) => setEditSchedTitle(e.target.value)} placeholder={t("schedule.taskTitle")} className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white" />
            <input value={editSchedAssignee} onChange={(e) => setEditSchedAssignee(e.target.value)} placeholder={t("schedule.assignee")} className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white" />
            <select value={editSchedParent} onChange={(e) => setEditSchedParent(e.target.value)} className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white">
              <option value="">{t("schedule.parentTask")} (--)</option>
              {scheduleTasks.filter((st) => !st.parent_id && st.id !== editingSchedId).map((st) => (
                <option key={st.id} value={st.id}>{st.title}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <select value={editSchedCategory} onChange={(e) => { if (e.target.value === "__new__") { setShowNewCategory(true); setEditSchedCategory(""); } else { setEditSchedCategory(e.target.value); } }} className="flex-1 px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white">
                <option value="">{t("schedule.category")} (--)</option>
                {categories.map((cat) => (<option key={cat.name} value={cat.name}>{cat.name}</option>))}
                <option value="__new__">+ {t("schedule.newCategory")}</option>
              </select>
            </div>
            <input type="date" value={editSchedStart} onChange={(e) => setEditSchedStart(e.target.value)} className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white" />
            <input type="date" value={editSchedEnd} onChange={(e) => setEditSchedEnd(e.target.value)} className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white" />
            <select value={editSchedStatus} onChange={(e) => setEditSchedStatus(e.target.value)} className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white">
              <option value="planned">{t("schedule.planned")}</option>
              <option value="in_progress">{t("schedule.inProgress")}</option>
              <option value="done">{t("schedule.done")}</option>
            </select>
            <div className="flex items-center gap-2 px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800">
              <span className="text-xs text-neutral-500">Progress</span>
              <div className="flex gap-0.5">
                {[25, 50, 75, 100].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setEditSchedProgress(editSchedProgress >= step ? step - 25 : step)}
                    className={`w-5 h-5 rounded-sm transition-colors ${editSchedProgress >= step ? "bg-green-500 hover:bg-green-600" : "bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600"}`}
                    title={`${step}%`}
                  />
                ))}
              </div>
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{editSchedProgress}%</span>
            </div>
          </div>
          {showNewCategory && (
            <div className="flex items-center gap-2">
              <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder={t("schedule.newCategory")} className="px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white" />
              <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: getNextCategoryColor() }} title="Auto color" />
              <button onClick={onCreateCategory} className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{t("action.create")}</button>
              <button onClick={() => setShowNewCategory(false)} className="px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-700">{t("action.cancel")}</button>
            </div>
          )}
          <div>
            <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">{t("schedule.dependencies")}</label>
            <div className="flex flex-wrap gap-1">
              {scheduleTasks.filter((st) => st.id !== editingSchedId).map((st) => (
                <button key={st.id} onClick={() => { if (!editSchedDepends.includes(st.id)) setEditSchedDepends([...editSchedDepends, st.id]); }} className={`px-2 py-0.5 text-xs rounded-full border flex items-center gap-1 ${editSchedDepends.includes(st.id) ? "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300" : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"}`}>
                  {st.title}
                  {editSchedDepends.includes(st.id) && (<span onClick={(e) => { e.stopPropagation(); setEditSchedDepends(editSchedDepends.filter((d) => d !== st.id)); }} className="hover:text-red-500 cursor-pointer">x</span>)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onSaveEditScheduleTask} className="px-4 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{t("action.save")}</button>
            <button onClick={() => setEditingSchedId(null)} className="px-4 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800">{t("action.cancel")}</button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {scheduleTasks.length === 0 && milestones.length === 0 ? (
        <div className="text-center py-16 text-neutral-400 dark:text-neutral-600">
          <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t("schedule.noTasks")}</p>
        </div>
      ) : scheduleView === "table" ? (
        <>
          <ListExportBar
            onPrint={() => {
              const rows = scheduleTasks.sort((a, b) => a.order - b.order).map((task) => ({
                Title: task.title,
                Start: task.start_date,
                End: task.end_date,
                Duration: `${task.duration_days}d`,
                Assignee: task.assignee || "-",
                Status: task.status,
                Category: task.category || "-",
                Progress: `${task.progress_pct}%`,
                Dependencies: task.depends_on?.length ? task.depends_on.map((d) => scheduleTasks.find((t2) => t2.id === d)?.title || d).join(", ") : "-",
              }));
              printList(`Schedule - ${projectLabel}`, rows);
            }}
            onExportMD={() => {
              const rows = scheduleTasks.sort((a, b) => a.order - b.order).map((task) => ({
                Title: task.title,
                Start: task.start_date,
                End: task.end_date,
                Duration: `${task.duration_days}d`,
                Assignee: task.assignee || "-",
                Status: task.status,
                Category: task.category || "-",
                Progress: `${task.progress_pct}%`,
                Dependencies: task.depends_on?.length ? task.depends_on.map((d) => scheduleTasks.find((t2) => t2.id === d)?.title || d).join(", ") : "-",
              }));
              downloadFile(generateMD(`Schedule - ${projectLabel}`, rows), "schedule.md", "text/markdown");
            }}
            onExportCSV={() => {
              const rows = scheduleTasks.sort((a, b) => a.order - b.order).map((task) => ({
                Title: task.title,
                Description: task.description || "",
                Start: task.start_date,
                End: task.end_date,
                Duration: String(task.duration_days),
                Assignee: task.assignee || "",
                Status: task.status,
                Category: task.category || "",
                Progress: String(task.progress_pct),
                Dependencies: task.depends_on?.length ? task.depends_on.map((d) => scheduleTasks.find((t2) => t2.id === d)?.title || d).join("; ") : "",
              }));
              downloadFile(generateCSV(rows), "schedule.csv", "text/csv");
            }}
          />
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            {/* Milestones row */}
            {milestones.length > 0 && (
              <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap gap-2">
                {milestones.map((ms) => (
                  <span key={ms.id} className="inline-flex items-center gap-1 text-xs">
                    <span className="text-amber-600 dark:text-amber-400">&#9670;</span>
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">{ms.title}</span>
                    <span className="text-neutral-500 dark:text-neutral-400">({ms.date})</span>
                    {ms.description && <span className="text-neutral-400 dark:text-neutral-500 ml-1">— {ms.description}</span>}
                    <button onClick={() => onStartEditMilestone(ms)} className="text-neutral-400 hover:text-indigo-500 ml-1" title={t("action.edit")}><Pencil className="w-3 h-3" /></button>
                    <button onClick={() => onDeleteMilestone(ms.id)} className="text-neutral-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
            {/* Edit Milestone Form */}
            {editingMsId && (
              <div className="px-4 py-3 bg-amber-50/50 dark:bg-amber-950/10 border-b border-amber-200 dark:border-amber-800 space-y-3">
                <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400">Edit Milestone</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input value={editMsTitle} onChange={(e) => setEditMsTitle(e.target.value)} placeholder={t("schedule.milestone")} className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white" />
                  <input type="date" value={editMsDate} onChange={(e) => setEditMsDate(e.target.value)} className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white" />
                  <input value={editMsDesc} onChange={(e) => setEditMsDesc(e.target.value)} placeholder={t("schedule.description")} className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white" />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">{t("schedule.dependencies")}</label>
                  <div className="flex flex-wrap gap-1">
                    {scheduleTasks.map((st) => (
                      <button key={st.id} onClick={() => setEditMsLinked(editMsLinked.includes(st.id) ? editMsLinked.filter((d) => d !== st.id) : [...editMsLinked, st.id])} className={`px-2 py-0.5 text-xs rounded-full border ${editMsLinked.includes(st.id) ? "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300" : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"}`}>{st.title}</button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={onSaveEditMilestone} className="px-4 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700">{t("action.save")}</button>
                  <button onClick={() => setEditingMsId(null)} className="px-4 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800">{t("action.cancel")}</button>
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                    <th className="text-left px-3 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 w-8">#</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">{t("schedule.taskTitle")}</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">{t("schedule.startDate")}</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">{t("schedule.endDate")}</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">{t("schedule.duration")}</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">{t("schedule.assignee")}</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">{t("schedule.status")}</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">{t("schedule.category")}</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">{t("schedule.progress")}</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">{t("schedule.dependencies")}</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleTasks.sort((a, b) => a.order - b.order).map((task, idx) => {
                    const isOverdue = task.status === "overdue";
                    const isChild = !!task.parent_id;
                    const taskCat = categories.find((c) => c.name === task.category);
                    const blockedInProgress = hasUnfinishedDeps(task);
                    return (
                      <tr key={task.id} className={`border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 ${isOverdue ? "border-l-2 border-l-red-500" : ""}`}>
                        <td className="px-3 py-2 text-neutral-400 text-xs">{idx + 1}</td>
                        <td className={`px-3 py-2 font-medium text-neutral-900 dark:text-white ${isChild ? "pl-8" : ""}`}>
                          {isChild && <span className="text-neutral-400 mr-1">&#8627;</span>}
                          {task.title}
                        </td>
                        <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400 text-xs font-mono">{task.start_date}</td>
                        <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400 text-xs font-mono">{task.end_date}</td>
                        <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400 text-xs">{task.duration_days}{t("schedule.days")}</td>
                        <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400 text-xs">{task.assignee || "-"}</td>
                        <td className="px-3 py-2">
                          <select
                            value={task.status}
                            onChange={(e) => {
                              if (e.target.value === "in_progress" && blockedInProgress) {
                                toastError(t("schedule.predecessorRequired"));
                                return;
                              }
                              onUpdateScheduleTask(task.id, { status: e.target.value });
                            }}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium border-0 cursor-pointer ${statusColors[task.status] || statusColors.planned}`}
                          >
                            <option value="planned">{t("schedule.planned")}</option>
                            <option value="in_progress" disabled={blockedInProgress}>{blockedInProgress ? "\uD83D\uDD12 " : ""}{t("schedule.inProgress")}</option>
                            <option value="done">{t("schedule.done")}</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {taskCat ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: taskCat.color }} />
                              <span className="text-neutral-600 dark:text-neutral-400">{taskCat.name}</span>
                            </span>
                          ) : <span className="text-neutral-400">-</span>}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <div className="flex gap-0.5">
                              {[25, 50, 75, 100].map((step) => (
                                <button
                                  key={step}
                                  onClick={(e) => { e.stopPropagation(); onUpdateScheduleTask(task.id, { progress_pct: task.progress_pct >= step ? step - 25 : step }); }}
                                  className={`w-4 h-4 rounded-sm transition-colors ${task.progress_pct >= step ? "bg-green-500 hover:bg-green-600" : "bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600"}`}
                                  title={`${step}%`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-neutral-500 w-8">{task.progress_pct}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400 max-w-[200px] truncate">
                          {task.depends_on.map((dep) => scheduleTasks.find((t2) => t2.id === dep)?.title || "").filter(Boolean).join(", ") || "-"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => onStartEditScheduleTask(task)} className="text-neutral-400 hover:text-indigo-500 p-1" title={t("action.edit")}><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => onDeleteScheduleTask(task.id)} className="text-neutral-400 hover:text-red-500 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Gantt Chart View */
        (() => {
          const allDates = [
            ...scheduleTasks.flatMap((t2) => [t2.start_date, t2.end_date].filter(Boolean)),
            ...milestones.map((m) => m.date).filter(Boolean),
          ];
          if (allDates.length === 0) return null;

          const sorted = allDates.sort();
          const minDateFull = new Date(sorted[0]);
          const maxDateFull = new Date(sorted[sorted.length - 1]);
          minDateFull.setDate(minDateFull.getDate() - 3);
          maxDateFull.setDate(maxDateFull.getDate() + 7);

          const dayMs = 86400000;
          const isAllRange = ganttRange === 0;
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          let minDate: Date;
          let maxDate: Date;
          if (isAllRange) {
            minDate = minDateFull;
            maxDate = maxDateFull;
          } else {
            minDate = new Date(today.getTime() - 2 * dayMs);
            maxDate = new Date(today.getTime() + (ganttRange - 2) * dayMs);
          }

          const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / dayMs) + 1;
          const effectiveContainerWidth = ganttContainerWidth - 192;
          const dayWidth = isAllRange ? 30 : Math.max(Math.floor(effectiveContainerWidth / ganttRange), 14);
          const rowHeight = 32;
          const headerHeight = 40;
          const todayOffset = Math.floor((today.getTime() - minDate.getTime()) / dayMs);

          const months: { label: string; startDay: number; span: number }[] = [];
          let curMonth = -1;
          let curYear = -1;
          for (let d = 0; d < totalDays; d++) {
            const dt = new Date(minDate.getTime() + d * dayMs);
            if (dt.getMonth() !== curMonth || dt.getFullYear() !== curYear) {
              curMonth = dt.getMonth();
              curYear = dt.getFullYear();
              months.push({ label: dt.toLocaleDateString(undefined, { month: "short", year: "numeric" }), startDay: d, span: 1 });
            } else {
              months[months.length - 1].span++;
            }
          }

          const days: { label: string; isWeekend: boolean; dayNum: number }[] = [];
          for (let d = 0; d < totalDays; d++) {
            const dt = new Date(minDate.getTime() + d * dayMs);
            days.push({ label: String(dt.getDate()), isWeekend: dt.getDay() === 0 || dt.getDay() === 6, dayNum: d });
          }

          const sortedTasks = [...scheduleTasks].sort((a, b) => a.order - b.order);
          const catGroupOrder = categories.map((c) => c.name);
          const catMap: Record<string, ScheduleTask[]> = {};
          for (const cat of categories) catMap[cat.name] = [];
          catMap[""] = [];
          for (const task of sortedTasks) {
            const key = task.category || "";
            if (!catMap[key]) catMap[key] = [];
            catMap[key].push(task);
          }

          type GanttRow = { type: "category"; name: string; color: string } | { type: "task"; task: ScheduleTask };
          const ganttRows: GanttRow[] = [];
          for (const catName of catGroupOrder) {
            const tasks = catMap[catName] || [];
            if (tasks.length > 0) {
              const cat = categories.find((c) => c.name === catName);
              ganttRows.push({ type: "category", name: catName, color: cat?.color || "#6b7280" });
              for (const task of tasks) ganttRows.push({ type: "task", task });
            }
          }
          if (catMap[""] && catMap[""].length > 0) {
            if (!catGroupOrder.includes("General")) {
              ganttRows.push({ type: "category", name: t("schedule.general"), color: "#6b7280" });
              for (const task of catMap[""]) ganttRows.push({ type: "task", task });
            } else {
              const generalIdx = ganttRows.findIndex((r) => r.type === "category" && r.name === "General");
              if (generalIdx >= 0) {
                let endIdx = generalIdx + 1;
                while (endIdx < ganttRows.length && ganttRows[endIdx].type === "task") endIdx++;
                const existingTasks = ganttRows.slice(generalIdx + 1, endIdx).map((r) => (r as { type: "task"; task: ScheduleTask }).task);
                const allGeneralTasks = [...existingTasks, ...catMap[""]].sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""));
                ganttRows.splice(generalIdx + 1, endIdx - generalIdx - 1, ...allGeneralTasks.map((task) => ({ type: "task" as const, task })));
              }
            }
          }

          const categoryRowHeight = 24;

          return (
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                {([
                  { label: t("schedule.1w"), days: 7 },
                  { label: t("schedule.2w"), days: 14 },
                  { label: t("schedule.3w"), days: 21 },
                  { label: t("schedule.1m"), days: 30 },
                  { label: t("schedule.all"), days: 0 },
                ] as const).map((opt) => (
                  <button
                    key={opt.days}
                    onClick={() => setGanttRange(opt.days)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md ${ganttRange === opt.days ? "bg-indigo-600 text-white" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div ref={ganttContainerRef} className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                {milestones.length > 0 && (
                  <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap gap-2">
                    {milestones.map((ms) => (
                      <span key={ms.id} className="inline-flex items-center gap-1 text-xs">
                        <span className="text-amber-600 dark:text-amber-400">&#9670;</span>
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">{ms.title}</span>
                        <span className="text-neutral-500 dark:text-neutral-400">({ms.date})</span>
                        {ms.description && <span className="text-neutral-400 dark:text-neutral-500 ml-1">— {ms.description}</span>}
                        <button onClick={() => onStartEditMilestone(ms)} className="text-neutral-400 hover:text-indigo-500 ml-1" title={t("action.edit")}><Pencil className="w-3 h-3" /></button>
                        <button onClick={() => onDeleteMilestone(ms.id)} className="text-neutral-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex">
                  <div className="flex-shrink-0 w-48 border-r border-neutral-200 dark:border-neutral-800">
                    <div className="h-[40px] border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 px-3 flex items-center">
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{t("schedule.taskTitle")}</span>
                    </div>
                    {milestones.length > 0 && (
                      <div className="h-[28px] px-3 flex items-center border-b border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20">
                        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">Milestones</span>
                      </div>
                    )}
                    {ganttRows.map((row, ri) => {
                      if (row.type === "category") {
                        return (
                          <div key={`cat-${ri}`} className="h-[24px] px-3 flex items-center border-b border-neutral-100 dark:border-neutral-800" style={{ backgroundColor: row.color + "18" }}>
                            <span className="w-2 h-2 rounded-full mr-1.5 flex-shrink-0" style={{ backgroundColor: row.color }} />
                            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: row.color }}>{row.name}</span>
                          </div>
                        );
                      }
                      const task = row.task;
                      return (
                        <div key={task.id} className={`h-[32px] px-3 flex items-center border-b border-neutral-100 dark:border-neutral-800 text-xs truncate ${task.parent_id ? "pl-6" : ""} ${task.status === "overdue" ? "text-red-600 dark:text-red-400" : "text-neutral-700 dark:text-neutral-300"}`}>
                          {task.parent_id && <span className="text-neutral-400 mr-1">&#8627;</span>}
                          {task.title}
                        </div>
                      );
                    })}
                  </div>
                  <div
                    className="overflow-x-auto flex-1"
                    ref={(el) => { if (el && todayOffset > 0) { el.scrollLeft = Math.max(0, todayOffset * dayWidth); } }}
                  >
                    <div style={{ width: totalDays * dayWidth, position: "relative" }}>
                      <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50" style={{ height: headerHeight / 2 }}>
                        {months.map((m, i) => (
                          <div key={i} className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-800 flex items-center px-1 overflow-hidden" style={{ width: m.span * dayWidth }}>
                            {m.label}
                          </div>
                        ))}
                      </div>
                      <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50" style={{ height: headerHeight / 2 }}>
                        {days.map((d, i) => (
                          <div key={i} className={`text-[9px] text-center border-r border-neutral-100 dark:border-neutral-800 flex items-center justify-center ${d.isWeekend ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-400" : "text-neutral-500 dark:text-neutral-400"}`} style={{ width: dayWidth }}>
                            {d.label}
                          </div>
                        ))}
                      </div>
                      {(() => {
                        const catRowCount = ganttRows.filter((r) => r.type === "category").length;
                        const taskRowCount = ganttRows.filter((r) => r.type === "task").length;
                        const milestoneAreaHeight = milestones.length > 0 ? 28 : 0;
                        const totalChartHeight = milestoneAreaHeight + catRowCount * categoryRowHeight + taskRowCount * rowHeight;

                        const rowYOffsets: number[] = [];
                        let yAccum = milestoneAreaHeight;
                        for (const row of ganttRows) {
                          rowYOffsets.push(yAccum);
                          yAccum += row.type === "category" ? categoryRowHeight : rowHeight;
                        }

                        const hexToHsl = (hex: string): [number, number, number] => {
                          const r = parseInt(hex.slice(1, 3), 16) / 255;
                          const g = parseInt(hex.slice(3, 5), 16) / 255;
                          const b = parseInt(hex.slice(5, 7), 16) / 255;
                          const max = Math.max(r, g, b), min = Math.min(r, g, b);
                          const l = (max + min) / 2;
                          if (max === min) return [0, 0, l * 100];
                          const d = max - min;
                          const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                          let h = 0;
                          if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                          else if (max === g) h = ((b - r) / d + 2) / 6;
                          else h = ((r - g) / d + 4) / 6;
                          return [h * 360, s * 100, l * 100];
                        };

                        return (
                          <div style={{ position: "relative", height: totalChartHeight }}>
                            {days.map((d, i) => d.isWeekend && (
                              <div key={`w-${i}`} className="absolute top-0 bottom-0 bg-neutral-50 dark:bg-neutral-800/30" style={{ left: i * dayWidth, width: dayWidth, height: totalChartHeight }} />
                            ))}
                            {milestones.map((ms) => {
                              const msOffset = Math.floor((new Date(ms.date).getTime() - minDate.getTime()) / dayMs);
                              if (msOffset < 0 || msOffset >= totalDays) return null;
                              return (
                                <div key={`ms-${ms.id}`} className="absolute z-10 flex items-center" style={{ left: msOffset * dayWidth + dayWidth / 2 - 6, top: 4 }} title={`${ms.title}${ms.description ? ": " + ms.description : ""}`}>
                                  <span className="text-amber-500 dark:text-amber-400 text-sm">&#9670;</span>
                                  <span className="text-[9px] text-amber-600 dark:text-amber-400 ml-0.5 whitespace-nowrap font-medium">{ms.title}</span>
                                </div>
                              );
                            })}
                            {milestones.length > 0 && (
                              <div className="absolute w-full border-b border-amber-200 dark:border-amber-800/50" style={{ top: milestoneAreaHeight, height: 0 }} />
                            )}
                            {ganttRows.map((row, ri) => {
                              if (row.type === "category") {
                                return (
                                  <div key={`cat-bar-${ri}`} className="absolute w-full border-b border-neutral-100 dark:border-neutral-800" style={{ top: rowYOffsets[ri], height: categoryRowHeight, backgroundColor: row.color + "10" }} />
                                );
                              }
                              const task = row.task;
                              const startOffset = task.start_date ? Math.floor((new Date(task.start_date).getTime() - minDate.getTime()) / dayMs) : 0;
                              const endOffset = task.end_date ? Math.floor((new Date(task.end_date).getTime() - minDate.getTime()) / dayMs) : startOffset;
                              const barWidth = Math.max((endOffset - startOffset + 1) * dayWidth - 4, 8);

                              const pct = task.progress_pct;
                              const dark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
                              const statusHue = task.status === "done" ? 220 : (task.status === "overdue" && pct >= 100) ? 220 : task.status === "overdue" ? 0 : 140;
                              const statusS = 70;
                              const statusL = dark ? 45 : 50;
                              const catObj = categories.find((c) => c.name === task.category);
                              const hasCatColor = catObj && catObj.color !== "#6b7280";
                              const [catH, catS, catL] = hasCatColor ? hexToHsl(catObj.color) : [statusHue, statusS, statusL];
                              const h = hasCatColor ? catH : statusHue;
                              const s = hasCatColor ? catS : statusS;
                              const l = hasCatColor ? catL : statusL;
                              const step = pct >= 100 ? 4 : pct >= 75 ? 3 : pct >= 50 ? 2 : pct >= 25 ? 1 : 0;
                              const isOverdue = task.status === "overdue";
                              const ratio = [0.0, 0.25, 0.5, 0.75, 1.0][isOverdue ? 4 - step : step];
                              const baseS = Math.round(s * (0.15 + 0.85 * ratio));
                              const baseL = dark ? Math.round(18 + 22 * ratio) : Math.round(88 - 30 * ratio);
                              const barBg = `hsl(${h}, ${baseS}%, ${baseL}%)`;
                              const fillL = dark ? Math.round(38 + 15 * ratio) : Math.round(l);
                              const fillBg = `hsl(${h}, ${Math.round(s)}%, ${fillL}%)`;

                              return (
                                <div key={task.id} className="absolute border-b border-neutral-100 dark:border-neutral-800" style={{ top: rowYOffsets[ri], height: rowHeight, width: "100%" }}>
                                  <div
                                    className="absolute top-1.5 h-5 rounded-sm opacity-90 hover:opacity-100 cursor-default overflow-hidden"
                                    style={{ left: startOffset * dayWidth + 2, width: barWidth, backgroundColor: barBg }}
                                    title={`${task.title} (${task.progress_pct}%) ${task.start_date} ~ ${task.end_date}`}
                                  >
                                    {pct > 0 && <div className="absolute inset-y-0 left-0 rounded-l-sm" style={{ width: `${pct}%`, backgroundColor: fillBg }} />}
                                    {barWidth > 40 && (
                                      <span className="absolute inset-0 flex items-center px-1.5 text-[9px] text-white font-medium truncate drop-shadow-sm z-10">
                                        {task.title}{barWidth > 60 ? ` ${pct}%` : ""}{barWidth > 100 ? ` (${task.duration_days}d)` : ""}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            <svg className="absolute top-0 left-0 pointer-events-none" style={{ width: totalDays * dayWidth, height: totalChartHeight }}>
                              {ganttRows.map((row, ri) => {
                                if (row.type !== "task") return null;
                                const task = row.task;
                                return task.depends_on.map((depId) => {
                                  const depRowIdx = ganttRows.findIndex((r) => r.type === "task" && r.task.id === depId);
                                  if (depRowIdx < 0) return null;
                                  const depTask = (ganttRows[depRowIdx] as { type: "task"; task: ScheduleTask }).task;
                                  const depEndOffset = depTask.end_date ? Math.floor((new Date(depTask.end_date).getTime() - minDate.getTime()) / dayMs) : 0;
                                  const taskStartOffset = task.start_date ? Math.floor((new Date(task.start_date).getTime() - minDate.getTime()) / dayMs) : 0;
                                  const x1 = (depEndOffset + 1) * dayWidth;
                                  const y1 = rowYOffsets[depRowIdx] + rowHeight / 2;
                                  const x2 = taskStartOffset * dayWidth + 2;
                                  const y2 = rowYOffsets[ri] + rowHeight / 2;
                                  return (
                                    <g key={`${task.id}-${depId}`}>
                                      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgb(156, 163, 175)" strokeWidth="1" strokeDasharray="3,2" />
                                      <polygon points={`${x2},${y2} ${x2 - 4},${y2 - 3} ${x2 - 4},${y2 + 3}`} fill="rgb(156, 163, 175)" />
                                    </g>
                                  );
                                });
                              })}
                            </svg>
                            {todayOffset >= 0 && todayOffset < totalDays && (
                              <div className="absolute top-0 pointer-events-none" style={{ left: todayOffset * dayWidth, height: totalChartHeight, width: 2, backgroundColor: "rgb(239 68 68)", zIndex: 50 }} />
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
