import fs from "fs";
import path from "path";
import type { ProcessedSkill } from "@/lib/types";
import { SkillBuilder } from "@/components/builder/SkillBuilder";

export default function BuilderPage() {
  const dataDir = path.join(process.cwd(), "src/data");
  const skills: ProcessedSkill[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, "skills.json"), "utf-8")
  );

  return <SkillBuilder wguSkills={skills} />;
}
