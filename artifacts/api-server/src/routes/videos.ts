import { Router } from "express";
import { db, videosTable, commentsTable } from "@workspace/db";
import { eq, desc, and, like, sql } from "drizzle-orm";
import { extractVideoId, fetchVideoDetails, fetchComments } from "../services/youtube";
import { classifyComments } from "../services/sentiment";
import { extractKeywords } from "../services/keywords";
import { generateAISummary } from "../services/ai";
import { logger } from "../lib/logger";

const router = Router();

// GET /videos
router.get("/videos", async (_req, res) => {
  try {
    const videos = await db.select().from(videosTable).orderBy(desc(videosTable.createdAt));
    res.json(videos);
  } catch (err) {
    logger.error({ err }, "Failed to list videos");
    res.status(500).json({ error: "Failed to list videos" });
  }
});

// POST /videos/analyze
router.post("/videos/analyze", async (req, res): Promise<void> => {
  const { url } = req.body as { url?: string };
  if (!url) { res.status(400).json({ error: "url is required" }); return; }

  const videoId = extractVideoId(url);
  if (!videoId) { res.status(400).json({ error: "Invalid YouTube URL or video ID" }); return; }

  try {
    const existing = await db
      .select()
      .from(videosTable)
      .where(eq(videosTable.youtubeId, videoId))
      .limit(1);

    if (existing.length > 0) {
      res.status(201).json(existing[0]);
      return;
    }

    const details = await fetchVideoDetails(videoId);

    const [video] = await db
      .insert(videosTable)
      .values({ ...details, status: "processing" })
      .returning();

    res.status(201).json(video);

    processVideo(video.id, videoId).catch((err) => {
      logger.error({ err, videoId }, "Background video processing failed");
    });
  } catch (err: unknown) {
    logger.error({ err }, "Failed to analyze video");
    const msg = err instanceof Error ? err.message : "Failed to analyze video";
    res.status(500).json({ error: msg });
  }
});

async function processVideo(dbId: number, youtubeId: string): Promise<void> {
  try {
    const rawComments = await fetchComments(youtubeId, 500);
    const texts = rawComments.map((c) => c.text);
    const sentiments = await classifyComments(texts);

    if (rawComments.length > 0) {
      const rows = rawComments.map((c, i) => ({
        videoId: dbId,
        youtubeCommentId: c.youtubeCommentId,
        text: c.text,
        authorName: c.authorName,
        likeCount: c.likeCount,
        publishedAt: c.publishedAt,
        sentiment: (sentiments[i]?.sentiment ?? "neutral") as "positive" | "negative" | "neutral",
        confidence: sentiments[i]?.confidence ?? 0.5,
      }));

      for (let i = 0; i < rows.length; i += 100) {
        await db.insert(commentsTable).values(rows.slice(i, i + 100));
      }
    }

    await db
      .update(videosTable)
      .set({ status: "completed", commentCount: rawComments.length, updatedAt: new Date() })
      .where(eq(videosTable.id, dbId));
  } catch (err) {
    await db
      .update(videosTable)
      .set({ status: "error", updatedAt: new Date() })
      .where(eq(videosTable.id, dbId));
    throw err;
  }
}

// GET /videos/:id
router.get("/videos/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const [video] = await db.select().from(videosTable).where(eq(videosTable.id, id)).limit(1);
    if (!video) { res.status(404).json({ error: "Video not found" }); return; }

    const sentimentRows = await db
      .select({
        sentiment: commentsTable.sentiment,
        count: sql<number>`count(*)::int`,
      })
      .from(commentsTable)
      .where(eq(commentsTable.videoId, id))
      .groupBy(commentsTable.sentiment);

    const summary = { positive: 0, negative: 0, neutral: 0, total: 0 };
    for (const row of sentimentRows) {
      const s = row.sentiment as keyof Omit<typeof summary, "total">;
      summary[s] += row.count;
      summary.total += row.count;
    }

    const t = summary.total || 1;
    res.json({
      ...video,
      sentimentSummary: {
        ...summary,
        positivePercent: parseFloat(((summary.positive / t) * 100).toFixed(1)),
        negativePercent: parseFloat(((summary.negative / t) * 100).toFixed(1)),
        neutralPercent: parseFloat(((summary.neutral / t) * 100).toFixed(1)),
      },
    });
  } catch (err) {
    logger.error({ err }, "Failed to get video");
    res.status(500).json({ error: "Failed to get video" });
  }
});

