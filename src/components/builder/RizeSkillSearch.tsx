"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, X } from "lucide-react";
import type { RizeSkillDraft } from "./SkillBuilder";

interface Props {
  rizeSkills: RizeSkillDraft[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  loading: boolean;
}

export function RizeSkillSearch({ rizeSkills, selectedSlug, onSelect, loading }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedSkill = rizeSkills.find((s) => s.rize_slug === selectedSlug);

  const { attachedSkills, allSkills } = useMemo(() => {
    const base = query
      ? rizeSkills.filter((s) => s.rize_skill.toLowerCase().includes(query.toLowerCase()))
      : rizeSkills;

    const attached = base.filter((s) => s.updated_by === "attached").sort((a, b) => a.rize_skill.localeCompare(b.rize_skill));
    const rest = base.filter((s) => s.updated_by !== "attached").sort((a, b) => a.rize_skill.localeCompare(b.rize_skill));
    return { attachedSkills: attached, allSkills: rest };
  }, [query, rizeSkills]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const statusColor = (status: string) => {
    if (status === "approved") return "bg-green-100 text-green-700";
    if (status === "review") return "bg-yellow-100 text-yellow-700";
    return "bg-slate-100 text-slate-500";
  };

  function renderSkillRow(skill: RizeSkillDraft, dimmed?: boolean) {
    return (
      <button
        key={skill.rize_slug}
        onClick={() => {
          onSelect(skill.rize_slug);
          setOpen(false);
          setQuery("");
        }}
        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 transition-colors ${
          skill.rize_slug === selectedSlug ? "bg-blue-50" : ""
        }`}
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${skill.draft_statement ? "bg-green-500" : "bg-slate-300"}`} />
        <span className={`truncate flex-1 ${dimmed ? "text-slate-400" : ""}`}>{skill.rize_skill}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${statusColor(skill.status)}`}>
          {skill.status}
        </span>
      </button>
    );
  }

  const noResults = attachedSkills.length === 0 && allSkills.length === 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm min-w-[240px] transition-colors"
      >
        {loading ? (
          <span className="text-slate-400">Loading skills...</span>
        ) : selectedSkill ? (
          <>
            <span className={`w-2 h-2 rounded-full shrink-0 ${selectedSkill.draft_statement ? "bg-green-500" : "bg-slate-300"}`} />
            <span className="text-slate-900 truncate">{selectedSkill.rize_skill}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${statusColor(selectedSkill.status)}`}>
              {selectedSkill.status}
            </span>
          </>
        ) : (
          <span className="text-slate-400">Select a Lightcast skill...</span>
        )}
        <ChevronDown size={14} className="ml-auto text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-[360px] bg-white rounded-lg border border-slate-200 shadow-xl z-50 max-h-[400px] flex flex-col">
          {/* Search input — always visible */}
          <div className="p-2 border-b border-slate-100 shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Lightcast skills..."
                className="w-full pl-8 pr-8 py-1.5 text-sm rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable skill list */}
          <div className="overflow-y-auto flex-1">
            {noResults ? (
              <div className="px-3 py-4 text-sm text-slate-400 text-center">No skills found</div>
            ) : (
              <>
                {/* In Courses section with sticky header */}
                {attachedSkills.length > 0 && (
                  <div>
                    <div className="sticky top-0 bg-white px-3 pt-2 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-50 z-10">
                      In Courses ({attachedSkills.length})
                    </div>
                    {attachedSkills.map((s) => renderSkillRow(s))}
                  </div>
                )}

                {/* All Skills section with sticky header */}
                {allSkills.length > 0 && (
                  <div>
                    <div className="sticky top-0 bg-white px-3 pt-2 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider border-t border-b border-slate-100 z-10">
                      All Skills ({allSkills.length})
                    </div>
                    {allSkills.map((s) => renderSkillRow(s, true))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
