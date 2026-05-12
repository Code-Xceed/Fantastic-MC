"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdSlot } from "@/components/AdSlot";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Gift, Clock, Users, Trophy, Sparkles, Server } from "lucide-react";
import { toast } from "sonner";

interface ActiveGiveaway {
  id: number;
  title: string;
  description: string | null;
  service: string;
  accountCount: number;
  isPremium: boolean;
  endsAt: string;
  entryCount: number;
}

interface PastGiveaway {
  id: number;
  title: string;
  service: string;
  accountCount: number;
  winnerIds: string | null;
  entryCount: number;
  endedAt: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

export default function GiveawaysPage() {
  const { data: session, status } = useSession();
  const [active, setActive] = useState<ActiveGiveaway[]>([]);
  const [past, setPast] = useState<PastGiveaway[]>([]);
  const [entering, setEntering] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/giveaways")
      .then((r) => r.json())
      .then((data) => {
        setActive(data.active || []);
        setPast(data.past || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    const initial = window.setTimeout(() => setNowMs(Date.now()), 0);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(initial);
    };
  }, []);

  const handleEnter = async (giveawayId: number) => {
    if (!session) return;
    setEntering(giveawayId);

    try {
      const res = await fetch("/api/giveaways/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giveawayId }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to enter giveaway");
        return;
      }

      toast.success("Successfully entered the giveaway!");
      fetch("/api/giveaways")
        .then((r) => r.json())
        .then((data) => {
          setActive(data.active || []);
          setPast(data.past || []);
        });
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setEntering(null);
    }
  };

  const getTimeRemaining = (endsAt: string) => {
    if (nowMs === null) return "Calculatings...";
    const end = new Date(endsAt).getTime();
    const diff = Math.max(0, end - nowMs);
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    
    if (diff === 0) return "Ended";
    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  if (status === "loading") {
    return (
      <div className="space-y-8 pt-8 max-w-5xl mx-auto">
        <Skeleton lines={1} className="w-48 h-10" />
        <div className="grid gap-6 sm:grid-cols-2">
          {[1, 2].map((i) => <Skeleton key={i} lines={4} className="h-48 rounded-3xl" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="show" variants={containerVariants} className="space-y-10 pt-4 pb-20 max-w-5xl mx-auto">
      <motion.div variants={itemVariants} className="flex flex-col gap-2 bg-card/30 p-5 rounded-3xl border border-border/40 backdrop-blur-md">
        <h1 className="text-2xl font-extrabold flex items-center gap-3 tracking-tight">
          <div className="bg-primary/10 p-2 rounded-xl relative">
            <Gift className="h-6 w-6 text-primary relative z-10" />
            <span className="absolute inset-0 bg-primary/20 blur-md rounded-xl"></span>
          </div>
          Giveaways
        </h1>
        <p className="text-muted-foreground ml-14">
          Enter daily raffles to win premium accounts for free.
        </p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <AdSlot format="banner" />
      </motion.div>

      {active.length === 0 && past.length === 0 ? (
        <motion.div variants={itemVariants}>
          <EmptyState
            icon={Gift}
            title="No active giveaways"
            description="Check back later. Admins frequently run drops for the community."
          />
        </motion.div>
      ) : (
        <>
          {active.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-5">
              <h2 className="text-xl font-bold flex items-center gap-2 tracking-tight">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                Active Drops
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {active.map((g) => {
                  const endsSoon = nowMs ? new Date(g.endsAt).getTime() - nowMs < 3600000 : false;
                  
                  return (
                    <Card key={g.id} className="border-border/50 bg-card/60 backdrop-blur-sm rounded-3xl overflow-hidden shadow-lg hover:shadow-primary/5 transition-all">
                      <div className="h-2 w-full bg-gradient-to-r from-primary to-primary/40" />
                      <CardContent className="p-6 space-y-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-xl font-bold tracking-tight">{g.title}</h3>
                            {g.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{g.description}</p>}
                          </div>
                          <Badge variant={g.isPremium ? "default" : "secondary"} className="shadow-sm">
                            {g.isPremium ? "Premium" : "Free"}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-3 bg-background/50 p-3 rounded-2xl border border-border/50">
                          <div className="flex-1 flex flex-col items-center">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Prize</span>
                            <span className="text-sm font-semibold flex items-center gap-1.5"><Server className="h-3.5 w-3.5 text-primary" /> {g.accountCount}x {g.service}</span>
                          </div>
                          <div className="w-px h-8 bg-border/50"></div>
                          <div className="flex-1 flex flex-col items-center">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Entries</span>
                            <span className="text-sm font-semibold flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-blue-500" /> {g.entryCount}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <div className={cn("text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 border", endsSoon ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-muted/50 text-muted-foreground border-border/50")}>
                            <Clock className="h-3.5 w-3.5" />
                            {getTimeRemaining(g.endsAt)}
                          </div>
                          {session ? (
                            <Button
                              size="sm"
                              className="rounded-xl font-semibold shadow-md transition-all"
                              disabled={!!entering}
                              onClick={() => handleEnter(g.id)}
                            >
                              {entering === g.id ? (
                                <><span className="h-3 w-3 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent" /> Entering</>
                              ) : (
                                <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Enter Drop</>
                              )}
                            </Button>
                          ) : (
                            <span className="text-xs font-medium text-muted-foreground">Login required</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          )}

          {past.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-5 pt-4">
              <h2 className="text-xl font-bold flex items-center gap-2 tracking-tight">
                <Trophy className="h-5 w-5 text-amber-500" /> Past Drops
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {past.map((g) => {
                  const didWin = session?.user?.id && g.winnerIds?.split(",").includes(session.user.id);
                  return (
                    <Card key={g.id} className={cn("border-border/40 backdrop-blur-sm rounded-2xl overflow-hidden", didWin ? "bg-amber-500/5 border-amber-500/20" : "bg-card/30 opacity-80")}>
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold line-clamp-1">{g.title}</h3>
                          {didWin ? (
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm border-0 shrink-0">
                              <Trophy className="mr-1 h-3 w-3" /> Won!
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="shrink-0">Ended</Badge>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <p className="text-sm font-medium flex items-center gap-2">
                            <Server className="h-3.5 w-3.5 text-muted-foreground" /> {g.accountCount || 1}x {g.service}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <Users className="h-3.5 w-3.5" /> {g.entryCount} total entries
                          </p>
                        </div>
                        <div className="pt-3 border-t border-border/40 text-xs text-muted-foreground flex items-center gap-1.5">
                          <Clock className="h-3 w-3" /> Ended {new Date(g.endedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
