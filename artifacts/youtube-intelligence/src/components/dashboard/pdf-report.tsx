import React from "react";

interface SentimentSummary {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  positivePercent: number;
  negativePercent: number;
  neutralPercent: number;
}

interface Keyword {
  word: string;
  count: number;
}

interface AISummary {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  commonThemes: string[];
}

interface Video {
  title: string;
  channelName: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  thumbnailUrl?: string;
  sentimentSummary?: SentimentSummary;
}

interface Analytics {
  sentimentSummary: SentimentSummary;
  topPositiveKeywords: Keyword[];
  topNegativeKeywords: Keyword[];
  topNeutralKeywords: Keyword[];
  sentimentOverTime: { date: string; positive: number; negative: number; neutral: number }[];
}

interface PdfReportProps {
  video: Video;
  analytics?: Analytics;
  summary?: AISummary;
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, background: "#e5e7eb", borderRadius: 4, height: 8 }}>
        <div style={{ width: `${pct}%`, background: color, borderRadius: 4, height: 8 }} />
      </div>
      <span style={{ fontSize: 11, color: "#6b7280", minWidth: 28, textAlign: "right" }}>{value}</span>
    </div>
  );
}

export const PdfReport = React.forwardRef<HTMLDivElement, PdfReportProps>(
  ({ video, analytics, summary }, ref) => {
    const ss = analytics?.sentimentSummary ?? video.sentimentSummary;
    const posKw = analytics?.topPositiveKeywords ?? [];
    const negKw = analytics?.topNegativeKeywords ?? [];
    const neuKw = analytics?.topNeutralKeywords ?? [];
    const maxKw = Math.max(
      ...[...posKw, ...negKw, ...neuKw].map((k) => k.count),
      1
    );

    const generatedDate = new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

    return (
      <div
        ref={ref}
        style={{
          fontFamily: "Inter, Arial, sans-serif",
          background: "#ffffff",
          color: "#111827",
          width: 794,
          padding: "40px 48px",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ borderBottom: "3px solid #2563eb", paddingBottom: 20, marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11, color: "#2563eb", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
                AudienceIntel — YouTube Analysis Report
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, lineHeight: 1.3, maxWidth: 520 }}>
                {video.title}
              </h1>
              <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: 13 }}>{video.channelName}</p>
            </div>
            <div style={{ textAlign: "right", fontSize: 11, color: "#9ca3af", flexShrink: 0, marginLeft: 16 }}>
              <div>Generated</div>
              <div style={{ fontWeight: 600, color: "#6b7280" }}>{generatedDate}</div>
            </div>
          </div>
        </div>

        {/* Video Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
          {[
            { label: "Views", value: video.viewCount.toLocaleString(), color: "#2563eb" },
            { label: "Likes", value: video.likeCount.toLocaleString(), color: "#16a34a" },
            { label: "Comments", value: video.commentCount.toLocaleString(), color: "#7c3aed" },
            { label: "Analyzed", value: (ss?.total ?? 0).toLocaleString(), color: "#ea580c" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                border: `1px solid #e5e7eb`,
                borderTop: `3px solid ${stat.color}`,
                borderRadius: 8,
                padding: "12px 14px",
                background: "#fafafa",
              }}
            >
              <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                {stat.label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Sentiment KPIs */}
        {ss && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#374151", textTransform: "uppercase", letterSpacing: 1 }}>
              Sentiment Analysis
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {[
                { label: "Positive", value: ss.positive, pct: ss.positivePercent, color: "#16a34a", bg: "#f0fdf4" },
                { label: "Negative", value: ss.negative, pct: ss.negativePercent, color: "#dc2626", bg: "#fef2f2" },
                { label: "Neutral", value: ss.neutral, pct: ss.neutralPercent, color: "#6b7280", bg: "#f9fafb" },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: s.bg,
                    border: `1px solid ${s.color}30`,
                    borderRadius: 8,
                    padding: "16px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 11, color: s.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: s.color, lineHeight: 1 }}>
                    {s.pct.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                    {s.value.toLocaleString()} comments
                  </div>
                  {/* Mini bar */}
                  <div style={{ marginTop: 10, background: "#e5e7eb", borderRadius: 4, height: 6 }}>
                    <div style={{ width: `${s.pct}%`, background: s.color, borderRadius: 4, height: 6 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sentiment Breakdown visual bar */}
        {ss && ss.total > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: "#374151", textTransform: "uppercase", letterSpacing: 1 }}>
              Comment Sentiment Distribution
            </h2>
            <div style={{ height: 24, borderRadius: 8, overflow: "hidden", display: "flex", border: "1px solid #e5e7eb" }}>
              {ss.positivePercent > 0 && (
                <div style={{ width: `${ss.positivePercent}%`, background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {ss.positivePercent > 8 && <span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>{ss.positivePercent.toFixed(0)}%</span>}
                </div>
              )}
              {ss.negativePercent > 0 && (
                <div style={{ width: `${ss.negativePercent}%`, background: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {ss.negativePercent > 8 && <span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>{ss.negativePercent.toFixed(0)}%</span>}
                </div>
              )}
              {ss.neutralPercent > 0 && (
                <div style={{ width: `${ss.neutralPercent}%`, background: "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {ss.neutralPercent > 8 && <span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>{ss.neutralPercent.toFixed(0)}%</span>}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              {[{ label: "Positive", color: "#16a34a" }, { label: "Negative", color: "#dc2626" }, { label: "Neutral", color: "#9ca3af" }].map(l => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6b7280" }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Keywords */}
        {(posKw.length > 0 || negKw.length > 0 || neuKw.length > 0) && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#374151", textTransform: "uppercase", letterSpacing: 1 }}>
              Top Keywords by Sentiment
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {[
                { title: "Positive Keywords", kws: posKw.slice(0, 10), color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
                { title: "Negative Keywords", kws: negKw.slice(0, 10), color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
                { title: "Neutral Keywords", kws: neuKw.slice(0, 10), color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
              ].map((col) => (
                <div
                  key={col.title}
                  style={{ background: col.bg, border: `1px solid ${col.border}`, borderTop: `3px solid ${col.color}`, borderRadius: 8, padding: "14px" }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: col.color, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
                    {col.title}
                  </div>
                  {col.kws.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {col.kws.map((kw) => (
                        <div key={kw.word}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>{kw.word}</span>
                            <span style={{ fontSize: 11, color: col.color, fontWeight: 600 }}>{kw.count}</span>
                          </div>
                          <Bar value={kw.count} max={maxKw} color={col.color} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, color: "#9ca3af" }}>No data</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Summary */}
        {summary && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#374151", textTransform: "uppercase", letterSpacing: 1 }}>
              AI Audience Intelligence Summary
            </h2>
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "16px", marginBottom: 14 }}>
              <p style={{ fontSize: 13, lineHeight: 1.7, margin: 0, color: "#1e3a5f" }}>{summary.summary}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {summary.strengths.length > 0 && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "14px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", marginBottom: 8 }}>Audience Strengths</div>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {summary.strengths.map((s, i) => (
                      <li key={i} style={{ fontSize: 12, color: "#374151", marginBottom: 4, lineHeight: 1.5 }}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.weaknesses.length > 0 && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "14px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", marginBottom: 8 }}>Areas for Improvement</div>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {summary.weaknesses.map((s, i) => (
                      <li key={i} style={{ fontSize: 12, color: "#374151", marginBottom: 4, lineHeight: 1.5 }}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {summary.commonThemes.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Common Themes</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {summary.commonThemes.map((t, i) => (
                    <span key={i} style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 16, padding: "3px 10px", fontSize: 11, color: "#374151", fontWeight: 500 }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "#9ca3af" }}>Generated by AudienceIntel · {generatedDate}</span>
          <span style={{ fontSize: 10, color: "#9ca3af" }}>{video.title}</span>
        </div>
      </div>
    );
  }
);

PdfReport.displayName = "PdfReport";
