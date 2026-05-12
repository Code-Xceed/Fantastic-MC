"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdSlot } from "@/components/AdSlot";
import { AdOverlay } from "@/components/AdOverlay";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { formatCooldown } from "@/lib/gen-logic";
import { Check, Copy, Crown, RefreshCw, Server, Tv, Zap } from "lucide-react";
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

type GenState = "idle" | "generating" | "watching_ad" | "claiming" | "done";

export default function ServicesPage() {
  const { data: session, status } = useSession();
  const [services, setServices] = useState<ServiceStock[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [genState, setGenState] = useState<GenState>("idle");
  const [activeService, setActiveService] = useState<string | null>(null);
  const [claimToken, setClaimToken] = useState<string | null>(null);
  const [result, setResult] = useState<{ service: string; account: string; isPremium: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  const refreshData = useCallback(() => {
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

  useEffect(() => {
    refreshData();
    const timer = window.setInterval(refreshData, 20_000);
    return () => window.clearInterval(timer);
  }, [refreshData]);

  const handleGenerate = async (service: string, isPremium: boolean) => {
    if (!session) return;
    setActiveService(service);
    setGenState("generating");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, isPremium }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Generation failed");
        setGenState("idle");
        refreshData();
        return;
      }

      if (data.requiresAd) {
        // Free user: show ad overlay
        setClaimToken(data.token);
        setGenState("watching_ad");
      } else {
        // Premium/admin: got account immediately
        setResult({ service, account: data.account, isPremium });
        setGenState("done");
        toast.success("Account generated!");
        refreshData();
      }
    } catch {
      toast.error("Something went wrong");
      setGenState("idle");
    }
  };

  const handleAdComplete = useCallback(async () => {
    if (!claimToken) return;
    setGenState("claiming");

    try {
      const res = await fetch("/api/generate/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: claimToken }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to claim account");
        setGenState("idle");
        setClaimToken(null);
        return;
      }

      setResult({ service: activeService || "", account: data.account, isPremium: false });
      setGenState("done");
      toast.success("Account generated!");
      refreshData();
    } catch {
      toast.error("Failed to claim account");
      setGenState("idle");
      setClaimToken(null);
    } finally {
      setClaimToken(null);
    }
  }, [claimToken, activeService, refreshData]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard!");
  };

  const ServiceIcon = ({ iconUrl, name }: { iconUrl?: string | null; name: string }) => {
    if (iconUrl) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={iconUrl} alt={name} className="h-6 w-6 rounded" />;
    }
    switch (name.toLowerCase()) {
      case "minecraft":
        return <Tv className="h-6 w-6 text-green-600" />;
      case "spotify":
        return <Server className="h-6 w-6 text-green-600" />;
      case "netflix":
        return <Server className="h-6 w-6 text-red-600" />;
      case "youtube":
        return <Server className="h-6 w-6 text-red-600" />;
      default:
        return <Server className="h-6 w-6 text-gray-600" />;
    }
  };

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} lines={1} />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} lines={1} />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} lines={1} />
          ))}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h1 className="text-2xl font-bold">Please login to generate accounts</h1>
      </div>
    );
  }

  const isPremiumOrAdmin = userData?.hasSubscription || session.isAdmin;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Server className="h-6 w-6" />
          Services
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {!isPremiumOrAdmin && (
            <Badge variant="outline" className="text-xs">
              <Tv className="mr-1 h-3 w-3" />
              Free users watch a 30s ad
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={refreshData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <AdSlot format="banner" />

      {/* Services grid */}
      {services.length === 0 ? (
        <EmptyState
          icon={Server}
          title="No services available"
          description="An admin needs to create a service and add stock before accounts can be generated."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((svc) => (
            <Card key={svc.name} className="border-border/50">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ServiceIcon iconUrl={svc.iconUrl} name={svc.displayName} />
                    <h3 className="font-semibold text-lg">{svc.displayName}</h3>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Zap className="h-3 w-3" /> Free: {svc.freeStock}
                    </Badge>
                    <Badge className="flex items-center gap-1">
                      <Crown className="h-3 w-3" /> Premium: {svc.premiumStock}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={
                      svc.freeStock === 0 ||
                      genState !== "idle" ||
                      (userData?.freeCooldownRemaining || 0) > 0
                    }
                    onClick={() => handleGenerate(svc.name, false)}
                  >
                    {isPremiumOrAdmin ? (
                      <><Zap className="mr-2 h-4 w-4" /> Generate Free</>
                    ) : (
                      <><Tv className="mr-2 h-4 w-4" /> Watch Ad & Generate</>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={
                      svc.premiumStock === 0 ||
                      genState !== "idle" ||
                      !userData?.hasSubscription ||
                      (userData?.premiumCooldownRemaining || 0) > 0
                    }
                    onClick={() => handleGenerate(svc.name, true)}
                  >
                    <Crown className="mr-2 h-4 w-4" /> Generate Premium
                  </Button>

                  {(userData?.premiumCooldownRemaining ?? 0) > 0 && userData?.hasSubscription && (
                    <p className="text-xs text-muted-foreground sm:col-span-2">
                      Premium cooldown: {formatCooldown(userData?.premiumCooldownRemaining ?? 0)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Ad overlay for free users */}
      {genState === "watching_ad" && (
        <AdOverlay
          duration={30}
          onComplete={handleAdComplete}
          onSkip={() => {
            setGenState("idle");
            setClaimToken(null);
            toast.error("Generation cancelled");
          }}
        />
      )}

      {/* Claiming spinner */}
      {genState === "claiming" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-white">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <p>Claiming your account...</p>
          </div>
        </div>
      )}

      {/* Result dialog */}
      <Dialog open={genState === "done"} onOpenChange={(open) => { if (!open) { setGenState("idle"); setResult(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Account Generated!</DialogTitle>
          </DialogHeader>
          {result && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground mb-1">
                  {result.service} — {result.isPremium ? "Premium" : "Free"}
                </p>
                <p className="font-mono text-lg break-all">{result.account}</p>
              </div>
              <Button
                className="w-full"
                onClick={() => copyToClipboard(result.account)}
              >
                {copied ? <><Check className="mr-2 h-4 w-4" /> Copied!</> : <><Copy className="mr-2 h-4 w-4" /> Copy to Clipboard</>}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Save this account — it won&apos;t be shown again.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
