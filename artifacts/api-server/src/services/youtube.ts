import { logger } from "../lib/logger";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YT_API_BASE = "https://www.googleapis.com/youtube/v3";

export function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      // shorts
      const shorts = u.pathname.match(/\/shorts\/([^/?]+)/);
      if (shorts) return shorts[1];
    }
  } catch {
    // not a valid URL
  }
  // bare video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

export interface VideoDetails {
  youtubeId: string;
  title: string;
  channelName: string;
  viewCount: number;
  likeCount: number;
  publishedAt: string;
  thumbnailUrl: string;
  commentCount: number;
}

export async function fetchVideoDetails(videoId: string): Promise<VideoDetails> {
  if (!YOUTUBE_API_KEY) throw new Error("YOUTUBE_API_KEY not configured");

  const url = `${YT_API_BASE}/videos?part=snippet,statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);

  const data = await res.json() as any;
  const item = data.items?.[0];
  if (!item) throw new Error("Video not found");

  const snippet = item.snippet;
  const stats = item.statistics;

  return {
    youtubeId: videoId,
    title: snippet.title,
    channelName: snippet.channelTitle,
    viewCount: parseInt(stats.viewCount ?? "0", 10),
    likeCount: parseInt(stats.likeCount ?? "0", 10),
    publishedAt: snippet.publishedAt,
    thumbnailUrl:
      snippet.thumbnails?.maxres?.url ??
      snippet.thumbnails?.high?.url ??
      snippet.thumbnails?.default?.url ??
      "",
    commentCount: parseInt(stats.commentCount ?? "0", 10),
  };
}

export interface RawComment {
  youtubeCommentId: string;
  text: string;
  authorName: string;
  likeCount: number;
  publishedAt: string;
}

export async function fetchComments(videoId: string, maxComments = 500): Promise<RawComment[]> {
  if (!YOUTUBE_API_KEY) throw new Error("YOUTUBE_API_KEY not configured");

  const comments: RawComment[] = [];
  let pageToken: string | undefined;

  while (comments.length < maxComments) {
    const remaining = maxComments - comments.length;
    const maxResults = Math.min(remaining, 100);

    const params = new URLSearchParams({
      part: "snippet",
      videoId,
      maxResults: String(maxResults),
      order: "relevance",
      key: YOUTUBE_API_KEY,
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`${YT_API_BASE}/commentThreads?${params}`);
    if (!res.ok) {
      const body = await res.text();
      logger.warn({ status: res.status, body }, "YouTube comments API error");
      break;
    }

    const data = await res.json() as any;
    for (const item of data.items ?? []) {
      const c = item.snippet.topLevelComment.snippet;
      comments.push({
        youtubeCommentId: item.id,
        text: c.textDisplay,
        authorName: c.authorDisplayName,
        likeCount: c.likeCount ?? 0,
        publishedAt: c.publishedAt,
      });
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return comments;
}
