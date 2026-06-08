import React from "react";
import { 
  useGetAnalytics, 
  getGetAnalyticsQueryKey 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area
} from "recharts";

const COLORS = {
  positive: "hsl(var(--chart-1))", // green
  negative: "hsl(var(--chart-2))", // red
  neutral: "hsl(var(--chart-3))", // gray
};

interface AnalyticsTabProps {
  videoId: number;
}

export function AnalyticsTab({ videoId }: AnalyticsTabProps) {
  const { data: analytics, isLoading, error } = useGetAnalytics(videoId, {
    query: {
      enabled: !!videoId,
      queryKey: getGetAnalyticsQueryKey(videoId),
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load analytics data.
      </div>
    );
  }

  const { sentimentSummary, sentimentOverTime, topPositiveKeywords, topNegativeKeywords, topNeutralKeywords } = analytics;

  const pieData = [
    { name: 'Positive', value: sentimentSummary.positive, color: COLORS.positive },
    { name: 'Negative', value: sentimentSummary.negative, color: COLORS.negative },
    { name: 'Neutral', value: sentimentSummary.neutral, color: COLORS.neutral },
  ].filter(d => d.value > 0);

  const formatPercent = (value: number, total: number) => {
    if (total === 0) return "0%";
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sentiment Distribution</CardTitle>
            <CardDescription>Overall breakdown of comment sentiments</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: number) => [value.toLocaleString(), 'Comments']}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sentiment Trend</CardTitle>
            <CardDescription>Comment sentiment over time</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sentimentOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.positive} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.positive} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorNeg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.negative} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.negative} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" />
                <RechartsTooltip 
                  labelFormatter={(val) => new Date(val).toLocaleDateString()}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="positive" stroke={COLORS.positive} fillOpacity={1} fill="url(#colorPos)" stackId="1" />
                <Area type="monotone" dataKey="negative" stroke={COLORS.negative} fillOpacity={1} fill="url(#colorNeg)" stackId="2" />
                <Area type="monotone" dataKey="neutral" stroke={COLORS.neutral} fillOpacity={0.3} fill={COLORS.neutral} stackId="3" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-t-4 border-t-green-500">
          <CardHeader>
            <CardTitle className="text-base">Top Positive Keywords</CardTitle>
          </CardHeader>
          <CardContent>
            {topPositiveKeywords?.length > 0 ? (
              <ul className="space-y-3">
                {topPositiveKeywords.map((kw, i) => (
                  <li key={i} className="flex justify-between items-center text-sm">
                    <span className="font-medium">{kw.word}</span>
                    <span className="bg-green-500/10 text-green-500 px-2 py-0.5 rounded text-xs">{kw.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-red-500">
          <CardHeader>
            <CardTitle className="text-base">Top Negative Keywords</CardTitle>
          </CardHeader>
          <CardContent>
            {topNegativeKeywords?.length > 0 ? (
              <ul className="space-y-3">
                {topNegativeKeywords.map((kw, i) => (
                  <li key={i} className="flex justify-between items-center text-sm">
                    <span className="font-medium">{kw.word}</span>
                    <span className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded text-xs">{kw.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-gray-500">
          <CardHeader>
            <CardTitle className="text-base">Top Neutral Keywords</CardTitle>
          </CardHeader>
          <CardContent>
            {topNeutralKeywords?.length > 0 ? (
              <ul className="space-y-3">
                {topNeutralKeywords.map((kw, i) => (
                  <li key={i} className="flex justify-between items-center text-sm">
                    <span className="font-medium">{kw.word}</span>
                    <span className="bg-gray-500/10 text-gray-400 px-2 py-0.5 rounded text-xs">{kw.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
