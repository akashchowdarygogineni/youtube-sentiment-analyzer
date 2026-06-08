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

// AFINN-style lexicon for sentiment correction.
// Used to override low-confidence neutral predictions from HuggingFace.
const POSITIVE_WORDS = new Set([
  "thank","thanks","thankyou","good","great","love","awesome","amazing","excellent",
  "fantastic","wonderful","beautiful","perfect","best","brilliant","outstanding",
  "superb","incredible","fabulous","terrific","enjoy","enjoyed","enjoying",
  "helpful","useful","clear","clean","fresh","fun","happy","glad","nice",
  "cool","sweet","pleased","impressed","loved","loved","liked","like",
  "appreciate","appreciated","appreciated","bravo","congratulations","congrats",
  "recommend","recommended","worthy","worth","valuable","top","favorite",
  "favourite","well","win","winner","winning","proud","excited","exciting",
  "hope","helpful","kind","generous","brilliant","genius","inspiring","inspired",
  "motivation","motivating","enthusiastic","delightful","delighted","refreshing",
  "honest","genuine","authentic","talented","creative","innovative","insightful",
  "informative","educational","quality","masterpiece","legendary","goat",
  "underrated","gems","gem","perfection","flawless","solid","smooth","epic",
  "legendary","iconic","timeless","phenomenal","extraordinary","remarkable",
  "class","classy","elegant","polished","professional","clean","crisp",
]);

const NEGATIVE_WORDS = new Set([
  "bad","terrible","hate","awful","worst","disappointing","disappointment",
  "horrible","disgusting","ugly","boring","waste","wasted","stupid","dumb",
  "useless","worthless","trash","garbage","pathetic","ridiculous","nonsense",
  "annoying","frustrated","frustrating","angry","angry","sad","upset",
  "misleading","lied","lie","lying","wrong","incorrect","inaccurate","broken",
  "fix","fixed","error","bug","bugs","issue","issues","problem","problems",
  "fail","failed","failure","poor","mediocre","overrated","fake","clickbait",
  "clickbaited","scam","fraud","worse","regret","regretted","unsubscribe",
  "dislike","disliked","cringe","cringy","embarassing","shame","shameful",
  "toxic","rude","disrespectful","offensive","inappropriate","unfair",
  "biased","bias","propaganda","manipulation","manipulated","misled",
]);

function lexiconScore(text: string): number {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/);
  let score = 0;
  for (const w of words) {
    if (POSITIVE_WORDS.has(w)) score += 1;
    if (NEGATIVE_WORDS.has(w)) score -= 1;
  }
  return score;
}

function lexiconClassify(text: string): SentimentResult | null {
  const score = lexiconScore(text);
  if (score >= 2) return { sentiment: "positive", confidence: Math.min(0.6 + score * 0.05, 0.95) };
  if (score <= -2) return { sentiment: "negative", confidence: Math.min(0.6 + Math.abs(score) * 0.05, 0.95) };
  if (score === 1) return { sentiment: "positive", confidence: 0.55 };
  if (score === -1) return { sentiment: "negative", confidence: 0.55 };
  return null;
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
  return data.map((predictions: any[], i: number) => {
    const best = predictions.reduce((a: any, b: any) => (b.score > a.score ? b : a));
    const hfResult: SentimentResult = {
      sentiment: LABEL_MAP[best.label as HFLabel] ?? "neutral",
      confidence: best.score,
    };

    // Correction layer: when HF predicts neutral with low confidence,
    // use our lexicon to check for clear positive/negative signals.
    if (hfResult.sentiment === "neutral" && hfResult.confidence < 0.75) {
      const lexResult = lexiconClassify(texts[i]);
      if (lexResult) return lexResult;
    }

    // When HF predicts positive/negative but confidence is very low (<0.55),
    // also cross-check with lexicon.
    if (hfResult.confidence < 0.55) {
      const lexResult = lexiconClassify(texts[i]);
      if (lexResult) return lexResult;
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
    const batch = texts.slice(i, i + batchSize).map((t) =>
      // HF model has max 128 tokens; truncate to avoid errors
      t.slice(0, 512)
    );

    try {
      const batchResults = await classifyBatch(batch);
      results.push(...batchResults);
    } catch (err) {
      logger.warn({ err, batchStart: i }, "Sentiment batch failed, falling back to lexicon");
      // Fallback: use lexicon instead of blanket neutral
      results.push(
        ...batch.map((text) => {
          const lex = lexiconClassify(text);
          return lex ?? { sentiment: "neutral" as const, confidence: 0.5 };
        })
      );
    }

    // Small delay to avoid rate limits
    if (i + batchSize < texts.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return results;
}
