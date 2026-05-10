"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Users, Search, Ban, StickyNote, Clock } from "lucide-react";

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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [noteText, setNoteText] = useState("");
  const [cooldownSec, setCooldownSec] = useState("");

  const fetchUsers = (searchVal = search, pageVal = page) => {
    const params = new URLSearchParams();
    if (searchVal) params.set("search", searchVal);
    params.set("page", String(pageVal));

    fetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => {});
  };

  useEffect(() => { fetchUsers(); }, [page]);

  const handleSearch = () => {
    setPage(1);
    fetchUsers(search, 1);
  };

  const handleBlacklist = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(`Blacklist status: ${data.isBlacklisted}`);
      fetchUsers();
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, isBlacklisted: data.isBlacklisted });
      }
    } catch { toast.error("Failed"); }
  };

  const handleSetNote = async () => {
    if (!selectedUser) return;
    try {
      const res = await fetch("/api/admin/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id, note: noteText }),
      });
      if (!res.ok) { toast.error("Failed"); return; }
      toast.success("Note updated");
      fetchUsers();
    } catch { toast.error("Failed"); }
  };

  const handleResetCooldown = async (stage: string) => {
    if (!selectedUser) return;
    try {
      const res = await fetch("/api/admin/cooldowns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", userId: selectedUser.id, stage }),
      });
      if (!res.ok) { toast.error("Failed"); return; }
      toast.success(`${stage} cooldown reset`);
    } catch { toast.error("Failed"); }
  };

  const handleSetCustomCooldown = async (stage: string) => {
    if (!selectedUser || !cooldownSec) return;
    try {
      const res = await fetch("/api/admin/cooldowns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set", userId: selectedUser.id, stage, timeSec: parseInt(cooldownSec) }),
      });
      if (!res.ok) { toast.error("Failed"); return; }
      toast.success(`Custom ${stage} cooldown set to ${cooldownSec}s`);
      setCooldownSec("");
    } catch { toast.error("Failed"); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Users className="h-6 w-6" />
        User Management
      </h1>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Search by username or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="max-w-sm"
        />
        <Button variant="outline" onClick={handleSearch}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Users table */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {users.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">No users found.</p>
            ) : (
              users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer"
                  onClick={() => {
                    setSelectedUser(u);
                    setNoteText(u.notes || "");
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.avatar || ""} />
                      <AvatarFallback>{u.username?.charAt(0) || "?"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{u.username || u.id}</p>
                      <p className="text-xs text-muted-foreground">ID: {u.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{u.amountGenned} gen</Badge>
                    {u.isBlacklisted && <Badge variant="destructive">Banned</Badge>}
                    <Badge variant={u.subscriptionStage === "Premium" ? "default" : "outline"}>
                      {u.subscriptionStage}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-4 border-t">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
              <span className="text-sm text-muted-foreground">{page}/{totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User detail dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-lg">
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
                <div>
                  <p className="font-medium">{selectedUser.username}</p>
                  <p className="text-xs text-muted-foreground">ID: {selectedUser.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Free Genned:</span> {selectedUser.amountGenned}</div>
                <div><span className="text-muted-foreground">Premium Genned:</span> {selectedUser.premAmountGenned}</div>
                <div><span className="text-muted-foreground">Stage:</span> {selectedUser.subscriptionStage}</div>
                <div><span className="text-muted-foreground">Blacklisted:</span> {String(selectedUser.isBlacklisted)}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Last Gen:</span> {selectedUser.lastTimeGenned ? new Date(parseFloat(selectedUser.lastTimeGenned) * 1000).toLocaleString() : "Never"}</div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Note</Label>
                <div className="flex gap-2">
                  <Input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note..." />
                  <Button size="sm" onClick={handleSetNote}>
                    <StickyNote className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cooldowns</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleResetCooldown("Free")}>Reset Free</Button>
                  <Button variant="outline" size="sm" onClick={() => handleResetCooldown("Premium")}>Reset Premium</Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Seconds"
                    value={cooldownSec}
                    onChange={(e) => setCooldownSec(e.target.value)}
                    className="w-32"
                  />
                  <Button size="sm" variant="outline" onClick={() => handleSetCustomCooldown("Free")}>Set Free</Button>
                  <Button size="sm" variant="outline" onClick={() => handleSetCustomCooldown("Premium")}>Set Premium</Button>
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
