"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  Github,
  RefreshCw,
  Upload,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Save,
  Monitor,
  Laptop,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";

interface SyncStatus {
  enabled: boolean;
  machine_role: string;
  repo_owner: string;
  repo_name: string;
  branch: string;
  auto_pull_on_start: boolean;
  last_synced_at: string;
  last_sync_result: string;
  token_set: boolean;
}

interface SyncResult {
  ok: boolean;
  warning?: boolean;
  pushed?: number;
  pulled?: number;
  errors: number;
  synced_at?: string;
  message?: string;
}

export default function SettingsPage() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [enabled, setEnabled] = useState(false);
  const [machineRole, setMachineRole] = useState<"main" | "laptop">("main");
  const [repoOwner, setRepoOwner] = useState("");
  const [repoName, setRepoName] = useState("");
  const [branch, setBranch] = useState("main");
  const [token, setToken] = useState("");
  const [autoPull, setAutoPull] = useState(true);
  const [showToken, setShowToken] = useState(false);

  // Action states
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);
  const [pullSuccess, setPullSuccess] = useState(false);

  // Confirm dialogs
  const [pushConfirm, setPushConfirm] = useState(false);
  const [pullConfirm, setPullConfirm] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");

  useEffect(() => { loadStatus(); }, []);

  async function loadStatus() {
    setLoading(true);
    try {
      const data = await apiFetch<SyncStatus>("/api/sync/status");
      setStatus(data);
      setEnabled(data.enabled);
      setMachineRole((data.machine_role as "main" | "laptop") || "main");
      setRepoOwner(data.repo_owner);
      setRepoName(data.repo_name);
      setBranch(data.branch || "main");
      setAutoPull(data.auto_pull_on_start);
    } catch {
      toast.error("Failed to load sync status");
    } finally {
      setLoading(false);
    }
  }

  async function handleTest() {
    if (!repoOwner || !repoName) { toast.error("Enter repo owner and name first"); return; }
    if (!token && !status?.token_set) { toast.error("Enter a Personal Access Token"); return; }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiFetch<{ ok: boolean; message: string }>("/api/sync/test", {
        method: "POST",
        body: JSON.stringify({ token: token || "", repo_owner: repoOwner, repo_name: repoName }),
      });
      setTestResult(res);
      if (res.ok) toast.success("Connection successful!");
      else toast.error(res.message);
    } catch {
      toast.error("Connection test failed");
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch("/api/sync/config", {
        method: "POST",
        body: JSON.stringify({ enabled, machine_role: machineRole, repo_owner: repoOwner, repo_name: repoName, token, branch, auto_pull_on_start: autoPull }),
      });
      setToken("");
      toast.success("Settings saved");
      await loadStatus();
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function executePush(force = false) {
    setPushing(true);
    setPushConfirm(false);
    try {
      const res = await apiFetch<SyncResult>(`/api/sync/push${force ? "?force=true" : ""}`, { method: "POST" });
      if (res.warning) {
        setConfirmMessage(res.message || "");
        setPushConfirm(true);
        return;
      }
      if (res.ok) {
        toast.success(`Pushed ${res.pushed} files to GitHub`);
        setPushSuccess(true);
        setTimeout(() => setPushSuccess(false), 3000);
      } else {
        toast.error(res.message || `Push failed (${res.errors} errors)`);
      }
      await loadStatus();
    } catch (e: unknown) {
      // 409 = warning/confirm needed
      const err = e as { status?: number; body?: SyncResult };
      if (err?.status === 409 && err?.body?.warning) {
        setConfirmMessage(err.body.message || "");
        setPushConfirm(true);
      } else {
        toast.error("Push failed");
      }
    } finally {
      setPushing(false);
    }
  }

  async function executePull(force = false) {
    setPulling(true);
    setPullConfirm(false);
    try {
      const res = await apiFetch<SyncResult>(`/api/sync/pull${force ? "?force=true" : ""}`, { method: "POST" });
      if (res.warning) {
        setConfirmMessage(res.message || "");
        setPullConfirm(true);
        return;
      }
      if (res.ok) {
        toast.success(`Pulled ${res.pulled} files from GitHub`);
        setPullSuccess(true);
        setTimeout(() => setPullSuccess(false), 3000);
      } else {
        toast.error(res.message || `Pull failed (${res.errors} errors)`);
      }
      await loadStatus();
    } catch (e: unknown) {
      const err = e as { status?: number; body?: SyncResult };
      if (err?.status === 409 && err?.body?.warning) {
        setConfirmMessage(err.body.message || "");
        setPullConfirm(true);
      } else {
        toast.error("Pull failed");
      }
    } finally {
      setPulling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gray-400" size={28} />
      </div>
    );
  }

  const isConfigured = status?.token_set && status?.repo_owner && status?.repo_name;
  const syncEnabled = status?.enabled && isConfigured;
  const currentRole = status?.machine_role || "main";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-100">Settings</h1>

      {/* Confirm dialogs */}
      {pushConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-yellow-600 rounded-xl p-6 max-w-md w-full mx-4 space-y-4">
            <div className="flex items-center gap-2 text-yellow-400">
              <AlertTriangle size={18} />
              <span className="font-semibold">Push Confirmation</span>
            </div>
            <p className="text-sm text-gray-300">{confirmMessage}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setPushConfirm(false)} className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg">Cancel</button>
              <button onClick={() => executePush(true)} className="px-4 py-2 text-sm bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg">Push anyway</button>
            </div>
          </div>
        </div>
      )}

      {pullConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-yellow-600 rounded-xl p-6 max-w-md w-full mx-4 space-y-4">
            <div className="flex items-center gap-2 text-yellow-400">
              <AlertTriangle size={18} />
              <span className="font-semibold">Pull Confirmation</span>
            </div>
            <p className="text-sm text-gray-300">{confirmMessage}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setPullConfirm(false)} className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg">Cancel</button>
              <button onClick={() => executePull(true)} className="px-4 py-2 text-sm bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg">Pull anyway</button>
            </div>
          </div>
        </div>
      )}

      {/* GitHub Sync */}
      <section className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-700">
          <Github size={20} className="text-gray-300" />
          <h2 className="text-base font-semibold text-gray-100">GitHub Data Sync</h2>
          <span className="ml-auto">
            {syncEnabled ? (
              <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle size={13} /> Active</span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-gray-500"><XCircle size={13} /> Inactive</span>
            )}
          </span>
        </div>

        <div className="px-6 py-5 space-y-5">
          <p className="text-sm text-gray-400">
            Sync todos, issues, schedules, plans, and people across machines via a private GitHub repository.
          </p>

          {/* Enable toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => setEnabled(!enabled)} className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? "bg-blue-500" : "bg-gray-600"}`}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-5" : ""}`} />
            </div>
            <span className="text-sm text-gray-300">Enable sync</span>
          </label>

          {/* Machine Role */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400 font-medium">Machine Role</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMachineRole("main")}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm transition-colors ${
                  machineRole === "main"
                    ? "bg-blue-600/20 border-blue-500 text-blue-300"
                    : "bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500"
                }`}
              >
                <Monitor size={16} />
                <div className="text-left">
                  <div className="font-medium">Main</div>
                  <div className="text-xs opacity-70">Push freely · Pull with confirm</div>
                </div>
              </button>
              <button
                onClick={() => setMachineRole("laptop")}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm transition-colors ${
                  machineRole === "laptop"
                    ? "bg-purple-600/20 border-purple-500 text-purple-300"
                    : "bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500"
                }`}
              >
                <Laptop size={16} />
                <div className="text-left">
                  <div className="font-medium">Laptop</div>
                  <div className="text-xs opacity-70">Pull freely · Push with confirm</div>
                </div>
              </button>
            </div>
            <p className="text-xs text-gray-500">
              {machineRole === "main"
                ? "Main: Push updates GitHub. Pull overwrites local data — confirmation required."
                : "Laptop: Pull gets latest data. Push overwrites GitHub — confirmation required to prevent accidents."}
            </p>
          </div>

          {/* Repo owner */}
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-medium">GitHub Username</label>
            <input type="text" value={repoOwner} onChange={(e) => setRepoOwner(e.target.value)} placeholder="your-github-username"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500" />
          </div>

          {/* Repo name */}
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-medium">Repository Name</label>
            <input type="text" value={repoName} onChange={(e) => setRepoName(e.target.value)} placeholder="pm-master-data"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500" />
          </div>

          {/* Branch */}
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-medium">Branch</label>
            <input type="text" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500" />
          </div>

          {/* PAT Token */}
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-medium">
              Personal Access Token{status?.token_set && <span className="ml-2 text-green-400">(saved)</span>}
            </label>
            <div className="relative">
              <input type={showToken ? "text" : "password"} value={token} onChange={(e) => setToken(e.target.value)}
                placeholder={status?.token_set ? "Leave blank to keep existing token" : "ghp_xxxxxxxxxxxx"}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 pr-10 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500" />
              <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-200">
                {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-xs text-gray-500">GitHub → Settings → Developer settings → Personal access tokens → repo scope</p>
          </div>

          {/* Auto pull on start */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => setAutoPull(!autoPull)} className={`relative w-10 h-5 rounded-full transition-colors ${autoPull ? "bg-blue-500" : "bg-gray-600"}`}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoPull ? "translate-x-5" : ""}`} />
            </div>
            <span className="text-sm text-gray-300">Auto-pull on app start</span>
            {machineRole === "laptop" && autoPull && (
              <span className="text-xs text-purple-400">Recommended for Laptop</span>
            )}
          </label>

          {/* Test result */}
          {testResult && (
            <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${testResult.ok ? "bg-green-900/30 text-green-300" : "bg-red-900/30 text-red-300"}`}>
              {testResult.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
              {testResult.message}
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={handleTest} disabled={testing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg disabled:opacity-50">
              {testing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              Test Connection
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Save
            </button>
          </div>

          {/* Sync actions */}
          {isConfigured && (
            <>
              <div className="border-t border-gray-700 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Manual Sync</p>
                  <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                    currentRole === "main" ? "bg-blue-900/40 text-blue-300" : "bg-purple-900/40 text-purple-300"
                  }`}>
                    {currentRole === "main" ? <Monitor size={11} /> : <Laptop size={11} />}
                    {currentRole === "main" ? "Main" : "Laptop"}
                  </span>
                </div>

                <div className="flex gap-2">
                  {/* Push */}
                  <button onClick={() => executePush(false)} disabled={pushing || !syncEnabled}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-lg disabled:opacity-40 transition-colors ${
                      pushSuccess
                        ? "bg-green-700/50 text-green-300 border border-green-600/50"
                        : currentRole === "laptop"
                        ? "bg-yellow-800/40 hover:bg-yellow-700/40 text-yellow-300 border border-yellow-700/50"
                        : "bg-gray-700 hover:bg-gray-600 text-gray-200"
                    }`}>
                    {pushing ? <Loader2 size={14} className="animate-spin" /> : pushSuccess ? <CheckCircle size={14} /> : <Upload size={14} />}
                    {pushSuccess ? "Pushed!" : "Push to GitHub"}
                    {!pushSuccess && currentRole === "laptop" && <AlertTriangle size={12} className="opacity-60" />}
                  </button>

                  {/* Pull */}
                  <button onClick={() => executePull(false)} disabled={pulling || !syncEnabled}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-lg disabled:opacity-40 transition-colors ${
                      pullSuccess
                        ? "bg-green-700/50 text-green-300 border border-green-600/50"
                        : currentRole === "main"
                        ? "bg-yellow-800/40 hover:bg-yellow-700/40 text-yellow-300 border border-yellow-700/50"
                        : "bg-gray-700 hover:bg-gray-600 text-gray-200"
                    }`}>
                    {pulling ? <Loader2 size={14} className="animate-spin" /> : pullSuccess ? <CheckCircle size={14} /> : <Download size={14} />}
                    {pullSuccess ? "Pulled!" : "Pull from GitHub"}
                    {!pullSuccess && currentRole === "main" && <AlertTriangle size={12} className="opacity-60" />}
                  </button>
                </div>

                <p className="text-xs text-gray-500">
                  {currentRole === "main"
                    ? "Push: safe. Pull: overwrites local data with GitHub version."
                    : "Pull: safe. Push: overwrites GitHub with local data — confirmation required."}
                </p>
              </div>

              {status?.last_synced_at && (
                <div className="text-xs text-gray-500 space-y-0.5">
                  <p>Last synced: <span className="text-gray-400">{status.last_synced_at}</span></p>
                  {status.last_sync_result && <p>Result: <span className="text-gray-400">{status.last_sync_result}</span></p>}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* What gets synced */}
      <section className="bg-gray-800 rounded-xl border border-gray-700 px-6 py-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-300">What gets synced</h3>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
          {["Todos", "Issues", "Schedules", "Subtasks", "Activity logs", "People", "Plans", "Card order"].map((item) => (
            <div key={item} className="flex items-center gap-1.5">
              <CheckCircle size={11} className="text-green-500 flex-shrink-0" /> {item}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 pt-1">
          <XCircle size={11} className="text-red-500 flex-shrink-0" />
          Password and session tokens are never synced
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <XCircle size={11} className="text-red-500 flex-shrink-0" />
          Project files (~/Projects/) are not synced — use rsync separately
        </div>
      </section>
    </div>
  );
}
