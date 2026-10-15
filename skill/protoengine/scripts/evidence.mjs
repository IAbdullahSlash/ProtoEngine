#!/usr/bin/env node
// Searches GitHub repositories and Hacker News stories for projects similar to
// an idea, and prints numbered results with links. No API keys needed; set
// GITHUB_TOKEN to raise GitHub's search limit (10 a minute without it).
// Needs Node.js 18+ (built-in fetch). No dependencies.
//
// Usage: node scripts/evidence.mjs "whatsapp inventory" "voice bookkeeping" ...

const PER_QUERY = 10; // fetched per query, before the relevance filter
const MAX_PER_SOURCE = 8;
const STOP = new Set(["the", "and", "for", "app", "with", "tool", "using", "based"]);

const queries = process.argv.slice(2).map((q) => q.trim()).filter(Boolean);
if (queries.length === 0) {
  console.error('Give 1-4 short search queries, e.g.: node scripts/evidence.mjs "whatsapp inventory" "stock tracker"');
  process.exit(1);
}

const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n));

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers: { Accept: "application/json", ...headers } });
  if (!res.ok) throw new Error(`${new URL(url).host} returned HTTP ${res.status}`);
  return res.json();
}

// Both APIs match loosely; keep a result only if its text contains every
// keyword of the query (first 5 letters, so "tracking" matches "tracker").
function relevant(query, text) {
  const t = text.toLowerCase();
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));
  return words.every((w) => t.includes(w.slice(0, 5)));
}

async function github(query) {
  const headers = { "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "protoengine-skill" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const data = await getJson(
    `https://api.github.com/search/repositories?per_page=${PER_QUERY}&q=${encodeURIComponent(query)}`,
    headers,
  );
  return data.items
    .filter((r) => relevant(query, `${r.full_name} ${r.description ?? ""}`))
    .map((r) => ({
      key: r.full_name,
      line: `${r.full_name} (${compact(r.stargazers_count)} stars, updated ${(r.pushed_at ?? "").slice(0, 10)})`,
      detail: r.description ?? "",
      url: r.html_url,
    }));
}

async function hackerNews(query) {
  const data = await getJson(
    `https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=${PER_QUERY}&query=${encodeURIComponent(query)}`,
  );
  return data.hits
    .filter((h) => h.title && relevant(query, `${h.title} ${h.url ?? ""}`))
    .map((h) => ({
      key: h.objectID,
      line: `${h.title} (${compact(h.points ?? 0)} points, ${compact(h.num_comments ?? 0)} comments, ${(h.created_at ?? "").slice(0, 10)})`,
      detail: h.url ? new URL(h.url).host.replace(/^www\./, "") : "",
      url: `https://news.ycombinator.com/item?id=${h.objectID}`,
    }));
}

async function collect(name, search) {
  const settled = await Promise.allSettled(queries.map(search));
  const errors = settled.filter((s) => s.status === "rejected").map((s) => s.reason.message);
  const seen = new Set();
  const items = settled
    .filter((s) => s.status === "fulfilled")
    .flatMap((s) => s.value)
    .filter((i) => !seen.has(i.key) && seen.add(i.key))
    .slice(0, MAX_PER_SOURCE);
  return { name, items, errors };
}

const sources = await Promise.all([collect("GitHub", github), collect("Hacker News", hackerNews)]);

console.log(`Searched for: ${queries.join(", ")}\n`);
for (const { name, items, errors } of sources) {
  console.log(`## ${name}`);
  if (items.length === 0) console.log("(no matching results)");
  items.forEach((i, n) => {
    console.log(`${n + 1}. ${i.line}`);
    if (i.detail) console.log(`   ${i.detail}`);
    console.log(`   ${i.url}`);
  });
  if (errors.length) console.log(`(some searches failed: ${[...new Set(errors)].join("; ")})`);
  console.log("");
}
console.log("Only cite links listed above.");
