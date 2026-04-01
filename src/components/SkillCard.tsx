"use client";

import type { ProcessedSkill } from "@/lib/types";
import type { FuseResult } from "@/lib/search";
import { ReactNode } from "react";

interface Props {
  skill: ProcessedSkill;
  matches?: FuseResult["matches"];
  semanticScore?: number;
  onClick: () => void;
}

function highlightText(text: string, indices: readonly [number, number][]): ReactNode {
  if (!indices || indices.length === 0) return text;

  // Merge overlapping indices
  const sorted = [...indices].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [start, end] of sorted) {
    if (merged.length > 0 && start <= merged[merged.length - 1][1] + 1) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], end);
    } else {
      merged.push([start, end]);
    }
  }

  const parts: ReactNode[] = [];
  let lastIdx = 0;
  for (let i = 0; i < merged.length; i++) {
    const [start, end] = merged[i];
    if (start > lastIdx) {
      parts.push(text.slice(lastIdx, start));
    }
    parts.push(
      <mark key={i} className="bg-yellow-100 rounded px-0.5">
        {text.slice(start, end + 1)}
      </mark>
    );
    lastIdx = end + 1;
  }
  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }
  return parts;
}

export function SkillCard({ skill, matches, semanticScore, onClick }: Props) {
  // Find matches for specific fields
  const nameMatch = matches?.find((m: { key?: string }) => m.key === "skillName");
  const statementMatch = matches?.find((m: { key?: string }) => m.key === "skillStatement");

  const displayedKeywords = skill.keywords.slice(0, 5);
  const extraCount = skill.keywords.length - 5;

  return (
    <button
      onClick={onClick}
      className="text-left w-full bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex flex-wrap gap-1.5 mb-2 items-center">
        {skill.categories.map((cat) => (
          <span
            key={cat}
            className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800"
          >
            {cat}
          </span>
        ))}
        {semanticScore !== undefined && (
          <span className="ml-auto inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
            {Math.round(semanticScore * 100)}% match
          </span>
        )}
      </div>

      <h3 className="font-semibold text-lg text-slate-900 mb-1.5">
        {nameMatch
          ? highlightText(skill.skillName, nameMatch.indices as unknown as [number, number][])
          : skill.skillName}
      </h3>

      <p className="text-base text-slate-700 italic mb-3 leading-relaxed">
        {statementMatch
          ? highlightText(skill.skillStatement, statementMatch.indices as unknown as [number, number][])
          : skill.skillStatement}
      </p>

      {displayedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {displayedKeywords.map((kw) => (
            <span
              key={kw}
              className="inline-block text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600"
            >
              {kw}
            </span>
          ))}
          {extraCount > 0 && (
            <span className="inline-block text-xs px-2 py-0.5 text-slate-400">
              +{extraCount} more
            </span>
          )}
        </div>
      )}
    </button>
  );
}
