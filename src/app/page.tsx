import fs from "fs";
import path from "path";
import { SkillWorkspace } from "@/components/SkillWorkspace";
import type { ProcessedSkill, Facets } from "@/lib/types";

export default function Home() {
  const dataDir = path.join(process.cwd(), "src/data");
  const skills: ProcessedSkill[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, "skills.json"), "utf-8")
  );
  const facets: Facets = JSON.parse(
    fs.readFileSync(path.join(dataDir, "facets.json"), "utf-8")
  );

  return <SkillWorkspace skills={skills} facets={facets} />;
}
