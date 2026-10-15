# Contributing to ProtoEngine

Thanks for helping out! ProtoEngine is a Hacktoberfest project, and pull
requests of any size are welcome.

## Getting started

1. Fork the repo and clone your fork.
2. `npm install`
3. `cp .env.example .env.local` and add your `GEMINI_API_KEY`
   (free at https://aistudio.google.com/apikey).
4. `npm run dev` and open http://localhost:3000.

## Ground rules

- **Gemma only.** Every AI call goes to a Gemma 4 model through
  `src/lib/gemma.ts`. Please don't add other model providers or silent
  fallbacks; if Gemma fails, the app should show an error.
- **Validate model output.** Model replies are parsed as JSON and checked with
  zod. Add a schema for any new response shape.
- **Do maths in code.** Marks, totals and sums are computed in TypeScript,
  never by the model.
- **No secrets.** Never commit `.env.local` or any API key.
- Run `npm run lint` and `npx tsc --noEmit` before opening a PR.

## Pull requests

- Keep each PR focused on one change and describe what it does and how you
  tested it.
- Link the issue it fixes, if there is one.
- Be kind in reviews and discussions.
