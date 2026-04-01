import type { ProcessedSkill } from "./types";

let embeddings: number[][] | null = null;
let embeddingsPromise: Promise<number[][]> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pipelineInstance: any = null;

async function loadEmbeddings(): Promise<number[][]> {
  if (embeddings) return embeddings;
  if (embeddingsPromise) return embeddingsPromise;

  embeddingsPromise = fetch("/embeddings.json")
    .then((r) => r.json())
    .then((data: number[][]) => {
      embeddings = data;
      return data;
    });

  return embeddingsPromise;
}

async function getEmbedder() {
  if (pipelineInstance) return pipelineInstance;

  const { pipeline } = await import("@huggingface/transformers");

  pipelineInstance = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2",
    { dtype: "q8" }
  );

  return pipelineInstance;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface SemanticResult {
  skill: ProcessedSkill;
  score: number;
}

export type SemanticSearchStatus = "idle" | "loading-model" | "loading-embeddings" | "searching" | "ready" | "error";

export async function semanticSearch(
  query: string,
  skills: ProcessedSkill[],
  onStatus?: (status: SemanticSearchStatus) => void
): Promise<SemanticResult[]> {
  try {
    // Load embeddings and model in parallel
    onStatus?.("loading-embeddings");
    const [embs, embedder] = await Promise.all([
      loadEmbeddings(),
      (async () => {
        onStatus?.("loading-model");
        return getEmbedder();
      })(),
    ]);

    onStatus?.("searching");

    // Embed the query
    const extractor = await embedder;
    const output = await extractor(query, { pooling: "mean", normalize: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queryEmbedding = ((output as any).tolist() as number[][])[0].slice(0, 128);

    // Compute similarity for all skills
    const scored: SemanticResult[] = [];
    for (let i = 0; i < embs.length && i < skills.length; i++) {
      const score = cosineSimilarity(queryEmbedding, embs[i]);
      if (score > 0.2) {
        scored.push({ skill: skills[i], score });
      }
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    onStatus?.("ready");
    return scored.slice(0, 200);
  } catch (err) {
    console.error("Semantic search error:", err);
    onStatus?.("error");
    return [];
  }
}

// Preload embeddings eagerly (they're just a JSON fetch)
export function preloadEmbeddings() {
  loadEmbeddings();
}
