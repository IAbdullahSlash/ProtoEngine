#!/usr/bin/env node
// A minimal agent harness that runs the ProtoEngine Agent Skill on Gemma 4.
// Gemma gets the skill's SKILL.md as instructions and two tools: read a file
// from the skill folder, and run one of the skill's scripts. It shows the
// skill working with an open-weight model, with no MCP server involved.
//
// Usage: GEMINI_API_KEY=... node tools/skill-harness.mjs "<idea and context>"

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const MODEL = "gemma-4-26b-a4b-it";
const MAX_TURNS = 12;
const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../skill/protoengine");
const SCRIPTS = { evidence: "scripts/evidence.mjs", mark: "scripts/mark.mjs" };

const request = process.argv.slice(2).join(" ").trim();
if (!request) {
  console.error('Usage: node tools/skill-harness.mjs "<idea and context>"');
  process.exit(1);
}
if (!process.env.GEMINI_API_KEY) {
  console.error("Set GEMINI_API_KEY.");
  process.exit(1);
}

const tools = [
  {
    functionDeclarations: [
      {
        name: "read_skill_file",
        description: "Read a file from the skill folder, e.g. references/mark-scheme.md.",
        parameters: {
          type: "object",
          properties: { path: { type: "string", description: "Path relative to the skill folder." } },
          required: ["path"],
        },
      },
      {
        name: "run_script",
        description:
          'Run one of the skill\'s scripts. "evidence" takes 1-4 search queries; "mark" takes the six scores in order.',
        parameters: {
          type: "object",
          properties: {
            script: { type: "string", enum: Object.keys(SCRIPTS) },
            args: { type: "array", items: { type: "string" } },
          },
          required: ["script", "args"],
        },
      },
    ],
  },
];

function readSkillFile(path) {
  const full = resolve(SKILL_DIR, path);
  if (relative(SKILL_DIR, full).startsWith("..")) return "Error: path is outside the skill folder.";
  try {
    return readFileSync(full, "utf8");
  } catch {
    return `Error: no file at ${path}.`;
  }
}

function runScript(script, args) {
  if (!SCRIPTS[script]) return `Error: unknown script "${script}".`;
  try {
    return execFileSync(process.execPath, [join(SKILL_DIR, SCRIPTS[script]), ...args.map(String)], {
      cwd: SKILL_DIR,
      encoding: "utf8",
      timeout: 30_000,
    });
  } catch (err) {
    return `Error (exit ${err.status}): ${err.stderr || err.message}`;
  }
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const skill = readFileSync(join(SKILL_DIR, "SKILL.md"), "utf8");
const systemInstruction =
  "You are an agent with one Agent Skill loaded. Follow it exactly. The ProtoEngine MCP tools are NOT available, " +
  "so do steps 3 to 6 yourself using your tools. Do not ask the user questions; use the details given.\n\n" +
  `<skill>\n${skill}\n</skill>`;

const contents = [{ role: "user", parts: [{ text: request }] }];

for (let turn = 1; turn <= MAX_TURNS; turn++) {
  let response;
  for (let attempt = 0; ; attempt++) {
    try {
      response = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: { systemInstruction, tools, temperature: 0.3, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } },
      });
      break;
    } catch (err) {
      if (attempt < 2 && [429, 500, 503].includes(err.status)) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }

  const calls = response.functionCalls ?? [];
  contents.push(response.candidates[0].content);
  if (calls.length === 0) {
    console.log(`\n=== Gemma's report (${MODEL}, ${turn} turns) ===\n`);
    console.log(response.text);
    process.exit(0);
  }

  const parts = calls.map((call) => {
    const { name, args = {} } = call;
    console.log(`[turn ${turn}] ${name} ${JSON.stringify(args)}`);
    const output = name === "read_skill_file" ? readSkillFile(args.path) : runScript(args.script, args.args ?? []);
    return { functionResponse: { id: call.id, name, response: { output } } };
  });
  contents.push({ role: "user", parts });
}

console.error(`Stopped after ${MAX_TURNS} turns without a final report.`);
process.exit(1);
