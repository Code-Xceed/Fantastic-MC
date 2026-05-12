import { auth } from "@/lib/auth";
import { claimAccount, cleanupExpiredPending } from "@/lib/gen-logic";
import { rateLimit } from "@/lib/rate-limit";
import { invalidateUserCache } from "@/lib/cache";
import { logger } from "@/lib/log";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Rate limit: 20 claim requests per minute per user
  const limit = await rateLimit(`claim:${session.user.id}`, { windowMs: 60_000, maxRequests: 20 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded." },
      { status: 429 }
    );
  }

  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: "Claim token is required" }, { status: 400 });
    }

    // Clean up expired pending generations as a side effect
    cleanupExpiredPending().catch(() => {});

    const result = await claimAccount(token, session.user.id, session.roles || []);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, retryAfter: result.retryAfter },
        { status: result.retryAfter ? 425 : 400 }
      );
    }

    invalidateUserCache(session.user.id);

    return NextResponse.json({
      success: true,
      account: result.account,
    });
  } catch (error) {
    logger.error("api.claim.failed", {
      userId: session.user.id,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
