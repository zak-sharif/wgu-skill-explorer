"use client";

import { X } from "lucide-react";

interface Props {
  showing: number;
  total: number;
  filtered: number;
  selectedCategories: string[];
  selectedCollections: string[];
  onRemoveCategory: (cat: string) => void;
  onRemoveCollection: (col: string) => void;
}

export function StatsBar({
  showing,
  total,
  filtered,
  selectedCategories,
  selectedCollections,
  onRemoveCategory,
  onRemoveCollection,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <p className="text-sm text-slate-600">
        Showing{" "}
        <span className="font-semibold text-slate-900">
          {showing.toLocaleString()}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-slate-900">
          {filtered === total
            ? total.toLocaleString()
            : `${filtered.toLocaleString()} filtered (${total.toLocaleString()} total)`}
        </span>{" "}
        skills
      </p>

      {(selectedCategories.length > 0 || selectedCollections.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {selectedCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => onRemoveCategory(cat)}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200"
            >
              {cat}
              <X className="h-3 w-3" />
            </button>
          ))}
          {selectedCollections.map((col) => (
            <button
              key={col}
              onClick={() => onRemoveCollection(col)}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 hover:bg-green-200"
            >
              {col}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
