import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";

const anthropic = new Anthropic();

const DAILY_LIMIT = 200; // ~$1/day at Sonnet pricing
const MAX_CHARS = 459; // longest WGU skill statement

async function checkDailyLimit(): Promise<{ allowed: boolean; used: number }> {
  const today = new Date().toISOString().split("T")[0];

  // Count today's generations by checking updated_at timestamps
  const { count, error } = await supabase
    .from("rize_skill_drafts")
    .select("*", { count: "exact", head: true })
    .gte("updated_at", `${today}T00:00:00Z`)
    .not("draft_statement", "is", null);

  if (error) {
    console.error("Error checking daily limit:", error);
    return { allowed: true, used: 0 }; // fail open
  }

  return { allowed: (count || 0) < DAILY_LIMIT, used: count || 0 };
}

export async function POST(request: Request) {
  try {
    const { allowed, used } = await checkDailyLimit();
    if (!allowed) {
      return Response.json(
        { error: `Daily AI generation limit reached (${used}/${DAILY_LIMIT}). Try again tomorrow.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      rizeSkill,
      pinnedRsds,
    }: {
      rizeSkill: string;
      pinnedRsds: { skillName: string; skillStatement: string }[];
    } = body;

    if (!rizeSkill || !pinnedRsds || pinnedRsds.length === 0) {
      return Response.json(
        { error: "rizeSkill and at least one pinned RSD are required" },
        { status: 400 }
      );
    }

    const rsdList = pinnedRsds
      .map(
        (rsd, i) =>
          `${i + 1}. **${rsd.skillName}**: ${rsd.skillStatement}`
      )
      .join("\n");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `You are a curriculum designer at a university. Given these WGU Rich Skill Descriptors that relate to the skill '${rizeSkill}', write a concise skill definition that describes what this skill means and what a learner who has this skill can do.

Rules:
- Be as brief as possible. Aim for 1 sentence (under 100 characters is ideal).
- Hard limit: ${MAX_CHARS} characters maximum.
- Be clear, actionable, and employer-relevant.
- No jargon, no filler words, no preamble.
- Start with a verb (e.g., "Apply...", "Analyze...", "Design...").
- Just return the statement, nothing else.

WGU Rich Skill Descriptors for reference:
${rsdList}`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    const statement = textBlock ? textBlock.text.trim() : "";

    return Response.json({ statement, dailyUsed: used + 1, dailyLimit: DAILY_LIMIT });
  } catch (error) {
    console.error("Error generating statement:", error);
    return Response.json(
      { error: "Failed to generate statement" },
      { status: 500 }
    );
  }
}
