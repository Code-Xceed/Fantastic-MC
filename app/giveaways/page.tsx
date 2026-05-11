"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdSlot } from "@/components/AdSlot";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Gift, Clock, Users, Trophy } from "lucide-react";
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

export default function GiveawaysPage() {
  const { data: session, status } = useSession();
  const [active, setActive] = useState<ActiveGiveaway[]>([]);
  const [past, setPast] = useState<PastGiveaway[]>([]);
  const [entering, setEntering] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/giveaways")
      .then((r) => r.json())
      .then((data) => {
        setActive(data.active || []);
        setPast(data.past || []);
      })
      .catch(() => {});
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
        toast.error(data.error || "Failed to enter");
        return;
      }

      toast.success("You entered the giveaway!");
      // Refresh to update entry count
      fetch("/api/giveaways")
        .then((r) => r.json())
        .then((data) => {
          setActive(data.active || []);
          setPast(data.past || []);
        });
    } catch {
      toast.error("Something went wrong");
    } finally {
      setEntering(null);
    }
  };

  const getTimeRemaining = (endsAt: string) => {
    const end = new Date(endsAt).getTime();
    const now = Date.now();
    const diff = Math.max(0, end - now);
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  if (status === "loading") {
    return <LoadingSpinner className="py-20" text="Loading giveaways..." />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Gift className="h-6 w-6" />
        Giveaways
      </h1>

      <AdSlot format="banner" />

      {active.length === 0 && past.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No giveaways available right now. Check back later!
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active giveaways */}
          {active.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5" /> Active Giveaways
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {active.map((g) => (
                  <Card key={g.id} className="border-border/50">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{g.title}</h3>
                        <Badge variant={g.isPremium ? "default" : "secondary"}>
                          {g.isPremium ? "Premium" : "Free"}
                        </Badge>
                      </div>
                      {g.description && (
                        <p className="text-sm text-muted-foreground">{g.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Gift className="h-4 w-4" /> {g.accountCount}x {g.service}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" /> {g.entryCount} entries
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Ends in: {getTimeRemaining(g.endsAt)}
                        </span>
                        {session ? (
                          <Button
                            size="sm"
                            disabled={!!entering}
                            onClick={() => handleEnter(g.id)}
                          >
                            {entering === g.id ? "Entering..." : "Enter Giveaway"}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Login to enter</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Past giveaways */}
          {past.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Trophy className="h-5 w-5" /> Past Giveaways
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {past.map((g) => (
                  <Card key={g.id} className="border-border/50 opacity-75">
                    <CardContent className="p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{g.title}</h3>
                        <Badge variant="outline">Ended</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {g.accountCount || 1}x {g.service} — {g.entryCount} entries
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ended: {new Date(g.endedAt).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