// DELETE /videos/:id
router.delete("/videos/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    await db.delete(videosTable).where(eq(videosTable.id, id));
    res.status(204).end();
  } catch (err) {
    logger.error({ err }, "Failed to delete video");
    res.status(500).json({ error: "Failed to delete video" });
  }
});

// GET /videos/:id/comments
router.get("/videos/:id/comments", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const sentiment = req.query.sentiment as string | undefined;
  const search = req.query.search as string | undefined;
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10)));
  const offset = (page - 1) * limit;

  try {
    const base = eq(commentsTable.videoId, id);
    const sentimentCond =
      sentiment && sentiment !== "all"
        ? eq(commentsTable.sentiment, sentiment as "positive" | "negative" | "neutral")
        : undefined;
    const searchCond = search ? like(commentsTable.text, `%${search}%`) : undefined;

    const conditions = [base, sentimentCond, searchCond].filter(Boolean) as ReturnType<typeof eq>[];
    const where = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(commentsTable)
      .where(where);

    const data = await db
      .select()
      .from(commentsTable)
      .where(where)
      .orderBy(desc(commentsTable.likeCount))
      .limit(limit)
      .offset(offset);

    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error({ err }, "Failed to query comments");
    res.status(500).json({ error: "Failed to query comments" });
  }
});

// GET /videos/:id/analytics
router.get("/videos/:id/analytics", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const sentimentRows = await db
      .select({
        sentiment: commentsTable.sentiment,
        count: sql<number>`count(*)::int`,
      })
      .from(commentsTable)
      .where(eq(commentsTable.videoId, id))
      .groupBy(commentsTable.sentiment);

    const summary = { positive: 0, negative: 0, neutral: 0, total: 0 };
    for (const row of sentimentRows) {
      const s = row.sentiment as keyof Omit<typeof summary, "total">;
      summary[s] += row.count;
      summary.total += row.count;
    }
    const t = summary.total || 1;

    const timeRows = await db
      .select({
        date: sql<string>`to_char(${commentsTable.publishedAt}::timestamp, 'YYYY-MM-DD')`,
        sentiment: commentsTable.sentiment,
        count: sql<number>`count(*)::int`,
      })
      .from(commentsTable)
      .where(eq(commentsTable.videoId, id))
      .groupBy(
        sql`to_char(${commentsTable.publishedAt}::timestamp, 'YYYY-MM-DD')`,
        commentsTable.sentiment
      )
      .orderBy(sql`to_char(${commentsTable.publishedAt}::timestamp, 'YYYY-MM-DD')`);

    type TimePoint = { date: string; positive: number; negative: number; neutral: number };
    const timeMap = new Map<string, TimePoint>();
    for (const row of timeRows) {
      if (!timeMap.has(row.date)) {
        timeMap.set(row.date, { date: row.date, positive: 0, negative: 0, neutral: 0 });
      }
      const point = timeMap.get(row.date)!;
      const s = row.sentiment as keyof Omit<TimePoint, "date">;
      point[s] += row.count;
    }

    const allComments = await db
      .select({ text: commentsTable.text, sentiment: commentsTable.sentiment })
      .from(commentsTable)
      .where(eq(commentsTable.videoId, id));

    const bySentiment: Record<string, string[]> = { positive: [], negative: [], neutral: [] };
    for (const c of allComments) {
      bySentiment[c.sentiment]?.push(c.text);
    }

    res.json({
      sentimentSummary: {
        ...summary,
        positivePercent: parseFloat(((summary.positive / t) * 100).toFixed(1)),
        negativePercent: parseFloat(((summary.negative / t) * 100).toFixed(1)),
        neutralPercent: parseFloat(((summary.neutral / t) * 100).toFixed(1)),
      },
      sentimentOverTime: Array.from(timeMap.values()),
      topPositiveKeywords: extractKeywords(bySentiment.positive, 15),
      topNegativeKeywords: extractKeywords(bySentiment.negative, 15),
      topNeutralKeywords: extractKeywords(bySentiment.neutral, 10),
    });
  } catch (err) {
    logger.error({ err }, "Failed to get analytics");
    res.status(500).json({ error: "Failed to get analytics" });
  }
});

