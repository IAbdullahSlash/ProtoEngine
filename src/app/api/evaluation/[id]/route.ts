import { NextResponse } from "next/server";
import { getEvaluation } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const evaluation = await getEvaluation(params.id);
    if (!evaluation) return NextResponse.json({ error: "Evaluation not found." }, { status: 404 });
    return NextResponse.json(evaluation);
  } catch (err) {
    console.error("[evaluation]", err);
    return NextResponse.json({ error: "Could not load the evaluation." }, { status: 500 });
  }
}
