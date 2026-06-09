# 🎬 YouTube Sentiment Analyzer

Transform raw YouTube comments into actionable audience intelligence using AI-powered sentiment analysis, keyword extraction, interactive analytics, and automated reporting.

## 🚀 Overview

YouTube Sentiment Analyzer is a full-stack audience intelligence platform that helps creators, marketers, and researchers understand audience perception from YouTube comments.

Simply paste a YouTube video URL, and the platform:

* Fetches real comments using the YouTube Data API
* Classifies comments as Positive, Negative, or Neutral
* Extracts trending keywords and discussion topics
* Generates AI-powered audience insights
* Visualizes sentiment using interactive charts
* Exports reports as PDF and CSV

---

## ✨ Features

### 🎥 Video Analysis

* Analyze any public YouTube video
* Automatic video metadata extraction
* Support for standard, Shorts, and youtu.be links

### 💬 Comment Processing

* Fetch up to 500 comments
* Paginated comment loading
* Comment search and filtering

### 🤖 Sentiment Analysis

* Positive sentiment detection
* Negative sentiment detection
* Neutral sentiment detection
* Confidence scoring
* AFINN-165 lexicon integration
* HuggingFace model support

### 📊 Analytics Dashboard

* Sentiment distribution charts
* KPI summary cards
* Trend visualization
* Comment statistics
* Audience engagement metrics

### 🏷️ Keyword Intelligence

* Top positive keywords
* Top negative keywords
* Top neutral keywords
* Stopword filtering
* Theme extraction

### 🧠 AI Audience Insights

* Executive summary generation
* Audience strengths analysis
* Improvement recommendations
* Common theme identification
* GPT-powered summaries

### 📄 Export Options

* PDF report generation
* CSV data export
* Shareable analytics reports

### 🎨 User Experience

* Responsive design
* Dark mode support
* Light mode support
* Modern dashboard interface
* Mobile-friendly layout

---

## 🛠️ Tech Stack

### Frontend

* React 19
* Vite 7
* TypeScript
* Tailwind CSS
* shadcn/ui
* Recharts
* Framer Motion
* TanStack Query

### Backend

* Node.js
* Express 5
* TypeScript
* Drizzle ORM
* PostgreSQL
* Zod Validation
* Pino Logging

### AI & APIs

* OpenAI GPT-4o-mini
* YouTube Data API v3
* HuggingFace Inference API
* AFINN-165 Sentiment Analysis

### Infrastructure

* PostgreSQL
* pnpm Workspaces
* Drizzle Kit
* OpenAPI
* Orval

---

## 📂 Project Structure

```text
Audience-Insights/
│
├── artifacts/
│   ├── api-server/
│   └── youtube-intelligence/
│
├── lib/
│   ├── api-spec/
│   ├── api-client-react/
│   ├── api-zod/
│   └── db/
│
├── scripts/
├── attached_assets/
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

---

## ⚙️ Installation

### Clone Repository

```bash
git clone https://github.com/akashchowdarygogineni/youtube-sentiment-analyzer.git
cd youtube-sentiment-analyzer
```

### Install Dependencies

```bash
pnpm install
```

### Configure Environment Variables

Create a `.env` file:

```env
DATABASE_URL=
YOUTUBE_API_KEY=
OPENAI_API_KEY=
HUGGINGFACE_API_KEY=
SESSION_SECRET=
```

### Database Setup

```bash
pnpm --filter @workspace/db run push
```

### Run Backend

```bash
pnpm --filter @workspace/api-server run dev
```

### Run Frontend

```bash
pnpm --filter @workspace/youtube-intelligence run dev
```

Open:

```text
http://localhost:23570
```

---

## 📡 API Endpoints

| Method | Endpoint                   | Description             |
| ------ | -------------------------- | ----------------------- |
| GET    | /api/videos                | Get all analyzed videos |
| POST   | /api/videos/analyze        | Analyze a YouTube video |
| GET    | /api/videos/:id            | Get analysis details    |
| DELETE | /api/videos/:id            | Delete analysis         |
| GET    | /api/videos/:id/comments   | Fetch comments          |
| GET    | /api/videos/:id/analytics  | Analytics data          |
| GET    | /api/videos/:id/summary    | AI summary              |
| GET    | /api/videos/:id/export/csv | Export CSV              |

---

## 📈 Workflow

1. User submits YouTube URL
2. Video metadata is fetched
3. Comments are collected
4. Sentiment analysis runs
5. Keywords are extracted
6. Results are stored in PostgreSQL
7. Dashboard displays analytics
8. AI generates audience summary
9. User exports PDF or CSV reports

---

## 🔮 Future Enhancements

* Multi-language sentiment analysis
* Channel-level analytics
* Competitor comparison
* Real-time monitoring
* Scheduled analysis jobs
* User authentication
* Team collaboration
* Public report sharing

---

## 📄 License

MIT License

---

## 👨‍💻 Author

**Akash Chowdary Gogineni**

GitHub:
https://github.com/akashchowdarygogineni

---

⭐ If you found this project useful, consider giving it a star on GitHub.
