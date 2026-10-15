"use client";

import { useEffect, useState } from "react";
import type { Evaluation } from "@/lib/evaluation";
import type { Research } from "@/lib/research";
import type { Verdict } from "@/lib/snapshot";

type Result = Evaluation;

const STAGES = ["Gemma is choosing search terms…", "Searching GitHub and Hacker News…", "Gemma is marking against the evidence…"];

const VERDICT_STYLE: Record<Verdict, string> = {
  Build: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  "Narrow it down": "bg-sky-100 text-sky-900 ring-sky-300",
  Rethink: "bg-amber-100 text-amber-900 ring-amber-300",
  Drop: "bg-rose-100 text-rose-900 ring-rose-300",
};

function barColor(score: number) {
  if (score >= 8) return "bg-emerald-500";
  if (score >= 6) return "bg-sky-500";
  if (score >= 4) return "bg-amber-500";
  return "bg-rose-500";
}

export default function Home() {
  const [form, setForm] = useState({ idea: "", purpose: "", users: "", weeks: "", skills: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [stage, setStage] = useState(0);

  // The API does all three stages in one call; step the label on a timer so
  // the wait reads as progress.
  useEffect(() => {
    if (!loading) return setStage(0);
    const t1 = setTimeout(() => setStage(1), 2500);
    const t2 = setTimeout(() => setStage(2), 5000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [loading]);

  // A link ending ?e=<id> opens a saved evaluation (made here or through the MCP connector).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("e");
    if (!id) return;
    fetch(`/api/evaluation/${encodeURIComponent(id)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load the evaluation.");
        const e = data as Result;
        setResult(e);
        setForm({
          idea: e.input.idea,
          purpose: e.input.purpose ?? "",
          users: e.input.users ?? "",
          weeks: e.input.weeks ? String(e.input.weeks) : "",
          skills: e.input.skills ?? "",
        });
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, weeks: form.weeks ? Number(form.weeks) : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setResult(data as Result);
      window.history.replaceState(null, "", `?e=${(data as Result).id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const input =
    "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">ProtoEngine</h1>
        <p className="mt-2 text-stone-600">
          Write down a project idea and get it marked like an exam answer. Marked by{" "}
          <code className="rounded bg-stone-200 px-1.5 py-0.5 text-sm">gemma-4-26b-a4b-it</code>.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Your idea</span>
          <textarea
            required
            minLength={20}
            rows={5}
            value={form.idea}
            onChange={set("idea")}
            className={input}
            placeholder="What are you building, and what problem does it solve?"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Purpose</span>
            <input value={form.purpose} onChange={set("purpose")} className={input} placeholder="Hackathon, startup, side project…" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Who it&rsquo;s for</span>
            <input value={form.users} onChange={set("users")} className={input} placeholder="Students, small shops, devs…" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Weeks available</span>
            <input type="number" min={1} max={104} value={form.weeks} onChange={set("weeks")} className={input} placeholder="4" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Team skills</span>
            <input value={form.skills} onChange={set("skills")} className={input} placeholder="React, Python, design…" />
          </label>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-stone-900 px-4 py-2.5 font-semibold text-white transition hover:bg-stone-700 disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? STAGES[stage] : "Mark my idea"}
        </button>
      </form>

      {error && (
        <div role="alert" className="mt-6 rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-900">
          <p className="font-semibold">Marking failed</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-stone-500">Mark</p>
              <p className="text-6xl font-bold tabular-nums text-stone-900">
                {result.mark.toFixed(1)}
                <span className="text-2xl font-medium text-stone-400">/10</span>
              </p>
            </div>
            <span className={`rounded-full px-4 py-1.5 text-lg font-semibold ring-1 ${VERDICT_STYLE[result.verdict]}`}>
              {result.verdict}
            </span>
          </div>

          <ul className="mt-6 divide-y divide-stone-100">
            {result.criteria.map((c) => (
              <li key={c.key} className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-stone-800">{c.label}</span>
                  <span className="tabular-nums font-semibold text-stone-700">{c.score}/10</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-stone-100">
                  <div className={`h-2 rounded-full ${barColor(c.score)}`} style={{ width: `${c.score * 10}%` }} />
                </div>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{c.reason}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-stone-400">
            Marked by {result.model}. The overall mark is the mean of the six criteria, computed in code. Evaluation id{" "}
            <code className="text-stone-500">{result.id}</code>.
          </p>
        </section>
      )}

      {result && <EvidenceCard research={result.research} />}

      <ConnectorBox />
    </main>
  );
}

function EvidenceCard({ research }: { research: Research }) {
  const byId = new Map(research.items.map((i) => [i.id, i]));
  const closest = research.closest.flatMap((c) => {
    const item = byId.get(c.id);
    return item ? [{ ...item, why: c.why }] : [];
  });

  return (
    <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">Evidence</h2>
      <p className="mt-2 leading-relaxed text-stone-800">{research.summary}</p>
      <p className="mt-3 rounded-lg bg-stone-50 p-3 text-sm leading-relaxed text-stone-700">
        <span className="font-semibold text-stone-900">Room left: </span>
        {research.gap}
      </p>

      {closest.length > 0 && (
        <>
          <h3 className="mt-5 font-semibold text-stone-800">Closest matches</h3>
          <ul className="mt-2 space-y-3">
            {closest.map((c) => (
              <li key={c.id} className="rounded-lg border border-stone-200 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <a href={c.url} target="_blank" rel="noreferrer" className="font-medium text-stone-900 underline decoration-stone-300 underline-offset-2 hover:decoration-stone-600">
                    {c.title}
                  </a>
                  <span className="text-xs text-stone-500">
                    {c.source} · {c.stat}
                  </span>
                </div>
                <p className="mt-1 text-sm text-stone-600">{c.why}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      {research.items.length > 0 && (
        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-medium text-stone-700">
            All {research.items.length} search results
          </summary>
          <ul className="mt-2 divide-y divide-stone-100 text-sm">
            {research.items.map((i) => (
              <li key={i.id} className="py-2">
                <a href={i.url} target="_blank" rel="noreferrer" className="text-stone-800 underline decoration-stone-300 underline-offset-2 hover:decoration-stone-600">
                  {i.title}
                </a>
                <span className="ml-2 text-xs text-stone-500">
                  {i.source} · {i.stat}
                  {i.date && ` · ${i.date}`}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="mt-4 text-xs text-stone-400">
        Searched for: {research.queries.join(", ")}. Every link above came from the GitHub or Hacker News API.
        {research.unavailable.length > 0 && ` ${research.unavailable.join(" and ")} could not be reached this time.`}
      </p>
    </section>
  );
}

function ConnectorBox() {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/api/mcp`;
  const local = /localhost|127\.0\.0\.1/.test(origin);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: the URL is still visible to select by hand */
    }
  };

  const code = "rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[0.8rem] text-stone-800";
  return (
    <section className="mt-8 rounded-2xl border border-stone-300 bg-stone-900 p-5 text-stone-100 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold">Use it in your own AI</h2>
      <p className="mt-1 text-sm text-stone-300">
        ProtoEngine is also an MCP connector. Your AI app calls it, and the marking still runs on Gemma 4 on our server, so
        you get the same marks in any app. Tools: <code>start_evaluation</code>, <code>research_market</code>,{" "}
        <code>get_evaluation</code>.
      </p>
      <div className="mt-4 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-stone-800 px-3 py-2 font-mono text-sm">{url}</code>
        <button onClick={copy} className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-stone-900 hover:bg-stone-200">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {local && (
        <p className="mt-2 text-xs text-amber-300">
          This is a local address. Claude and ChatGPT on the web need the deployed https URL; Claude Code and Gemini CLI on
          this machine can use it as is.
        </p>
      )}
      <dl className="mt-5 space-y-4 text-sm">
        <div>
          <dt className="font-semibold">Claude (web or desktop)</dt>
          <dd className="mt-1 text-stone-300">Settings → Connectors → Add custom connector, then paste the URL.</dd>
        </div>
        <div>
          <dt className="font-semibold">Claude Code</dt>
          <dd className="mt-1">
            <code className={code}>claude mcp add --transport http protoengine {url}</code>
          </dd>
        </div>
        <div>
          <dt className="font-semibold">ChatGPT</dt>
          <dd className="mt-1 text-stone-300">
            Settings → Apps &amp; Connectors → Advanced settings → turn on Developer mode, then Create, paste the URL and
            choose no authentication.
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Gemini CLI</dt>
          <dd className="mt-1 text-stone-300">
            Add to <code className={code}>~/.gemini/settings.json</code>:{" "}
            <code className={code}>{`"mcpServers": { "protoengine": { "httpUrl": "${url}" } }`}</code>
          </dd>
        </div>
      </dl>
      <p className="mt-5 text-sm text-stone-300">
        Then ask: <span className="italic text-stone-100">&ldquo;Mark my idea with ProtoEngine: …&rdquo;</span>
      </p>
      <div className="mt-5 border-t border-stone-700 pt-4 text-sm text-stone-300">
        <span className="font-semibold text-stone-100">Prefer an Agent Skill?</span> The same marking method is an open{" "}
        <a
          href="https://github.com/IAbdullahSlash/ProtoEngine/tree/main/skill/protoengine"
          target="_blank"
          rel="noreferrer"
          className="text-white underline underline-offset-2"
        >
          SKILL.md
        </a>{" "}
        (Agent Skill Open Standard) with its mark scheme and scripts. Drop it into any agent that loads skills; it uses the
        connector when present and marks on its own when not.
      </div>
    </section>
  );
}
