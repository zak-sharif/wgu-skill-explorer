"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";

export function ExportDrafts() {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);

    try {
      // Fetch all drafts
      const { data: drafts, error: draftsError } = await supabase
        .from("rize_skill_drafts")
        .select("*")
        .order("rize_skill", { ascending: true });

      if (draftsError) throw draftsError;

      // Fetch all pinned RSDs
      const { data: allPinned, error: pinnedError } = await supabase
        .from("pinned_rsds")
        .select("*")
        .order("sort_order", { ascending: true });

      if (pinnedError) throw pinnedError;

      // Group pinned RSDs by slug
      const pinnedBySlug = new Map<
        string,
        { names: string[]; statements: string[] }
      >();
      for (const p of allPinned || []) {
        if (!pinnedBySlug.has(p.rize_slug)) {
          pinnedBySlug.set(p.rize_slug, { names: [], statements: [] });
        }
        const entry = pinnedBySlug.get(p.rize_slug)!;
        entry.names.push(p.wgu_skill_name);
        entry.statements.push(p.wgu_skill_statement);
      }

      // Build CSV rows
      const rows = (drafts || []).map((d) => {
        const pinned = pinnedBySlug.get(d.rize_slug);
        return {
          "Lightcast Skill": d.rize_skill,
          "Lightcast Slug": d.rize_slug,
          "Draft Statement": d.draft_statement || "",
          Status: d.status,
          "Pinned WGU RSD Names": pinned ? pinned.names.join(" | ") : "",
          "Pinned WGU RSD Statements": pinned
            ? pinned.statements.join(" | ")
            : "",
          "Updated At": d.updated_at || "",
        };
      });

      const csv = Papa.unparse(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const date = new Date().toISOString().split("T")[0];
      const a = document.createElement("a");
      a.href = url;
      a.download = `rize-skill-statements-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export. Check console for details.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
    >
      {exporting ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Download size={14} />
      )}
      {exporting ? "Exporting..." : "Export CSV"}
    </button>
  );
}
