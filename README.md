# ProtoEngine

> **A Hacktoberfest 2026 (Hacktober '26) project, and fully open source.**
> Built at the Hacktoberfest Hack Day, Lucknow x Integral University, and
> released under the [MIT licence](LICENSE). Issues and pull requests are
> welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).

**Write down a project idea and get it marked like an exam answer, by
[Gemma 4](https://ai.google.dev/gemma) (`gemma-4-26b-a4b-it`) through the
Gemini API.**

Every AI call goes to Gemma; there is no fallback to another model. The call
happens in [`src/lib/gemma.ts`](src/lib/gemma.ts) (`callGemma` →
`ai.models.generateContent({ model: "gemma-4-26b-a4b-it", ... })`). The
marking prompt is in [`src/lib/snapshot.ts`](src/lib/snapshot.ts) and the
research prompts in [`src/lib/research.ts`](src/lib/research.ts).

Made for Hacktoberfest 2026 at the Hacktoberfest Hack Day, Lucknow x Integral
University (15–16 Oct 2026), for the Developer Tools track and the MLH "Best
Use of Gemma 4" and "Best Open-Source AI Project" challenges. Every file in
this repository was written during the event.

## An exam board for ideas

| Exam board | ProtoEngine |
| --- | --- |
| Answer sheet | Your idea, plus its purpose, users, weeks available and team skills |
| Evidence | Real GitHub repositories and Hacker News stories, searched before marking |
| Examiner | Gemma 4 (`gemma-4-26b-a4b-it`) marks six criteria with reasons |
| Mark scheme | An open [Agent Skill](skill/protoengine/SKILL.md) any agent can load |
| Exam hall anywhere | An MCP connector, so the same engine works inside Claude, ChatGPT or Gemini CLI |

## What works today

### Snapshot: the mark

Describe your idea and, optionally, its purpose, users, the weeks you have
and your team's skills. Gemma marks six criteria from 0 to 10, each with a
reason:

| Criterion | Question |
| --- | --- |
| Real problem | Do people actually have this problem today? |
| Worth solving | Is the pain big or frequent enough to matter? |
| Not already done | Is there no existing tool that already solves it well? |
| Something new | Does it bring a new angle, method or insight? |
| Within reach | Can this team build it in the time they have? |
| Someone wants it | Is there a specific group who would use or pay for it? |

The server, not the model, averages the six marks into a mark out of 10 and
gives a verdict: **Build** (≥ 7.5), **Narrow it down** (≥ 5.5),
**Rethink** (≥ 3.5) or **Drop**.

### Evidence: who is already doing it

Before marking, Gemma turns the idea into four 2-keyword search queries.
ProtoEngine then searches GitHub and Hacker News (public APIs, no keys needed)
and drops loose matches that don't contain the query's keywords. The results go into the
marking prompt, so "Not already done" and "Something new" are marked against
real projects rather than the model's memory. Gemma also summarises who is
already doing it, what room is left, and the three closest matches.

Every link shown came back from the GitHub or Hacker News API. Gemma refers
to results only by id, and the code turns those ids into titles and links, so
the model never supplies a URL.

### MCP connector: use it in your own AI

ProtoEngine is also a remote MCP server at `/api/mcp`
([`src/app/api/mcp/route.ts`](src/app/api/mcp/route.ts)), built with
`mcp-handler`. The server calls Gemma itself, so you get the same marks
whichever AI app connects to it.

| Tool | What it does |
| --- | --- |
| `start_evaluation` | Researches and marks an idea; returns the mark, verdict, reasons, closest matches and a link |
| `research_market` | GitHub + Hacker News search with a Gemma summary of who is already doing it |
| `get_evaluation` | Fetches a saved evaluation by its id |

Connect it (Claude and ChatGPT need the public `https://` URL of a
deployment; Claude Code and Gemini CLI can also use `http://localhost:3000/api/mcp`):

- **Claude (web or desktop):** Settings → Connectors → Add custom connector → paste `https://<your-deployment>/api/mcp`
- **Claude Code:** `claude mcp add --transport http protoengine https://<your-deployment>/api/mcp`
- **ChatGPT:** Settings → Apps & Connectors → Advanced settings → Developer mode → Create, paste the URL, no authentication
- **Gemini CLI:** in `~/.gemini/settings.json`, `"mcpServers": { "protoengine": { "httpUrl": "https://<your-deployment>/api/mcp" } }`

Then ask: *"Mark my idea with ProtoEngine: …"*

Every evaluation gets an id and a link (`/?e=<id>`) that opens it on the
website, whether it was made on the site or through the connector.
Evaluations are kept in Upstash Redis when it is configured, otherwise in
memory.

### Agent Skill: the open mark scheme

The marking method is also an [Agent Skill](https://agentskills.io) in
[`skill/protoengine/`](skill/protoengine/SKILL.md). It follows the Agent Skill
Open Standard and passes the official `skills-ref` validator. It contains:

- `SKILL.md`: when and how to mark an idea, the report format and edge cases.
- `references/mark-scheme.md`: what each score from 0 to 10 means for each criterion.
- `scripts/evidence.mjs`: GitHub + Hacker News search (Node 18+, no dependencies, no keys).
- `scripts/mark.mjs`: turns the six scores into the mark and verdict, so the model never does the arithmetic.

An agent with the ProtoEngine connector calls `start_evaluation`; one without
it follows the skill's steps and runs the scripts. To try the skill on Gemma 4
with no connector, run the bundled harness. It gives Gemma the SKILL.md and lets
it call only the skill's two scripts:

```bash
GEMINI_API_KEY=... node tools/skill-harness.mjs "Mark my idea: ... Purpose: ... Weeks: 2. Skills: ..."
```

To use the skill in your own agent, copy `skill/protoengine/` into the agent's
skills folder (for example `.claude/skills/` for Claude Code).

## How it works

```text
idea + context
   │
   ├─ Gemma: 4 search queries ───────────► GitHub search + Hacker News (Algolia)
   │                                           │  relevance filter, dedupe
   │                                           ▼
   │                                       evidence (numbered results)
   │                       ┌───────────────────┴───────────────────┐
   │                       ▼                                       ▼
   │        Gemma: mark 6 criteria vs evidence      Gemma: summary, room left, closest
   │                       │                                       │
   │                       └──────────────► TypeScript: mean, verdict, ids → titles/links
   │                                                    │
   └──────────────────────────────────────────► saved with an id → web page, /?e=<id>, MCP tools
```

Gemma's replies are requested as JSON, fences are stripped, and every reply is
validated with zod. If a reply is malformed, ProtoEngine retries once with the
same Gemma model and the error appended to the prompt; if that also fails,
you see an error. Transient Gemini API errors (HTTP 429 or 5xx) are retried
twice with the same model. Gemma's thinking is set to `minimal`: with it on,
one marking took about two minutes instead of about ten seconds.

## Project structure

```text
src/lib/gemma.ts           The only place a model is called: Gemma 4, JSON + zod, retries
src/lib/snapshot.ts        Six criteria, marking prompt, mean and verdict
src/lib/research.ts        Search queries, GitHub + Hacker News, evidence summary
src/lib/evaluation.ts      Full pipeline shared by the website and the MCP connector
src/lib/store.ts           Saved evaluations: Upstash Redis or in memory
src/app/page.tsx           The one-page UI
src/app/api/evaluate/      POST: research + mark an idea
src/app/api/research/      POST: research only
src/app/api/evaluation/    GET /api/evaluation/<id>: a saved evaluation
src/app/api/mcp/           The MCP connector
skill/protoengine/         The Agent Skill (SKILL.md, mark scheme, scripts)
tools/skill-harness.mjs    Runs the Agent Skill on Gemma 4
```

## Run it locally

You need Node.js 20 or newer and a free Gemini API key from
[Google AI Studio](https://aistudio.google.com/apikey).

```bash
git clone https://github.com/IAbdullahSlash/ProtoEngine---MLH.git
cd ProtoEngine---MLH
npm install
cp .env.example .env.local
npm run dev
```

Add your key to `.env.local`, then open http://localhost:3000.

| Variable | Needed | What for |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | All Gemma calls |
| `GITHUB_TOKEN` | No | Raises GitHub's search limit from 10 to 30 a minute; each marking uses 4 searches. A token with no scopes is enough. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | No | Keeps evaluations across restarts and serverless instances; without them they live in memory |

Check the code with `npm run lint` and `npx tsc --noEmit`.

To try the MCP connector locally with the official MCP Inspector:

```bash
npx @modelcontextprotocol/inspector --cli http://localhost:3000/api/mcp --transport http --method tools/list
```

To validate the Agent Skill with the official validator (needs `uv`):

```bash
uvx --from "git+https://github.com/agentskills/agentskills#subdirectory=skills-ref" skills-ref validate skill/protoengine
```

## API

Mark an idea (research + marking):

```bash
curl -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"idea":"...","purpose":"hackathon","users":"students","weeks":2,"skills":"React"}'
```

Only `idea` is required, and it must be at least 20 characters. Returns
`{ id, createdAt, input, model, mark, verdict, criteria: [{ key, label, score, reason }], research }`.

Research only:

```bash
curl -X POST http://localhost:3000/api/research \
  -H "Content-Type: application/json" \
  -d '{"idea":"..."}'
```

Returns `{ queries, items: [{ id, source, title, url, description, stat, date }], summary, gap, closest: [{ id, why }], unavailable }`.

Get a saved evaluation: `GET /api/evaluation/<id>`.

Errors come back as `{ "error": "..." }` with status 400 for invalid input,
404 for an unknown evaluation id, and 502 when Gemma fails.

## Deploy

ProtoEngine is a standard Next.js app and runs on Vercel or any Node.js host.
Set `GEMINI_API_KEY` (and optionally `GITHUB_TOKEN` and the Upstash variables)
in the host's environment settings. Set the Upstash variables on serverless hosts;
otherwise `get_evaluation` and `/?e=<id>` links only work on the instance that
made the evaluation. The API routes allow up to 60 seconds per request.

## Known limitations

- The Gemini API sometimes returns HTTP 500 for Gemma; retries usually recover,
  but a marking can then take 20–30 seconds instead of the usual 12–18.
- GitHub and Hacker News match loosely. The keyword filter removes most noise,
  but some unrelated results can still appear in the full results list.
- Marks are one model's judgement on what you wrote; treat them as a structured
  second opinion, not a verdict on your idea.
- The website's prompt in `src/lib/snapshot.ts` and the skill's mark scheme are
  kept in sync by hand.

## Built from open pieces

| Piece | Role | Licence |
| --- | --- | --- |
| [Gemma 4](https://ai.google.dev/gemma) | Examiner: search queries, marking, summaries | Apache 2.0 (open weights) |
| [Gemini API](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api) + [`@google/genai`](https://github.com/googleapis/js-genai) | Hosted access to Gemma | Apache 2.0 (SDK) |
| [Hacker News Search API](https://hn.algolia.com/api) | Evidence: discussions and launches | Public API |
| [GitHub REST API](https://docs.github.com/en/rest/search/search#search-repositories) | Evidence: existing repositories | Public API |
| [Model Context Protocol](https://modelcontextprotocol.io) + [`mcp-handler`](https://github.com/vercel/mcp-handler) | The connector | Apache 2.0 (SDK and `mcp-handler`) |
| [Agent Skills](https://agentskills.io) | The open mark scheme format | Open standard |
| [Next.js](https://nextjs.org), [Tailwind CSS](https://tailwindcss.com), [zod](https://zod.dev) | App, styling, validation | MIT |

## Contributing

ProtoEngine is open source and was made for Hacktoberfest 2026, so
contributions of any size are welcome. See
[CONTRIBUTING.md](CONTRIBUTING.md). Licensed under [MIT](LICENSE).
