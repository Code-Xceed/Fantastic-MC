"use client";

import { cn } from "@/lib/utils";

interface AdSlotProps {
  className?: string;
  format?: "banner" | "sidebar" | "inline";
}

export function AdSlot({ className, format = "banner" }: AdSlotProps) {
  const enabled = process.env.NEXT_PUBLIC_AD_SLOT_ENABLED === "true";

  if (!enabled) return null;

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
