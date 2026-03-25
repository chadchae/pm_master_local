"use client";

import { useFocusTasks, getWeekOfMonth, getWeekStartEnd, formatKorDate, daysUntilWeekEnd, daysUntilMonthEnd, weeksUntilMonthEnd, getDaysColor } from "@/lib/focusTasks";
import { useMajorSchedule } from "@/lib/majorSchedule";

interface NotificationCardProps {
  onClose: () => void;
}

function daysUntilDate(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  const diff = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function NotificationCard({ onClose }: NotificationCardProps) {
  const { focusTasks } = useFocusTasks();
  const { getUpcoming } = useMajorSchedule();

  const now = new Date();
  const weekNum = getWeekOfMonth(now);
  const { start: weekStart, end: weekEnd } = getWeekStartEnd(now);
  const weekDaysLeft = daysUntilWeekEnd();
  const monthDaysLeft = daysUntilMonthEnd();
  const monthWeeksLeft = weeksUntilMonthEnd();
  const currentMonth = now.getMonth() + 1;
  const upcoming = getUpcoming(3);

  return (
    <div
      className="w-[320px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl p-4 space-y-3"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Section 1: Weekly focus */}
      <div>
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="text-sm font-medium text-neutral-900 dark:text-white">
            이번주 집중할일
          </span>
          <span className="text-xs text-neutral-400">
            {weekNum}주차 ({formatKorDate(weekStart)} - {formatKorDate(weekEnd)})
          </span>
        </div>
        {(() => {
          const sorted = [...focusTasks.weekly].sort((a, b) => {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return a.dueDate.localeCompare(b.dueDate);
          });
          const items = sorted.slice(0, 3);
          return items.length > 0 ? (
            <div className="space-y-1">
              {items.map((item, i) => (
                <div key={item.id} className="flex items-center justify-between">
                  <span className={`truncate ${i === 0 ? "text-sm font-medium text-neutral-800 dark:text-neutral-200" : "text-xs text-neutral-500 dark:text-neutral-400"}`}>
                    {item.title}
                  </span>
                  <span className={`font-medium flex-shrink-0 ml-2 ${i === 0 ? "text-xs" : "text-[10px]"} ${getDaysColor(weekDaysLeft)}`}>
                    {weekDaysLeft}일 남음
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-xs text-neutral-400">(미설정)</span>
          );
        })()}
      </div>

      <div className="border-t border-neutral-100 dark:border-neutral-800" />

      {/* Section 2: Monthly focus */}
      <div>
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
            이번달 집중할일
          </span>
          <span className="text-[10px] text-neutral-400">
            {currentMonth}월
          </span>
        </div>
        {(() => {
          const sorted = [...focusTasks.monthly].sort((a, b) => {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return a.dueDate.localeCompare(b.dueDate);
          });
          const items = sorted.slice(0, 3);
          return items.length > 0 ? (
            <div className="space-y-1">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <span className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
                    {item.title}
                  </span>
                  <span className={`text-[10px] font-medium flex-shrink-0 ml-2 ${getDaysColor(monthDaysLeft)}`}>
                    {monthWeeksLeft}주 {monthDaysLeft % 7}일 남음
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-0.5">
              <span className="text-[10px] text-neutral-400 block">(미설정)</span>
              <span className="text-[10px] text-neutral-400 block">(미설정)</span>
            </div>
          );
        })()}
      </div>

      <div className="border-t border-neutral-100 dark:border-neutral-800" />

      {/* Section 3: Major schedules */}
      <div>
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
            주요일정
          </span>
        </div>
        {upcoming.length > 0 ? (
          <div className="space-y-1">
            {upcoming.map((s) => {
              const days = daysUntilDate(s.date);
              const d = new Date(s.date + "T00:00:00");
              return (
                <div key={s.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-[10px] text-neutral-400">
                      {d.getMonth() + 1}월{d.getDate()}일
                    </span>
                    <span className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
                      {s.title}
                    </span>
                  </div>
                  <span className={`text-[10px] font-medium flex-shrink-0 ${getDaysColor(days)}`}>
                    {days}일 남음
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <span className="text-[10px] text-neutral-400">주요일정 없음</span>
        )}
      </div>
    </div>
  );
}
