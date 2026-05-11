import { auth } from "@/lib/auth";
import { claimAccount, cleanupExpiredPending } from "@/lib/gen-logic";
import { rateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Rate limit: 20 claim requests per minute per user
  const limit = rateLimit(`claim:${session.user.id}`, { windowMs: 60_000, maxRequests: 20 });
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

    const result = await claimAccount(token);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      account: result.account,
    });
  } catch (error) {
    console.error("Claim error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
