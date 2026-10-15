import { z } from "zod";
import { askGemmaJson, PRIMARY_MODEL, type GemmaModel } from "./gemma";

export const CRITERIA = [
  { key: "real_problem", label: "Real problem", question: "Is this a problem people actually have, today?" },
  { key: "worth_solving", label: "Worth solving", question: "Is the pain big or frequent enough that solving it matters?" },
  { key: "not_already_done", label: "Not already done", question: "Is it free of an existing tool that already solves it well?" },
  { key: "something_new", label: "Something new", question: "Does it bring a new angle, method or insight?" },
  { key: "within_reach", label: "Within reach", question: "Can this team build a working version in the weeks they have, with their skills?" },
  { key: "someone_wants_it", label: "Someone wants it", question: "Is there a specific group who would use or pay for it?" },
] as const;

export type CriterionKey = (typeof CRITERIA)[number]["key"];

export const SnapshotInput = z.object({
  idea: z.string().trim().min(20, "Describe the idea in at least 20 characters.").max(4000),
  purpose: z.string().trim().max(500).optional().default(""),
  users: z.string().trim().max(500).optional().default(""),
  weeks: z.coerce.number().int().min(1).max(104).optional(),
  skills: z.string().trim().max(500).optional().default(""),
});
export type SnapshotInput = z.infer<typeof SnapshotInput>;

const CriterionMark = z.object({
  score: z.coerce.number().int().min(0).max(10),
  reason: z.string().min(1),
});

const GemmaMarks = z.object(
  Object.fromEntries(CRITERIA.map((c) => [c.key, CriterionMark])) as Record<
    CriterionKey,
    typeof CriterionMark
  >,
);

export type Verdict = "Build" | "Narrow it down" | "Rethink" | "Drop";

export interface Snapshot {
  model: GemmaModel;
  mark: number; // mean of the six scores, 1 decimal, out of 10
  verdict: Verdict;
  criteria: { key: CriterionKey; label: string; score: number; reason: string }[];
}

export function verdictFor(mark: number): Verdict {
  if (mark >= 7.5) return "Build";
  if (mark >= 5.5) return "Narrow it down";
  if (mark >= 3.5) return "Rethink";
  return "Drop";
}

const SYSTEM = `You are a strict but fair examiner marking a project idea like an exam answer.
Mark each criterion as a whole number from 0 to 10, where 5 is an average idea.
Do not inflate marks. Base every reason on the idea and context given; be specific, one or two sentences.
Reply with a single JSON object and nothing else: no markdown, no code fences.`;

function buildPrompt(input: SnapshotInput): string {
  const context = [
    input.purpose && `Purpose: ${input.purpose}`,
    input.users && `Intended users: ${input.users}`,
    input.weeks && `Weeks available: ${input.weeks}`,
    input.skills && `Team skills: ${input.skills}`,
  ].filter(Boolean);

  const criteriaList = CRITERIA.map((c) => `- ${c.key}: ${c.question}`).join("\n");
  const shape = CRITERIA.map((c) => `  "${c.key}": { "score": <0-10>, "reason": "<why>" }`).join(",\n");

  return `IDEA:
${input.idea}

CONTEXT:
${context.length ? context.join("\n") : "(none given)"}

CRITERIA:
${criteriaList}

Return exactly this JSON shape:
{
${shape}
}`;
}

export async function evaluateSnapshot(
  input: SnapshotInput,
  model: GemmaModel = PRIMARY_MODEL,
): Promise<Snapshot> {
  const { data } = await askGemmaJson({ model, system: SYSTEM, prompt: buildPrompt(input), schema: GemmaMarks });

  const criteria = CRITERIA.map((c) => ({
    key: c.key,
    label: c.label,
    score: data[c.key].score,
    reason: data[c.key].reason,
  }));
  // Arithmetic is done here, never by the model.
  const sum = criteria.reduce((acc, c) => acc + c.score, 0);
  const mark = Math.round((sum / criteria.length) * 10) / 10;

  return { model, mark, verdict: verdictFor(mark), criteria };
}
