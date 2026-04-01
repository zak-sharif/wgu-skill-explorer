import Papa from "papaparse";
import type { ProcessedSkill } from "./types";

export function exportToCsv(skills: ProcessedSkill[], filename = "wgu-skills-export.csv") {
  const rows = skills.map((s) => ({
    "Skill Name": s.skillName,
    "Skill Statement": s.skillStatement,
    Categories: s.categories.join("; "),
    Keywords: s.keywords.join("; "),
    Occupations: s.occupations.map((o) => `${o.code} - ${o.name}`).join("; "),
    Collections: s.collections.join("; "),
    UUID: s.uuid,
  }));

  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
