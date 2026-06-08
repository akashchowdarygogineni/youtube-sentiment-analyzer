import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetVideo, 
  getGetVideoQueryKey,
  useGetAnalytics,
  getGetAnalyticsQueryKey,
  useGetAISummary,
  getGetAISummaryQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, MessageSquare, ThumbsUp, Eye, Download, FileText, Trash2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useDeleteVideo } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { AnalyticsTab } from "@/components/dashboard/analytics-tab";
import { CommentsTab } from "@/components/dashboard/comments-tab";
import { SummaryTab } from "@/components/dashboard/summary-tab";
import { PdfReport } from "@/components/dashboard/pdf-report";
import { useQueryClient } from "@tanstack/react-query";
import { getListVideosQueryKey } from "@workspace/api-client-react";

export default function Dashboard() {
  const { id } = useParams<{ id: string }>();
  const videoId = parseInt(id || "0", 10);
  const [isClient, setIsClient] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const { data: video, isLoading, error } = useGetVideo(videoId, {
    query: {
      enabled: !!videoId,
      queryKey: getGetVideoQueryKey(videoId),
      refetchInterval: (query) => {
        if (query.state.data && (query.state.data.status === 'pending' || query.state.data.status === 'processing')) {
          return 3000;
        }
        return false;
      }
    }
  });

  const { data: analytics } = useGetAnalytics(videoId, {
    query: { enabled: !!videoId && video?.status === 'completed', queryKey: getGetAnalyticsQueryKey(videoId) }
  });

  const { data: aiSummary } = useGetAISummary(videoId, {
    query: { enabled: false, queryKey: getGetAISummaryQueryKey(videoId) }
  });

  const deleteMutation = useDeleteVideo({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() });
        setLocation("/");
      }
    }
  });

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this analysis?")) {
      deleteMutation.mutate({ id: videoId });
    }
  };

  const handleExportPdf = async () => {
    if (!pdfRef.current || !video) return;
    setIsExporting(true);
    try {
      const [html2canvas, { default: jsPDF }] = await Promise.all([
        import("html2canvas").then(m => m.default),
        import("jspdf"),
      ]);

      // Temporarily show the hidden report div
      const el = pdfRef.current;
      el.style.display = "block";
      el.style.position = "fixed";
      el.style.top = "-9999px";
      el.style.left = "0";

      // Wait for render
      await new Promise(r => setTimeout(r, 300));

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: 794,
        windowWidth: 794,
      });

      el.style.display = "none";
      el.style.position = "";
      el.style.top = "";
      el.style.left = "";

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width / 2;   // account for scale: 2
      const imgHeight = canvas.height / 2;

      const ratio = pdfWidth / imgWidth;
      const scaledHeight = imgHeight * ratio;

      if (scaledHeight <= pdfHeight) {
        // Fits on one page
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, scaledHeight);
      } else {
        // Multi-page: slice canvas into page-sized chunks
        let yOffset = 0;
        const pageHeightPx = (pdfHeight / pdfWidth) * imgWidth * 2; // in original canvas px (scale 2)

        while (yOffset < canvas.height) {
          const remaining = canvas.height - yOffset;
          const sliceH = Math.min(pageHeightPx, remaining);

          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceH;
          const ctx = pageCanvas.getContext("2d")!;
          ctx.drawImage(canvas, 0, -yOffset);

          const pageImg = pageCanvas.toDataURL("image/png");
          const sliceScaled = (sliceH / 2) * ratio;

          if (yOffset > 0) pdf.addPage();
          pdf.addImage(pageImg, "PNG", 0, 0, pdfWidth, sliceScaled);

          yOffset += sliceH;
        }
      }

      const slug = video.title.replace(/[^a-z0-9]/gi, "_").slice(0, 40).toLowerCase();
      pdf.save(`audienceintel_${slug}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("PDF export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading || !isClient) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">Loading analysis data...</p>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-destructive/10 text-destructive p-6 rounded-xl max-w-md text-center border border-destructive/20">
          <h2 className="text-xl font-bold mb-2">Error loading dashboard</h2>
          <p className="mb-6 opacity-80 text-sm">Could not retrieve video data. The analysis may have failed or the ID is invalid.</p>
          <Link href="/">
            <Button variant="outline" className="border-destructive/30 hover:bg-destructive/10">Return Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isProcessing = video.status === 'pending' || video.status === 'processing';

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Hidden PDF report - rendered off-screen for capture */}
      <div ref={pdfRef} style={{ display: "none" }}>
        <PdfReport
          video={video as any}
          analytics={analytics as any}
          summary={aiSummary as any}
        />
      </div>

      {/* Header */}
      <div className="border-b border-border/40 bg-card/50 sticky top-0 z-10 backdrop-blur no-print">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Link>
          <div className="font-bold text-sm text-primary tracking-tight">AudienceIntel</div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              <span className="hidden sm:inline">Delete Analysis</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-6">
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row gap-6 items-start mb-8 p-6 bg-card rounded-2xl border shadow-sm print-card">
          <div className="w-full md:w-64 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-muted border border-border/50 relative">
            {video.thumbnailUrl && <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight leading-tight">{video.title}</h1>
              <p className="text-muted-foreground text-sm mt-1.5 font-medium">{video.channelName}</p>
            </div>
            
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="flex items-center bg-secondary px-3 py-1.5 rounded-full text-secondary-foreground border border-border/50">
                <Eye className="w-4 h-4 mr-2 opacity-60" />
                <span className="font-medium">{video.viewCount.toLocaleString()}</span>
              </div>
              <div className="flex items-center bg-secondary px-3 py-1.5 rounded-full text-secondary-foreground border border-border/50">
                <ThumbsUp className="w-4 h-4 mr-2 opacity-60" />
                <span className="font-medium">{video.likeCount.toLocaleString()}</span>
              </div>
              <div className="flex items-center bg-secondary px-3 py-1.5 rounded-full text-secondary-foreground border border-border/50">
                <MessageSquare className="w-4 h-4 mr-2 opacity-60" />
                <span className="font-medium">{video.commentCount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {isProcessing ? (
          <div className="flex flex-col items-center justify-center py-20 border rounded-2xl bg-card shadow-sm">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Analyzing Comments</h2>
            <p className="text-muted-foreground text-center max-w-md">
              We are currently processing {video.commentCount.toLocaleString()} comments and running sentiment analysis. 
              This may take a few moments.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-6 bg-transparent border-b rounded-none w-full justify-start h-auto p-0 no-print overflow-x-auto flex-nowrap">
              <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-6 whitespace-nowrap">Dashboard</TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-6 whitespace-nowrap">Deep Analytics</TabsTrigger>
              <TabsTrigger value="comments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-6 whitespace-nowrap">Comments Explorer</TabsTrigger>
              <TabsTrigger value="summary" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-6 whitespace-nowrap">AI Summary</TabsTrigger>
              <TabsTrigger value="export" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-6 whitespace-nowrap">Export & Report</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6 animate-in fade-in-50 duration-500">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print-card">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">Total Analyzed</p>
                    <p className="text-3xl font-bold">{video.sentimentSummary?.total.toLocaleString() || 0}</p>
                  </CardContent>
                </Card>
                <Card className="border-b-4 border-b-green-500">
                  <CardContent className="p-6">
                    <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">Positive</p>
                    <div className="flex items-end gap-2">
                      <p className="text-3xl font-bold text-green-500">{video.sentimentSummary?.positivePercent?.toFixed(1) || 0}%</p>
                      <p className="text-sm text-muted-foreground mb-1">({video.sentimentSummary?.positive?.toLocaleString() || 0})</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-b-4 border-b-red-500">
                  <CardContent className="p-6">
                    <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">Negative</p>
                    <div className="flex items-end gap-2">
                      <p className="text-3xl font-bold text-red-500">{video.sentimentSummary?.negativePercent?.toFixed(1) || 0}%</p>
                      <p className="text-sm text-muted-foreground mb-1">({video.sentimentSummary?.negative?.toLocaleString() || 0})</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-b-4 border-b-gray-500">
                  <CardContent className="p-6">
                    <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">Neutral</p>
                    <div className="flex items-end gap-2">
                      <p className="text-3xl font-bold text-gray-400">{video.sentimentSummary?.neutralPercent?.toFixed(1) || 0}%</p>
                      <p className="text-sm text-muted-foreground mb-1">({video.sentimentSummary?.neutral?.toLocaleString() || 0})</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="print-card">
                  <AnalyticsTab videoId={videoId} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="animate-in fade-in-50 duration-500">
              <AnalyticsTab videoId={videoId} />
            </TabsContent>

            <TabsContent value="comments" className="animate-in fade-in-50 duration-500">
              <CommentsTab videoId={videoId} />
            </TabsContent>
            
            <TabsContent value="summary" className="animate-in fade-in-50 duration-500">
              <SummaryTab videoId={videoId} />
            </TabsContent>

            <TabsContent value="export" className="animate-in fade-in-50 duration-500">
              <Card>
                <CardHeader>
                  <CardTitle>Export Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-sm text-muted-foreground max-w-2xl">
                    Download your audience intelligence data for external reporting, sharing with your team, or deeper analysis in your own tools.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                    <div className="border rounded-xl p-5 bg-card flex flex-col items-start gap-4">
                      <div className="bg-primary/10 p-3 rounded-lg text-primary">
                        <Download className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Raw Data (CSV)</h3>
                        <p className="text-sm text-muted-foreground mb-4">Export all comments, sentiment scores, and confidence metrics.</p>
                      </div>
                      <Button onClick={() => window.open(`/api/videos/${videoId}/export/csv`, '_blank')} className="w-full mt-auto">
                        Download CSV
                      </Button>
                    </div>

                    <div className="border rounded-xl p-5 bg-card flex flex-col items-start gap-4">
                      <div className="bg-secondary p-3 rounded-lg text-secondary-foreground">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Executive Report (PDF)</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Export a complete A4 report with sentiment KPIs, keyword analysis, and AI insights.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleExportPdf}
                        disabled={isExporting}
                        className="w-full mt-auto"
                      >
                        {isExporting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating PDF…
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4 mr-2" />
                            Export PDF
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* PDF preview notice */}
                  <div className="max-w-2xl p-4 bg-muted/50 rounded-lg border border-border/50 text-sm text-muted-foreground">
                    <strong className="text-foreground">What's included in the PDF:</strong> video metadata, sentiment KPI cards, sentiment distribution bar, top keywords per sentiment, and AI audience summary (if generated). The report is formatted for A4/Letter printing.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
