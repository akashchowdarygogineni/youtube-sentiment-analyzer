import { pgTable, serial, text, integer, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { videosTable } from "./videos";

export const sentimentEnum = pgEnum("sentiment_type", ["positive", "negative", "neutral"]);

export const commentsTable = pgTable("comments", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull().references(() => videosTable.id, { onDelete: "cascade" }),
  youtubeCommentId: text("youtube_comment_id").notNull(),
  text: text("text").notNull(),
  authorName: text("author_name").notNull(),
  likeCount: integer("like_count").notNull().default(0),
  publishedAt: text("published_at").notNull(),
  sentiment: sentimentEnum("sentiment").notNull(),
  confidence: real("confidence").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCommentSchema = createInsertSchema(commentsTable).omit({ id: true, createdAt: true });
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof commentsTable.$inferSelect;
