"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Crown, Clock, UserPlus, Users } from "lucide-react";

interface SubUser {
  id: string;
  username: string | null;
  avatar: string | null;
  subscriptionStage: string;
  subscriptionTimeLeft: number | null;
  amountGenned: number;
  premAmountGenned: number;
}

export default function AdminSubscriptionsPage() {
  const [premiumUsers, setPremiumUsers] = useState<SubUser[]>([]);
  const [targetUserId, setTargetUserId] = useState("");
  const [timeSec, setTimeSec] = useState("");
  const [massTimeSec, setMassTimeSec] = useState("");

  const fetchPremiumUsers = () => {
    fetch("/api/admin/users?search=&page=1&limit=100")
      .then((r) => r.json())
      .then((data) => {
        const subs = (data.users || []).filter(
          (u: SubUser) => u.subscriptionStage === "Premium"
        );
        setPremiumUsers(subs);
      })
      .catch(() => {});
  };

  useEffect(() => { fetchPremiumUsers(); }, []);

  const presets = [
    { label: "1 Day", seconds: 86400 },
    { label: "7 Days", seconds: 604800 },
    { label: "30 Days", seconds: 2592000 },
    { label: "90 Days", seconds: 7776000 },
  ];

  const handleSubscription = async (action: string) => {
    if (!targetUserId && action !== "massadd") {
      toast.error("User ID is required");
      return;
    }

    try {
      const body: Record<string, unknown> = { action };
      if (action === "add" || action === "set") {
        body.userId = targetUserId;
        body.timeSec = parseInt(timeSec);
      } else if (action === "remove") {
        body.userId = targetUserId;
      } else if (action === "massadd") {
        body.massTimeSec = parseInt(massTimeSec);
      }

      const res = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }

      if (action === "massadd") {
        toast.success(`Extended ${data.count} premium subscriptions`);
      } else {
        toast.success(`Subscription ${action} successful`);
      }
      fetchPremiumUsers();
    } catch {
      toast.error("Failed");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Crown className="h-6 w-6" />
        Subscription Management
      </h1>

      {/* Premium users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Premium Users ({premiumUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {premiumUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No premium users.</p>
          ) : (
            <div className="divide-y">
              {premiumUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{u.username || u.id}</p>
                    <p className="text-xs text-muted-foreground">ID: {u.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">
                      <Crown className="mr-1 h-3 w-3" /> Premium
                    </Badge>
                    {u.subscriptionTimeLeft && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(u.subscriptionTimeLeft * 1000).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Manage subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Manage Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>User ID</Label>
            <Input
              placeholder="Discord user ID"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Duration (seconds)</Label>
            <Input
              type="number"
              placeholder="e.g. 86400 for 1 day"
              value={timeSec}
              onChange={(e) => setTimeSec(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <Button
                  key={p.label}
                  variant="outline"
                  size="sm"
                  onClick={() => setTimeSec(String(p.seconds))}
                >
                  <Clock className="mr-1 h-3 w-3" />
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => handleSubscription("add")}>Add Time</Button>
            <Button variant="outline" onClick={() => handleSubscription("set")}>Set Time</Button>
            <Button variant="destructive" onClick={() => handleSubscription("remove")}>Remove</Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Mass add */}
      <Card>
        <CardHeader>
          <CardTitle>Mass Extend Premium</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Extend all current premium subscriptions by a set amount of time.
          </p>
          <div className="space-y-2">
            <Label>Duration (seconds)</Label>
            <Input
              type="number"
              placeholder="e.g. 86400 for 1 day"
              value={massTimeSec}
              onChange={(e) => setMassTimeSec(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <Button
                  key={p.label}
                  variant="outline"
                  size="sm"
                  onClick={() => setMassTimeSec(String(p.seconds))}
                >
                  <Clock className="mr-1 h-3 w-3" />
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
          <Button onClick={() => handleSubscription("massadd")} disabled={!massTimeSec}>
            Mass Extend
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
