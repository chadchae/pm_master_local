"use client";

import { useState, KeyboardEvent } from "react";
import { X, CalendarDays, Plus, Trash2, Pencil, Check } from "lucide-react";
import { useMajorSchedule, MajorSchedule } from "@/lib/majorSchedule";
import { getDaysColor } from "@/lib/focusTasks";

interface MajorSchedulePanelProps {
  open: boolean;
  onClose: () => void;
}

function daysUntilDate(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function isPast(dateStr: string): boolean {
  return daysUntilDate(dateStr) < 0;
}

function MiniCalendar({ schedules }: { schedules: MajorSchedule[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay(); // 0=Sunday
  const daysInMonth = lastDay.getDate();

  const scheduleDates = new Set(
    schedules
      .filter((s) => {
        const d = new Date(s.date + "T00:00:00");
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .map((s) => parseInt(s.date.split("-")[2], 10))
  );

  const today = now.getDate();
  const headers = ["일", "월", "화", "수", "목", "금", "토"];

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="mt-3">
      <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
        {year}년 {month + 1}월
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {headers.map((h) => (
          <div key={h} className="text-[9px] text-neutral-400 py-0.5">{h}</div>
        ))}
        {cells.map((day, i) => (
          <div
            key={i}
            className={`relative text-[10px] py-1 rounded ${
              day === today
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold"
                : day
                ? "text-neutral-600 dark:text-neutral-400"
                : ""
            }`}
          >
            {day || ""}
            {day && scheduleDates.has(day) && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-500" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MajorSchedulePanel({ open, onClose }: MajorSchedulePanelProps) {
  const { schedules, addSchedule, removeSchedule, updateSchedule } = useMajorSchedule();
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");

  const handleAdd = () => {
    if (!newTitle.trim() || !newDate) return;
    addSchedule(newTitle.trim(), newDate);
    setNewTitle("");
    setNewDate("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleAdd();
  };

  const sorted = [...schedules].sort((a, b) => a.date.localeCompare(b.date));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative ml-auto w-[380px] h-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 flex flex-col shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-cyan-500" />
            <span className="font-semibold text-sm">주요일정</span>
            {schedules.length > 0 && (
              <span className="text-xs text-neutral-400 ml-1">({schedules.length})</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Add form */}
        <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 space-y-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="일정 제목"
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
          />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            />
            <button
              onClick={handleAdd}
              disabled={!newTitle.trim() || !newDate}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              추가
            </button>
          </div>
        </div>

        {/* Schedule list */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {sorted.length === 0 ? (
            <div className="text-center text-sm text-neutral-400 py-8">
              일정이 없습니다
            </div>
          ) : (
            <div className="space-y-1">
              {sorted.map((s) => {
                const days = daysUntilDate(s.date);
                const past = isPast(s.date);
                const d = new Date(s.date + "T00:00:00");
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm group ${
                      past
                        ? "text-neutral-400 dark:text-neutral-600"
                        : "text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    {editingId === s.id ? (
                      <>
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="w-28 px-2 py-0.5 text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                        />
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              if (editTitle.trim() && editDate) {
                                updateSchedule(s.id, editTitle.trim(), editDate);
                                setEditingId(null);
                              }
                            } else if (e.key === "Escape") {
                              setEditingId(null);
                            }
                          }}
                          autoFocus
                          className="flex-1 px-2 py-0.5 text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                        />
                        <button
                          onClick={() => {
                            if (editTitle.trim() && editDate) {
                              updateSchedule(s.id, editTitle.trim(), editDate);
                              setEditingId(null);
                            }
                          }}
                          className="p-0.5 rounded text-cyan-500 hover:text-cyan-600 transition-colors flex-shrink-0"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-neutral-400 flex-shrink-0 w-14">
                          {d.getMonth() + 1}월{d.getDate()}일
                        </span>
                        <span className="flex-1 truncate">{s.title}</span>
                        {past ? (
                          <span className="text-[10px] text-neutral-400 flex-shrink-0">(지남)</span>
                        ) : (
                          <span className={`text-[10px] font-medium flex-shrink-0 ${getDaysColor(days)}`}>
                            {days}일
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setEditingId(s.id);
                            setEditTitle(s.title);
                            setEditDate(s.date);
                          }}
                          className="p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-indigo-500 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeSchedule(s.id)}
                          className="p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-red-500 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Mini calendar */}
          <MiniCalendar schedules={schedules} />
        </div>
      </div>
    </div>
  );
}
