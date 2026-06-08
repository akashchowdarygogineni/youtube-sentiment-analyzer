import { pgTable, serial, text, integer, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const videoStatusEnum = pgEnum("video_status", ["pending", "processing", "completed", "error"]);

export const videosTable = pgTable("videos", {
  id: serial("id").primaryKey(),
  youtubeId: text("youtube_id").notNull().unique(),
  title: text("title").notNull(),
  channelName: text("channel_name").notNull(),
  viewCount: integer("view_count").notNull().default(0),
  likeCount: integer("like_count").notNull().default(0),
  publishedAt: text("published_at").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  commentCount: integer("comment_count").notNull().default(0),
  status: videoStatusEnum("status").notNull().default("pending"),
  aiSummary: text("ai_summary"),
  aiStrengths: text("ai_strengths"),
  aiWeaknesses: text("ai_weaknesses"),
  aiThemes: text("ai_themes"),
  aiGeneratedAt: timestamp("ai_generated_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertVideoSchema = createInsertSchema(videosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videosTable.$inferSelect;
