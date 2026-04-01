"use client";

import { useState, useMemo } from "react";
import type { RizeSkillDraft } from "./SkillBuilder";

interface Props {
  rizeSkills: RizeSkillDraft[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  loading: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  review: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
};

type StatusFilter = "all" | "draft" | "review" | "approved";

export function RizeSkillList({
  rizeSkills,
  selectedSlug,
  onSelect,
  loading,
}: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    let results = rizeSkills;

    if (statusFilter !== "all") {
      results = results.filter((s) => s.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter((s) =>
        s.rize_skill.toLowerCase().includes(q)
      );
    }

    return results;
  }, [rizeSkills, search, statusFilter]);

  const draftedCount = rizeSkills.filter(
    (s) => s.draft_statement && s.draft_statement.trim().length > 0
  ).length;

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 bg-slate-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-100 space-y-2">
        <input
          type="text"
          placeholder="Search Lightcast skills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-sm px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        <div className="flex gap-1">
          {(["all", "draft", "review", "approved"] as StatusFilter[]).map(
            (s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                  statusFilter === s
                    ? "bg-blue-100 text-blue-700 font-medium"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            )
          )}
        </div>

        <p className="text-xs text-slate-400">
          {draftedCount} of {rizeSkills.length} drafted
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.map((skill) => (
          <button
            key={skill.rize_slug}
            onClick={() => onSelect(skill.rize_slug)}
            className={`w-full text-left px-3 py-2 border-b border-slate-50 transition-colors ${
              selectedSlug === skill.rize_slug
                ? "bg-blue-50 border-l-2 border-l-blue-500"
                : "hover:bg-slate-50"
            }`}
          >
            <div className="flex items-start justify-between gap-1">
              <span className="text-sm text-slate-800 leading-tight">
                {skill.rize_skill}
              </span>
              <span
                className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  STATUS_COLORS[skill.status]
                }`}
              >
                {skill.status}
              </span>
            </div>
          </button>
        ))}

        {filtered.length === 0 && (
          <p className="p-4 text-sm text-slate-400 text-center">
            No skills match your search.
          </p>
        )}
      </div>
    </div>
  );
}
