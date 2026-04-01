"use client";

import type { ProcessedSkill } from "@/lib/types";
import type { FuseResult } from "@/lib/search";
import { SkillCard } from "./SkillCard";

interface Props {
  skills: ProcessedSkill[];
  visibleCount: number;
  onShowMore: () => void;
  onSelectSkill: (skill: ProcessedSkill) => void;
  matchMap: Map<string, FuseResult["matches"]> | null;
  scoreMap?: Map<string, number> | null;
}

export function SkillGrid({
  skills,
  visibleCount,
  onShowMore,
  onSelectSkill,
  matchMap,
  scoreMap,
}: Props) {
  const visible = skills.slice(0, visibleCount);
  const hasMore = visibleCount < skills.length;

  if (skills.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <p className="text-lg">No skills found matching your criteria.</p>
        <p className="text-sm mt-1">
          Try adjusting your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visible.map((skill) => (
          <SkillCard
            key={skill.uuid}
            skill={skill}
            matches={matchMap?.get(skill.uuid) ?? undefined}
            semanticScore={scoreMap?.get(skill.uuid)}
            onClick={() => onSelectSkill(skill)}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-8 mb-8">
          <button
            onClick={onShowMore}
            className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Show more ({skills.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
