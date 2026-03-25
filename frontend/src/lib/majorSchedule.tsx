"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export interface MajorSchedule {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
}

interface MajorScheduleContextType {
  schedules: MajorSchedule[];
  addSchedule: (title: string, date: string) => void;
  removeSchedule: (id: string) => void;
  updateSchedule: (id: string, title: string, date: string) => void;
  getUpcoming: (count: number) => MajorSchedule[];
}

const STORAGE_KEY = "pm_major_schedules";

function loadFromStorage(): MajorSchedule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(schedules: MajorSchedule[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
}

const MajorScheduleContext = createContext<MajorScheduleContextType | null>(null);

export function MajorScheduleProvider({ children }: { children: ReactNode }) {
  const [schedules, setSchedules] = useState<MajorSchedule[]>([]);

  useEffect(() => {
    setSchedules(loadFromStorage());
  }, []);

  const persist = useCallback((next: MajorSchedule[]) => {
    setSchedules(next);
    saveToStorage(next);
  }, []);

  const addSchedule = useCallback(
    (title: string, date: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      persist([...schedules, { id, title, date }]);
    },
    [schedules, persist]
  );

  const removeSchedule = useCallback(
    (id: string) => {
      persist(schedules.filter((s) => s.id !== id));
    },
    [schedules, persist]
  );

  const updateSchedule = useCallback(
    (id: string, title: string, date: string) => {
      persist(schedules.map((s) => (s.id === id ? { ...s, title, date } : s)));
    },
    [schedules, persist]
  );

  const getUpcoming = useCallback(
    (count: number): MajorSchedule[] => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().slice(0, 10);
      return schedules
        .filter((s) => s.date >= todayStr)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, count);
    },
    [schedules]
  );

  return (
    <MajorScheduleContext.Provider value={{ schedules, addSchedule, removeSchedule, updateSchedule, getUpcoming }}>
      {children}
    </MajorScheduleContext.Provider>
  );
}

export function useMajorSchedule(): MajorScheduleContextType {
  const ctx = useContext(MajorScheduleContext);
  if (!ctx) throw new Error("useMajorSchedule must be used within MajorScheduleProvider");
  return ctx;
}
