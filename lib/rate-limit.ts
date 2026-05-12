import { db } from "./db";
import { logger } from "./log";

interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
}

const DEFAULT_WINDOW = 60_000;
const DEFAULT_MAX = 10;

export async function rateLimit(
  key: string,
  opts: RateLimitOptions = {}
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW;
  const maxRequests = opts.maxRequests ?? DEFAULT_MAX;
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  await db.rateLimit.deleteMany({ where: { reset_at: { lt: now } } });

  try {
    const entry = await db.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, reset_at: resetAt },
      update: { count: { increment: 1 } },
    });

    if (entry.reset_at < now) {
      const fresh = await db.rateLimit.update({
        where: { key },
        data: { count: 1, reset_at: resetAt },
      });
      return { allowed: true, remaining: maxRequests - 1, resetAt: fresh.reset_at.getTime() };
    }

    if (entry.count > maxRequests) {
      logger.warn("rate_limit.blocked", { key, resetAt: entry.reset_at.getTime() });
      return { allowed: false, remaining: 0, resetAt: entry.reset_at.getTime() };
    }

    return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.reset_at.getTime() };
  } catch (error) {
    logger.error("rate_limit.failed", {
      key,
      error: error instanceof Error ? error.message : "unknown",
    });
    return { allowed: false, remaining: 0, resetAt: resetAt.getTime() };
  }
}
