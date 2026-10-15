import { gatherEvidence, summariseEvidence, type Research } from "./research";
import { evaluateSnapshot, type Snapshot, type SnapshotInput } from "./snapshot";
import { newId, saveEvaluation } from "./store";

export type Evaluation = Snapshot & {
  id: string;
  createdAt: string;
  input: SnapshotInput;
  research: Research;
};

/** The full pipeline, shared by the web app (/api/evaluate) and the MCP connector. */
export async function runEvaluation(input: SnapshotInput): Promise<Evaluation> {
  // Search first, then mark against the evidence while Gemma summarises it.
  const evidence = await gatherEvidence(input.idea);
  const [snapshot, research] = await Promise.all([
    evaluateSnapshot(input, evidence),
    summariseEvidence(input.idea, evidence),
  ]);

  const evaluation: Evaluation = {
    id: newId(),
    createdAt: new Date().toISOString(),
    input,
    ...snapshot,
    research,
  };
  try {
    await saveEvaluation(evaluation);
  } catch (err) {
    // Saving is a convenience; the marks are still valid without it.
    console.error("[evaluation] could not save", err);
  }
  return evaluation;
}

/** A plain-text report of an evaluation, for AI clients reading MCP results. */
export function evaluationReport(e: Evaluation, baseUrl?: string): string {
  const lines = [
    `ProtoEngine evaluation ${e.id} (marked by ${e.model})`,
    `Mark: ${e.mark.toFixed(1)}/10 - Verdict: ${e.verdict}`,
    "",
    ...e.criteria.map((c) => `- ${c.label}: ${c.score}/10. ${c.reason}`),
    "",
    `Who is already doing it: ${e.research.summary}`,
    `Room left: ${e.research.gap}`,
  ];
  const byId = new Map(e.research.items.map((i) => [i.id, i]));
  const closest = e.research.closest.flatMap((c) => {
    const item = byId.get(c.id);
    return item ? [`- ${item.title} (${item.source}, ${item.stat}) ${item.url}: ${c.why}`] : [];
  });
  if (closest.length) lines.push("Closest matches:", ...closest);
  if (baseUrl) lines.push("", `View it: ${baseUrl}/?e=${e.id}`);
  lines.push("", "The mark is the mean of the six criteria, computed in code. Links come from the GitHub and Hacker News APIs.");
  return lines.join("\n");
}
