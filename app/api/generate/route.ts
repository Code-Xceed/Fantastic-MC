import { auth } from "@/lib/auth";
import { reserveAccount } from "@/lib/gen-logic";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Rate limit: 10 generate requests per minute per user
  const limit = rateLimit(`gen:${session.user.id}`, { windowMs: 60_000, maxRequests: 10 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before generating again.", cooldownRemaining: Math.ceil((limit.resetAt - Date.now()) / 1000) },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { service, isPremium } = body;

    if (!service) {
      return NextResponse.json({ error: "Service is required" }, { status: 400 });
    }

    // Check service exists and is active
    const svcConfig = await db.serviceConfig.findFirst({
      where: { name: service, is_active: true },
    });
    if (!svcConfig) {
      return NextResponse.json({ error: "Service not found or inactive" }, { status: 404 });
    }

    // Ensure user exists in DB
    let user = await db.user.findUnique({ where: { user_id: session.user.id } });
    if (!user) {
      user = await db.user.create({
        data: {
          user_id: session.user.id,
          username: session.user.name,
          avatar: session.user.image,
          is_admin: session.isAdmin,
        },
      });
    } else {
      // Update username/avatar/admin status if changed
      await db.user.update({
        where: { user_id: session.user.id },
        data: {
          username: session.user.name,
          avatar: session.user.image,
          is_admin: session.isAdmin,
        },
      });
    }

    const isAdmin = session.isAdmin || user.is_admin;
    const result = await reserveAccount(
      session.user.id,
      service,
      isPremium || false,
      session.roles || [],
      isAdmin
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, cooldownRemaining: result.cooldownRemaining },
        { status: 400 }
      );
    }

    // Premium/admin: return account immediately
    if (!result.requiresAd) {
      return NextResponse.json({
        success: true,
        account: result.account,
        requiresAd: false,
      });
    }

    // Free user: return token, they must watch ad then claim
    return NextResponse.json({
      success: true,
      token: result.token,
      requiresAd: true,
    });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
