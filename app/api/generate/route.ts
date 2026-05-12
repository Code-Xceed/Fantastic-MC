import { auth } from "@/lib/auth";
import { reserveAccount } from "@/lib/gen-logic";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { invalidateUserCache } from "@/lib/cache";
import { logger } from "@/lib/log";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const limit = await rateLimit(`gen:${session.user.id}`, { windowMs: 60_000, maxRequests: 10 });
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Please wait before generating again.",
        cooldownRemaining: Math.ceil((limit.resetAt - Date.now()) / 1000),
      },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const service = typeof body.service === "string" ? body.service.trim().toLowerCase() : "";
    const isPremium = Boolean(body.isPremium);

    if (!service) {
      return NextResponse.json({ error: "Service is required" }, { status: 400 });
    }

    const svcConfig = await db.serviceConfig.findFirst({
      where: { name: service, is_active: true },
    });
    if (!svcConfig) {
      return NextResponse.json({ error: "Service not found or inactive" }, { status: 404 });
    }

    const user = await db.user.upsert({
      where: { user_id: session.user.id },
      update: {
        username: session.user.name,
        avatar: session.user.image,
        is_admin: session.isAdmin,
      },
      create: {
        user_id: session.user.id,
        username: session.user.name,
        avatar: session.user.image,
        is_admin: session.isAdmin,
        subscription_stage: "Free",
      },
    });

    const result = await reserveAccount(
      session.user.id,
      service,
      isPremium,
      session.roles || [],
      session.isAdmin || user.is_admin
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, cooldownRemaining: result.cooldownRemaining },
        { status: 400 }
      );
    }

    invalidateUserCache(session.user.id);

    if (!result.requiresAd) {
      return NextResponse.json({
        success: true,
        account: result.account,
        requiresAd: false,
      });
    }

    return NextResponse.json({
      success: true,
      token: result.token,
      requiresAd: true,
      claimableAt: result.claimableAt,
    });
  } catch (error) {
    logger.error("api.generate.failed", {
      userId: session.user.id,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
