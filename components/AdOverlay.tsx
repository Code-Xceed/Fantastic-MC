"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, Tv, Volume2 } from "lucide-react";

interface AdOverlayProps {
  duration?: number; // seconds
  onComplete: () => void;
  onSkip?: () => void;
}

export function AdOverlay({ duration = 30, onComplete, onSkip }: AdOverlayProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [canSkip, setCanSkip] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const zoneId = process.env.NEXT_PUBLIC_PROPELLER_ZONE_ID;

  useEffect(() => {
    if (timeLeft <= 0) {
      setCanSkip(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Load PropellerAds script
  useEffect(() => {
    if (!zoneId) {
      // No zone configured — just show countdown
      setAdLoaded(true);
      return;
    }

    // Inject PropellerAds interstitial
    const existingScript = document.getElementById("propeller-ads-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "propeller-ads-script";
      script.async = true;
      script.src = "//magsrv.com/ad-provider.js";
      script.setAttribute("data-zone", zoneId);
      document.head.appendChild(script);
    }

    // Try to trigger the ad
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      if (w.AdProvider) {
        w.AdProvider.push({ zone: zoneId, type: "interstitial" });
        setAdLoaded(true);
      } else {
        // Script still loading — mark as loaded after timeout
        const fallback = setTimeout(() => setAdLoaded(true), 2000);
        return () => clearTimeout(fallback);
      }
    } catch {
      setAdLoaded(true);
    }
  }, [zoneId]);

  const progress = ((duration - timeLeft) / duration) * 100;

  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* Close button disabled until ad completes */}
      <div className="absolute top-4 right-4">
        {canSkip ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={handleComplete}
          >
            <X className="h-6 w-6" />
          </Button>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full text-white/30">
            <X className="h-6 w-6" />
          </div>
        )}
      </div>

      {/* Ad container */}
      <div className="relative w-full max-w-2xl mx-4">
        {/* PropellerAds zone container */}
        {zoneId && (
          <div id={`propeller-${zoneId}`} className="mb-4 min-h-[250px] flex items-center justify-center" />
        )}

        {/* Placeholder if no ad zone */}
        {!zoneId && (
          <div className="mb-4 flex min-h-[250px] flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 p-8">
            <Tv className="mb-3 h-16 w-16 text-white/40" />
            <p className="text-lg font-medium text-white/60">Sponsored Content</p>
            <p className="text-sm text-white/30">Ad will appear here when configured</p>
          </div>
        )}
      </div>

      {/* Countdown bar */}
      <div className="w-full max-w-2xl mx-4 mt-4 space-y-3">
        <Progress value={progress} className="h-2 bg-white/10" />

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-white/50">
            <Volume2 className="h-4 w-4" />
            <span>Please wait while the ad plays</span>
          </div>
          <span className="text-white/70 font-mono">
            {canSkip ? "Done!" : `${timeLeft}s`}
          </span>
        </div>

        {canSkip && (
          <Button
            className="w-full"
            size="lg"
            onClick={handleComplete}
          >
            Claim Your Account
          </Button>
        )}

        {!canSkip && onSkip && (
          <p className="text-center text-xs text-white/30">
            Premium users skip ads — <a href="/services" className="underline">Learn more</a>
          </p>
        )}
      </div>
    </div>
  );
}
