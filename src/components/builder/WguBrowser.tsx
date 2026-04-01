"use client";

import { useState, useMemo } from "react";
import Fuse from "fuse.js";
import { Search, X } from "lucide-react";
import type { ProcessedSkill } from "@/lib/types";
import type { RizeSkillDraft } from "./SkillBuilder";
import { DraggableSkillCard } from "./DraggableSkillCard";

interface Props {
  wguSkills: ProcessedSkill[];
  selectedRizeSkill: RizeSkillDraft | null;
}

export function WguBrowser({ wguSkills, selectedRizeSkill }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);

  const fuse = useMemo(
    () =>
      new Fuse(wguSkills, {
        keys: [
          { name: "skillStatement", weight: 3 },
          { name: "skillName", weight: 2 },
          { name: "categories", weight: 1.5 },
          { name: "keywords", weight: 1 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [wguSkills]
  );

  const results = useMemo(() => {
    const query = searchQuery.trim();
    if (query) {
      return fuse.search(query, { limit: 200 }).map((r) => r.item);
    }
    if (selectedRizeSkill) {
      const rizeResults = fuse.search(selectedRizeSkill.rize_skill, { limit: 200 }).map((r) => r.item);
      if (rizeResults.length > 0) return rizeResults;
    }
    return wguSkills.slice(0, 200);
  }, [searchQuery, fuse, wguSkills, selectedRizeSkill]);

  const visible = results.slice(0, visibleCount);
  const hasMore = visibleCount < results.length;

  return (
    <div>
      {/* Search bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search WGU skills by name, statement, or keyword..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(50); }}
            className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-1.5">
          {results.length} results
          {!searchQuery.trim() && selectedRizeSkill ? ` (auto-matched to "${selectedRizeSkill.rize_skill}")` : ""}
          {" "}&middot; Drag cards to pin or drop directly into the statement editor
        </p>
      </div>

      {/* Grid of draggable cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {visible.map((skill) => (
          <DraggableSkillCard key={skill.uuid} skill={skill} />
        ))}
      </div>

      {visible.length === 0 && (
        <p className="py-12 text-sm text-slate-400 text-center">No WGU skills found.</p>
      )}

      {hasMore && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setVisibleCount((prev) => prev + 50)}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Show more ({results.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
