import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className, lines = 3 }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
      style={{
        height: `${lines * 24}px`,
      }}
    >
      <div className="h-full w-full bg-gradient-to-r from-muted via-muted/20 to-muted" />
    </div>
  );
}
