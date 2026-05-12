"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdSlot } from "@/components/AdSlot";
import { ErrorState } from "@/components/ErrorState";
import { Skeleton } from "@/components/Skeleton";
import {
  History,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Trophy,
  Zap,
  Crown,
  Server,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface HistoryItem {
  id: number;
  service: string;
  combo: string;
  isPremium: boolean;
  source: string;
  giveawayId: number | null;
  generatedAt: string;
}

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [error, setError] = useState(false);

  const fetchHistory = useCallback(() => {
    if (session?.user?.id) {
      setError(false);
      fetch(`/api/user/history?page=${page}`)
        .then((r) => r.json())
        .then((data) => {
          setHistory(data.history || []);
          setTotalPages(data.totalPages || 1);
          setTotal(data.total || 0);
        })
        .catch(() => setError(true));
    }
  }, [page, session?.user?.id]);

  useEffect(() => {
    const timer = window.setTimeout(fetchHistory, 0);
    return () => window.clearTimeout(timer);
  }, [fetchHistory]);

  const copyToClipboard = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} lines={1} />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} lines={1} />
          ))}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h1 className="text-2xl font-bold">Please login to view your history</h1>
      </div>
    );
  }

  const genCount = history.filter((h) => h.source === "generation").length;
  const winCount = history.filter((h) => h.source === "giveaway").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="h-6 w-6" />
          Generation History
        </h1>
        <p className="text-muted-foreground mt-1">
          All your generated and won accounts in one place.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Accounts</p>
              <p className="text-lg font-bold">{total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
              <Server className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Generated</p>
              <p className="text-lg font-bold">{genCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-500/10">
              <Trophy className="h-4 w-4 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Giveaway Wins</p>
              <p className="text-lg font-bold">{winCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <AdSlot format="banner" />

      {error ? (
        <ErrorState message="Failed to load history" onRetry={fetchHistory} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Your Accounts</span>
              <Badge variant="secondary">{total} total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <History className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No accounts generated yet. Head to Services to get started!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                  >
                    {/* Source icon */}
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      h.source === "giveaway"
                        ? "bg-yellow-500/10"
                        : "bg-primary/10"
                    }`}>
                      {h.source === "giveaway" ? (
                        <Trophy className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <Zap className="h-4 w-4 text-primary" />
                      )}
                    </div>

                    {/* Service + combo */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{h.service}</p>
                        <Badge variant={h.isPremium ? "default" : "secondary"} className="text-[10px] px-1.5">
                          {h.isPremium ? (
                            <><Crown className="mr-0.5 h-2.5 w-2.5" /> Premium</>
                          ) : (
                            "Free"
                          )}
                        </Badge>
                        {h.source === "giveaway" && (
                          <Badge variant="outline" className="text-[10px] px-1.5 border-yellow-500/30 text-yellow-600">
                            <Trophy className="mr-0.5 h-2.5 w-2.5" /> Won
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">
                        {h.combo}
                      </p>
                    </div>

                    {/* Time + copy */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(h.generatedAt)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copyToClipboard(h.id, h.combo)}
                      >
                        {copiedId === h.id ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
