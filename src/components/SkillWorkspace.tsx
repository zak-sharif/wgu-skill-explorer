"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { ProcessedSkill, Facets } from "@/lib/types";
import type { FuseResult } from "@/lib/search";
import { createFuseIndex } from "@/lib/search";
import {
  semanticSearch,
  preloadEmbeddings,
  type SemanticResult,
  type SemanticSearchStatus,
} from "@/lib/semantic-search";
import { supabase } from "@/lib/supabase";
import { SearchBar } from "./SearchBar";
import { FilterBar } from "./FilterBar";
import { StatsBar } from "./StatsBar";
import { SkillGrid } from "./SkillGrid";
import { SkillModal } from "./SkillModal";
import { RizeSkillSearch } from "./builder/RizeSkillSearch";
import { BuilderPanel } from "./builder/BuilderPanel";
import { ExportDrafts } from "./builder/ExportDrafts";
import { DraggableSkillCard } from "./builder/DraggableSkillCard";
import { Sparkles, Type, X } from "lucide-react";

import type { RizeSkillDraft, PinnedRsd } from "./builder/SkillBuilder";

interface Props {
  skills: ProcessedSkill[];
  facets: Facets;
}

export function SkillWorkspace({ skills, facets }: Props) {
  // Explorer state
  const [query, setQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(50);
  const [selectedSkill, setSelectedSkill] = useState<ProcessedSkill | null>(null);
  const [searchMode, setSearchMode] = useState<"text" | "semantic">("text");
  const [semanticResults, setSemanticResults] = useState<SemanticResult[]>([]);
  const [semanticStatus, setSemanticStatus] = useState<SemanticSearchStatus>("idle");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Builder state
  const [selectedRizeSlug, setSelectedRizeSlug] = useState<string | null>(null);
  const [rizeSkills, setRizeSkills] = useState<RizeSkillDraft[]>([]);
  const [pinnedRsds, setPinnedRsds] = useState<PinnedRsd[]>([]);
  const [draftStatement, setDraftStatement] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [loadingRize, setLoadingRize] = useState(true);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [builderMode, setBuilderMode] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Fetch Lightcast skills
  useEffect(() => {
    async function fetchRizeSkills() {
      setLoadingRize(true);
      const { data, error } = await supabase
        .from("rize_skill_drafts")
        .select("*")
        .order("rize_skill", { ascending: true });
      if (error) console.error("Error fetching rize skills:", error);
      else setRizeSkills((data as RizeSkillDraft[]) || []);
      setLoadingRize(false);
    }
    fetchRizeSkills();
  }, []);

  // Fetch pinned RSDs when Lightcast skill changes
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
    const sel = rizeSkills.find((s) => s.rize_slug === selectedRizeSlug);
    setDraftStatement(sel?.draft_statement || "");
    setSaveStatus("saved");
    fetchPinnedRsds();
  }, [selectedRizeSlug, rizeSkills]);

  // Semantic search
  useEffect(() => {
    if (searchMode === "semantic") preloadEmbeddings();
  }, [searchMode]);

  useEffect(() => {
    if (searchMode !== "semantic" || !query.trim()) {
      setSemanticResults([]);
      return;
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      const results = await semanticSearch(query, skills, setSemanticStatus);
      setSemanticResults(results);
    }, 400);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [query, searchMode, skills]);

  const fuse = useMemo(() => createFuseIndex(skills), [skills]);

  const { filteredSkills, fuseResults } = useMemo(() => {
    let results: ProcessedSkill[];
    let fuseRes: FuseResult[] | null = null;

    if (searchMode === "semantic" && query.trim()) {
      results = semanticResults.map((r) => r.skill);
    } else if (query.trim()) {
      fuseRes = fuse.search(query);
      results = fuseRes.map((r) => r.item);
    } else {
      results = [...skills].sort((a, b) => (a.categories[0] || "").localeCompare(b.categories[0] || ""));
    }

    if (selectedCategories.length > 0) {
      results = results.filter((s) => s.categories.some((c: string) => selectedCategories.includes(c)));
      if (fuseRes) fuseRes = fuseRes.filter((r) => r.item.categories.some((c: string) => selectedCategories.includes(c)));
    }
    if (selectedCollections.length > 0) {
      results = results.filter((s) => s.collections.some((c: string) => selectedCollections.includes(c)));
      if (fuseRes) fuseRes = fuseRes.filter((r) => r.item.collections.some((c: string) => selectedCollections.includes(c)));
    }
    return { filteredSkills: results, fuseResults: fuseRes };
  }, [query, searchMode, semanticResults, selectedCategories, selectedCollections, skills, fuse]);

  const handleQueryChange = useCallback((q: string) => { setQuery(q); setVisibleCount(50); }, []);
  const handleShowMore = useCallback(() => { setVisibleCount((p) => p + 50); }, []);
  const removeCategory = useCallback((cat: string) => { setSelectedCategories((p) => p.filter((c) => c !== cat)); setVisibleCount(50); }, []);
  const removeCollection = useCallback((col: string) => { setSelectedCollections((p) => p.filter((c) => c !== col)); setVisibleCount(50); }, []);

  const matchMap = useMemo(() => {
    if (!fuseResults) return null;
    const map = new Map<string, FuseResult["matches"]>();
    for (const r of fuseResults) map.set(r.item.uuid, r.matches);
    return map;
  }, [fuseResults]);

  const scoreMap = useMemo(() => {
    if (searchMode !== "semantic" || !query.trim()) return null;
    const map = new Map<string, number>();
    for (const r of semanticResults) map.set(r.skill.uuid, r.score);
    return map;
  }, [semanticResults, searchMode, query]);

  // Builder handlers
  const handleSelectRizeSkill = useCallback((slug: string) => {
    setSelectedRizeSlug(slug);
    setBuilderMode(true);

    // Auto-filter WGU skills to the matching category
    const rize = rizeSkills.find((s) => s.rize_slug === slug);
    if (rize) {
      // Check if the Lightcast skill name matches a WGU category
      const matchingCat = facets.categories.find(
        (c) => c.name.toLowerCase() === rize.rize_skill.toLowerCase()
      );
      if (matchingCat) {
        setSelectedCategories([matchingCat.name]);
      } else {
        // Clear category filter and let search handle it
        setSelectedCategories([]);
        setQuery(rize.rize_skill);
      }
      setVisibleCount(50);
    }
  }, [rizeSkills, facets.categories]);

  const handlePinRsd = useCallback(async (skill: ProcessedSkill) => {
    if (!selectedRizeSlug) return;
    if (pinnedRsds.some((p) => p.wgu_uuid === skill.uuid)) return;
    const newSortOrder = pinnedRsds.length > 0 ? Math.max(...pinnedRsds.map((p) => p.sort_order)) + 1 : 0;
    const { data, error } = await supabase
      .from("pinned_rsds")
      .insert({ rize_slug: selectedRizeSlug, wgu_uuid: skill.uuid, wgu_skill_name: skill.skillName, wgu_skill_statement: skill.skillStatement, sort_order: newSortOrder })
      .select().single();
    if (error) console.error("Error pinning RSD:", error);
    else if (data) setPinnedRsds((prev) => [...prev, data as PinnedRsd]);
  }, [selectedRizeSlug, pinnedRsds]);

  const handleRemoveRsd = useCallback(async (pinnedId: string) => {
    const { error } = await supabase.from("pinned_rsds").delete().eq("id", pinnedId);
    if (!error) setPinnedRsds((prev) => prev.filter((p) => p.id !== pinnedId));
  }, []);

  const handleReorderRsds = useCallback(async (reordered: PinnedRsd[]) => {
    setPinnedRsds(reordered);
    await Promise.all(reordered.map((rsd, i) => supabase.from("pinned_rsds").update({ sort_order: i }).eq("id", rsd.id)));
  }, []);

  const handleSaveStatement = useCallback(async (statement: string) => {
    if (!selectedRizeSlug) return;
    setSaveStatus("saving");
    const { error } = await supabase.from("rize_skill_drafts").update({ draft_statement: statement, updated_at: new Date().toISOString() }).eq("rize_slug", selectedRizeSlug);
    if (error) { setSaveStatus("unsaved"); } else {
      setSaveStatus("saved");
      setRizeSkills((prev) => prev.map((s) => s.rize_slug === selectedRizeSlug ? { ...s, draft_statement: statement, updated_at: new Date().toISOString() } : s));
    }
  }, [selectedRizeSlug]);

  const handleUpdateStatus = useCallback(async (newStatus: "draft" | "review" | "approved") => {
    if (!selectedRizeSlug) return;
    const { error } = await supabase.from("rize_skill_drafts").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("rize_slug", selectedRizeSlug);
    if (!error) setRizeSkills((prev) => prev.map((s) => s.rize_slug === selectedRizeSlug ? { ...s, status: newStatus } : s));
  }, [selectedRizeSlug]);

  const handleDropStatement = useCallback((statement: string) => {
    setDraftStatement(statement);
    handleSaveStatement(statement);
  }, [handleSaveStatement]);

  const selectedRizeSkill = useMemo(() => rizeSkills.find((s) => s.rize_slug === selectedRizeSlug) || null, [rizeSkills, selectedRizeSlug]);
  const activeDragSkill = useMemo(() => activeDragId ? skills.find((s) => s.uuid === activeDragId) || null : null, [activeDragId, skills]);
  const draftedCount = rizeSkills.filter((s) => s.draft_statement).length;

  function handleDragStart(event: DragStartEvent) { setActiveDragId(event.active.id as string); }
  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;
    if (over.id === "workspace-drop-zone") {
      const skill = skills.find((s) => s.uuid === active.id);
      if (skill) handlePinRsd(skill);
    } else if (over.id === "statement-drop-zone") {
      const skill = skills.find((s) => s.uuid === active.id);
      if (skill) handleDropStatement(skill.skillStatement);
    }
  }

  const statusMessage = searchMode === "semantic" && query.trim()
    ? semanticStatus === "loading-model" ? "Loading AI model (first time only)..."
    : semanticStatus === "loading-embeddings" ? "Loading skill embeddings..."
    : semanticStatus === "searching" ? "Finding semantically similar skills..." : null
    : null;

  const panelOpen = builderMode && selectedRizeSlug;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 shrink-0">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-2xl font-bold text-slate-900">WGU Skill Explorer</h1>
              <div className="flex items-center gap-3">
                <RizeSkillSearch
                  rizeSkills={rizeSkills}
                  selectedSlug={selectedRizeSlug}
                  onSelect={handleSelectRizeSkill}
                  loading={loadingRize}
                />
                <ExportDrafts />
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                  <button onClick={() => setSearchMode("text")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${searchMode === "text" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                    <Type size={14} /> Text
                  </button>
                  <button onClick={() => setSearchMode("semantic")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${searchMode === "semantic" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                    <Sparkles size={14} /> Semantic
                  </button>
                </div>
              </div>
            </div>
            <SearchBar
              query={query}
              onChange={handleQueryChange}
              placeholder={searchMode === "semantic" ? 'Try "protecting sensitive patient data" or "lead a team through change"...' : "Search by skill name, statement, or keyword..."}
            />
            {searchMode === "semantic" && (
              <p className="mt-2 text-xs text-slate-400">Semantic search finds conceptually related skills, not just exact keyword matches.</p>
            )}
          </div>
        </header>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: WGU Skill Browser */}
          <div className={`flex-1 overflow-y-auto transition-all ${panelOpen ? "mr-0" : ""}`}>
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
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
                onCategoriesChange={(cats) => { setSelectedCategories(cats); setVisibleCount(50); }}
                onCollectionsChange={(cols) => { setSelectedCollections(cols); setVisibleCount(50); }}
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

              {/* Render draggable cards if builder mode, otherwise normal cards */}
              {builderMode ? (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredSkills.slice(0, visibleCount).map((skill) => (
                      <DraggableSkillCard key={skill.uuid} skill={skill} />
                    ))}
                  </div>
                  {visibleCount < filteredSkills.length && (
                    <div className="flex justify-center mt-8 mb-8">
                      <button onClick={handleShowMore} className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors">
                        Show more ({filteredSkills.length - visibleCount} remaining)
                      </button>
                    </div>
                  )}
                  {filteredSkills.length === 0 && (
                    <div className="text-center py-16 text-slate-500">
                      <p className="text-lg">No skills found matching your criteria.</p>
                    </div>
                  )}
                </div>
              ) : (
                <SkillGrid
                  skills={filteredSkills}
                  visibleCount={visibleCount}
                  onShowMore={handleShowMore}
                  onSelectSkill={setSelectedSkill}
                  matchMap={matchMap}
                  scoreMap={scoreMap}
                />
              )}
            </div>
          </div>

          {/* Right: Builder Panel (slides in) */}
          {panelOpen && selectedRizeSkill && (
            <div className="w-[400px] shrink-0 border-l border-slate-200 bg-white overflow-y-auto shadow-[-2px_0_10px_rgba(0,0,0,0.05)]">
              <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between z-10">
                <h2 className="text-sm font-bold text-slate-900 truncate">{selectedRizeSkill.rize_skill}</h2>
                <button
                  onClick={() => { setBuilderMode(false); setSelectedRizeSlug(null); }}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={16} />
                </button>
              </div>
              <BuilderPanel
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
          )}
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeDragSkill ? (
            <div className="bg-white rounded-lg border-2 border-blue-400 shadow-xl p-3 w-[300px] opacity-90">
              <div className="flex flex-wrap gap-1 mb-1">
                {activeDragSkill.categories.slice(0, 2).map((cat) => (
                  <span key={cat} className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800">{cat}</span>
                ))}
              </div>
              <p className="text-sm font-semibold text-slate-900 mb-1">{activeDragSkill.skillName}</p>
              <p className="text-xs text-slate-500 line-clamp-2">{activeDragSkill.skillStatement}</p>
            </div>
          ) : null}
        </DragOverlay>
      </div>

      {/* Skill detail modal (only in non-builder mode) */}
      {!builderMode && (
        <SkillModal skill={selectedSkill} onClose={() => setSelectedSkill(null)} />
      )}
    </DndContext>
  );
}
