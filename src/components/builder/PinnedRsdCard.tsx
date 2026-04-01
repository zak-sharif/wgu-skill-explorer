"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import type { PinnedRsd } from "./SkillBuilder";

interface Props {
  rsd: PinnedRsd;
  onRemove: () => void;
}

export function PinnedRsdCard({ rsd, onRemove }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rsd.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 bg-white rounded-md border border-slate-200 p-3 hover:shadow-sm transition-shadow"
    >
      <button
        className="shrink-0 mt-0.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{rsd.wgu_skill_name}</p>
        <p className="text-xs text-slate-500 italic mt-0.5 line-clamp-2">
          {rsd.wgu_skill_statement}
        </p>
      </div>

      <button
        onClick={onRemove}
        className="shrink-0 text-slate-300 hover:text-red-500 transition-colors"
        title="Remove"
      >
        <X size={16} />
      </button>
    </div>
  );
}
