# ProtoEngine

**Write down a project idea and get it marked like an exam answer, by
[Gemma 4](https://ai.google.dev/gemma) (`gemma-4-26b-a4b-it`) through the
Gemini API.**

Every AI call goes to Gemma; there is no fallback to another model. The call
happens in [`src/lib/gemma.ts`](src/lib/gemma.ts) (`callGemma` →
`ai.models.generateContent({ model: "gemma-4-26b-a4b-it", ... })`). The
marking prompt is in [`src/lib/snapshot.ts`](src/lib/snapshot.ts) and the
research prompts in [`src/lib/research.ts`](src/lib/research.ts).

Built at the Hacktoberfest Hack Day, Lucknow x Integral University
(15–16 Oct 2026), for the Developer Tools track and the MLH "Best Use of
Gemma 4" and "Best Open-Source AI Project" challenges.

## What works today

**Snapshot.** Describe your idea and, optionally, its purpose, users, the weeks
you have and your team's skills. Gemma marks six criteria from 0 to 10, each
with a reason:

| Criterion | Question |
| --- | --- |
| Real problem | Do people actually have this problem today? |
| Worth solving | Is the pain big or frequent enough to matter? |
| Not already done | Is there no existing tool that already solves it well? |
| Something new | Does it bring a new angle, method or insight? |
| Within reach | Can this team build it in the time they have? |
| Someone wants it | Is there a specific group who would use or pay for it? |

The server (not the model) averages the six marks into a mark out of 10 and
gives a verdict: **Build** (≥ 7.5), **Narrow it down** (≥ 5.5),
**Rethink** (≥ 3.5) or **Drop**.

**Evidence.** Before marking, Gemma turns the idea into short search queries
and ProtoEngine searches GitHub and Hacker News (public APIs, no keys
needed). The results go into the marking prompt, so "Not already done" and
"Something new" are marked against real projects rather than the model's
memory. Gemma also summarises who is already doing it, what room is left,
and the closest matches. Every link shown came back from the GitHub or Hacker
News API; Gemma never supplies a URL.

Gemma's reply is parsed as JSON and validated with zod. If it is malformed,
ProtoEngine retries once with the same Gemma model and the error appended to
the prompt; if that also fails, you see an error. Transient Gemini API errors
(HTTP 429/5xx) are retried twice with the same Gemma model.

## API

```bash
curl -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"idea":"...","purpose":"hackathon","users":"students","weeks":2,"skills":"React"}'
```

Returns `{ model, mark, verdict, criteria: [{ key, label, score, reason }], research }`.

```bash
curl -X POST http://localhost:3000/api/research   -H "Content-Type: application/json"   -d '{"idea":"..."}'
```

Returns `{ queries, items: [{ id, source, title, url, description, stat, date }], summary, gap, closest: [{ id, why }], unavailable }`.

## Run it locally

```bash
npm install
cp .env.example .env.local   # then add your GEMINI_API_KEY (GITHUB_TOKEN optional)
npm run dev
```

Open http://localhost:3000.

## Stack

Next.js 14 (App Router), TypeScript, Tailwind CSS, `@google/genai`, zod.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Licensed under [MIT](LICENSE).
