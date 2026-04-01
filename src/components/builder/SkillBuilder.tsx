"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { ProcessedSkill } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { RizeSkillSearch } from "./RizeSkillSearch";
import { EditorPanel } from "./EditorPanel";
import { WguBrowser } from "./WguBrowser";
import { ExportDrafts } from "./ExportDrafts";
import Link from "next/link";

export interface RizeSkillDraft {
  id: string;
  rize_skill: string;
  rize_slug: string;
  draft_statement: string | null;
  status: "draft" | "review" | "approved";
  updated_by: string | null;
  updated_at: string | null;
  created_at: string;
}

export interface PinnedRsd {
  id: string;
  rize_slug: string;
  wgu_uuid: string;
  wgu_skill_name: string;
  wgu_skill_statement: string;
  sort_order: number;
  created_at: string;
}

interface Props {
  wguSkills: ProcessedSkill[];
}

export function SkillBuilder({ wguSkills }: Props) {
  const [selectedRizeSlug, setSelectedRizeSlug] = useState<string | null>(null);
  const [rizeSkills, setRizeSkills] = useState<RizeSkillDraft[]>([]);
  const [pinnedRsds, setPinnedRsds] = useState<PinnedRsd[]>([]);
  const [draftStatement, setDraftStatement] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [loadingRize, setLoadingRize] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    async function fetchRizeSkills() {
      setLoadingRize(true);
      const { data, error } = await supabase
        .from("rize_skill_drafts")
        .select("*")
        .order("rize_skill", { ascending: true })
        .range(0, 2999);
      if (error) console.error("Error fetching rize skills:", error);
      else setRizeSkills((data as RizeSkillDraft[]) || []);
      setLoadingRize(false);
    }
    fetchRizeSkills();
  }, []);

  useEffect(() => {
    if (!selectedRizeSlug) {
      setPinnedRsds([]);
      setDraftStatement("");
      return;
    }
    async function fetchPinnedRsds() {
      const { data, error } = await supabase
        .from("pinned_rsds")
        .select("*")
        .eq("rize_slug", selectedRizeSlug)
        .order("sort_order", { ascending: true });
      if (error) console.error("Error fetching pinned RSDs:", error);
      else setPinnedRsds((data as PinnedRsd[]) || []);
    }
    const selectedSkill = rizeSkills.find((s) => s.rize_slug === selectedRizeSlug);
    setDraftStatement(selectedSkill?.draft_statement || "");
    setSaveStatus("saved");
    fetchPinnedRsds();
  }, [selectedRizeSlug, rizeSkills]);

  const handleSelectSkill = useCallback((slug: string) => {
    setSelectedRizeSlug(slug);
  }, []);

  const handlePinRsd = useCallback(
    async (skill: ProcessedSkill) => {
      if (!selectedRizeSlug) return;
      if (pinnedRsds.some((p) => p.wgu_uuid === skill.uuid)) return;
      const newSortOrder = pinnedRsds.length > 0
        ? Math.max(...pinnedRsds.map((p) => p.sort_order)) + 1 : 0;
      const { data, error } = await supabase
        .from("pinned_rsds")
        .insert({
          rize_slug: selectedRizeSlug,
          wgu_uuid: skill.uuid,
          wgu_skill_name: skill.skillName,
          wgu_skill_statement: skill.skillStatement,
          sort_order: newSortOrder,
        })
        .select()
        .single();
      if (error) console.error("Error pinning RSD:", error);
      else if (data) setPinnedRsds((prev) => [...prev, data as PinnedRsd]);
    },
    [selectedRizeSlug, pinnedRsds]
  );

  const handleRemoveRsd = useCallback(async (pinnedId: string) => {
    const { error } = await supabase.from("pinned_rsds").delete().eq("id", pinnedId);
    if (error) console.error("Error removing pinned RSD:", error);
    else setPinnedRsds((prev) => prev.filter((p) => p.id !== pinnedId));
  }, []);

  const handleReorderRsds = useCallback(async (reordered: PinnedRsd[]) => {
    setPinnedRsds(reordered);
    const updates = reordered.map((rsd, index) =>
      supabase.from("pinned_rsds").update({ sort_order: index }).eq("id", rsd.id)
    );
    await Promise.all(updates);
  }, []);

  const handleSaveStatement = useCallback(
    async (statement: string) => {
      if (!selectedRizeSlug) return;
      setSaveStatus("saving");
      const { error } = await supabase
        .from("rize_skill_drafts")
        .update({ draft_statement: statement, updated_at: new Date().toISOString() })
        .eq("rize_slug", selectedRizeSlug);
      if (error) {
        console.error("Error saving statement:", error);
        setSaveStatus("unsaved");
      } else {
        setSaveStatus("saved");
        setRizeSkills((prev) =>
          prev.map((s) =>
            s.rize_slug === selectedRizeSlug
              ? { ...s, draft_statement: statement, updated_at: new Date().toISOString() }
              : s
          )
        );
      }
    },
    [selectedRizeSlug]
  );

  const handleUpdateStatus = useCallback(
    async (newStatus: "draft" | "review" | "approved") => {
      if (!selectedRizeSlug) return;
      const { error } = await supabase
        .from("rize_skill_drafts")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("rize_slug", selectedRizeSlug);
      if (error) console.error("Error updating status:", error);
      else {
        setRizeSkills((prev) =>
          prev.map((s) =>
            s.rize_slug === selectedRizeSlug
              ? { ...s, status: newStatus, updated_at: new Date().toISOString() }
              : s
          )
        );
      }
    },
    [selectedRizeSlug]
  );

  // Allow dropping a WGU statement directly into the editor
  const handleDropStatement = useCallback(
    (statement: string) => {
      setDraftStatement(statement);
      handleSaveStatement(statement);
    },
    [handleSaveStatement]
  );

  const selectedRizeSkill = useMemo(
    () => rizeSkills.find((s) => s.rize_slug === selectedRizeSlug) || null,
    [rizeSkills, selectedRizeSlug]
  );

  const activeDragSkill = useMemo(() => {
    if (!activeDragId) return null;
    return wguSkills.find((s) => s.uuid === activeDragId) || null;
  }, [activeDragId, wguSkills]);

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    if (over.id === "workspace-drop-zone") {
      const skill = wguSkills.find((s) => s.uuid === active.id);
      if (skill) handlePinRsd(skill);
    } else if (over.id === "statement-drop-zone") {
      // Drop the WGU statement directly into the editor
      const skill = wguSkills.find((s) => s.uuid === active.id);
      if (skill) handleDropStatement(skill.skillStatement);
    }
  }

  const draftedCount = rizeSkills.filter((s) => s.draft_statement).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
              &larr; Explorer
            </Link>
            <h1 className="text-xl font-bold text-slate-900">Skill Builder</h1>
            <span className="text-xs text-slate-400">{draftedCount} of {rizeSkills.length} drafted</span>
          </div>
          <div className="flex items-center gap-3">
            <RizeSkillSearch
              rizeSkills={rizeSkills}
              selectedSlug={selectedRizeSlug}
              onSelect={handleSelectSkill}
              loading={loadingRize}
            />
            <ExportDrafts />
          </div>
        </div>
      </header>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Main content: WGU browser (2/3) + Editor panel (1/3) */}
        <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full">
          {/* WGU Skills Browser — takes up most of the page */}
          <div className="flex-1 overflow-y-auto px-4 py-4" style={{ minHeight: 0 }}>
            <WguBrowser
              wguSkills={wguSkills}
              selectedRizeSkill={selectedRizeSkill}
            />
          </div>

          {/* Editor Panel — max 1/3 of viewport, collapsible */}
          {selectedRizeSkill && (
            <div className="shrink-0 border-t border-slate-300 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)]" style={{ maxHeight: "33vh" }}>
              <div className="overflow-y-auto h-full px-4 py-3">
                <EditorPanel
                  selectedSkill={selectedRizeSkill}
                  pinnedRsds={pinnedRsds}
                  draftStatement={draftStatement}
                  setDraftStatement={setDraftStatement}
                  saveStatus={saveStatus}
                  onSaveStatement={handleSaveStatement}
                  onRemoveRsd={handleRemoveRsd}
                  onReorderRsds={handleReorderRsds}
                  onUpdateStatus={handleUpdateStatus}
                />
              </div>
            </div>
          )}
        </div>

        <DragOverlay>
          {activeDragSkill ? (
            <div className="bg-white rounded-lg border-2 border-blue-400 shadow-xl p-3 w-[300px] opacity-90">
              <div className="flex flex-wrap gap-1 mb-1">
                {activeDragSkill.categories.slice(0, 2).map((cat) => (
                  <span key={cat} className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {cat}
                  </span>
                ))}
              </div>
              <p className="text-sm font-semibold text-slate-900 mb-1">{activeDragSkill.skillName}</p>
              <p className="text-xs text-slate-500 line-clamp-2">{activeDragSkill.skillStatement}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
