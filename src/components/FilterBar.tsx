"use client";

import { useState, useMemo } from "react";
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { ChevronDown, X } from "lucide-react";
import type { Facets, ProcessedSkill } from "@/lib/types";
import { ExportButton } from "./ExportButton";

interface Props {
  facets: Facets;
  selectedCategories: string[];
  selectedCollections: string[];
  onCategoriesChange: (cats: string[]) => void;
  onCollectionsChange: (cols: string[]) => void;
  filteredSkills: ProcessedSkill[];
}

function MultiCombobox({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { name: string; count: number }[];
  selected: string[];
  onChange: (val: string[]) => void;
}) {
  const [filterQuery, setFilterQuery] = useState("");

  const filtered = useMemo(() => {
    if (!filterQuery) return options.slice(0, 50);
    const q = filterQuery.toLowerCase();
    return options.filter((o) => o.name.toLowerCase().includes(q)).slice(0, 50);
  }, [filterQuery, options]);

  return (
    <div className="relative">
      <Combobox
        multiple
        value={selected}
        onChange={onChange}
        onClose={() => setFilterQuery("")}
      >
        <div className="relative">
          <ComboboxInput
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder={label}
            className="w-full sm:w-56 pl-3 pr-8 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <ComboboxButton className="absolute right-2 top-1/2 -translate-y-1/2">
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </ComboboxButton>
        </div>

        <ComboboxOptions className="absolute z-10 mt-1 w-72 max-h-60 overflow-auto rounded-lg bg-white border border-slate-200 shadow-lg py-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">No results</div>
          ) : (
            filtered.map((opt) => (
              <ComboboxOption
                key={opt.name}
                value={opt.name}
                className="px-3 py-1.5 text-sm cursor-pointer select-none data-[focus]:bg-blue-50 data-[selected]:font-medium"
              >
                <span className="flex justify-between items-center">
                  <span className="truncate">
                    {selected.includes(opt.name) && (
                      <span className="text-blue-600 mr-1">&#10003;</span>
                    )}
                    {opt.name}
                  </span>
                  <span className="text-slate-400 ml-2 shrink-0">
                    ({opt.count.toLocaleString()})
                  </span>
                </span>
              </ComboboxOption>
            ))
          )}
        </ComboboxOptions>
      </Combobox>
    </div>
  );
}

export function FilterBar({
  facets,
  selectedCategories,
  selectedCollections,
  onCategoriesChange,
  onCollectionsChange,
  filteredSkills,
}: Props) {
  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-3">
        <MultiCombobox
          label="Filter by category..."
          options={facets.categories}
          selected={selectedCategories}
          onChange={onCategoriesChange}
        />
        <MultiCombobox
          label="Filter by collection..."
          options={facets.collections}
          selected={selectedCollections}
          onChange={onCollectionsChange}
        />
        <ExportButton skills={filteredSkills} />
      </div>

      {(selectedCategories.length > 0 || selectedCollections.length > 0) && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selectedCategories.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 text-sm px-2.5 py-1 rounded-full bg-blue-100 text-blue-800"
            >
              {cat}
              <button
                onClick={() =>
                  onCategoriesChange(selectedCategories.filter((c) => c !== cat))
                }
                className="hover:text-blue-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          {selectedCollections.map((col) => (
            <span
              key={col}
              className="inline-flex items-center gap-1 text-sm px-2.5 py-1 rounded-full bg-green-100 text-green-800"
            >
              {col}
              <button
                onClick={() =>
                  onCollectionsChange(selectedCollections.filter((c) => c !== col))
                }
                className="hover:text-green-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
