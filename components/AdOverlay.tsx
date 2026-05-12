"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tv, Volume2, X } from "lucide-react";

interface AdOverlayProps {
  duration?: number;
  onComplete: () => void;
  onSkip?: () => void;
}

export function AdOverlay({ duration = 30, onComplete, onSkip }: AdOverlayProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const zoneId = process.env.NEXT_PUBLIC_PROPELLER_ZONE_ID;
  const canSkip = timeLeft <= 0;

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = window.setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (!zoneId) return;

    const existingScript = document.getElementById("propeller-ads-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "propeller-ads-script";
      script.async = true;
      script.src = "//magsrv.com/ad-provider.js";
      script.setAttribute("data-zone", zoneId);
      document.head.appendChild(script);
    }

    try {
      const w = window as Window & {
        AdProvider?: { push: (payload: { zone: string; type: string }) => void };
      };
      w.AdProvider?.push({ zone: zoneId, type: "interstitial" });
    } catch {
      return;
    }
  }, [zoneId]);

  const progress = duration > 0 ? ((duration - timeLeft) / duration) * 100 : 100;

  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 px-4 backdrop-blur-sm">
      <div className="absolute right-4 top-4">
        {canSkip ? (
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={handleComplete}>
            <X className="h-6 w-6" />
          </Button>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full text-white/30">
            <X className="h-6 w-6" />
          </div>
        )}
      </div>

      <div className="relative w-full max-w-2xl">
        {zoneId ? (
          <div id={`propeller-${zoneId}`} className="mb-4 flex min-h-[250px] items-center justify-center" />
        ) : (
          <div className="mb-4 flex min-h-[250px] flex-col items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/5 p-8 text-center">
            <Tv className="mb-3 h-16 w-16 text-white/40" />
            <p className="text-lg font-medium text-white/60">Sponsored Content</p>
            <p className="text-sm text-white/30">Ad will appear here when configured</p>
          </div>
        )}
      </div>

      <div className="mt-4 w-full max-w-2xl space-y-3">
        <Progress value={progress} className="h-2 bg-white/10" />
        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-white/50">
            <Volume2 className="h-4 w-4" />
            <span>Please wait while the ad plays</span>
          </div>
          <span className="font-mono text-white/70">{canSkip ? "Done!" : `${timeLeft}s`}</span>
        </div>

        {canSkip && (
          <Button className="w-full" size="lg" onClick={handleComplete}>
            Claim Your Account
          </Button>
        )}

        {!canSkip && onSkip && (
          <p className="text-center text-xs text-white/30">
            Premium users skip ads. <a href="/services" className="underline">Learn more</a>
          </p>
        )}
      </div>
    </div>
  );
}
