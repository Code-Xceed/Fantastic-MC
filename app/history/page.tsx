"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdSlot } from "@/components/AdSlot";
import { ErrorState } from "@/components/ErrorState";
import { Skeleton } from "@/components/Skeleton";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
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

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

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
    toast.success("Copied to clipboard");
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
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  if (status === "loading") {
    return (
      <div className="space-y-6 pt-8 max-w-5xl mx-auto">
        <Skeleton lines={2} className="w-64 h-16" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} lines={1} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton lines={5} className="h-96 rounded-3xl" />
      </div>
    );
  }

  if (!session) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-32 text-center">
        <History className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
        <h1 className="text-2xl font-bold tracking-tight">Authentication Required</h1>
      </motion.div>
    );
  }

  const genCount = history.filter((h) => h.source === "generation").length;
  const winCount = history.filter((h) => h.source === "giveaway").length;

  return (
    <motion.div initial="hidden" animate="show" variants={containerVariants} className="space-y-8 pt-4 pb-20 max-w-5xl mx-auto">
      <motion.div variants={itemVariants} className="flex flex-col gap-2 bg-card/30 p-5 rounded-3xl border border-border/40 backdrop-blur-md">
        <h1 className="text-2xl font-extrabold flex items-center gap-3 tracking-tight">
          <div className="bg-primary/10 p-2 rounded-xl">
            <History className="h-6 w-6 text-primary" />
          </div>
          Generation History
        </h1>
        <p className="text-muted-foreground ml-14">
          All your generated and won accounts securely logged.
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Accounts", value: total, icon: Zap, bg: "bg-primary/10", text: "text-primary" },
          { label: "Direct Generations", value: genCount, icon: Server, bg: "bg-blue-500/10", text: "text-blue-500" },
          { label: "Giveaway Wins", value: winCount, icon: Trophy, bg: "bg-amber-500/10", text: "text-amber-500" },
        ].map((stat, i) => (
          <Card key={i} className="border-border/40 bg-card/40 backdrop-blur-sm rounded-2xl hover:bg-card/60 transition-colors">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", stat.bg)}>
                <stat.icon className={cn("h-6 w-6", stat.text)} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <motion.div variants={itemVariants}>
        <AdSlot format="banner" />
      </motion.div>

      {error ? (
        <motion.div variants={itemVariants}>
          <ErrorState message="Failed to load history data" onRetry={fetchHistory} />
        </motion.div>
      ) : (
        <motion.div variants={itemVariants}>
          <Card className="border-border/40 bg-card/40 backdrop-blur-md rounded-3xl overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/30 bg-muted/20 pb-4">
              <CardTitle className="flex items-center justify-between text-lg font-bold">
                Your Ledger
                <Badge variant="secondary" className="font-mono bg-background shadow-sm border border-border/50">{total} items</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {history.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <History className="h-14 w-14 text-muted-foreground mb-4 opacity-20" />
                  <p className="text-base font-medium text-muted-foreground">
                    Your history is clean. Generate an account to start your ledger.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {history.map((h) => (
                    <motion.div
                      key={h.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 hover:bg-muted/30 transition-colors group"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm border border-border/30",
                          h.source === "giveaway" ? "bg-amber-500/10 border-amber-500/20" : "bg-primary/5"
                        )}>
                          {h.source === "giveaway" ? (
                            <Trophy className="h-5 w-5 text-amber-500" />
                          ) : (
                            <Zap className="h-5 w-5 text-primary" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-base font-bold tracking-tight">{h.service}</p>
                            <Badge variant={h.isPremium ? "default" : "secondary"} className="text-[10px] px-1.5 h-4 uppercase font-bold tracking-wider">
                              {h.isPremium ? "Premium" : "Free"}
                            </Badge>
                            {h.source === "giveaway" && (
                              <Badge variant="outline" className="text-[10px] px-1.5 h-4 border-amber-500/30 text-amber-500 bg-amber-500/5">
                                <Trophy className="mr-1 h-2.5 w-2.5" /> Won
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-mono text-muted-foreground bg-background/50 inline-block px-2 py-0.5 rounded border border-border/50 truncate max-w-[200px] sm:max-w-xs">
                              {h.combo}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-16 sm:pl-0">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 bg-background/40 px-2 py-1 rounded-md border border-border/40">
                          <Clock className="h-3.5 w-3.5" />
                          {formatTime(h.generatedAt)}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          className={cn("h-8 rounded-lg shadow-sm transition-all", copiedId === h.id ? "bg-green-500/20 text-green-500 hover:bg-green-500/30" : "opacity-0 group-hover:opacity-100")}
                          onClick={() => copyToClipboard(h.id, h.combo)}
                        >
                          {copiedId === h.id ? (
                            <><Check className="h-4 w-4 mr-1.5" /> Copied</>
                          ) : (
                            <><Copy className="h-4 w-4 mr-1.5" /> Copy</>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 bg-muted/10 border-t border-border/30">
                  <Button variant="outline" size="sm" className="rounded-full shadow-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                  </Button>
                  <span className="text-xs font-medium text-muted-foreground bg-background px-3 py-1 rounded-full border border-border/50">
                    {page} / {totalPages}
                  </span>
                  <Button variant="outline" size="sm" className="rounded-full shadow-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
