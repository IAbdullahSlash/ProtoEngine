import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { evaluationReport, runEvaluation } from "@/lib/evaluation";
import { PRIMARY_MODEL } from "@/lib/gemma";
import { research, type Research } from "@/lib/research";
import { SnapshotInput } from "@/lib/snapshot";
import { getEvaluation } from "@/lib/store";

// The ProtoEngine MCP connector. The server calls Gemma itself, so it gives
// the same marks whichever AI app (Claude, ChatGPT, Gemini CLI, Hermes...)
// is connected to it.

export const runtime = "nodejs";
export const maxDuration = 60;

const text = (t: string, isError = false) => ({ content: [{ type: "text" as const, text: t }], isError });
const failed = (err: unknown) => text(`ProtoEngine failed: ${(err as Error).message}`, true);

function researchReport(r: Research): string {
  const lines = [
    `Searched GitHub and Hacker News for: ${r.queries.join(", ")}`,
    `Who is already doing it: ${r.summary}`,
    `Room left: ${r.gap}`,
    "",
    "Results (every link came from the GitHub or Hacker News API):",
    ...r.items.map((i) => `- [${i.source}] ${i.title} (${i.stat}${i.date ? `, ${i.date}` : ""}) ${i.url}`),
  ];
  if (r.unavailable.length) lines.push("", `Could not reach: ${r.unavailable.join(", ")}`);
  return lines.join("\n");
}

function buildHandler(origin: string) {
  return createMcpHandler(
    (server) => {
      server.registerTool(
        "start_evaluation",
        {
          title: "Mark a project idea",
          description:
            `Marks a project idea like an exam answer, using Google's open model Gemma 4 (${PRIMARY_MODEL}). ` +
            "Searches GitHub and Hacker News for existing work first, then scores six criteria 0-10 with reasons " +
            "(real problem, worth solving, not already done, something new, within reach, someone wants it) and gives " +
            "a mark out of 10 and a verdict: Build, Narrow it down, Rethink or Drop. Takes 10-30 seconds. " +
            "Show the user the mark, verdict and reasons as returned; do not re-score them yourself.",
          inputSchema: z.object({
            idea: z.string().min(20).describe("The project idea in the user's words: what it is and what problem it solves."),
            purpose: z.string().optional().describe("Why they are building it, e.g. hackathon, startup, coursework."),
            users: z.string().optional().describe("Who it is for."),
            weeks: z.number().int().min(1).max(104).optional().describe("Weeks available to build it."),
            skills: z.string().optional().describe("The team's skills, e.g. React, Python."),
          }),
        },
        async (args) => {
          try {
            const input = SnapshotInput.parse(args);
            return text(evaluationReport(await runEvaluation(input), origin));
          } catch (err) {
            return failed(err);
          }
        },
      );

      server.registerTool(
        "research_market",
        {
          title: "Find who is already doing an idea",
          description:
            "Searches GitHub repositories and Hacker News stories for projects similar to an idea, and has Gemma 4 " +
            "summarise who is already doing it and what room is left. Returns only links the APIs returned.",
          inputSchema: z.object({
            idea: z.string().min(20).describe("The project idea to research."),
          }),
        },
        async ({ idea }) => {
          try {
            return text(researchReport(await research(idea)));
          } catch (err) {
            return failed(err);
          }
        },
      );

      server.registerTool(
        "get_evaluation",
        {
          title: "Get a saved evaluation",
          description: "Fetches an evaluation made earlier by start_evaluation or on the ProtoEngine website, by its id.",
          inputSchema: z.object({
            id: z.string().describe("The 10-character evaluation id, e.g. from a ProtoEngine link ending ?e=<id>."),
          }),
        },
        async ({ id }) => {
          try {
            const e = await getEvaluation(id.trim());
            return e ? text(evaluationReport(e, origin)) : text(`No evaluation found with id "${id}".`, true);
          } catch (err) {
            return failed(err);
          }
        },
      );
    },
    { serverInfo: { name: "protoengine", version: "0.1.0" } },
  );
}

async function handle(req: Request): Promise<Response> {
  return buildHandler(new URL(req.url).origin)(req);
}

export { handle as GET, handle as POST, handle as DELETE };
