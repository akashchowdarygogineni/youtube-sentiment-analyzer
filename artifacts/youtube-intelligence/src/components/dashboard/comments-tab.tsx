import React, { useState } from "react";
import { 
  useQueryComments, 
  getQueryCommentsQueryKey,
  QueryCommentsSentiment
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, ThumbsUp, Calendar } from "lucide-react";
import { format } from "date-fns";

interface CommentsTabProps {
  videoId: number;
}

export function CommentsTab({ videoId }: CommentsTabProps) {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sentiment, setSentiment] = useState<QueryCommentsSentiment>("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, error } = useQueryComments(videoId, {
    search: search || undefined,
    sentiment: sentiment === "all" ? undefined : sentiment,
    page,
    limit,
  }, {
    query: {
      enabled: !!videoId,
      queryKey: getQueryCommentsQueryKey(videoId, { search: search || undefined, sentiment: sentiment === "all" ? undefined : sentiment, page, limit }),
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleFilter = (val: QueryCommentsSentiment) => {
    setSentiment(val);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card p-4 rounded-xl border">
        <form onSubmit={handleSearch} className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search comments..." 
            className="pl-9 bg-background/50"
          />
        </form>
        
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Button 
            variant={sentiment === "all" ? "default" : "outline"} 
            onClick={() => handleFilter("all")}
            size="sm"
          >
            All
          </Button>
          <Button 
            variant={sentiment === "positive" ? "default" : "outline"} 
            onClick={() => handleFilter("positive")}
            className={sentiment !== "positive" ? "text-green-500 hover:text-green-600 hover:bg-green-500/10" : "bg-green-600 hover:bg-green-700"}
            size="sm"
          >
            Positive
          </Button>
          <Button 
            variant={sentiment === "negative" ? "default" : "outline"} 
            onClick={() => handleFilter("negative")}
            className={sentiment !== "negative" ? "text-red-500 hover:text-red-600 hover:bg-red-500/10" : "bg-red-600 hover:bg-red-700"}
            size="sm"
          >
            Negative
          </Button>
          <Button 
            variant={sentiment === "neutral" ? "default" : "outline"} 
            onClick={() => handleFilter("neutral")}
            className={sentiment !== "neutral" ? "text-gray-500 hover:text-gray-600 hover:bg-gray-500/10" : "bg-gray-600 hover:bg-gray-700"}
            size="sm"
          >
            Neutral
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-muted-foreground">
          Failed to load comments.
        </div>
      ) : data?.data.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-dashed">
          <p className="text-muted-foreground">No comments found matching your criteria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground px-1">
            Showing {data?.data.length} of {data?.total.toLocaleString()} comments
          </div>
          
          {data?.data.map((comment) => (
            <Card key={comment.id} className={`overflow-hidden transition-all hover-elevate border-l-4 ${
              comment.sentiment === 'positive' ? 'border-l-green-500' : 
              comment.sentiment === 'negative' ? 'border-l-red-500' : 'border-l-gray-500'
            }`}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-sm">{comment.authorName}</div>
                  <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                    comment.sentiment === 'positive' ? 'bg-green-500/10 text-green-500' : 
                    comment.sentiment === 'negative' ? 'bg-red-500/10 text-red-500' : 'bg-gray-500/10 text-gray-500'
                  }`}>
                    {comment.sentiment.charAt(0).toUpperCase() + comment.sentiment.slice(1)} 
                    <span className="opacity-70 ml-1">{(comment.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <p className="text-sm leading-relaxed mb-4 text-foreground/90 whitespace-pre-wrap">
                  {comment.text}
                </p>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center">
                    <ThumbsUp className="w-3.5 h-3.5 mr-1" />
                    {comment.likeCount.toLocaleString()}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1" />
                    {format(new Date(comment.publishedAt), "MMM d, yyyy")}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {data && data.totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 pt-6 pb-12">
              <Button 
                variant="outline" 
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <div className="text-sm text-muted-foreground font-medium">
                Page {page} of {data.totalPages}
              </div>
              <Button 
                variant="outline" 
                disabled={page >= data.totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
