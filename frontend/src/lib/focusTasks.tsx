"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { apiFetch } from "@/lib/api";

// --- Date utility functions ---

/** Week starts on Sunday */
export function getWeekOfMonth(date: Date): number {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  return Math.ceil((date.getDate() + firstDayOfMonth) / 7);
}

export function getWeekStartEnd(date: Date): { start: Date; end: Date } {
  const day = date.getDay(); // 0=Sunday
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/** Returns tailwind text color class based on remaining days */
export function getDaysColor(days: number): string {
  if (days > 30) return "text-blue-500";
  if (days > 14) return "text-sky-500";
  if (days > 7) return "text-amber-500";
  if (days > 3) return "text-orange-500";
  return "text-red-500";
}

/** Format date as "M월D일" */
export function formatKorDate(date: Date): string {
  return `${date.getMonth() + 1}월${date.getDate()}일`;
}

/** Days remaining until end of current week (Saturday) */
export function daysUntilWeekEnd(): number {
  const now = new Date();
  const { end } = getWeekStartEnd(now);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** Days remaining until end of current month */
export function daysUntilMonthEnd(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const diff = lastDay.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** Weeks remaining until end of current month (rounded up) */
export function weeksUntilMonthEnd(): number {
  return Math.ceil(daysUntilMonthEnd() / 7);
}

// --- Focus Tasks Context ---

/** A focused todo item (from TodoPanel or todos page) */
export interface FocusTodoItem {
  id: string;
  title: string;
  dueDate?: string; // YYYY-MM-DD, for sorting in notification card
}

interface FocusTasksState {
  weekly: FocusTodoItem[];
  monthly: FocusTodoItem[];
}

interface FocusTasksContextType {
  focusTasks: FocusTasksState;
  /** Returns added=true if added, added=false if removed or blocked. blocked=true when limit reached. */
  toggleWeeklyFocus: (id: string, title: string, dueDate?: string) => { added: boolean; blocked: boolean };
  toggleMonthlyFocus: (id: string, title: string, dueDate?: string) => { added: boolean; blocked: boolean };
  isWeeklyFocus: (id: string) => boolean;
  isMonthlyFocus: (id: string) => boolean;
}

const LEGACY_STORAGE_KEY = "pm_focus_tasks";

const FocusTasksContext = createContext<FocusTasksContextType | null>(null);

export function FocusTasksProvider({ children }: { children: ReactNode }) {
  const [focusTasks, setFocusTasks] = useState<FocusTasksState>({ weekly: [], monthly: [] });

  const persistToServer = useCallback(async (next: FocusTasksState) => {
    setFocusTasks(next);
    try {
      await apiFetch("/api/focus-tasks", {
        method: "PUT",
        body: JSON.stringify(next),
      });
    } catch {
      // silent - local state is already updated
    }
  }, []);

  useEffect(() => {
    apiFetch<FocusTasksState>("/api/focus-tasks")
      .then((data) => {
        const serverEmpty = (!data.weekly || data.weekly.length === 0) && (!data.monthly || data.monthly.length === 0);
        if (serverEmpty) {
          // One-time migration from localStorage
          try {
            const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
            if (raw) {
              const parsed = JSON.parse(raw);
              const weekly = Array.isArray(parsed.weekly)
                ? parsed.weekly
                : parsed.weekly ? [parsed.weekly] : [];
              const monthly = Array.isArray(parsed.monthly) ? parsed.monthly : [];
              if (weekly.length > 0 || monthly.length > 0) {
                const migrated = { weekly, monthly };
                apiFetch("/api/focus-tasks", {
                  method: "PUT",
                  body: JSON.stringify(migrated),
                }).then(() => {
                  setFocusTasks(migrated);
                  localStorage.removeItem(LEGACY_STORAGE_KEY);
                });
                return;
              }
            }
          } catch {
            // ignore migration errors
          }
        }
        setFocusTasks({ weekly: data.weekly || [], monthly: data.monthly || [] });
      })
      .catch(() => {});
  }, []);

  const toggleWeeklyFocus = useCallback(
    (id: string, title: string, dueDate?: string): { added: boolean; blocked: boolean } => {
      const current = focusTasks;
      const idx = current.weekly.findIndex((m) => m.id === id);
      if (idx >= 0) {
        const next = [...current.weekly];
        next.splice(idx, 1);
        persistToServer({ ...current, weekly: next });
        return { added: false, blocked: false };
      }
      if (current.weekly.length >= 3) {
        return { added: false, blocked: true };
      }
      persistToServer({ ...current, weekly: [...current.weekly, { id, title, dueDate }] });
      return { added: true, blocked: false };
    },
    [focusTasks, persistToServer]
  );

  const toggleMonthlyFocus = useCallback(
    (id: string, title: string, dueDate?: string): { added: boolean; blocked: boolean } => {
      const current = focusTasks;
      const idx = current.monthly.findIndex((m) => m.id === id);
      if (idx >= 0) {
        const next = [...current.monthly];
        next.splice(idx, 1);
        persistToServer({ ...current, monthly: next });
        return { added: false, blocked: false };
      }
      if (current.monthly.length >= 3) {
        return { added: false, blocked: true };
      }
      persistToServer({ ...current, monthly: [...current.monthly, { id, title, dueDate }] });
      return { added: true, blocked: false };
    },
    [focusTasks, persistToServer]
  );

  const isWeeklyFocus = useCallback(
    (id: string): boolean => focusTasks.weekly.some((m) => m.id === id),
    [focusTasks]
  );

  const isMonthlyFocus = useCallback(
    (id: string): boolean => focusTasks.monthly.some((m) => m.id === id),
    [focusTasks]
  );

  return (
    <FocusTasksContext.Provider value={{ focusTasks, toggleWeeklyFocus, toggleMonthlyFocus, isWeeklyFocus, isMonthlyFocus }}>
      {children}
    </FocusTasksContext.Provider>
  );
}

export function useFocusTasks(): FocusTasksContextType {
  const ctx = useContext(FocusTasksContext);
  if (!ctx) throw new Error("useFocusTasks must be used within FocusTasksProvider");
  return ctx;
}
