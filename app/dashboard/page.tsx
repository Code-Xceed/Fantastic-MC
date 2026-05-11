"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdSlot } from "@/components/AdSlot";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { GiveawayWinPopup } from "@/components/GiveawayWinPopup";
import { formatCooldown } from "@/lib/gen-logic";
import {
  User,
  Zap,
  Crown,
  Clock,
  History,
  Trophy,
} from "lucide-react";

interface UserData {
  id: string;
  username: string | null;
  avatar: string | null;
  amountGenned: number;
  premAmountGenned: number;
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
    return <LoadingSpinner className="py-20" text="Loading dashboard..." />;
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h1 className="text-2xl font-bold">Please login to view your dashboard</h1>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Profile card */}
      <Card className="lg:col-span-1">
        <CardContent className="flex flex-col items-center gap-4 p-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={userData?.avatar || session.user.image || ""} />
            <AvatarFallback className="text-2xl">
              {session.user.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h2 className="text-xl font-bold">{userData?.username || session.user.name}</h2>
            <Badge variant={userData?.subscriptionStage === "Premium" ? "default" : "secondary"} className="mt-1">
              {userData?.subscriptionStage === "Premium" ? (
                <><Crown className="mr-1 h-3 w-3" /> Premium</>
              ) : (
                <><User className="mr-1 h-3 w-3" /> Free</>
              )}
            </Badge>
          </div>
          {userData?.isBlacklisted && (
            <Badge variant="destructive">Blacklisted</Badge>
          )}
          {userData?.hasSubscription && userData.subscriptionTimeLeft && (
            <p className="text-xs text-muted-foreground">
              Sub expires: {new Date(userData.subscriptionTimeLeft * 1000).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Free Generated</p>
              <p className="text-2xl font-bold">{userData?.amountGenned || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Crown className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Premium Generated</p>
              <p className="text-2xl font-bold">{userData?.premAmountGenned || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Free Cooldown</p>
              <p className="text-lg font-semibold">
                {userData?.freeCooldownRemaining
                  ? formatCooldown(userData.freeCooldownRemaining)
                  : "Ready"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Premium Cooldown</p>
              <p className="text-lg font-semibold">
                {userData?.premiumCooldownRemaining
                  ? formatCooldown(userData.premiumCooldownRemaining)
                  : "Ready"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <AdSlot format="sidebar" className="lg:col-span-1" />

      {/* Recent history */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accounts generated yet.</p>
          ) : (
            <div className="space-y-2">
              {recentHistory.map((h) => (
                <div key={h.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    h.source === "giveaway" ? "bg-yellow-500/10" : "bg-primary/10"
                  }`}>
                    {h.source === "giveaway" ? (
                      <Trophy className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <Zap className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{h.service}</p>
                      <Badge variant={h.isPremium ? "default" : "secondary"} className="text-[10px] px-1.5">
                        {h.isPremium ? "Premium" : "Free"}
                      </Badge>
                      {h.source === "giveaway" && (
                        <Badge variant="outline" className="text-[10px] px-1.5 border-yellow-500/30 text-yellow-600">
                          <Trophy className="mr-0.5 h-2.5 w-2.5" /> Won
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">{h.combo}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(h.generatedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Giveaway win popup */}
      <GiveawayWinPopup />
    </div>
  );
}
