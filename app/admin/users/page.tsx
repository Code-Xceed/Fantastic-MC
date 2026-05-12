"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/Skeleton";
import { toast } from "sonner";
import { Ban, Search, StickyNote, Users } from "lucide-react";

interface UserItem {
  id: string;
  username: string | null;
  avatar: string | null;
  amountGenned: number;
  premAmountGenned: number;
  isBlacklisted: boolean;
  subscriptionStage: string;
  subscriptionTimeLeft: number | null;
  lastTimeGenned: string | null;
  notes: string | null;
  createdAt: string;
}

type UserFilter = "all" | "premium" | "blacklisted";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [noteText, setNoteText] = useState("");
  const [cooldownSec, setCooldownSec] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), filter });
    if (search.trim()) params.set("search", search.trim());
    return params.toString();
  }, [filter, page, search]);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/users?${query}`)
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => toast.error("Failed to load users"))
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(fetchUsers, 0);
    return () => window.clearTimeout(timer);
  }, [fetchUsers]);

  const handleBlacklist = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed");
        return;
      }
      toast.success(data.isBlacklisted ? "User blacklisted" : "User unblacklisted");
      fetchUsers();
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, isBlacklisted: data.isBlacklisted });
      }
    } catch {
      toast.error("Failed to update blacklist");
    }
  };

  const handleSetNote = async () => {
    if (!selectedUser) return;
    try {
      const res = await fetch("/api/admin/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id, note: noteText }),
      });
      if (!res.ok) {
        toast.error("Failed to update note");
        return;
      }
      toast.success("Note updated");
      fetchUsers();
    } catch {
      toast.error("Failed to update note");
    }
  };

  const handleResetCooldown = async (stage: string) => {
    if (!selectedUser) return;
    try {
      const res = await fetch("/api/admin/cooldowns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", userId: selectedUser.id, stage }),
      });
      if (!res.ok) {
        toast.error("Failed to reset cooldown");
        return;
      }
      toast.success(`${stage} cooldown reset`);
    } catch {
      toast.error("Failed to reset cooldown");
    }
  };

  const handleSetCustomCooldown = async (stage: string) => {
    if (!selectedUser || !cooldownSec) return;
    try {
      const res = await fetch("/api/admin/cooldowns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set",
          userId: selectedUser.id,
          stage,
          timeSec: parseInt(cooldownSec, 10),
        }),
      });
      if (!res.ok) {
        toast.error("Failed to set cooldown");
        return;
      }
      toast.success(`Custom ${stage} cooldown set`);
      setCooldownSec("");
    } catch {
      toast.error("Failed to set cooldown");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Users className="h-6 w-6" />
          User Management
        </h1>
        <div className="flex flex-wrap gap-2">
          {(["all", "premium", "blacklisted"] as UserFilter[]).map((item) => (
            <Button
              key={item}
              variant={filter === item ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setFilter(item);
                setPage(1);
              }}
            >
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Search by username or Discord ID"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-md"
        />
        <Button variant="outline" onClick={fetchUsers}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4].map((item) => (
                <Skeleton key={item} lines={2} />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="p-10 text-center">
              <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">No users match this view</p>
              <p className="text-sm text-muted-foreground">Try a broader search or another filter.</p>
            </div>
          ) : (
            <div className="divide-y">
              {users.map((user) => (
                <button
                  key={user.id}
                  className="flex w-full flex-col gap-3 p-3 text-left transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                  onClick={() => {
                    setSelectedUser(user);
                    setNoteText(user.notes || "");
                  }}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatar || ""} />
                      <AvatarFallback>{user.username?.charAt(0) || "?"}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{user.username || user.id}</span>
                      <span className="block truncate text-xs text-muted-foreground">ID: {user.id}</span>
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{user.amountGenned} free</Badge>
                    <Badge variant="outline">{user.premAmountGenned} premium</Badge>
                    {user.isBlacklisted && <Badge variant="destructive">Blacklisted</Badge>}
                    <Badge variant={user.subscriptionStage === "Premium" ? "default" : "outline"}>
                      {user.subscriptionStage}
                    </Badge>
                  </span>
                </button>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 border-t p-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Prev
              </Button>
              <span className="text-sm text-muted-foreground">
                {page}/{totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedUser?.username || selectedUser?.id}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedUser.avatar || ""} />
                  <AvatarFallback>{selectedUser.username?.charAt(0) || "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">{selectedUser.username}</p>
                  <p className="truncate text-xs text-muted-foreground">ID: {selectedUser.id}</p>
                </div>
              </div>

              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div>Free generated: {selectedUser.amountGenned}</div>
                <div>Premium generated: {selectedUser.premAmountGenned}</div>
                <div>Stage: {selectedUser.subscriptionStage}</div>
                <div>Blacklisted: {String(selectedUser.isBlacklisted)}</div>
                <div className="sm:col-span-2">
                  Last gen:{" "}
                  {selectedUser.lastTimeGenned
                    ? new Date(parseFloat(selectedUser.lastTimeGenned) * 1000).toLocaleString()
                    : "Never"}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Note</Label>
                <div className="flex gap-2">
                  <Input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note" />
                  <Button size="sm" onClick={handleSetNote}>
                    <StickyNote className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cooldowns</Label>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleResetCooldown("Free")}>
                    Reset Free
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleResetCooldown("Premium")}>
                    Reset Premium
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="number"
                    placeholder="Seconds"
                    value={cooldownSec}
                    onChange={(e) => setCooldownSec(e.target.value)}
                    className="w-32"
                  />
                  <Button size="sm" variant="outline" onClick={() => handleSetCustomCooldown("Free")}>
                    Set Free
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleSetCustomCooldown("Premium")}>
                    Set Premium
                  </Button>
                </div>
              </div>

              <Separator />

              <Button
                variant={selectedUser.isBlacklisted ? "outline" : "destructive"}
                onClick={() => handleBlacklist(selectedUser.id)}
              >
                <Ban className="mr-2 h-4 w-4" />
                {selectedUser.isBlacklisted ? "Unblacklist" : "Blacklist"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
