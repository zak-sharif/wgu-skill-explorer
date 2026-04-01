"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Sparkles, Loader2, GripVertical, X } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { RizeSkillDraft, PinnedRsd } from "./SkillBuilder";

interface Props {
  selectedSkill: RizeSkillDraft;
  pinnedRsds: PinnedRsd[];
  draftStatement: string;
  setDraftStatement: (s: string) => void;
  saveStatus: "saved" | "saving" | "unsaved";
  onSaveStatement: (statement: string) => void;
  onRemoveRsd: (id: string) => void;
  onReorderRsds: (reordered: PinnedRsd[]) => void;
  onUpdateStatus: (status: "draft" | "review" | "approved") => void;
}

function SortablePinnedRsd({ rsd, onRemove }: { rsd: PinnedRsd; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: rsd.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="bg-slate-50 rounded-lg p-3 group">
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="cursor-grab text-slate-300 hover:text-slate-500 mt-0.5 shrink-0">
          <GripVertical size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className="text-xs font-semibold text-slate-700">{rsd.wgu_skill_name}</p>
            <button onClick={onRemove} className="text-slate-300 hover:text-red-500 shrink-0">
              <X size={12} />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 italic leading-relaxed">{rsd.wgu_skill_statement}</p>
        </div>
      </div>
    </div>
  );
}

export function BuilderPanel({
  selectedSkill,
  pinnedRsds,
  draftStatement,
  setDraftStatement,
  saveStatus,
  onSaveStatement,
  onRemoveRsd,
  onReorderRsds,
  onUpdateStatus,
}: Props) {
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { setNodeRef: setDropRef, isOver: isOverPinZone } = useDroppable({ id: "workspace-drop-zone" });
  const { setNodeRef: setStatementDropRef, isOver: isOverStatementZone } = useDroppable({ id: "statement-drop-zone" });

  const handleChange = useCallback((value: string) => {
    setDraftStatement(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSaveStatement(value), 1000);
  }, [setDraftStatement, onSaveStatement]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const handleBlur = useCallback(() => {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    onSaveStatement(draftStatement);
  }, [draftStatement, onSaveStatement]);

  async function handleGenerate() {
    if (pinnedRsds.length === 0) { setGenerateError("Pin at least one WGU skill first."); return; }
    setGenerating(true);
    setGenerateError(null);
    try {
      const response = await fetch("/api/generate-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rizeSkill: selectedSkill.rize_skill,
          pinnedRsds: pinnedRsds.map((r) => ({ skillName: r.wgu_skill_name, skillStatement: r.wgu_skill_statement })),
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate statement");
      }
      const data = await response.json();
      setDraftStatement(data.statement);
      onSaveStatement(data.statement);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Failed to generate statement");
    } finally {
      setGenerating(false);
    }
  }

  const cycleStatus = () => {
    const next = selectedSkill.status === "draft" ? "review" : selectedSkill.status === "review" ? "approved" : "draft";
    onUpdateStatus(next);
  };

  const statusColor = selectedSkill.status === "approved" ? "bg-green-100 text-green-700 border-green-200"
    : selectedSkill.status === "review" ? "bg-yellow-100 text-yellow-700 border-yellow-200"
    : "bg-slate-100 text-slate-500 border-slate-200";

  return (
    <div className="px-4 py-3">
      {/* Status */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={cycleStatus} className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColor}`}>
          {selectedSkill.status}
        </button>
        <span className={`text-xs ml-auto ${saveStatus === "saved" ? "text-green-600" : saveStatus === "saving" ? "text-blue-500" : "text-slate-400"}`}>
          {saveStatus === "saved" ? "Saved" : saveStatus === "saving" ? "Saving..." : "Unsaved"}
        </span>
      </div>

      {/* Statement Editor */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Skill Statement</h3>
        <div ref={setStatementDropRef} className={`rounded-lg border p-3 transition-colors ${isOverStatementZone ? "border-green-400 bg-green-50" : "border-slate-200"}`}>
          <textarea
            value={draftStatement}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            placeholder={isOverStatementZone ? "Drop to use this WGU statement..." : "Write a statement, or drag a WGU skill here..."}
            className="w-full text-sm border-0 bg-transparent resize-none focus:outline-none leading-relaxed"
            rows={4}
          />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={handleGenerate}
            disabled={generating || pinnedRsds.length === 0}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {generating ? "Generating..." : "Generate with AI"}
          </button>
          <span className={`text-xs ${draftStatement.length > 459 ? "text-red-500 font-medium" : "text-slate-400"}`}>
            {draftStatement.length}/459
          </span>
          {generateError && <span className="text-xs text-red-500">{generateError}</span>}
        </div>
      </div>

      {/* Pinned RSDs */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Pinned WGU RSDs ({pinnedRsds.length})
        </h3>
        <div ref={setDropRef} className={`rounded-lg border min-h-[60px] p-2 transition-colors ${isOverPinZone ? "border-blue-400 bg-blue-50" : "border-slate-200 border-dashed"}`}>
          {pinnedRsds.length === 0 ? (
            <div className="text-xs text-slate-400 py-4 text-center">
              Drag WGU skill cards here to pin them as references
            </div>
          ) : (
            <SortableContext items={pinnedRsds.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {pinnedRsds.map((rsd) => (
                  <SortablePinnedRsd key={rsd.id} rsd={rsd} onRemove={() => onRemoveRsd(rsd.id)} />
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      </div>
    </div>
  );
}
