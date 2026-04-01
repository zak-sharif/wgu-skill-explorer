"use client";

import { useState, useEffect } from "react";
import { SkillWorkspace } from "@/components/SkillWorkspace";
import type { ProcessedSkill, Facets } from "@/lib/types";

export default function Home() {
  const [skills, setSkills] = useState<ProcessedSkill[] | null>(null);
  const [facets, setFacets] = useState<Facets | null>(null);

  useEffect(() => {
    // Fetch data in parallel from static files (cached by browser/CDN)
    Promise.all([
      fetch("/skills.json").then((r) => r.json()),
      fetch("/facets.json").then((r) => r.json()),
    ]).then(([s, f]) => {
      setSkills(s);
      setFacets(f);
    });
  }, []);

  if (!skills || !facets) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading 8,940 skills...</p>
        </div>
      </div>
    );
  }

  return <SkillWorkspace skills={skills} facets={facets} />;
}
