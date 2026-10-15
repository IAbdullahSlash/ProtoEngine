import { z } from "zod";
import { askGemmaJson } from "./gemma";

// Evidence comes only from the Hacker News and GitHub APIs. Gemma chooses the
// search terms and writes the summary, but every link shown to the user is
// one these APIs returned; the model never supplies a URL.

export type Source = "Hacker News" | "GitHub";

export interface EvidenceItem {
  id: string; // "hn-1", "gh-1", ...: what Gemma uses to refer to an item
  source: Source;
  title: string;
  url: string;
  description: string;
  stat: string; // "1.2k stars" or "340 points · 120 comments"
  date: string; // YYYY-MM-DD
}

export interface Evidence {
  queries: string[];
  items: EvidenceItem[];
  unavailable: Source[]; // sources whose API call failed
}

export interface Research extends Evidence {
  summary: string;
  gap: string;
  closest: { id: string; why: string }[];
}

const PER_QUERY = 10; // fetched per query, before the relevance filter
const MAX_PER_SOURCE = 8;

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n));
const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");

async function getJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: "application/json", ...headers }, cache: "no-store" });
  if (!res.ok) throw new Error(`${new URL(url).host} returned ${res.status}`);
  return res.json();
}

const HnResponse = z.object({
  hits: z.array(
    z.object({
      objectID: z.string(),
      title: z.string().nullable().optional(),
      url: z.string().nullable().optional(),
      points: z.number().nullable().optional(),
      num_comments: z.number().nullable().optional(),
      created_at: z.string().nullable().optional(),
    }),
  ),
});

async function searchHackerNews(query: string) {
  const url = `https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=${PER_QUERY}&query=${encodeURIComponent(query)}`;
  const { hits } = HnResponse.parse(await getJson(url));
  return hits
    .filter((h) => h.title)
    .map((h) => ({
      key: `hn:${h.objectID}`,
      source: "Hacker News" as const,
      title: h.title!,
      url: `https://news.ycombinator.com/item?id=${h.objectID}`,
      description: h.url ? new URL(h.url).host.replace(/^www\./, "") : "Discussion on Hacker News",
      stat: `${compact(h.points ?? 0)} points · ${compact(h.num_comments ?? 0)} comments`,
      date: day(h.created_at),
    }));
}

const GhResponse = z.object({
  items: z.array(
    z.object({
      full_name: z.string(),
      html_url: z.string(),
      description: z.string().nullable(),
      stargazers_count: z.number(),
      pushed_at: z.string().nullable(),
    }),
  ),
});

async function searchGitHub(query: string) {
  const url = `https://api.github.com/search/repositories?per_page=${PER_QUERY}&q=${encodeURIComponent(query)}`;
  const headers: Record<string, string> = { "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "ProtoEngine" };
  // Optional: raises GitHub's search limit from 10 to 30 requests a minute.
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const { items } = GhResponse.parse(await getJson(url, headers));
  return items.map((r) => ({
    key: `gh:${r.full_name}`,
    source: "GitHub" as const,
    title: r.full_name,
    url: r.html_url,
    description: r.description ?? "",
    stat: `${compact(r.stargazers_count)} stars`,
    date: day(r.pushed_at),
  }));
}

type Found = Omit<EvidenceItem, "id"> & { key: string };

// HN and GitHub both match loosely, so a query can return results that share
// one common word with it. Keep a result only if its text contains every
// keyword of the query that found it (matched on the first 5 letters, so
// "tracking" matches "tracker").
const STOP = new Set(["the", "and", "for", "app", "with", "tool", "using", "based"]);
function relevant(query: string, item: Found): boolean {
  const text = `${item.title} ${item.description}`.toLowerCase();
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));
  return words.every((w) => text.includes(w.slice(0, 5)));
}

/** Run every query against one source; drop loose matches and duplicates; a failed source is reported, not fatal. */
async function collect(source: Source, queries: string[], search: (q: string) => Promise<Found[]>) {
  const results = await Promise.allSettled(
    queries.map(async (q) => (await search(q)).filter((item) => relevant(q, item))),
  );
  const ok = results.filter((r): r is PromiseFulfilledResult<Found[]> => r.status === "fulfilled");
  if (ok.length === 0) {
    console.error(`[research] ${source} failed`, results);
    return { items: [] as Found[], failed: true };
  }
  const seen = new Set<string>();
  const items = ok
    .flatMap((r) => r.value)
    .filter((i) => !seen.has(i.key) && seen.add(i.key))
    .slice(0, MAX_PER_SOURCE);
  return { items, failed: false };
}

const Queries = z.object({ queries: z.array(z.string().trim().min(2).max(60)).min(1).max(4) });

