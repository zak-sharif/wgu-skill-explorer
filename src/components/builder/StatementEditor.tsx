"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import type { PinnedRsd } from "./SkillBuilder";

interface Props {
  rizeSkillName: string;
  pinnedRsds: PinnedRsd[];
  draftStatement: string;
  setDraftStatement: (s: string) => void;
  saveStatus: "saved" | "saving" | "unsaved";
  onSave: (statement: string) => void;
}

export function StatementEditor({
  rizeSkillName,
  pinnedRsds,
  draftStatement,
  setDraftStatement,
  saveStatus,
  onSave,
}: Props) {
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.max(100, textareaRef.current.scrollHeight) + "px";
    }
  }, [draftStatement]);

  // Debounced auto-save
  const handleChange = useCallback(
    (value: string) => {
      setDraftStatement(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSave(value);
      }, 1000);
    },
    [setDraftStatement, onSave]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  async function handleGenerate() {
    if (pinnedRsds.length === 0) {
      setGenerateError("Pin at least one WGU skill first.");
      return;
    }

    setGenerating(true);
    setGenerateError(null);

    try {
      const response = await fetch("/api/generate-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rizeSkill: rizeSkillName,
          pinnedRsds: pinnedRsds.map((r) => ({
            skillName: r.wgu_skill_name,
            skillStatement: r.wgu_skill_statement,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate statement");
      }

      const data = await response.json();
      setDraftStatement(data.statement);
      onSave(data.statement);
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "Failed to generate statement"
      );
    } finally {
      setGenerating(false);
    }
  }

  const handleBlur = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    onSave(draftStatement);
  }, [draftStatement, onSave]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
          Skill Statement
        </h3>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs ${
              saveStatus === "saved"
                ? "text-green-600"
                : saveStatus === "saving"
                  ? "text-blue-500"
                  : "text-slate-400"
            }`}
          >
            {saveStatus === "saved"
              ? "Saved"
              : saveStatus === "saving"
                ? "Saving..."
                : "Unsaved"}
          </span>
          <span className="text-xs text-slate-400">
            {draftStatement.length} chars
          </span>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={draftStatement}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder="Write a skill statement, or use AI to generate one from the pinned RSDs..."
        className="w-full text-sm border border-slate-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent leading-relaxed"
        rows={4}
      />

      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={handleGenerate}
          disabled={generating || pinnedRsds.length === 0}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
          {generating ? "Generating..." : "Generate with AI"}
        </button>

        {generateError && (
          <span className="text-xs text-red-500">{generateError}</span>
        )}
      </div>
    </div>
  );
}
