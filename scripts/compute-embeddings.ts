import { pipeline } from "@huggingface/transformers";
import fs from "fs";
import path from "path";

const SKILLS_PATH = path.join(process.cwd(), "src/data/skills.json");
const OUTPUT_PATH = path.join(process.cwd(), "public/embeddings.json");
const BATCH_SIZE = 64;

async function main() {
  const skills = JSON.parse(fs.readFileSync(SKILLS_PATH, "utf-8"));
  console.log(`Embedding ${skills.length} skills...`);

  const extractor = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );

  // Build search text for each skill: name + statement + categories
  const texts = skills.map(
    (s: { skillName: string; skillStatement: string; categories: string[] }) =>
      `${s.skillName}. ${s.skillStatement} ${s.categories.join(", ")}`
  );

  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const output = await extractor(batch, { pooling: "mean", normalize: true });

    // output.tolist() returns number[][]
    const batchEmbeddings = output.tolist() as number[][];
    allEmbeddings.push(...batchEmbeddings);

    const pct = Math.round(((i + batch.length) / texts.length) * 100);
    process.stdout.write(`\r  ${i + batch.length}/${texts.length} (${pct}%)`);
  }
  console.log();

  // Save as JSON array of arrays (will be ~35MB, gzips to ~15MB)
  // Only keep first 128 dims to reduce size (MiniLM outputs 384 dims)
  const truncated = allEmbeddings.map((e) => e.slice(0, 128));
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(truncated));

  const sizeMB = (fs.statSync(OUTPUT_PATH).size / 1024 / 1024).toFixed(1);
  console.log(`Wrote ${allEmbeddings.length} embeddings to ${OUTPUT_PATH} (${sizeMB} MB)`);
  console.log(`Dimensions: ${truncated[0].length} (truncated from ${allEmbeddings[0].length})`);
}

main().catch(console.error);
