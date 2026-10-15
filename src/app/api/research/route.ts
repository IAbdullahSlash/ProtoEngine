import { NextResponse } from "next/server";
import { z } from "zod";
import { GemmaError } from "@/lib/gemma";
import { research } from "@/lib/research";

export const runtime = "nodejs";
export const maxDuration = 60;

const Input = z.object({
  idea: z.string().trim().min(20, "Describe the idea in at least 20 characters.").max(4000),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const input = Input.safeParse(body);
  if (!input.success) {
    return NextResponse.json({ error: input.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  try {
    return NextResponse.json(await research(input.data.idea));
  } catch (err) {
    const message = err instanceof GemmaError ? err.message : `Research failed: ${(err as Error).message}`;
    console.error("[research]", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
