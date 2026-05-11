"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AdSlotProps {
  className?: string;
  format?: "banner" | "sidebar" | "inline";
  zoneId?: string; // override the default zone
}

export function AdSlot({ className, format = "banner", zoneId }: AdSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const adZoneId = zoneId || process.env.NEXT_PUBLIC_PROPELLER_BANNER_ZONE_ID;
  const enabled = process.env.NEXT_PUBLIC_AD_SLOT_ENABLED === "true";

  useEffect(() => {
    if (!enabled || !adZoneId) return;

    // Inject PropellerAds native/banner script
    const existingScript = document.getElementById("propeller-banner-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "propeller-banner-script";
      script.async = true;
      script.src = "//magsrv.com/ad-provider.js";
      document.head.appendChild(script);
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      if (w.AdProvider) {
        w.AdProvider.push({ zone: adZoneId, type: "native" });
      }
    } catch {
      // Ad script not loaded yet
    }
  }, [adZoneId, enabled]);

  if (!enabled) return null;

  if (adZoneId) {
    return (
      <div
        ref={containerRef}
        id={`propeller-banner-${adZoneId}`}
        className={cn(
          "flex items-center justify-center rounded-lg overflow-hidden",
          format === "banner" && "h-[90px] w-full",
          format === "sidebar" && "h-[250px] w-full",
          format === "inline" && "h-[60px] w-full",
          className
        )}
      />
    );
  }

  // Fallback placeholder
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-xs text-muted-foreground",
        format === "banner" && "h-[90px] w-full",
        format === "sidebar" && "h-[250px] w-full",
        format === "inline" && "h-[60px] w-full",
        className
      )}
    >
      Ad Space
    </div>
  );
}
