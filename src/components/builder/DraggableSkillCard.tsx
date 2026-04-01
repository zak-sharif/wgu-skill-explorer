"use client";

import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import type { ProcessedSkill } from "@/lib/types";

interface Props {
  skill: ProcessedSkill;
}

export function DraggableSkillCard({ skill }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: skill.uuid,
    data: {
      uuid: skill.uuid,
      skillName: skill.skillName,
      skillStatement: skill.skillStatement,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-white rounded-lg border border-slate-200 p-4 transition-all ${
        isDragging
          ? "opacity-30 shadow-none"
          : "hover:shadow-md hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          className="shrink-0 mt-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>

        <div className="flex-1 min-w-0">
          {skill.categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {skill.categories.slice(0, 2).map((cat) => (
                <span
                  key={cat}
                  className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}
          <p className="text-sm font-semibold text-slate-900 mb-1">
            {skill.skillName}
          </p>
          <p className="text-sm text-slate-600 italic leading-relaxed">
            {skill.skillStatement}
          </p>
        </div>
      </div>
    </div>
  );
}
