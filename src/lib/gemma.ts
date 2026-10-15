import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { z } from "zod";

// Every AI call in ProtoEngine goes through this file, to a Gemma 4 model on
// the Gemini API. There is no fallback to any other model or provider.
export const PRIMARY_MODEL = "gemma-4-26b-a4b-it";
export const SECOND_MODEL = "gemma-4-31b-it";
export type GemmaModel = typeof PRIMARY_MODEL | typeof SECOND_MODEL;

export class GemmaError extends Error {}

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GemmaError("GEMINI_API_KEY is not set. Add it to .env.local.");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

/** Remove ``` fences and any text around the outermost JSON object. */
export function extractJson(text: string): string {
  const unfenced = text.replace(/```(?:json)?/gi, "").trim();
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start === -1 || end <= start) return unfenced;
  return unfenced.slice(start, end + 1);
}

async function callGemma(model: GemmaModel, system: string, prompt: string): Promise<string> {
  const response = await getClient().models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: system,
      temperature: 0.3,
      // Thinking on ("high") took ~2 min per marking; minimal keeps it demo-fast.
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
    },
  });
  const text = response.text;
  if (!text) throw new GemmaError(`${model} returned an empty response.`);
  return text;
}

/**
 * Ask Gemma for JSON, parse it and validate it with zod. On a parse or
 * validation failure, retry once with the same model and the error appended
 * to the prompt; after that, throw.
 */
export async function askGemmaJson<T>(opts: {
  model?: GemmaModel;
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
}): Promise<{ data: T; model: GemmaModel }> {
  const model = opts.model ?? PRIMARY_MODEL;
  let prompt = opts.prompt;
  let lastError = "";

  for (let attempt = 1; attempt <= 2; attempt++) {
    const raw = await callGemma(model, opts.system, prompt);
    try {
      const parsed = JSON.parse(extractJson(raw));
      const result = opts.schema.safeParse(parsed);
      if (result.success) return { data: result.data, model };
      lastError = result.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ");
    } catch (err) {
      lastError = `Invalid JSON: ${(err as Error).message}`;
    }
    prompt =
      `${opts.prompt}\n\nYour previous reply could not be used: ${lastError}\n` +
      "Reply again with only the corrected JSON object, nothing else.";
  }
  throw new GemmaError(`${model} did not return valid JSON after 2 attempts. ${lastError}`);
}
