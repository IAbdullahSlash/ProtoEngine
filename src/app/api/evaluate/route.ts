import { NextResponse } from "next/server";
import { GemmaError } from "@/lib/gemma";
import { evaluateSnapshot, SnapshotInput } from "@/lib/snapshot";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const input = SnapshotInput.safeParse(body);
  if (!input.success) {
    return NextResponse.json({ error: input.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  try {
    const snapshot = await evaluateSnapshot(input.data);
    return NextResponse.json(snapshot);
  } catch (err) {
    const message = err instanceof GemmaError ? err.message : `Gemma call failed: ${(err as Error).message}`;
    console.error("[evaluate]", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
