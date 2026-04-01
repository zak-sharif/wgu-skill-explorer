import fs from "fs";
import path from "path";

interface RawSkill {
  uuid: string;
  skillName: string;
  skillStatement: string;
  categories: string[];
  keywords: string[];
  occupations: { code: string; targetNodeName: string; frameworkName: string }[];
  status: string;
  publishDate: string;
  id: string;
}

interface RawCollection {
  uuid: string;
  name: string;
  description: string;
  skills: RawSkill[];
}

interface ProcessedSkill {
  uuid: string;
  skillName: string;
  skillStatement: string;
  categories: string[];
  keywords: string[];
  occupations: { code: string; name: string }[];
  collections: string[];
  publishDate: string;
}

const NOISE_PATTERNS = [
  /^Western Governors University$/,
  /^WGUSID:/,
  /^InTASC_/,
  /^NICE_/,
  /^CAEP_/,
  /^ISTE_/,
  /^SHRM/,
];

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function isNoiseKeyword(kw: string): boolean {
  return NOISE_PATTERNS.some((pattern) => pattern.test(kw));
}

function main() {
  const rawDir = path.resolve(__dirname, "../data/raw");
  const outDir = path.resolve(__dirname, "../src/data");

  // Read all skills
  const rawSkills: RawSkill[] = JSON.parse(
    fs.readFileSync(path.join(rawDir, "wgu-all-skills.json"), "utf-8")
  );
  console.log(`Loaded ${rawSkills.length} skills`);

  // Read all collections and build skill->collection mapping
  const collectionsDir = path.join(rawDir, "collections");
  const collectionFiles = fs.readdirSync(collectionsDir).filter((f) => f.endsWith(".json"));

  const skillToCollections = new Map<string, string[]>();
  const collectionNames = new Map<string, string>();

  for (const file of collectionFiles) {
    const col: RawCollection = JSON.parse(
      fs.readFileSync(path.join(collectionsDir, file), "utf-8")
    );
    collectionNames.set(col.uuid, col.name);
    for (const skill of col.skills) {
      const existing = skillToCollections.get(skill.uuid) || [];
      existing.push(col.name);
      skillToCollections.set(skill.uuid, existing);
    }
  }
  console.log(`Loaded ${collectionFiles.length} collections`);

  // Process skills
  const processed: ProcessedSkill[] = rawSkills.map((skill) => {
    // Decode HTML entities
    const skillName = decodeHtmlEntities(skill.skillName || "");
    const skillStatement = decodeHtmlEntities(skill.skillStatement || "");
    const categories = (skill.categories || []).map(decodeHtmlEntities);

    // Clean keywords: decode, remove noise, deduplicate
    const cleanedKeywords = (skill.keywords || [])
      .filter((kw) => kw != null)
      .map(decodeHtmlEntities)
      .filter((kw) => !isNoiseKeyword(kw));
    const uniqueKeywords = [...new Set(cleanedKeywords)];

    // Map occupations
    const occupations = (skill.occupations || [])
      .filter((occ) => occ && occ.code)
      .map((occ) => ({
        code: occ.code || "",
        name: decodeHtmlEntities(occ.targetNodeName || ""),
      }));

    // Collections
    const collections = skillToCollections.get(skill.uuid) || [];

    return {
      uuid: skill.uuid,
      skillName,
      skillStatement,
      categories,
      keywords: uniqueKeywords,
      occupations,
      collections,
      publishDate: skill.publishDate,
    };
  });

  // Build facets
  const categoryCounts = new Map<string, number>();
  const collectionCounts = new Map<string, number>();
  const occupationCounts = new Map<string, number>();

  for (const skill of processed) {
    for (const cat of skill.categories) {
      categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
    }
    for (const col of skill.collections) {
      collectionCounts.set(col, (collectionCounts.get(col) || 0) + 1);
    }
    for (const occ of skill.occupations) {
      const key = `${occ.code}|${occ.name}`;
      occupationCounts.set(key, (occupationCounts.get(key) || 0) + 1);
    }
  }

  const sortByCount = (a: { count: number }, b: { count: number }) => b.count - a.count;

  const facets = {
    categories: [...categoryCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort(sortByCount),
    collections: [...collectionCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort(sortByCount),
    occupations: [...occupationCounts.entries()]
      .map(([key, count]) => {
        const [code, name] = key.split("|");
        return { code, name, count };
      })
      .sort(sortByCount),
  };

  // Write output
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "skills.json"), JSON.stringify(processed));
  fs.writeFileSync(path.join(outDir, "facets.json"), JSON.stringify(facets, null, 2));

  console.log(`Wrote ${processed.length} processed skills to src/data/skills.json`);
  console.log(
    `Wrote facets: ${facets.categories.length} categories, ${facets.collections.length} collections, ${facets.occupations.length} occupations`
  );
}

main();
