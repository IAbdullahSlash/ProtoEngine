"use client";

import { useState } from "react";
import type { Snapshot, Verdict } from "@/lib/snapshot";

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
  const [result, setResult] = useState<Snapshot | null>(null);

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
      setResult(data as Snapshot);
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
          {loading ? "Gemma is marking…" : "Mark my idea"}
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
            Marked by {result.model}. The overall mark is the mean of the six criteria, computed in code.
          </p>
        </section>
      )}
    </main>
  );
}