/** Gemma turns the idea into short search queries, then we hit HN and GitHub. */
export async function gatherEvidence(idea: string): Promise<Evidence> {
  const { data } = await askGemmaJson({
    system:
      "You write search queries to find existing products, open-source projects and discussions similar to a project idea. " +
      "Reply with a single JSON object and nothing else: no markdown, no code fences.",
    prompt: `IDEA:\n${idea}\n\nWrite 4 search queries of exactly 2 plain keywords each (no quotes, no operators) that would find tools already doing this. Each query pairs the core action or object with one distinguishing feature, e.g. "whatsapp inventory", "voice bookkeeping". Use common English words that would appear in a project name or description, not the idea's own wording.\n\nReturn exactly: { "queries": ["...", "...", "...", "..."] }`,
    schema: Queries,
  });
  const queries = data.queries.slice(0, 4);

  const [hn, gh] = await Promise.all([
    collect("Hacker News", queries, searchHackerNews),
    collect("GitHub", queries, searchGitHub),
  ]);

  const withId = (prefix: string) => (f: Found, n: number): EvidenceItem => ({
    id: `${prefix}-${n + 1}`,
    source: f.source,
    title: f.title,
    url: f.url,
    description: f.description,
    stat: f.stat,
    date: f.date,
  });
  const items = [...gh.items.map(withId("gh")), ...hn.items.map(withId("hn"))];
  const unavailable: Source[] = [];
  if (gh.failed) unavailable.push("GitHub");
  if (hn.failed) unavailable.push("Hacker News");
  return { queries, items, unavailable };
}

/** Evidence as plain text for a Gemma prompt. */
export function evidenceForPrompt(evidence: Evidence): string {
  if (evidence.items.length === 0) return "(no matching GitHub repositories or Hacker News stories were found)";
  return evidence.items
    .map((i) => `[${i.id}] ${i.source}: ${i.title} (${i.stat}, ${i.date})${i.description ? ` - ${i.description}` : ""}`)
    .join("\n");
}

/**
 * Gemma sometimes cites results by id ("[gh-4, hn-2]") in its prose. Swap
 * each id for the result's title so the text reads naturally.
 */
export function citeTitles(text: string, evidence: Evidence): string {
  const titles = new Map(evidence.items.map((i) => [i.id, i.title]));
  const title = (id: string) => titles.get(id.toLowerCase()) ?? id;
  return text
    .replace(/\s*\[((?:gh|hn)-\d+(?:\s*,\s*(?:gh|hn)-\d+)*)\]/gi, (_, ids: string) =>
      ` (${ids.split(/\s*,\s*/).map(title).join(", ")})`,
    )
    .replace(/\b(?:gh|hn)-\d+\b/gi, title);
}

const Summary = z.object({
  summary: z.string().min(1),
  gap: z.string().min(1),
  closest: z.array(z.object({ id: z.string(), why: z.string().min(1) })).max(3),
});

/** Gemma summarises who is already doing it, citing items only by id. */
export async function summariseEvidence(idea: string, evidence: Evidence): Promise<Research> {
  if (evidence.items.length === 0) {
    return {
      ...evidence,
      summary: "No similar GitHub repositories or Hacker News stories came up for this idea.",
      gap: "Nothing close was found, so the space looks open; check by hand before relying on it.",
      closest: [],
    };
  }

  const { data } = await askGemmaJson({
    system:
      "You are a market researcher. Use only the search results given; do not invent products, links or numbers. " +
      "Reply with a single JSON object and nothing else: no markdown, no code fences.",
    prompt: `IDEA:\n${idea}\n\nSEARCH RESULTS:\n${evidenceForPrompt(evidence)}\n\nReturn exactly:
{
  "summary": "<2-3 sentences: who is already doing something like this, based only on the results>",
  "gap": "<1-2 sentences: what the idea does that none of the results do, or say plainly if a result already covers it>",
  "closest": [ { "id": "<a result id such as gh-1 or hn-2>", "why": "<one sentence on how it overlaps>" } ]
}
List at most 3 closest results, most similar first. Use [] if none of the results is actually similar. In the text fields, refer to results by name, not by id.`,
    schema: Summary,
  });

  const known = new Set(evidence.items.map((i) => i.id));
  const closest = data.closest.filter((c) => known.has(c.id)); // drop any id Gemma made up
  return {
    ...evidence,
    summary: citeTitles(data.summary, evidence),
    gap: citeTitles(data.gap, evidence),
    closest: closest.map((c) => ({ ...c, why: citeTitles(c.why, evidence) })),
  };
}

export async function research(idea: string): Promise<Research> {
  return summariseEvidence(idea, await gatherEvidence(idea));
}
