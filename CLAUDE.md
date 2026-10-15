# ProtoEngine

Write down a project idea and get it marked like an exam answer. Built at the
Hacktoberfest Hack Day, Lucknow x Integral University (15–16 Oct 2026), for the
Developer Tools track and the MLH "Best Use of Gemma 4" challenge.

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
the next. Steps 1–3 are the demo; 4+ are stretch.

1. **Snapshot** (`/api/evaluate`): idea + context (purpose, users, weeks
   available, team skills) → Gemma marks six criteria 0–10 with a reason each:
   real problem, worth solving, not already done, something new, within reach,
   someone wants it. Server computes the mean as the mark /10 and a verdict:
   Build (≥7.5), Narrow it down (≥5.5), Rethink (≥3.5), Drop.
2. **Research** (`/api/research`): Hacker News (Algolia API) and GitHub search,
   no keys needed. Gemma summarises who is already doing it. Only show links
   that came back from the APIs.
3. **MCP connector** (`/api/mcp`): tools `start_evaluation`,
   `research_market`, `get_evaluation`. The server calls Gemma itself, so the
   connector works the same in Claude, ChatGPT and Gemini CLI.
4. **Second marker:** `gemma-4-31b-it` re-marks the six criteria; flag any
   criterion where the two markers differ by 3 or more.
5. **Plan:** phases sized to the weeks available, summed in code.
6. **SKILL.md** in `/skill`: the marking method as an Agent Skill.
7. **Image input:** a photo of a sketch → Gemma extracts the idea text.
8. **Ollama fallback:** same prompts against local `gemma4` via Ollama when
   `USE_OLLAMA=1`.

Anything past step 3 that isn't finished by the freeze gets removed from the
README and the deck, not left half-working.

## UI

One page: idea form → mark card (big mark, verdict, six criteria with reasons)
→ research list → "Use it in your own AI" box with the connector URL and
per-app steps. Clean, readable, works on a laptop at a demo table.

## Working rules

- Commit after each working step with a clear message; push often (the commit
  history shows the work happened at the event).
- Keep the README honest: list only features that work.
- When unsure about a Gemma API detail, check
  https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api rather than guessing.
