"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdSlot } from "@/components/AdSlot";
import { GiveawayWinPopup } from "@/components/GiveawayWinPopup";
import { Skeleton } from "@/components/Skeleton";
import { formatCooldown } from "@/lib/gen-logic";
import { motion } from "framer-motion";
import {
  User,
  Zap,
  Crown,
  Clock,
  History,
  Trophy,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserData {
  id: string;
  username: string | null;
  avatar: string | null;
  amountGenned: number;
  premAmountGenned: number;
  totalAccounts: number;
  lastTimeGenned: string | null;
  isBlacklisted: boolean;
  subscriptionStage: string;
  subscriptionTimeLeft: number | null;
  hasSubscription: boolean;
  freeCooldownRemaining: number;
  premiumCooldownRemaining: number;
}

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
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/user")
        .then((r) => r.json())
        .then((data) => setUserData(data.user))
        .catch(() => {});

      fetch("/api/user/history?page=1")
        .then((r) => r.json())
        .then((data) => setRecentHistory((data.history || []).slice(0, 5)))
        .catch(() => {});
    }
  }, [session]);

  if (status === "loading") {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pt-4 pb-20">
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton lines={4} className="h-64 rounded-3xl" />
          <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
             {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} lines={2} className="h-32 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <User className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
        <h1 className="text-2xl font-bold tracking-tight">Authentication Required</h1>
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid gap-6 lg:grid-cols-3 max-w-6xl mx-auto pt-4 pb-20"
    >
      {/* Profile card */}
      <motion.div variants={itemVariants} className="lg:col-span-1 h-full">
        <Card className="h-full border-border/40 bg-card/40 backdrop-blur-md rounded-3xl overflow-hidden shadow-lg shadow-background/5">
          <div className="h-24 w-full bg-gradient-to-br from-primary/20 via-background to-background relative border-b border-border/50">
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 p-1.5 bg-card rounded-full border border-border/50">
              <Avatar className="h-20 w-20 border-2 border-background shadow-sm">
                <AvatarImage src={userData?.avatar || session.user.image || ""} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                  {session.user.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
          <CardContent className="flex flex-col items-center gap-4 p-6 pt-14">
            <div className="text-center">
              <h2 className="text-2xl font-extrabold tracking-tight">{userData?.username || session.user.name}</h2>
              <div className="mt-2 flex justify-center items-center gap-2">
                <Badge variant={userData?.subscriptionStage === "Premium" ? "default" : "secondary"} className="shadow-sm font-medium py-1 px-3">
                  {userData?.subscriptionStage === "Premium" ? (
                    <><Crown className="mr-1.5 h-3.5 w-3.5" /> Premium User</>
                  ) : (
                    <><User className="mr-1.5 h-3.5 w-3.5" /> Free Member</>
                  )}
                </Badge>
                {userData?.isBlacklisted && (
                  <Badge variant="destructive" className="shadow-sm py-1 px-3">Blacklisted</Badge>
                )}
              </div>
            </div>
            
            {userData?.hasSubscription && userData.subscriptionTimeLeft && (
              <div className="bg-primary/5 border border-primary/10 w-full p-3 rounded-xl text-center mt-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Subscription Expires</p>
                <p className="text-sm font-medium">{new Date(userData.subscriptionTimeLeft * 1000).toLocaleString()}</p>
              </div>
            )}
            
            <Link href="/services" className={cn(buttonVariants({ variant: "default" }), "w-full rounded-xl mt-2 h-12 text-base font-semibold shadow-md shadow-primary/20")}>
              Generate Accounts <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <div className="lg:col-span-2 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { icon: History, label: "Total Generated", value: userData?.totalAccounts || 0, color: "text-blue-500", bg: "bg-blue-500/10" },
          { icon: Zap, label: "Free Generated", value: userData?.amountGenned || 0, color: "text-zinc-500", bg: "bg-zinc-500/10" },
          { icon: Crown, label: "Premium Generated", value: userData?.premAmountGenned || 0, color: "text-amber-500", bg: "bg-amber-500/10" },
          { icon: Clock, label: "Free Cooldown", value: userData?.freeCooldownRemaining ? formatCooldown(userData.freeCooldownRemaining) : "Ready", isString: true },
          { icon: Clock, label: "Premium Cooldown", value: userData?.premiumCooldownRemaining ? formatCooldown(userData.premiumCooldownRemaining) : "Ready", isString: true, highlight: true }
        ].map((stat, i) => (
          <motion.div key={i} variants={itemVariants}>
            <Card className="border-border/40 bg-card/40 backdrop-blur-sm rounded-3xl h-full hover:bg-card/60 transition-colors">
              <CardContent className="flex flex-col justify-center gap-3 p-6 h-full">
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", stat.bg || "bg-primary/10")}>
                    <stat.icon className={cn("h-5 w-5", stat.color || "text-primary")} />
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">{stat.label}</p>
                </div>
                <p className={cn("text-3xl font-bold tracking-tight pl-1", stat.isString && "text-xl", stat.highlight && "text-amber-500")}>
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="lg:col-span-3 mt-4">
        <AdSlot format="banner" />
      </div>

      {/* Recent history */}
      <motion.div variants={itemVariants} className="lg:col-span-3">
        <Card className="border-border/40 bg-card/40 backdrop-blur-sm rounded-3xl overflow-hidden shadow-sm">
          <CardHeader className="border-b border-border/30 bg-muted/20 pb-4">
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2 font-bold">
                <History className="h-5 w-5 text-primary" />
                Recent Generations
              </span>
              <Link href="/history" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "rounded-full h-8 px-4 text-xs font-semibold")}>
                View History
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentHistory.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                <Zap className="h-10 w-10 mb-3 opacity-20" />
                <p className="font-medium">No accounts generated yet.</p>
                <Link href="/services" className="text-primary hover:underline text-sm mt-1">Start generating now</Link>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {recentHistory.map((h) => (
                  <div key={h.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      h.source === "giveaway" ? "bg-amber-500/15" : "bg-primary/10"
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
                        <Badge variant={h.isPremium ? "default" : "outline"} className="text-[10px] px-1.5 h-4 uppercase font-bold tracking-wider">
                          {h.isPremium ? "Premium" : "Free"}
                        </Badge>
                        {h.source === "giveaway" && (
                          <Badge variant="outline" className="text-[10px] px-1.5 h-4 border-amber-500/30 text-amber-500 bg-amber-500/5">
                            <Trophy className="mr-1 h-2.5 w-2.5" /> Won
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground font-mono truncate bg-background/50 inline-block px-2 py-0.5 rounded border border-border/50">
                        {h.combo}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap block">
                        {new Date(h.generatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <GiveawayWinPopup />
    </motion.div>
  );
}
