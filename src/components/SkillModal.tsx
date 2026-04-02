"use client";

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { X, ExternalLink } from "lucide-react";
import type { ProcessedSkill } from "@/lib/types";

interface Props {
  skill: ProcessedSkill | null;
  onClose: () => void;
}

export function SkillModal({ skill, onClose }: Props) {
  if (!skill) return null;

  const publishDate = skill.publishDate
    ? new Date(skill.publishDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <Dialog open={!!skill} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl bg-white shadow-xl">
          <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-start justify-between">
            <DialogTitle className="text-xl font-bold text-slate-900 pr-4">
              {skill.skillName}
            </DialogTitle>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Skill Statement */}
            <div>
              <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-1">
                Skill Statement
              </h4>
              <p className="text-base text-slate-800 italic leading-relaxed">
                {skill.skillStatement}
              </p>
            </div>

            {/* Categories */}
            {skill.categories.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Categories
                </h4>
                <div className="flex flex-wrap gap-2">
                  {skill.categories.map((cat) => (
                    <span
                      key={cat}
                      className="inline-block text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-medium"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Keywords */}
            {skill.keywords.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Keywords
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {skill.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-block text-sm px-2.5 py-0.5 rounded bg-slate-100 text-slate-700"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Occupations */}
            {(skill.occupations?.length ?? 0) > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Occupations
                </h4>
                <ul className="space-y-1">
                  {skill.occupations!.map((occ, i) => (
                    <li
                      key={`${occ.code}-${i}`}
                      className="text-sm text-slate-700"
                    >
                      <span className="font-mono text-slate-500 mr-2">
                        {occ.code}
                      </span>
                      {occ.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Collections */}
            {(skill.collections?.length ?? 0) > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Collections
                </h4>
                <ul className="space-y-1">
                  {skill.collections.map((col) => (
                    <li key={col} className="text-sm text-slate-700">
                      {col}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Published Date */}
            {publishDate && (
              <div>
                <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Published
                </h4>
                <p className="text-sm text-slate-700">{publishDate}</p>
              </div>
            )}

            {/* OSMT Link */}
            <div className="pt-2 border-t border-slate-200">
              <a
                href={`https://osmt.wgu.edu/skills/${skill.uuid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                View on OSMT
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
