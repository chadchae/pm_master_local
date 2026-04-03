"use client";

import React from "react";
import { Loader2, Save } from "lucide-react";

interface ProjectInstructionsTabProps {
  newInstruction: string;
  setNewInstruction: (v: string) => void;
  newChecklist: string;
  setNewChecklist: (v: string) => void;
  savingInstruction: boolean;
  onCreateInstruction: () => void;
}

export function ProjectInstructionsTab({
  newInstruction,
  setNewInstruction,
  newChecklist,
  setNewChecklist,
  savingInstruction,
  onCreateInstruction,
}: ProjectInstructionsTabProps) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">
        New Work Instruction
      </h3>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">
            Instruction
          </label>
          <textarea
            value={newInstruction}
            onChange={(e) => setNewInstruction(e.target.value)}
            rows={4}
            placeholder="What needs to be done?&#10;e.g., Implement authentication, Fix SSE streaming bug..."
            className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">
            Checklist (one per line, leave empty for default)
          </label>
          <textarea
            value={newChecklist}
            onChange={(e) => setNewChecklist(e.target.value)}
            rows={3}
            placeholder="Setup environment&#10;Implement core feature&#10;Write tests&#10;Update documentation"
            className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-mono resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={onCreateInstruction}
            disabled={savingInstruction || !newInstruction.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            {savingInstruction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Create Instruction
          </button>
        </div>
      </div>
    </div>
  );
}
