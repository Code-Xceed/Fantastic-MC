"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdSlot } from "@/components/AdSlot";
import { formatCooldown } from "@/lib/gen-logic";
import { Server, Zap, Crown, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ServiceStock {
  name: string;
  displayName: string;
  iconUrl: string | null;
  freeStock: number;
  premiumStock: number;
}

interface UserData {
  freeCooldownRemaining: number;
  premiumCooldownRemaining: number;
  hasSubscription: boolean;
  subscriptionStage: string;
  isBlacklisted: boolean;
}

export default function ServicesPage() {
  const { data: session, status } = useSession();
  const [services, setServices] = useState<ServiceStock[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [result, setResult] = useState<{ service: string; account: string; isPremium: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((data) => setServices(data.services || []))
      .catch(() => {});

    if (session?.user?.id) {
      fetch("/api/user")
        .then((r) => r.json())
        .then((data) => setUserData(data.user))
        .catch(() => {});
    }
  }, [session]);

  const handleGenerate = async (service: string, isPremium: boolean) => {
    if (!session) return;
    setGenerating(service);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, isPremium }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Generation failed");
        // Refresh user data to get updated cooldowns
        fetch("/api/user").then((r) => r.json()).then((d) => setUserData(d.user));
        return;
      }

      setResult({ service, account: data.account, isPremium });
      toast.success("Account generated! Check the dialog.");

      // Refresh user data
      fetch("/api/user").then((r) => r.json()).then((d) => setUserData(d.user));
      fetch("/api/services").then((r) => r.json()).then((d) => setServices(d.services || []));
    } catch {
      toast.error("Something went wrong");
    } finally {
      setGenerating(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard!");
  };

  if (status === "loading") {
    return <div className="flex items-center justify-center py-20">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h1 className="text-2xl font-bold">Please login to generate accounts</h1>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Server className="h-6 w-6" />
          Services
        </h1>
        <p className="text-muted-foreground mt-1">
          Select a service and generate an account. Cooldowns apply after each generation.
        </p>
      </div>

      <AdSlot format="banner" />

      {services.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No services available yet. Check back later!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((svc) => (
            <Card key={svc.name} className="border-border/50">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{svc.displayName}</h3>
                  {svc.iconUrl && (
                    <img src={svc.iconUrl} alt={svc.displayName} className="h-8 w-8 rounded" />
                  )}
                </div>

                <div className="flex gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Zap className="h-3 w-3" /> Free: {svc.freeStock}
                  </Badge>
                  <Badge className="flex items-center gap-1">
                    <Crown className="h-3 w-3" /> Premium: {svc.premiumStock}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={
                      svc.freeStock === 0 ||
                      !!generating ||
                      (userData?.freeCooldownRemaining || 0) > 0
                    }
                    onClick={() => handleGenerate(svc.name, false)}
                  >
                    {generating === svc.name ? "Generating..." : "Free Gen"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    disabled={
                      svc.premiumStock === 0 ||
                      !!generating ||
                      !userData?.hasSubscription ||
                      (userData?.premiumCooldownRemaining || 0) > 0
                    }
                    onClick={() => handleGenerate(svc.name, true)}
                  >
                    {generating === svc.name ? "Generating..." : "Premium Gen"}
                  </Button>
                </div>

                {(userData?.freeCooldownRemaining ?? 0) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Free cooldown: {formatCooldown(userData?.freeCooldownRemaining ?? 0)}
                  </p>
                )}
                {(userData?.premiumCooldownRemaining ?? 0) > 0 && userData?.hasSubscription && (
                  <p className="text-xs text-muted-foreground">
                    Premium cooldown: {formatCooldown(userData?.premiumCooldownRemaining ?? 0)}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Result dialog */}
      <Dialog open={!!result} onOpenChange={() => setResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Account Generated — {result?.service}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Badge variant={result?.isPremium ? "default" : "secondary"}>
              {result?.isPremium ? "Premium" : "Free"}
            </Badge>
            <div className="rounded-lg bg-muted p-4 font-mono text-sm break-all">
              {result?.account}
            </div>
            <Button
              className="w-full"
              onClick={() => result && copyToClipboard(result.account)}
            >
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "Copied!" : "Copy to Clipboard"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Save this account — it won&apos;t be shown again.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
