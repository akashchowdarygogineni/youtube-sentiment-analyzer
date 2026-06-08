import React from "react";
import { 
  useGetAISummary, 
  getGetAISummaryQueryKey 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, TrendingUp, TrendingDown, Target } from "lucide-react";
import { format } from "date-fns";

interface SummaryTabProps {
  videoId: number;
}

export function SummaryTab({ videoId }: SummaryTabProps) {
  const { data: summary, isLoading, error } = useGetAISummary(videoId, {
    query: {
      enabled: !!videoId,
      queryKey: getGetAISummaryQueryKey(videoId),
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Generating AI insights...</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load AI summary. The video might not have enough comments.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 shadow-lg shadow-primary/5">
        <CardHeader className="bg-primary/5 border-b border-primary/10 rounded-t-xl pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-primary" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-base leading-relaxed">{summary.summary}</p>
          <div className="text-xs text-muted-foreground mt-4 text-right">
            Generated {format(new Date(summary.generatedAt), "MMM d, h:mm a")}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-t-4 border-t-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Audience Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.strengths.length > 0 ? (
              <ul className="space-y-3">
                {summary.strengths.map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="text-green-500 font-bold">•</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No significant strengths identified.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingDown className="w-5 h-5 text-red-500" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.weaknesses.length > 0 ? (
              <ul className="space-y-3">
                {summary.weaknesses.map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="text-red-500 font-bold">•</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No significant weaknesses identified.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-primary" />
            Common Themes & Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary.commonThemes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {summary.commonThemes.map((theme, i) => (
                <div key={i} className="bg-secondary p-4 rounded-lg text-sm font-medium border border-border/50 flex items-center">
                  {theme}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No common themes identified.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
