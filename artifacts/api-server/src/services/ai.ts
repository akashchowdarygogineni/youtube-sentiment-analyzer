import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AISummaryResult {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  commonThemes: string[];
}

export async function generateAISummary(
  videoTitle: string,
  channelName: string,
  sentimentStats: { positive: number; negative: number; neutral: number; total: number },
  topPositiveKeywords: string[],
  topNegativeKeywords: string[],
  topNeutralKeywords: string[],
  samplePositiveComments: string[],
  sampleNegativeComments: string[]
): Promise<AISummaryResult> {
  const positivePercent = ((sentimentStats.positive / sentimentStats.total) * 100).toFixed(1);
  const negativePercent = ((sentimentStats.negative / sentimentStats.total) * 100).toFixed(1);
  const neutralPercent = ((sentimentStats.neutral / sentimentStats.total) * 100).toFixed(1);

  const prompt = `You are an expert YouTube audience analyst. Analyze the following comment data for the video "${videoTitle}" by ${channelName} and provide actionable insights.

Sentiment breakdown (${sentimentStats.total} comments analyzed):
- Positive: ${sentimentStats.positive} (${positivePercent}%)
- Negative: ${sentimentStats.negative} (${negativePercent}%)
- Neutral: ${sentimentStats.neutral} (${neutralPercent}%)

Top positive keywords: ${topPositiveKeywords.join(", ")}
Top negative keywords: ${topNegativeKeywords.join(", ")}
Top neutral keywords: ${topNeutralKeywords.join(", ")}

Sample positive comments:
${samplePositiveComments.map((c, i) => `${i + 1}. "${c}"`).join("\n")}

Sample negative comments:
${sampleNegativeComments.map((c, i) => `${i + 1}. "${c}"`).join("\n")}

Provide a comprehensive audience intelligence report in JSON with these exact fields:
- summary: A 3-4 sentence executive summary of the audience reception
- strengths: Array of 3-5 specific strengths the audience appreciates (be concrete, not generic)
- weaknesses: Array of 2-4 specific concerns or criticisms the audience raised (be concrete)
- commonThemes: Array of 4-6 recurring themes in the comments

Respond with valid JSON only, no markdown.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_tokens: 1024,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(raw);
    return {
      summary: parsed.summary ?? "",
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      commonThemes: Array.isArray(parsed.commonThemes) ? parsed.commonThemes : [],
    };
  } catch {
    return {
      summary: "Unable to generate summary at this time.",
      strengths: [],
      weaknesses: [],
      commonThemes: [],
    };
  }
}
