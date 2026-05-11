"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Copy, Check, PartyPopper } from "lucide-react";
import { toast } from "sonner";

interface GiveawayWin {
  id: number;
  giveawayId: number;
  title: string;
  serviceName: string;
  combo: string;
  isPremium: boolean;
  createdAt: string;
}

export function GiveawayWinPopup() {
  const [wins, setWins] = useState<GiveawayWin[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/wins")
      .then((r) => r.json())
      .then((data) => {
        setWins(data.wins || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const currentWin = wins[currentIndex] || null;
  const isOpen = !loading && wins.length > 0 && currentIndex < wins.length;

  const handleDismiss = async () => {
    const winIds = wins.map((w) => w.id);
    setCopied(false);

    try {
      await fetch("/api/user/wins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winIds }),
      });
    } catch {
      // silently fail
    }

    setCurrentIndex((prev) => prev + 1);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!currentWin) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <PartyPopper className="h-6 w-6 text-yellow-500" />
            Congratulations!
          </DialogTitle>
          <DialogDescription>
            You won a giveaway!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span className="font-semibold text-lg">{currentWin.title}</span>
            </div>

            <div className="flex gap-2">
              <Badge variant="secondary">{currentWin.serviceName}</Badge>
              <Badge variant={currentWin.isPremium ? "default" : "secondary"}>
                {currentWin.isPremium ? "Premium" : "Free"}
              </Badge>
            </div>

            <div className="rounded-md bg-background/80 p-3 font-mono text-sm break-all border">
              {currentWin.combo}
            </div>

            <Button
              className="w-full"
              onClick={() => copyToClipboard(currentWin.combo)}
            >
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "Copied!" : "Copy Account"}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Save this account — it&apos;s also saved in your History.
            </p>
          </div>

          {wins.length > 1 && currentIndex < wins.length - 1 && (
            <p className="text-xs text-center text-muted-foreground">
              You have {wins.length - currentIndex - 1} more win{wins.length - currentIndex - 1 > 1 ? "s" : ""} to view
            </p>
          )}

          <Button variant="outline" className="w-full" onClick={handleDismiss}>
            {currentIndex < wins.length - 1 ? "Next Win" : "Dismiss"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
