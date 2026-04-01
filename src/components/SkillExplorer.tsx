"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { ProcessedSkill, Facets } from "@/lib/types";
import type { FuseResult } from "@/lib/search";
import { createFuseIndex } from "@/lib/search";
import {
  semanticSearch,
  preloadEmbeddings,
  type SemanticResult,
  type SemanticSearchStatus,
} from "@/lib/semantic-search";
import { SearchBar } from "./SearchBar";
import { FilterBar } from "./FilterBar";
import { StatsBar } from "./StatsBar";
import { SkillGrid } from "./SkillGrid";
import { SkillModal } from "./SkillModal";
import { Sparkles, Type } from "lucide-react";
import Link from "next/link";

interface Props {
  skills: ProcessedSkill[];
  facets: Facets;
}

export function SkillExplorer({ skills, facets }: Props) {
  const [query, setQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(50);
  const [selectedSkill, setSelectedSkill] = useState<ProcessedSkill | null>(
    null
  );

  // Semantic search state
  const [searchMode, setSearchMode] = useState<"text" | "semantic">("text");
  const [semanticResults, setSemanticResults] = useState<SemanticResult[]>([]);
  const [semanticStatus, setSemanticStatus] =
    useState<SemanticSearchStatus>("idle");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preload embeddings when semantic mode is selected
  useEffect(() => {
    if (searchMode === "semantic") {
      preloadEmbeddings();
    }
  }, [searchMode]);

  // Run semantic search when query changes in semantic mode
  useEffect(() => {
    if (searchMode !== "semantic" || !query.trim()) {
      setSemanticResults([]);
      return;
    }

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    searchTimerRef.current = setTimeout(async () => {
      const results = await semanticSearch(query, skills, setSemanticStatus);
      setSemanticResults(results);
    }, 400); // slightly longer debounce for semantic (model inference)

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [query, searchMode, skills]);

  const fuse = useMemo(() => createFuseIndex(skills), [skills]);

  const { filteredSkills, fuseResults } = useMemo(() => {
    let results: ProcessedSkill[];
    let fuseRes: FuseResult[] | null = null;

    if (searchMode === "semantic" && query.trim()) {
      // Use semantic results
      results = semanticResults.map((r) => r.skill);
    } else if (query.trim()) {
      fuseRes = fuse.search(query);
      results = fuseRes.map((r) => r.item);
    } else {
      results = [...skills].sort((a, b) => {
        const catA = a.categories[0] || "";
        const catB = b.categories[0] || "";
        return catA.localeCompare(catB);
      });
    }

    if (selectedCategories.length > 0) {
      results = results.filter((s) =>
        s.categories.some((c: string) => selectedCategories.includes(c))
      );
      if (fuseRes) {
        fuseRes = fuseRes.filter((r) =>
          r.item.categories.some((c: string) =>
            selectedCategories.includes(c)
          )
        );
      }
    }

    if (selectedCollections.length > 0) {
      results = results.filter((s) =>
        s.collections.some((c: string) => selectedCollections.includes(c))
      );
      if (fuseRes) {
        fuseRes = fuseRes.filter((r) =>
          r.item.collections.some((c: string) =>
            selectedCollections.includes(c)
          )
        );
      }
    }

    return { filteredSkills: results, fuseResults: fuseRes };
  }, [
    query,
    searchMode,
    semanticResults,
    selectedCategories,
    selectedCollections,
    skills,
    fuse,
  ]);

  const handleQueryChange = useCallback((q: string) => {
    setQuery(q);
    setVisibleCount(50);
  }, []);

  const handleShowMore = useCallback(() => {
    setVisibleCount((prev) => prev + 50);
  }, []);

  const removeCategory = useCallback((cat: string) => {
    setSelectedCategories((prev) => prev.filter((c) => c !== cat));
    setVisibleCount(50);
  }, []);

  const removeCollection = useCallback((col: string) => {
    setSelectedCollections((prev) => prev.filter((c) => c !== col));
    setVisibleCount(50);
  }, []);

  // Build match map for text search highlighting
  const matchMap = useMemo(() => {
    if (!fuseResults) return null;
    const map = new Map<string, FuseResult["matches"]>();
    for (const r of fuseResults) {
      map.set(r.item.uuid, r.matches);
    }
    return map;
  }, [fuseResults]);

  // Build score map for semantic search
  const scoreMap = useMemo(() => {
    if (searchMode !== "semantic" || !query.trim()) return null;
    const map = new Map<string, number>();
    for (const r of semanticResults) {
      map.set(r.skill.uuid, r.score);
    }
    return map;
  }, [semanticResults, searchMode, query]);

  const statusMessage =
    searchMode === "semantic" && query.trim()
      ? semanticStatus === "loading-model"
        ? "Loading AI model (first time only)..."
        : semanticStatus === "loading-embeddings"
          ? "Loading skill embeddings..."
          : semanticStatus === "searching"
            ? "Finding semantically similar skills..."
            : null
      : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-900">
              WGU Skill Explorer
            </h1>
            <div className="flex items-center gap-3">
              <Link
                href="/builder"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Skill Builder &rarr;
              </Link>
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setSearchMode("text")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  searchMode === "text"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Type size={14} />
                Text
              </button>
              <button
                onClick={() => setSearchMode("semantic")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  searchMode === "semantic"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Sparkles size={14} />
                Semantic
              </button>
            </div>
            </div>
          </div>
          <SearchBar
            query={query}
            onChange={handleQueryChange}
            placeholder={
              searchMode === "semantic"
                ? 'Try "protecting sensitive patient data" or "lead a team through change"...'
                : "Search by skill name, statement, or keyword..."
            }
          />
          {searchMode === "semantic" && (
            <p className="mt-2 text-xs text-slate-400">
              Semantic search finds conceptually related skills, not just exact
              keyword matches.
            </p>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {statusMessage && (
          <div className="mb-4 flex items-center gap-2 text-sm text-blue-600 bg-blue-50 rounded-lg px-4 py-2.5">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
            {statusMessage}
          </div>
        )}

        <FilterBar
          facets={facets}
          selectedCategories={selectedCategories}
          selectedCollections={selectedCollections}
          onCategoriesChange={(cats) => {
            setSelectedCategories(cats);
            setVisibleCount(50);
          }}
          onCollectionsChange={(cols) => {
            setSelectedCollections(cols);
            setVisibleCount(50);
          }}
          filteredSkills={filteredSkills}
        />

        <StatsBar
          showing={Math.min(visibleCount, filteredSkills.length)}
          total={skills.length}
          filtered={filteredSkills.length}
          selectedCategories={selectedCategories}
          selectedCollections={selectedCollections}
          onRemoveCategory={removeCategory}
          onRemoveCollection={removeCollection}
        />

        <SkillGrid
          skills={filteredSkills}
          visibleCount={visibleCount}
          onShowMore={handleShowMore}
          onSelectSkill={setSelectedSkill}
          matchMap={matchMap}
          scoreMap={scoreMap}
        />
      </div>

      <SkillModal
        skill={selectedSkill}
        onClose={() => setSelectedSkill(null)}
      />
    </div>
  );
}
