import Sentiment from "sentiment";
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

// AFINN-165 lexicon (3300+ words, runs in-process, no network)
const afinn = new Sentiment();

function localClassify(text: string): SentimentResult {
  const result = afinn.analyze(text);
  const score = result.score;
  const wordCount = Math.max(result.tokens.length, 1);
  const normalised = score / wordCount; // per-word score avoids length bias

  if (score > 0 && normalised >= 0.05) {
    // confidence scales with signal strength, capped at 0.95
    const confidence = Math.min(0.5 + Math.abs(normalised) * 3, 0.95);
    return { sentiment: "positive", confidence };
  }
  if (score < 0 && normalised <= -0.05) {
    const confidence = Math.min(0.5 + Math.abs(normalised) * 3, 0.95);
    return { sentiment: "negative", confidence };
  }
  // Slight positive lean still neutral
  return { sentiment: "neutral", confidence: 0.6 };
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
    // Short timeout so we fail fast to the local fallback
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HuggingFace API error ${res.status}: ${body}`);
  }

  const data = await res.json() as any;

  return data.map((predictions: any[], i: number) => {
    const best = predictions.reduce((a: any, b: any) => (b.score > a.score ? b : a));
    const hfResult: SentimentResult = {
      sentiment: LABEL_MAP[best.label as HFLabel] ?? "neutral",
      confidence: best.score,
    };

    // When HF is uncertain, cross-check with local AFINN
    if (hfResult.confidence < 0.70) {
      const local = localClassify(texts[i]);
      // If local disagrees and is more confident, prefer local
      if (local.sentiment !== "neutral" && local.confidence > hfResult.confidence) {
        return local;
      }
    }

    return hfResult;
  });
}

export async function classifyComments(
  texts: string[],
  batchSize = 32
): Promise<SentimentResult[]> {
  const results: SentimentResult[] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize).map((t) => t.slice(0, 512));

    try {
      const batchResults = await classifyBatch(batch);
      results.push(...batchResults);
    } catch (err) {
      // HuggingFace unreachable or errored — use local AFINN classifier
      logger.warn(
        { err: (err as Error).message, batchStart: i },
        "HuggingFace unavailable, using local AFINN classifier"
      );
      results.push(...batch.map((text) => localClassify(text)));
    }

    if (i + batchSize < texts.length) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  return results;
}
