# ProtoEngine

Write down a project idea and get it marked like an exam answer. Built at the
Hacktoberfest Hack Day, Lucknow x Integral University (15–16 Oct 2026), for the
Developer Tools track. We are aiming at both prize categories:

- **Best Use of Gemma 4** (Google DeepMind): rewards multimodal use (text +
  images), a focused AI tool, and fast prototyping on the Gemini API.
- **Best Open-Source AI Project** (DigitalOcean): open-weight AI must be an
  important part of the project; public repo with an open-source licence. It
  names an agent skill (must follow the Agent Skill Open Standard), an
  open-weight model, and a model harness as examples that may be combined.

## The pitch: an exam board for ideas

Every part maps to how a real exam is marked, and every part is open:

| Exam board | ProtoEngine |
| --- | --- |
| Answer sheet | Idea typed in, or a photo of a sketch (Gemma vision) |
| Evidence | Real Hacker News + GitHub results, fed into the marking |
| Examiner | `gemma-4-26b-a4b-it` marks six criteria |
| Moderator | `gemma-4-31b-it` re-marks; big disagreements are flagged |
| Mark scheme | `SKILL.md`: the method as an Agent Skill any agent can load |
| Exam hall anywhere | MCP connector: the same engine inside Claude, ChatGPT, Gemini CLI, Hermes |

One-line pitch: "ProtoEngine marks your idea like an exam, with evidence, a
second marker and an open mark scheme, and it runs inside any AI agent."

Demo table tactics: show a QR code to the deployed URL so judges try their own
idea on their phone; have a sketch on paper ready to photograph; show the MCP
connector working inside an AI app; show the SKILL.md file.

This is a from-scratch rebuild of the author's earlier project idea-eval
(github.com/IAbdullahSlash/idea-evaluator). Reuse its ideas, not its files:
every file in this repo is written during the event.

## Hard requirements (judges check these)

1. **Gemma through the Gemini API.** Every AI call goes to a Gemma 4 model:
   - `gemma-4-26b-a4b-it`: primary marker
   - `gemma-4-31b-it`: second marker
   No Gemini, Groq or other model may silently answer instead. If Gemma fails,
   show an error; do not fall back to another provider.
2. **README names the model** in its first few lines, and shows where in the
   code the call happens.
3. **Open source:** MIT LICENSE, CONTRIBUTING.md, `hacktoberfest` topic.
4. **No secrets in git.** `GEMINI_API_KEY` lives in `.env.local`; commit only
   `.env.example`.
5. **Code freeze: 16 Oct, 2:30 PM IST.** A small thing that works beats a big
   thing that doesn't. Stop adding features at 2:00 PM.

## Stack

- Next.js 14 (App Router), TypeScript, Tailwind
- `@google/genai` SDK for Gemma (see the Gemma quickstart: `ai.models.generateContent({ model: "gemma-4-26b-a4b-it", ... })`)
- zod for every model response
- `mcp-handler` + MCP SDK for the connector at `/api/mcp`
- Upstash Redis for saved evaluations (optional; skip if short on time)
- Hosting: Vercel

## Gemma notes

- Ask for JSON in the prompt, then `JSON.parse` + zod-validate. Do not assume
  Gemini-style `responseSchema` works with Gemma until you have tested it.
- Strip code fences before parsing. On a parse or zod failure, retry once with
  the same Gemma model and the error appended to the prompt; then fail loudly.
- All arithmetic (overall mark, weeks, costs) is done in TypeScript, never by
  the model.

## Scope, in build order

Build each step end to end (UI + API + test with a real idea) before starting
the next. Steps 1–4 are the demo; 5+ are stretch. Steps are ordered by prize
value per hour of work.

1. **Snapshot** (`/api/evaluate`) ✅ done: idea + context (purpose, users, weeks
   available, team skills) → Gemma marks six criteria 0–10 with a reason each:
   real problem, worth solving, not already done, something new, within reach,
   someone wants it. Server computes the mean as the mark /10 and a verdict:
   Build (≥7.5), Narrow it down (≥5.5), Rethink (≥3.5), Drop.
2. **Research as evidence** (`/api/research`) ✅ done: Hacker News (Algolia API) and
   GitHub search, no keys needed. Gemma picks the search terms and summarises
   who is already doing it. Only show links that came back from the APIs. The
   same results are passed into the Snapshot prompt, so "Not already done"
   and "Something new" are marked against real evidence, not the model's
   memory.
3. **MCP connector** (`/api/mcp`) ✅ done: tools `start_evaluation`,
   `research_market`, `get_evaluation`. The server calls Gemma itself, so the
   connector works the same in Claude, ChatGPT and Gemini CLI.
4. **SKILL.md** in `/skill/protoengine/`: the marking method as an Agent Skill
   that follows the Agent Skill Open Standard (frontmatter `name` +
   `description`, instructions in Markdown). It tells an agent how to mark an
   idea and to use the MCP tools when available. Cheap, and named in the
   Open-Source AI prize.
5. **Image input:** a photo of a sketch or whiteboard → Gemma (vision) extracts
   the idea text into the form. Named in the Gemma prize ("multimodal").
6. **Moderator:** `gemma-4-31b-it` re-marks the six criteria in parallel; flag
   any criterion where the two markers differ by 3 or more.
7. **Ollama + Hermes Agent demo:** same prompts against local `gemma4` via
   Ollama when `USE_OLLAMA=1` (explicit, still Gemma, never a silent
   fallback). Then show Hermes Agent (open-source harness by Nous Research,
   works with Ollama, loads Markdown skills) using the ProtoEngine skill on a
   local Gemma. Only if it runs on the demo laptop; Hermes may need WSL on
   Windows. Test before committing to it.
8. **Plan:** phases sized to the weeks available, summed in code.

Suggested timing for 16 Oct: research before the 10:15 sprint if possible;
MCP + SKILL.md in the 10:15–12:45 sprint; image input and moderator in
1:30–2:00; 2:00–2:30 is README, deploy, QR code and demo rehearsal only.

Anything past step 3 that isn't finished by the freeze gets removed from the
README and the deck, not left half-working.

## UI

One page: idea form (with "photo of a sketch" option) → mark card (big mark,
verdict, six criteria with reasons, moderator flags) → evidence list →
"Use it in your own AI" box with the connector URL, per-app steps and a link
to the SKILL.md. Clean, readable, works on a laptop at a demo table and on a
judge's phone.

## Working rules

- Commit after each working step with a clear message; push often (the commit
  history shows the work happened at the event).
- Keep the README honest: list only features that work.
- When unsure about a Gemma API detail, check
  https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api rather than guessing.
