"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, LogOut, RefreshCw, Focus, Play, X, Star, Clock, AlertTriangle, Square, Bell } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { apiFetch, clearToken } from "@/lib/api";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useLocale, LocaleToggle } from "@/lib/i18n";
import { useFocusMode } from "@/lib/focusMode";
import { useHighlightFilter } from "@/lib/highlightFilter";
import { NotificationCard } from "./NotificationCard";

function getPageTitle(
  pathname: string,
  t: (key: string) => string
): { title: string; breadcrumbs: { label: string; href?: string }[] } {
  const segments = pathname.split("/").filter(Boolean);

  const titleMap: Record<string, string> = {
    "/dashboard": t("breadcrumb.dashboard"),
    "/dashboard/ideas": t("breadcrumb.ideas"),
    "/dashboard/projects": t("breadcrumb.projects"),
    "/dashboard/documents": t("breadcrumb.documents"),
    "/dashboard/notes": t("breadcrumb.notes"),
    "/dashboard/learning": t("breadcrumb.learning"),
    "/dashboard/issues": t("breadcrumb.issues"),
    "/dashboard/issue-docs": t("breadcrumb.issue-docs"),
    "/dashboard/guidelines": t("breadcrumb.guidelines"),
    "/dashboard/timeline": t("breadcrumb.timeline"),
    "/dashboard/servers": t("breadcrumb.servers"),
    "/dashboard/people": t("breadcrumb.people"),
    "/dashboard/trash": t("breadcrumb.trash"),
  };

  if (segments.length >= 3 && segments[1] === "projects") {
    const projectName = decodeURIComponent(segments[2]);
    return {
      title: projectName,
      breadcrumbs: [
        { label: t("breadcrumb.dashboard"), href: "/dashboard" },
        { label: t("breadcrumb.projects"), href: "/dashboard/projects" },
        { label: projectName },
      ],
    };
  }

  const title = titleMap[pathname] || segments[segments.length - 1] || t("breadcrumb.dashboard");
  const breadcrumbs: { label: string; href?: string }[] = [
    { label: t("breadcrumb.dashboard"), href: pathname === "/dashboard" ? undefined : "/dashboard" },
  ];

  if (pathname !== "/dashboard") {
    breadcrumbs.push({ label: title });
  }

  return { title, breadcrumbs };
}

export function PageHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLocale();
  const { breadcrumbs } = getPageTitle(pathname, t);
  const [scanning, setScanning] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const isDashboard = pathname === "/dashboard";
  const { focusMode, focusActive, focusCards, toggleFocusMode, startFocus } = useFocusMode();
  const { filterImportance, filterUrgency, filterSeverity, filterDefault, toggleFilterImportance, toggleFilterUrgency, toggleFilterSeverity, toggleFilterDefault } = useHighlightFilter();

  // Click-outside handler for notification card
  useEffect(() => {
    if (!showNotification) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotification(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showNotification]);

  const handleRescan = async () => {
    setScanning(true);
    try {
      await apiFetch("/api/projects");
      await apiFetch("/api/people/sync-projects", { method: "POST" });
      toast.success("Scan complete");
      router.refresh();
    } catch {
      toast.error("Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    router.replace("/");
  };

  return (
    <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <nav className="flex items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-neutral-900 dark:text-white font-medium">
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
        <button
          onClick={handleRescan}
          disabled={scanning}
          className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-indigo-500 transition-colors ml-2"
          title="Rescan projects"
        >
          <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
        </button>
        {isDashboard && (
          <div className="flex items-center gap-1.5 ml-2">
            {/* Toggle focus selection mode */}
            <button
              onClick={toggleFocusMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                focusMode
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/25"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
              title={t("dashboard.focusMode")}
            >
              {focusMode ? <X className="w-3.5 h-3.5" /> : <Focus className="w-3.5 h-3.5" />}
              {t("dashboard.focusMode")}
              {focusMode && focusCards.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-white/30 text-[10px]">
                  {focusCards.length}
                </span>
              )}
            </button>
            {/* Start focus view (only when cards selected, not yet active) */}
            {focusMode && focusCards.length > 0 && !focusActive && (
              <button
                onClick={startFocus}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500 text-white shadow-md shadow-green-500/25 hover:bg-green-600 transition-all animate-pulse"
                title={t("dashboard.focusStart")}
              >
                <Play className="w-3.5 h-3.5" />
                {t("dashboard.focusStart")}
              </button>
            )}
            {/* Selection hint */}
            {focusMode && focusCards.length === 0 && !focusActive && (
              <span className="text-xs text-amber-500 ml-1">
                {t("dashboard.focusSelectCards")}
              </span>
            )}
            {/* Highlight filter buttons */}
            <button
              onClick={toggleFilterDefault}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterDefault
                  ? "bg-neutral-500 text-white shadow-md shadow-neutral-500/30"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
              title="기본 테두리"
            >
              <Square className="w-3.5 h-3.5" />
              기본
            </button>
            <button
              onClick={toggleFilterImportance}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterImportance
                  ? "bg-yellow-400 text-white shadow-md shadow-yellow-400/30"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
              title="중요도 5 강조"
            >
              <Star className="w-3.5 h-3.5" />
              중요도
            </button>
            <button
              onClick={toggleFilterUrgency}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterUrgency
                  ? "bg-red-500 text-white shadow-md shadow-red-500/30"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
              title="긴급도 최고 강조"
            >
              <Clock className="w-3.5 h-3.5" />
              긴급도
            </button>
            <button
              onClick={toggleFilterSeverity}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterSeverity
                  ? "bg-purple-500 text-white shadow-md shadow-purple-500/30"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
              title="엄정함 최고 강조"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              엄정함
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotification(!showNotification)}
            className={`p-1.5 rounded-md transition-colors ${
              showNotification
                ? "bg-indigo-500 text-white"
                : "text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-indigo-500"
            }`}
            title="알림"
          >
            <Bell className="w-4 h-4" />
          </button>
          {showNotification && (
            <div className="absolute top-full right-0 mt-1 z-50">
              <NotificationCard onClose={() => setShowNotification(false)} />
            </div>
          )}
        </div>
        <LocaleToggle />
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          title={t("auth.logout")}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
