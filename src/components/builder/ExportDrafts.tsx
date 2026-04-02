"use client";

import { useState, useRef, useEffect } from "react";
import { Download, Loader2, ChevronDown, Check } from "lucide-react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";

const SCOPES = [
  { id: "pilot", label: "Summer Pilot", description: "46 pilot course skills" },
  { id: "courses", label: "All In Courses", description: "315 course-attached skills" },
  { id: "jobs", label: "In Jobs", description: "2,030 job-required skills" },
  { id: "drafted", label: "Drafted Only", description: "Skills with statements" },
  { id: "all", label: "All Skills", description: "All 2,440 Lightcast skills" },
] as const;

type ScopeId = typeof SCOPES[number]["id"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface DraftRow { rize_skill: string; rize_slug: string; draft_statement: string | null; status: string; updated_by: string | null; updated_at: string | null; [key: string]: any; }

export function ExportDrafts() {
  const [exporting, setExporting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedScopes, setSelectedScopes] = useState<Set<ScopeId>>(new Set(["pilot"]));
  const [pilotSlugs, setPilotSlugs] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Load pilot slugs
  useEffect(() => {
    fetch("/pilot-skills.json")
      .then((r) => r.json())
      .then((data: Record<string, unknown>) => setPilotSlugs(new Set(Object.keys(data))));
  }, []);

  // Close menu on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggleScope(id: ScopeId) {
    setSelectedScopes((prev) => {
      const next = new Set(prev);
      if (id === "all") {
        // "All" is exclusive — deselect everything else
        return new Set(["all"]);
      }
      next.delete("all");
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) next.add("all");
      return next;
    });
  }

  async function handleExport() {
    setExporting(true);
    setMenuOpen(false);

    try {
      // Fetch all drafts (paginated)
      const allDrafts: DraftRow[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("rize_skill_drafts")
          .select("*")
          .order("rize_skill", { ascending: true })
          .range(from, from + 999);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allDrafts.push(...(data as DraftRow[]));
        if (data.length < 1000) break;
        from += 1000;
      }

      // Filter by selected scopes (union of all selected)
      const filtered = allDrafts.filter((d) => {
        return Array.from(selectedScopes).some((scopeId) => {
          const scope = SCOPES.find((s) => s.id === scopeId);
          if (!scope) return false;
          if (scopeId === "pilot") return pilotSlugs.has(d.rize_slug);
          if (scopeId === "courses") return d.updated_by === "attached";
          if (scopeId === "jobs") return d.updated_by === "in_jobs";
          if (scopeId === "drafted") return !!d.draft_statement;
          return true; // "all"
        });
      });

      // Fetch pinned RSDs
      const { data: allPinned, error: pinnedError } = await supabase
        .from("pinned_rsds")
        .select("*")
        .order("sort_order", { ascending: true });
      if (pinnedError) throw pinnedError;

      const pinnedBySlug = new Map<string, { names: string[]; statements: string[] }>();
      for (const p of allPinned || []) {
        if (!pinnedBySlug.has(p.rize_slug)) {
          pinnedBySlug.set(p.rize_slug, { names: [], statements: [] });
        }
        const entry = pinnedBySlug.get(p.rize_slug)!;
        entry.names.push(p.wgu_skill_name);
        entry.statements.push(p.wgu_skill_statement);
      }

      const rows = filtered.map((d) => {
        const pinned = pinnedBySlug.get(d.rize_slug);
        const category = d.updated_by === "attached"
          ? (pilotSlugs.has(d.rize_slug) ? "Summer Pilot" : "In Courses")
          : d.updated_by === "in_jobs" ? "In Jobs" : "Other";
        return {
          "Lightcast Skill": d.rize_skill,
          "Category": category,
          "Draft Statement": d.draft_statement || "",
          "Status": d.status,
          "Pinned WGU RSD Names": pinned ? pinned.names.join(" | ") : "",
          "Pinned WGU RSD Statements": pinned ? pinned.statements.join(" | ") : "",
          "Updated At": d.updated_at || "",
          "Lightcast Slug": d.rize_slug,
        };
      });

      const csv = Papa.unparse(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().split("T")[0];
      const scopeLabel = selectedScopes.has("all") ? "all" : Array.from(selectedScopes).join("-");
      const a = document.createElement("a");
      a.href = url;
      a.download = `lightcast-skills-${scopeLabel}-${date}.csv`;
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

  const scopeLabel = selectedScopes.has("all")
    ? "All Skills"
    : Array.from(selectedScopes).map((id) => SCOPES.find((s) => s.id === id)?.label).join(", ");

  return (
    <div ref={containerRef} className="relative">
      <div className="flex">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-l-md border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {exporting ? "Exporting..." : "Export CSV"}
        </button>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center px-1.5 py-1.5 rounded-r-md border border-l-0 border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {menuOpen && (
        <div className="absolute top-full right-0 mt-1 w-[260px] bg-white rounded-lg border border-slate-200 shadow-xl z-50 py-1">
          <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Export Scope</div>
          {SCOPES.map((scope) => (
            <button
              key={scope.id}
              onClick={() => toggleScope(scope.id)}
              className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 transition-colors"
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedScopes.has(scope.id) ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
                {selectedScopes.has(scope.id) && <Check size={12} className="text-white" />}
              </div>
              <div>
                <div className="font-medium">{scope.label}</div>
                <div className="text-xs text-slate-400">{scope.description}</div>
              </div>
            </button>
          ))}
          <div className="border-t border-slate-100 mt-1 px-3 py-1.5">
            <p className="text-xs text-slate-400">Exporting: {scopeLabel}</p>
          </div>
        </div>
      )}
    </div>
  );
}
