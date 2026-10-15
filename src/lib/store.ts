import type { Evaluation } from "./evaluation";

// Saved evaluations, so get_evaluation (and shareable links) work by id.
// Uses Upstash Redis over its REST API when UPSTASH_REDIS_REST_URL and
// UPSTASH_REDIS_REST_TOKEN are set; otherwise an in-memory map, which is fine
// on one dev server but is lost on restart and not shared between serverless
// instances.

const TTL_SECONDS = 60 * 60 * 24 * 30;
const key = (id: string) => `protoengine:evaluation:${id}`;

const memory: Map<string, Evaluation> = ((globalThis as { __protoengineStore?: Map<string, Evaluation> })
  .__protoengineStore ??= new Map());

function upstash() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function redis(command: (string | number)[]): Promise<unknown> {
  const cfg = upstash()!;
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const body = (await res.json()) as { result?: unknown; error?: string };
  if (!res.ok || body.error) throw new Error(`Upstash: ${body.error ?? res.status}`);
  return body.result;
}

export const storeKind = () => (upstash() ? "upstash" : "memory");

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}

export async function saveEvaluation(evaluation: Evaluation): Promise<void> {
  if (upstash()) {
    await redis(["SET", key(evaluation.id), JSON.stringify(evaluation), "EX", TTL_SECONDS]);
  } else {
    memory.set(evaluation.id, evaluation);
  }
}

export async function getEvaluation(id: string): Promise<Evaluation | null> {
  if (!/^[a-f0-9]{10}$/.test(id)) return null;
  if (upstash()) {
    const raw = await redis(["GET", key(id)]);
    return typeof raw === "string" ? (JSON.parse(raw) as Evaluation) : null;
  }
  return memory.get(id) ?? null;
}
