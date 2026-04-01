"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { RizeSkillDraft, PinnedRsd } from "./SkillBuilder";
import { PinnedRsdCard } from "./PinnedRsdCard";
import { StatementEditor } from "./StatementEditor";

interface Props {
  selectedSkill: RizeSkillDraft | null;
  pinnedRsds: PinnedRsd[];
  draftStatement: string;
  setDraftStatement: (s: string) => void;
  saveStatus: "saved" | "saving" | "unsaved";
  onSaveStatement: (statement: string) => void;
  onRemoveRsd: (pinnedId: string) => void;
  onReorderRsds: (reordered: PinnedRsd[]) => void;
  onUpdateStatus: (status: "draft" | "review" | "approved") => void;
}

const STATUS_CYCLE: Record<string, "draft" | "review" | "approved"> = {
  draft: "review",
  review: "approved",
  approved: "draft",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 hover:bg-slate-200",
  review: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
  approved: "bg-green-100 text-green-700 hover:bg-green-200",
};

export function WorkspacePanel({
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
  const { isOver, setNodeRef } = useDroppable({
    id: "workspace-drop-zone",
  });

  const sortSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleSortEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = pinnedRsds.findIndex((p) => p.id === active.id);
    const newIndex = pinnedRsds.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(pinnedRsds, oldIndex, newIndex);
    onReorderRsds(reordered);
  }

  if (!selectedSkill) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="text-center">
          <p className="text-lg mb-1">Select a Lightcast skill to begin</p>
          <p className="text-sm">
            Choose from the panel on the left
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-slate-900">
          {selectedSkill.rize_skill}
        </h2>
        <button
          onClick={() => onUpdateStatus(STATUS_CYCLE[selectedSkill.status])}
          className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
            STATUS_COLORS[selectedSkill.status]
          }`}
          title={`Click to change to "${STATUS_CYCLE[selectedSkill.status]}"`}
        >
          {selectedSkill.status}
        </button>
      </div>

      {/* Pinned WGU RSDs section */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">
          Pinned WGU RSDs
        </h3>

        <div
          ref={setNodeRef}
          className={`min-h-[120px] rounded-lg border-2 transition-colors p-3 ${
            isOver
              ? "border-blue-400 bg-blue-50 border-dashed"
              : pinnedRsds.length === 0
                ? "border-slate-200 border-dashed bg-slate-50"
                : "border-slate-200 bg-white"
          }`}
        >
          {pinnedRsds.length === 0 ? (
            <div className="flex items-center justify-center h-[80px] text-slate-400 text-sm">
              Drag WGU skills here to build your definition
            </div>
          ) : (
            <DndContext
              sensors={sortSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSortEnd}
            >
              <SortableContext
                items={pinnedRsds.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {pinnedRsds.map((rsd) => (
                    <PinnedRsdCard
                      key={rsd.id}
                      rsd={rsd}
                      onRemove={() => onRemoveRsd(rsd.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Statement Editor */}
      <StatementEditor
        rizeSkillName={selectedSkill.rize_skill}
        pinnedRsds={pinnedRsds}
        draftStatement={draftStatement}
        setDraftStatement={setDraftStatement}
        saveStatus={saveStatus}
        onSave={onSaveStatement}
      />
    </div>
  );
}
