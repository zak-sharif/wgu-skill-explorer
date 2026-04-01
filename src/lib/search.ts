import Fuse, { FuseResult as FuseResultType } from "fuse.js";
import type { ProcessedSkill } from "./types";

export function createFuseIndex(skills: ProcessedSkill[]) {
  return new Fuse(skills, {
    keys: [
      { name: "skillStatement", weight: 3 },
      { name: "skillName", weight: 2 },
      { name: "categories", weight: 1.5 },
      { name: "keywords", weight: 1 },
    ],
    threshold: 0.35,
    includeMatches: true,
    ignoreLocation: true,
  });
}

export type FuseResult = FuseResultType<ProcessedSkill>;
