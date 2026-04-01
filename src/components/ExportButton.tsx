"use client";

import { Download } from "lucide-react";
import { exportToCsv } from "@/lib/export";
import type { ProcessedSkill } from "@/lib/types";

interface Props {
  skills: ProcessedSkill[];
}

export function ExportButton({ skills }: Props) {
  return (
    <button
      onClick={() => exportToCsv(skills)}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
    >
      <Download className="h-4 w-4" />
      Export CSV
    </button>
  );
}
