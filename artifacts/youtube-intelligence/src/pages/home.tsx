import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useListVideos, useAnalyzeVideo, getListVideosQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Youtube, Search, Loader2, BarChart2, Play } from "lucide-react";
import { format } from "date-fns";

export default function Home() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  
  const { data: videos, isLoading } = useListVideos({
    query: {
      queryKey: getListVideosQueryKey(),
    }
  });

  const analyzeMutation = useAnalyzeVideo({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() });
        setLocation(`/video/${data.id}`);
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    analyzeMutation.mutate({ data: { url } });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center mx-auto px-4">
          <div className="flex items-center gap-2 font-bold text-lg text-primary tracking-tight">
            <Youtube className="w-6 h-6 text-red-500" />
            AudienceIntel
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="flex flex-col items-center text-center space-y-6 mb-16">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Understand your <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-primary">YouTube audience</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Transform raw comments into actionable sentiment insights. Paste a YouTube URL to instantly analyze audience feedback and discover what viewers really think.
          </p>

          <form onSubmit={handleSubmit} className="w-full max-w-2xl mt-8 flex gap-2 relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Search className="w-5 h-5" />
            </div>
            <Input 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..." 
              className="h-14 pl-12 text-lg rounded-xl border-border bg-card/50"
              disabled={analyzeMutation.isPending}
            />
            <Button 
              type="submit" 
              size="lg" 
              className="h-14 px-8 rounded-xl font-medium"
              disabled={analyzeMutation.isPending || !url}
            >
              {analyzeMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <BarChart2 className="w-5 h-5 mr-2" />}
              Analyze
            </Button>
          </form>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight border-b pb-4">Recent Analyses</h2>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-muted rounded-t-xl" />
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : videos?.length === 0 ? (
            <div className="text-center py-12 bg-card/50 rounded-xl border border-dashed">
              <Youtube className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-muted-foreground">No analyses yet</h3>
              <p className="text-sm text-muted-foreground mt-1">Paste a URL above to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos?.map(video => (
                <Link key={video.id} href={`/video/${video.id}`} className="block group">
                  <Card className="h-full hover:border-primary/50 transition-colors overflow-hidden flex flex-col hover-elevate">
                    <div className="relative aspect-video bg-muted overflow-hidden">
                      {video.thumbnailUrl ? (
                        <img src={video.thumbnailUrl} alt={video.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Play className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-3 left-3 flex gap-2">
                        {video.status === 'processing' && (
                          <span className="px-2 py-1 text-xs font-medium bg-blue-500/80 text-white rounded backdrop-blur-sm flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Processing
                          </span>
                        )}
                        {video.status === 'completed' && (
                          <span className="px-2 py-1 text-xs font-medium bg-green-500/80 text-white rounded backdrop-blur-sm">
                            {video.commentCount} comments
                          </span>
                        )}
                      </div>
                    </div>
                    <CardHeader className="flex-1 p-4">
                      <CardTitle className="line-clamp-2 text-base leading-tight group-hover:text-primary transition-colors">
                        {video.title}
                      </CardTitle>
                      <CardDescription className="flex items-center justify-between mt-2">
                        <span className="text-xs truncate max-w-[120px]">{video.channelName}</span>
                        <span className="text-xs">{format(new Date(video.createdAt), "MMM d, yyyy")}</span>
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
