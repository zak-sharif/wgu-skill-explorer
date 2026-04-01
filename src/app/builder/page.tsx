"use client";

import { useState, useEffect } from "react";
import type { ProcessedSkill } from "@/lib/types";
import { SkillBuilder } from "@/components/builder/SkillBuilder";

export default function BuilderPage() {
  const [skills, setSkills] = useState<ProcessedSkill[] | null>(null);

  useEffect(() => {
    fetch("/skills.json")
      .then((r) => r.json())
      .then(setSkills);
  }, []);

  if (!skills) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return <SkillBuilder wguSkills={skills} />;
}
