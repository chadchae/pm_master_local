"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { STAGES, getStageBadgeClasses, getStageByFolder } from "@/lib/stages";
import { PageHeader } from "@/components/PageHeader";
import {
  GraduationCap, Github, HardDrive, Globe, Clock, Users,
  Plus, X, LayoutGrid, List, ChevronDown, ChevronRight,
} from "lucide-react";

interface ResearchProject {
  name: string;
  label: string;
  stage: string;
  stageName: string;
  status: string;
  importance: string;
  urgency: string;
  priority: string;
  collaboration: string;
  role: string;
  owner: string;
  deadline: string;
  people: string;
  related: string;
  subtasks_total: string;
  subtasks_done: string;
  github: string;
  pages: string;
  gdrive: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

function ProjectCard({ p }: { p: ResearchProject }) {
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-neutral-900 dark:text-white truncate">
            {p.label || p.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {p.priority && p.priority !== "low" && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${PRIORITY_COLORS[p.priority] || ""}`}>
                {p.priority}
              </span>
            )}
            {p.status && p.status !== "초기화" && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                {p.status.length > 12 ? p.status.slice(0, 12) + "…" : p.status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-neutral-400">
            {p.owner && <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{p.owner}</span>}
            {p.deadline && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{p.deadline}</span>}
          </div>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <a href={p.pages} target="_blank" rel="noopener noreferrer"
            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-300 hover:text-blue-500 transition-colors" title="Web">
            <Globe className="w-3.5 h-3.5" />
          </a>
          <a href={p.github} target="_blank" rel="noopener noreferrer"
            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors" title="GitHub">
            <Github className="w-3.5 h-3.5" />
          </a>
          <a href={p.gdrive} target="_blank" rel="noopener noreferrer"
            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-300 hover:text-green-500 transition-colors" title="Drive">
            <HardDrive className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

function ProjectRow({ p, onClick }: { p: ResearchProject; onClick: () => void }) {
  const stageConfig = getStageByFolder(p.stage);
  return (
    <tr className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer" onClick={onClick}>
      <td className="py-2.5 px-3">
        {stageConfig && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${stageConfig.bgColor} ${stageConfig.textColor}`}>
            {stageConfig.sublabel || stageConfig.label}
          </span>
        )}
      </td>
      <td className="py-2.5 px-3">
        <span className="font-medium text-sm text-neutral-900 dark:text-white">{p.label || p.name}</span>
      </td>
      <td className="py-2.5 px-3 text-xs text-neutral-500">{p.status}</td>
      <td className="py-2.5 px-3">
        {p.priority && p.priority !== "low" && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${PRIORITY_COLORS[p.priority] || ""}`}>{p.priority}</span>
        )}
      </td>
      <td className="py-2.5 px-3 text-xs text-neutral-500">{p.owner}</td>
      <td className="py-2.5 px-3 text-xs text-neutral-400">{p.deadline || "-"}</td>
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-1">
          <a href={p.pages} target="_blank" rel="noopener noreferrer" className="text-neutral-300 hover:text-blue-500"><Globe className="w-3.5 h-3.5" /></a>
          <a href={p.github} target="_blank" rel="noopener noreferrer" className="text-neutral-300 hover:text-neutral-700 dark:hover:text-white"><Github className="w-3.5 h-3.5" /></a>
          <a href={p.gdrive} target="_blank" rel="noopener noreferrer" className="text-neutral-300 hover:text-green-500"><HardDrive className="w-3.5 h-3.5" /></a>
        </div>
      </td>
    </tr>
  );
}

// Research-relevant stages
const RESEARCH_STAGES_ORDER = ["1_idea_stage", "2_initiation_stage", "3_in_development", "4_in_testing", "7_series", "5_completed", "6_archived"];
const RESEARCH_STAGES = RESEARCH_STAGES_ORDER.map((f) => STAGES.find((s) => s.folder === f)).filter(Boolean) as typeof STAGES;

export default function ResearchPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [filter, setFilter] = useState<string>("all");
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(new Set());
  const [cardOrder, setCardOrder] = useState<Record<string, string[]>>({});
  const [draggedProject, setDraggedProject] = useState<ResearchProject | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [dragOverCard, setDragOverCard] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProject, setNewProject] = useState({
    folder_name: "", label: "", description: "", stage: "1_idea_stage",
    owner: "채충일", collaboration: "personal", role: "lead",
    importance: "3", urgency: "low", priority: "low", deadline: "",
    related_people: "", related_projects: "",
  });

  const loadData = () => {
    Promise.all([
      apiFetch<{ projects: ResearchProject[]; total: number }>("/api/research-projects"),
      apiFetch<Record<string, string[]>>("/api/card-order").catch(() => ({})),
    ]).then(([data, order]) => {
      setProjects(data.projects || []);
      setTotal(data.total || 0);
      // Load research-specific card order (keys prefixed with "research_")
      const researchOrder: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(order)) {
        if (k.startsWith("research_")) {
          researchOrder[k.replace("research_", "")] = v;
        }
      }
      setCardOrder(researchOrder);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, project: ResearchProject) => {
    setDraggedProject(project);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, stageFolder: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stageFolder);
  };

  const handleCardDragOver = (e: React.DragEvent, cardName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCard(cardName);
  };

  const handleDrop = async (e: React.DragEvent, toStage: string) => {
    e.preventDefault();
    setDragOverStage(null);
    setDragOverCard(null);

    if (!draggedProject) return;

    if (draggedProject.stage !== toStage) {
      // Move to different stage
      try {
        await apiFetch("/api/projects/move", {
          method: "POST",
          body: JSON.stringify({
            project_name: draggedProject.name,
            from_stage: draggedProject.stage,
            to_stage: toStage,
          }),
        });
        loadData();
      } catch {
        // silently fail
      }
    }
    setDraggedProject(null);
  };

  const handleCardDrop = (e: React.DragEvent, targetName: string, stage: string) => {
    e.stopPropagation();
    setDragOverCard(null);

    if (!draggedProject) return;

    // Same stage reorder
    if (draggedProject.stage === stage && draggedProject.name !== targetName) {
      const stageProjects = [...(projectsByStage[stage] || [])];
      const fromIdx = stageProjects.findIndex((p) => p.name === draggedProject.name);
      const toIdx = stageProjects.findIndex((p) => p.name === targetName);
      if (fromIdx !== -1 && toIdx !== -1) {
        const [moved] = stageProjects.splice(fromIdx, 1);
        stageProjects.splice(toIdx, 0, moved);
        const newOrder = stageProjects.map((p) => p.name);
        // Save order
        setCardOrder((prev) => ({ ...prev, [stage]: newOrder }));
        apiFetch("/api/card-order", {
          method: "PUT",
          body: JSON.stringify({ stage: `research_${stage}`, order: newOrder }),
        }).catch(() => {});
        // Update local state for instant feedback
        const newProjects = projects.filter((p) => p.stage !== stage);
        setProjects([...newProjects, ...stageProjects]);
      }
      setDraggedProject(null);
      return;
    }

    // Different stage — trigger move
    handleDrop(e, stage);
  };

  const filtered = filter === "all" ? projects
    : filter === "collaboration" ? projects.filter((p) => p.collaboration === "collaboration")
    : filter === "personal" ? projects.filter((p) => p.collaboration === "personal")
    : filter === "lead" ? projects.filter((p) => p.role === "lead")
    : projects;

  const stats = {
    total,
    active: projects.filter((p) => !["보관"].includes(p.status) && p.status !== "초기화").length,
    urgent: projects.filter((p) => p.priority === "urgent" || p.priority === "high").length,
    withDeadline: projects.filter((p) => p.deadline).length,
  };

  const toggleStage = (folder: string) => {
    setCollapsedStages((prev) => {
      const next = new Set(prev);
      next.has(folder) ? next.delete(folder) : next.add(folder);
      return next;
    });
  };

  // Group by stage, apply saved card order
  const projectsByStage = RESEARCH_STAGES.reduce((acc, stage) => {
    const stageProjects = filtered.filter((p) => p.stage === stage.folder);
    const order = cardOrder[stage.folder];
    if (order && order.length > 0) {
      stageProjects.sort((a, b) => {
        const ai = order.indexOf(a.name);
        const bi = order.indexOf(b.name);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
    }
    acc[stage.folder] = stageProjects;
    return acc;
  }, {} as Record<string, ResearchProject[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageHeader icon={GraduationCap} title="연구 프로젝트" description={`총 ${total}개`} />
        <div className="flex items-center gap-2">
          <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5">
            <button onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "kanban" ? "bg-white dark:bg-neutral-700 shadow-sm" : "text-neutral-400"}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-white dark:bg-neutral-700 shadow-sm" : "text-neutral-400"}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" /> 새 연구
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { n: stats.total, l: "전체", c: "text-indigo-600" },
          { n: stats.active, l: "활성", c: "text-blue-600" },
          { n: stats.urgent, l: "긴급", c: "text-red-600" },
          { n: stats.withDeadline, l: "마감일", c: "text-amber-600" },
        ].map((s) => (
          <div key={s.l} className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-3 text-center">
            <div className={`text-xl font-bold ${s.c}`}>{s.n}</div>
            <div className="text-[11px] text-neutral-400">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          { key: "all", label: "전체", count: total },
          { key: "collaboration", label: "협업", count: projects.filter((p) => p.collaboration === "collaboration").length },
          { key: "personal", label: "개인", count: projects.filter((p) => p.collaboration === "personal").length },
          { key: "lead", label: "리드", count: projects.filter((p) => p.role === "lead").length },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
              filter === f.key ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 font-medium"
                : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            }`}>
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Kanban View — horizontal columns per stage */}
      {viewMode === "kanban" && (
        <div className="flex gap-3 min-h-[400px] overflow-x-auto pb-4">
          {RESEARCH_STAGES.map((stage) => {
            const stageProjects = projectsByStage[stage.folder] || [];
            const isCollapsed = collapsedStages.has(stage.folder);

            if (isCollapsed) {
              return (
                <div key={stage.folder}
                  className={`w-10 flex-shrink-0 rounded-xl border cursor-pointer transition-colors ${
                    dragOverStage === stage.folder
                      ? "border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                      : "border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                  onClick={() => toggleStage(stage.folder)}
                  onDragOver={(e) => handleDragOver(e, stage.folder)}
                  onDragLeave={() => setDragOverStage(null)}
                  onDrop={(e) => handleDrop(e, stage.folder)}>
                  <div className="flex flex-col items-center pt-3 gap-1">
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                    <span className={`text-[10px] font-medium writing-vertical ${stage.textColor}`} style={{ writingMode: "vertical-rl" }}>
                      {stage.label}
                    </span>
                    <span className="text-[10px] text-neutral-400 mt-1">{stageProjects.length}</span>
                  </div>
                </div>
              );
            }

            return (
              <div key={stage.folder}
                className={`w-[260px] flex-shrink-0 flex flex-col rounded-xl border transition-colors ${
                  dragOverStage === stage.folder && draggedProject?.stage !== stage.folder
                    ? "border-indigo-400 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20"
                    : "border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/30"
                }`}
                onDragOver={(e) => handleDragOver(e, stage.folder)}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={(e) => handleDrop(e, stage.folder)}>
                {/* Column Header */}
                <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl ${stage.bgColor} cursor-pointer`}
                  onClick={() => toggleStage(stage.folder)}>
                  <div className="flex items-center gap-1.5">
                    <ChevronDown className={`w-3.5 h-3.5 ${stage.textColor}`} />
                    <span className={`text-xs font-semibold ${stage.textColor}`}>{stage.label}</span>
                    {stage.sublabel && <span className={`text-[10px] opacity-60 ${stage.textColor}`}>/ {stage.sublabel}</span>}
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-white/50 dark:bg-black/20 ${stage.textColor}`}>
                    {stageProjects.length}
                  </span>
                </div>
                {/* Cards */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  {stageProjects.map((p) => (
                    <div key={p.name}
                      draggable
                      onDragStart={(e) => handleDragStart(e, p)}
                      onDragOver={(e) => handleCardDragOver(e, p.name)}
                      onDragLeave={() => setDragOverCard(null)}
                      onDrop={(e) => handleCardDrop(e, p.name, stage.folder)}
                      onClick={() => router.push(`/dashboard/projects/${encodeURIComponent(p.name)}`)}
                      className={`p-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                        draggedProject?.name === p.name
                          ? "opacity-40 border-neutral-300 dark:border-neutral-600"
                          : dragOverCard === p.name && draggedProject?.stage === stage.folder
                          ? "border-indigo-400 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20"
                          : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:shadow-sm hover:border-indigo-300 dark:hover:border-indigo-600"
                      }`}>
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                        {p.label || p.name}
                      </p>
                      {p.label && <p className="text-[10px] text-neutral-400 truncate">{p.name}</p>}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {p.priority && p.priority !== "low" && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${PRIORITY_COLORS[p.priority] || ""}`}>{p.priority}</span>
                        )}
                        {p.collaboration === "collaboration" && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">협업</span>
                        )}
                        {p.status && p.status !== "초기화" && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
                            {p.status.length > 15 ? p.status.slice(0, 15) + "…" : p.status}
                          </span>
                        )}
                      </div>
                      {/* Progress bar */}
                      {parseInt(p.subtasks_total) > 0 && (() => {
                        const total = parseInt(p.subtasks_total);
                        const done = parseInt(p.subtasks_done);
                        const pct = Math.round((done / total) * 100);
                        return (
                          <div className="mt-1.5">
                            <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-0.5">
                              <span>{done}/{total}</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : pct > 50 ? "bg-blue-500" : "bg-amber-500"}`}
                                style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })()}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                          {p.owner && <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{p.owner}</span>}
                          {p.deadline && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{p.deadline.slice(5)}</span>}
                        </div>
                        <div className="flex items-center gap-0.5">
                          <a href={p.pages} target="_blank" rel="noopener noreferrer" className="p-0.5 text-neutral-300 hover:text-blue-500"><Globe className="w-3 h-3" /></a>
                          <a href={p.github} target="_blank" rel="noopener noreferrer" className="p-0.5 text-neutral-300 hover:text-neutral-700 dark:hover:text-white"><Github className="w-3 h-3" /></a>
                          <a href={p.gdrive} target="_blank" rel="noopener noreferrer" className="p-0.5 text-neutral-300 hover:text-green-500"><HardDrive className="w-3 h-3" /></a>
                        </div>
                      </div>
                    </div>
                  ))}
                  {stageProjects.length === 0 && (
                    <div className="text-center py-8 text-neutral-300 dark:text-neutral-600 text-xs">빈 단계</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50">
                <th className="py-2 px-3 text-[11px] font-medium text-neutral-400 uppercase w-24">단계</th>
                <th className="py-2 px-3 text-[11px] font-medium text-neutral-400 uppercase">프로젝트</th>
                <th className="py-2 px-3 text-[11px] font-medium text-neutral-400 uppercase w-32">상태</th>
                <th className="py-2 px-3 text-[11px] font-medium text-neutral-400 uppercase w-20">긴급</th>
                <th className="py-2 px-3 text-[11px] font-medium text-neutral-400 uppercase w-24">오너</th>
                <th className="py-2 px-3 text-[11px] font-medium text-neutral-400 uppercase w-28">마감일</th>
                <th className="py-2 px-3 text-[11px] font-medium text-neutral-400 uppercase w-20">링크</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => <ProjectRow key={p.name} p={p} onClick={() => router.push(`/dashboard/projects/${encodeURIComponent(p.name)}`)} />)}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-neutral-400 text-sm">해당 필터에 맞는 연구 프로젝트가 없습니다.</div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-lg font-semibold">새 연구 프로젝트</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">폴더명 *</label>
                <input value={newProject.folder_name} onChange={(e) => setNewProject({...newProject, folder_name: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent text-sm" placeholder="rp_2026_07_project_name" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">프로젝트명</label>
                <input value={newProject.label} onChange={(e) => setNewProject({...newProject, label: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent text-sm" placeholder="연구 프로젝트 제목" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">설명</label>
                <textarea value={newProject.description} onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent text-sm" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">오너</label>
                  <input value={newProject.owner} onChange={(e) => setNewProject({...newProject, owner: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">협업</label>
                  <select value={newProject.collaboration} onChange={(e) => setNewProject({...newProject, collaboration: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent text-sm">
                    <option value="personal">Personal</option>
                    <option value="collaboration">Collaboration</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">긴급도</label>
                  <select value={newProject.priority} onChange={(e) => setNewProject({...newProject, priority: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent text-sm">
                    <option value="low">Low</option><option value="medium">Medium</option>
                    <option value="high">High</option><option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">마감일</label>
                  <input type="date" value={newProject.deadline} onChange={(e) => setNewProject({...newProject, deadline: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">관련 인원</label>
                <input value={newProject.related_people} onChange={(e) => setNewProject({...newProject, related_people: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent text-sm" placeholder="채충일, 홍길동" />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-neutral-200 dark:border-neutral-700">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700">취소</button>
              <button disabled={!newProject.folder_name || creating}
                onClick={async () => {
                  setCreating(true);
                  try {
                    const data = await apiFetch<{ success: boolean; detail?: string; message?: string; auto_setup?: Record<string, boolean>; links?: Record<string, string> }>("/api/projects/create-research", {
                      method: "POST", body: JSON.stringify(newProject),
                    });
                    if (data.success) {
                      const setup = data.auto_setup || {};
                      const msgs = [
                        `프로젝트 생성 완료!`,
                        setup.github_created ? `GitHub repo 생성` : `GitHub repo 실패`,
                        setup.git_pushed ? `코드 push 완료` : `코드 push 실패`,
                        setup.pages_enabled ? `GitHub Pages 활성화` : `Pages 활성화 실패`,
                        setup.gdrive_created ? `Google Drive 폴더 생성` : `Drive 폴더 실패`,
                      ];
                      alert(msgs.join("\n"));
                      setShowCreate(false);
                      window.location.reload();
                    } else { alert(data.detail || data.message || "생성 실패"); }
                  } catch { alert("서버 오류"); }
                  setCreating(false);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {creating ? "생성 중..." : "생성"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
