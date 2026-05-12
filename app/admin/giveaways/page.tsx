"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Gift, Plus, Search, Trophy, Users } from "lucide-react";

interface GiveawayItem {
  id: number;
  title: string;
  description: string | null;
  service: string;
  accountCount: number;
  isPremium: boolean;
  endsAt: string;
  isActive: boolean;
  winnerIds: string | null;
  entryCount: number;
  createdAt: string;
}

export default function AdminGiveawaysPage() {
  const [giveaways, setGiveaways] = useState<GiveawayItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [accountCount, setAccountCount] = useState("1");
  const [isPremium, setIsPremium] = useState(false);
  const [endsAt, setEndsAt] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "ended" | "premium">("all");

  const fetchGiveaways = () => {
    fetch("/api/admin/giveaways")
      .then((r) => r.json())
      .then((data) => setGiveaways(data.giveaways || []))
      .catch(() => {});
  };

  useEffect(() => { fetchGiveaways(); }, []);

  const handleCreate = async () => {
    if (!title || !serviceName || !endsAt) {
      toast.error("Title, service, and end time are required");
      return;
    }

    try {
      const res = await fetch("/api/admin/giveaways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          serviceName,
          accountCount: parseInt(accountCount) || 1,
          isPremium,
          endsAt: new Date(endsAt).toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }

      toast.success("Giveaway created!");
      setTitle("");
      setDescription("");
      setServiceName("");
      setAccountCount("1");
      setEndsAt("");
      fetchGiveaways();
    } catch {
      toast.error("Failed to create giveaway");
    }
  };

  const handleDraw = async (giveawayId: number) => {
    if (!confirm("Draw winners now? This will assign accounts from stock and end the giveaway.")) return;

    try {
      const res = await fetch("/api/admin/giveaways/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giveawayId }),
      });

      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }

      toast.success(`Winners drawn: ${data.winnerIds.join(", ")}`);
      fetchGiveaways();
    } catch {
      toast.error("Failed to draw winners");
    }
  };

  const filteredGiveaways = giveaways.filter((g) => {
    const matchesSearch =
      !search.trim() ||
      g.title.toLowerCase().includes(search.toLowerCase()) ||
      g.service.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "active" && g.isActive) ||
      (filter === "ended" && !g.isActive) ||
      (filter === "premium" && g.isPremium);
    return matchesSearch && matchesFilter;
  });
  const active = filteredGiveaways.filter((g) => g.isActive);
  const past = filteredGiveaways.filter((g) => !g.isActive);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Gift className="h-6 w-6" />
        Giveaway Management
      </h1>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search giveaways"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "active", "ended", "premium"] as const).map((item) => (
            <Button
              key={item}
              variant={filter === item ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(item)}
            >
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Active giveaways */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Active Giveaways ({active.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {active.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Trophy className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">No active giveaways match this view</p>
              <p className="text-sm text-muted-foreground">Create one below or adjust your filters.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {active.map((g) => (
                <div key={g.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{g.title}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary">{g.accountCount}x {g.service}</Badge>
                      <Badge variant={g.isPremium ? "default" : "outline"}>
                        {g.isPremium ? "Premium" : "Free"}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {g.entryCount}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ends: {new Date(g.endsAt).toLocaleString()}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => handleDraw(g.id)}>
                    <Trophy className="mr-1 h-4 w-4" />
                    Draw
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past giveaways */}
      {past.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past Giveaways</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {past.map((g) => (
                <div key={g.id} className="flex items-center justify-between rounded-lg border p-3 opacity-75">
                  <div>
                    <p className="text-sm font-medium">{g.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {g.accountCount}x {g.service} — {g.entryCount} entries
                    </p>
                  </div>
                  <Badge variant="outline">Ended</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Create giveaway */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Giveaway
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="e.g. Minecraft Giveaway"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Service Name</Label>
              <Input
                placeholder="e.g. minecraft"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Account Count</Label>
              <Input
                type="number"
                min="1"
                value={accountCount}
                onChange={(e) => setAccountCount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tier</Label>
              <div className="flex gap-2">
                <Button variant={!isPremium ? "default" : "outline"} size="sm" onClick={() => setIsPremium(false)}>Free</Button>
                <Button variant={isPremium ? "default" : "outline"} size="sm" onClick={() => setIsPremium(true)}>Premium</Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              placeholder="Giveaway description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>End Time</Label>
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>

          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Giveaway
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
