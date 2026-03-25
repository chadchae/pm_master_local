"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { apiFetch } from "@/lib/api";

export interface MajorSchedule {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
}

interface MajorScheduleContextType {
  schedules: MajorSchedule[];
  addSchedule: (title: string, date: string) => Promise<void>;
  removeSchedule: (id: string) => Promise<void>;
  updateSchedule: (id: string, title: string, date: string) => Promise<void>;
  getUpcoming: (count: number) => MajorSchedule[];
}

const MajorScheduleContext = createContext<MajorScheduleContextType | null>(null);

export function MajorScheduleProvider({ children }: { children: ReactNode }) {
  const [schedules, setSchedules] = useState<MajorSchedule[]>([]);

  useEffect(() => {
    apiFetch<{ schedules: MajorSchedule[] }>("/api/major-schedules")
      .then((data) => {
        if (data.schedules.length === 0) {
          // One-time migration from localStorage
          try {
            const raw = localStorage.getItem("pm_major_schedules");
            if (raw) {
              const parsed: MajorSchedule[] = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                Promise.all(
                  parsed.map((s) =>
                    apiFetch<{ schedules: MajorSchedule[] }>("/api/major-schedules", {
                      method: "POST",
                      body: JSON.stringify({ title: s.title, date: s.date }),
                    })
                  )
                ).then((results) => {
                  setSchedules(results[results.length - 1]?.schedules ?? []);
                  localStorage.removeItem("pm_major_schedules");
                });
                return;
              }
            }
          } catch {
            // ignore migration errors
          }
        }
        setSchedules(data.schedules);
      })
      .catch(() => {});
  }, []);

  const addSchedule = useCallback(async (title: string, date: string) => {
    const data = await apiFetch<{ schedules: MajorSchedule[] }>("/api/major-schedules", {
      method: "POST",
      body: JSON.stringify({ title, date }),
    });
    setSchedules(data.schedules);
  }, []);

  const removeSchedule = useCallback(async (id: string) => {
    const data = await apiFetch<{ schedules: MajorSchedule[] }>(`/api/major-schedules/${id}`, {
      method: "DELETE",
    });
    setSchedules(data.schedules);
  }, []);

  const updateSchedule = useCallback(async (id: string, title: string, date: string) => {
    const data = await apiFetch<{ schedules: MajorSchedule[] }>(`/api/major-schedules/${id}`, {
      method: "PUT",
      body: JSON.stringify({ title, date }),
    });
    setSchedules(data.schedules);
  }, []);

  const getUpcoming = useCallback(
    (count: number): MajorSchedule[] => {
      const todayStr = new Date().toISOString().slice(0, 10);
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