// GET /videos/:id/summary
router.get("/videos/:id/summary", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const [video] = await db.select().from(videosTable).where(eq(videosTable.id, id)).limit(1);
    if (!video) { res.status(404).json({ error: "Video not found" }); return; }

    if (video.aiSummary) {
      res.json({
        videoId: id,
        summary: video.aiSummary,
        strengths: JSON.parse(video.aiStrengths ?? "[]"),
        weaknesses: JSON.parse(video.aiWeaknesses ?? "[]"),
        commonThemes: JSON.parse(video.aiThemes ?? "[]"),
        generatedAt: video.aiGeneratedAt?.toISOString() ?? new Date().toISOString(),
      });
      return;
    }

    const allComments = await db
      .select({ text: commentsTable.text, sentiment: commentsTable.sentiment })
      .from(commentsTable)
      .where(eq(commentsTable.videoId, id));

    const counts = { positive: 0, negative: 0, neutral: 0, total: allComments.length };
    const bySentiment: Record<string, string[]> = { positive: [], negative: [], neutral: [] };
    for (const c of allComments) {
      const s = c.sentiment as keyof Omit<typeof counts, "total">;
      counts[s]++;
      bySentiment[c.sentiment]?.push(c.text);
    }

    const result = await generateAISummary(
      video.title,
      video.channelName,
      counts,
      extractKeywords(bySentiment.positive, 10).map((k) => k.word),
      extractKeywords(bySentiment.negative, 10).map((k) => k.word),
      extractKeywords(bySentiment.neutral, 10).map((k) => k.word),
      bySentiment.positive.slice(0, 5),
      bySentiment.negative.slice(0, 5)
    );

    const now = new Date();
    await db
      .update(videosTable)
      .set({
        aiSummary: result.summary,
        aiStrengths: JSON.stringify(result.strengths),
        aiWeaknesses: JSON.stringify(result.weaknesses),
        aiThemes: JSON.stringify(result.commonThemes),
        aiGeneratedAt: now,
        updatedAt: now,
      })
      .where(eq(videosTable.id, id));

    res.json({
      videoId: id,
      summary: result.summary,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      commonThemes: result.commonThemes,
      generatedAt: now.toISOString(),
    });
  } catch (err: unknown) {
    logger.error({ err }, "Failed to generate AI summary");
    const msg = err instanceof Error ? err.message : "Failed to generate AI summary";
    res.status(500).json({ error: msg });
  }
});

// GET /videos/:id/export/csv
router.get("/videos/:id/export/csv", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const [video] = await db.select().from(videosTable).where(eq(videosTable.id, id)).limit(1);
    if (!video) { res.status(404).json({ error: "Video not found" }); return; }

    const comments = await db
      .select()
      .from(commentsTable)
      .where(eq(commentsTable.videoId, id))
      .orderBy(desc(commentsTable.likeCount));

    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

    const header = ["id", "author", "text", "sentiment", "confidence", "likes", "published_at"].join(",");
    const rows = comments.map((c) =>
      [c.id, esc(c.authorName), esc(c.text), c.sentiment, c.confidence.toFixed(3), c.likeCount, c.publishedAt].join(",")
    );

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${video.youtubeId}_comments.csv"`);
    res.send([header, ...rows].join("\n"));
  } catch (err) {
    logger.error({ err }, "Failed to export CSV");
    res.status(500).json({ error: "Failed to export CSV" });
  }
});

export default router;
