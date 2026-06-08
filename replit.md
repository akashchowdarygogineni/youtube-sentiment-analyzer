# YouTube Audience Intelligence Platform

A production-ready SaaS dashboard that analyzes YouTube video comments using sentiment analysis, keyword extraction, and AI-generated audience insights.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/youtube-intelligence run dev` — run the frontend (port 23570)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas (also patches api-zod/src/index.ts)
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `YOUTUBE_API_KEY`, `HUGGINGFACE_API_KEY`, `OPENAI_API_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, Recharts, Framer Motion, wouter
- API: Express 5, async routes
- DB: PostgreSQL + Drizzle ORM (tables: `videos`, `comments`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Sentiment: HuggingFace `cardiffnlp/twitter-roberta-base-sentiment` via Inference API
- AI Summary: OpenAI `gpt-4o-mini`
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/videos.ts` — videos table schema
- `lib/db/src/schema/comments.ts` — comments table schema
- `artifacts/api-server/src/routes/videos.ts` — all video/comment/analytics routes
- `artifacts/api-server/src/services/` — youtube, sentiment, keywords, ai services
- `artifacts/youtube-intelligence/src/pages/` — home.tsx, dashboard.tsx
- `artifacts/youtube-intelligence/src/components/dashboard/` — analytics, comments, summary tabs

## Architecture decisions

- Sentiment classification runs in background after returning 201 to the client, so the UI can poll for status
- HuggingFace calls are batched in groups of 32 with 200ms delay to avoid rate limits; failed batches fall back to neutral
- AI summaries are cached in the `videos` table to avoid re-generating on every request
- Orval collision fix: `lib/api-spec/package.json` codegen script patches `api-zod/src/index.ts` after Orval runs to drop the conflicting `./generated/types` re-export
- CSV export streams the entire comment set as text/csv directly from the API

## Product

Users paste a YouTube URL → the platform fetches video details + up to 500 comments → classifies each as positive/negative/neutral → displays KPI cards, pie/bar/line charts, top keywords, color-coded comment explorer, AI-generated audience summary, and CSV/PDF export.

## Gotchas

- After any `openapi.yaml` change, run codegen with `pnpm --filter @workspace/api-spec run codegen` — this script also patches `lib/api-zod/src/index.ts` to remove the conflicting types barrel export
- HuggingFace model may be cold-starting (first request can take 20–30s); the `wait_for_model: true` option handles this
- `processVideo()` runs as a detached async task — errors there only surface in server logs

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
