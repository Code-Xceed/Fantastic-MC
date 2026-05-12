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
import { Check, Copy, Crown, RefreshCw, Server, Tv, Zap, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

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
        setClaimToken(data.token);
        setGenState("watching_ad");
      } else {
        setResult({ service, account: data.account, isPremium });
        setGenState("done");
        toast.success("Account generated successfully");
        refreshData();
      }
    } catch {
      toast.error("Network error. Please try again.");
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
        toast.error(data.error || "Verification failed. Could not claim account.");
        setGenState("idle");
        setClaimToken(null);
        return;
      }

      setResult({ service: activeService || "", account: data.account, isPremium: false });
      setGenState("done");
      toast.success("Account generated successfully");
      refreshData();
    } catch {
      toast.error("Network error during claim. Please try again.");
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
    toast.success("Copied to clipboard");
  };

  const ServiceIcon = ({ iconUrl, name }: { iconUrl?: string | null; name: string }) => {
    if (iconUrl) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={iconUrl} alt={name} className="h-7 w-7 rounded-md object-cover shadow-sm" />;
    }
    switch (name.toLowerCase()) {
      case "minecraft": return <Tv className="h-7 w-7 text-green-500" />;
      case "spotify": return <Server className="h-7 w-7 text-green-500" />;
      case "netflix": return <Server className="h-7 w-7 text-red-500" />;
      case "youtube": return <Server className="h-7 w-7 text-red-500" />;
      default: return <Server className="h-7 w-7 text-muted-foreground" />;
    }
  };

  if (status === "loading") {
    return (
      <div className="space-y-6 pt-8">
        <div className="flex justify-between items-center mb-6">
          <Skeleton lines={1} className="w-48 h-8" />
          <Skeleton lines={1} className="w-24 h-8" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border-border/40 bg-card/40">
              <CardContent className="p-6">
                <Skeleton lines={3} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-32 text-center"
      >
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
        <h1 className="text-2xl font-bold tracking-tight">Authentication Required</h1>
        <p className="text-muted-foreground mt-2">Please login via the navigation bar to generate accounts.</p>
      </motion.div>
    );
  }

  const isPremiumOrAdmin = userData?.hasSubscription || session.isAdmin;

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
      className="space-y-8 pt-4 pb-20 max-w-6xl mx-auto"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card/30 p-4 rounded-2xl border border-border/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-xl">
            <Server className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Generator Services</h1>
            <p className="text-sm text-muted-foreground">Select a service to generate an account.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!isPremiumOrAdmin && (
            <Badge variant="secondary" className="text-xs font-medium py-1 px-3 bg-background/80 border-border/50 shadow-sm">
              <Tv className="mr-1.5 h-3.5 w-3.5 text-primary" />
              Ad wait: 30s
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={refreshData} className="rounded-full shadow-sm">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <AdSlot format="banner" />

      {services.length === 0 ? (
        <EmptyState
          icon={Server}
          title="No services available"
          description="Services and stock will appear here once added by administrators."
        />
      ) : (
        <motion.div 
          variants={containerVariants} 
          initial="hidden" 
          animate="show" 
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {services.map((svc) => (
            <motion.div key={svc.name} variants={itemVariants}>
              <Card className="group border-border/40 bg-card/40 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
                <CardContent className="p-6 flex flex-col h-full justify-between gap-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-xl bg-background shadow-sm border border-border/50 group-hover:scale-110 transition-transform">
                        <ServiceIcon iconUrl={svc.iconUrl} name={svc.displayName} />
                      </div>
                      <h3 className="font-semibold text-lg tracking-tight">{svc.displayName}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-background/50 p-3 rounded-xl border border-border/40">
                    <div className="flex-1 flex flex-col items-center justify-center px-2 border-r border-border/50">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Free</span>
                      <span className="font-mono font-medium text-foreground">{svc.freeStock}</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center px-2">
                      <span className="text-[10px] uppercase font-bold text-primary tracking-wider mb-1">Premium</span>
                      <span className="font-mono font-medium text-primary">{svc.premiumStock}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <Button
                      size="default"
                      variant={isPremiumOrAdmin ? "outline" : "default"}
                      className="w-full rounded-xl transition-all"
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
                        <><Tv className="mr-2 h-4 w-4" /> Watch Ad to Generate</>
                      )}
                    </Button>
                    <Button
                      size="default"
                      variant={isPremiumOrAdmin ? "default" : "secondary"}
                      className="w-full rounded-xl transition-all"
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
                      <p className="text-[11px] text-center font-medium text-red-400 mt-1">
                        Cooldown: {formatCooldown(userData?.premiumCooldownRemaining ?? 0)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {genState === "watching_ad" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AdOverlay
              duration={30}
              onComplete={handleAdComplete}
              onSkip={() => {
                setGenState("idle");
                setClaimToken(null);
                toast.error("Generation cancelled");
              }}
            />
          </motion.div>
        )}

        {genState === "claiming" && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md"
          >
            <div className="flex flex-col items-center gap-4 bg-card p-8 rounded-3xl border border-border shadow-2xl">
              <div className="relative flex h-12 w-12 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40 opacity-75"></span>
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
              <p className="text-sm font-medium tracking-wide animate-pulse">Claiming your account...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={genState === "done"} onOpenChange={(open) => { if (!open) { setGenState("idle"); setResult(null); } }}>
        <DialogContent className="max-w-md sm:rounded-3xl border-border/50 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <div className="bg-green-500/20 text-green-500 p-1.5 rounded-full">
                <Check className="h-5 w-5" />
              </div>
              Success!
            </DialogTitle>
          </DialogHeader>
          {result && (
            <div className="space-y-6 pt-4">
              <div className="rounded-xl border border-border/50 bg-muted/30 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Server className="h-4 w-4" /> {result.service}
                  </span>
                  <Badge variant={result.isPremium ? "default" : "secondary"} className="shadow-sm">
                    {result.isPremium ? "Premium" : "Free"}
                  </Badge>
                </div>
                <div className="bg-background/80 border border-border/50 p-4 rounded-lg flex items-center justify-center">
                  <p className="font-mono text-lg font-semibold tracking-wider break-all text-center selection:bg-primary/30">
                    {result.account}
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                className="w-full rounded-xl h-14 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
                onClick={() => copyToClipboard(result.account)}
              >
                {copied ? <><Check className="mr-2 h-5 w-5" /> Copied</> : <><Copy className="mr-2 h-5 w-5" /> Copy to Clipboard</>}
              </Button>
              <p className="text-xs text-center text-muted-foreground font-medium">
                Please save this immediately. It will not be shown again.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
