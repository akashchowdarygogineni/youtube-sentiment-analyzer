import { logger } from "../lib/logger";

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const MODEL = "cardiffnlp/twitter-roberta-base-sentiment";
const HF_URL = `https://api-inference.huggingface.co/models/${MODEL}`;

type HFLabel = "LABEL_0" | "LABEL_1" | "LABEL_2";
const LABEL_MAP: Record<HFLabel, "negative" | "neutral" | "positive"> = {
  LABEL_0: "negative",
  LABEL_1: "neutral",
  LABEL_2: "positive",
};

export interface SentimentResult {
  sentiment: "positive" | "negative" | "neutral";
  confidence: number;
}

async function classifyBatch(texts: string[]): Promise<SentimentResult[]> {
  if (!HF_API_KEY) throw new Error("HUGGINGFACE_API_KEY not configured");

  const res = await fetch(HF_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: texts, options: { wait_for_model: true } }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HuggingFace API error ${res.status}: ${body}`);
  }

  const data = await res.json() as any;

  // data is array of arrays of {label, score}
  return data.map((predictions: any[]) => {
    const best = predictions.reduce((a: any, b: any) => (b.score > a.score ? b : a));
    return {
      sentiment: LABEL_MAP[best.label as HFLabel] ?? "neutral",
      confidence: best.score,
    };
  });
}

export async function classifyComments(
  texts: string[],
  batchSize = 32
): Promise<SentimentResult[]> {
  const results: SentimentResult[] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize).map((t) =>
      // HF model has max 128 tokens; truncate to avoid errors
      t.slice(0, 512)
    );

    try {
      const batchResults = await classifyBatch(batch);
      results.push(...batchResults);
    } catch (err) {
      logger.warn({ err, batchStart: i }, "Sentiment batch failed, falling back to neutral");
      // Fallback: neutral for this batch
      results.push(...batch.map(() => ({ sentiment: "neutral" as const, confidence: 0.5 })));
    }

    // Small delay to avoid rate limits
    if (i + batchSize < texts.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return results;
}
