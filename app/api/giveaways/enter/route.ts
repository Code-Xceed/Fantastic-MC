import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { invalidateCache } from "@/lib/cache";
import { logger } from "@/lib/log";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { giveawayId } = await req.json();
    if (!giveawayId) {
      return NextResponse.json({ error: "Giveaway ID required" }, { status: 400 });
    }

    const giveaway = await db.giveaway.findUnique({ where: { id: giveawayId } });
    if (!giveaway || !giveaway.is_active) {
      return NextResponse.json({ error: "Giveaway not found or ended" }, { status: 404 });
    }

    if (new Date(giveaway.ends_at) < new Date()) {
      await db.giveaway.update({ where: { id: giveawayId }, data: { is_active: false } });
      return NextResponse.json({ error: "Giveaway has ended" }, { status: 400 });
    }

    // Ensure user exists
    let user = await db.user.findUnique({ where: { user_id: session.user.id } });
    if (!user) {
      user = await db.user.create({
        data: {
          user_id: session.user.id,
          username: session.user.name,
          avatar: session.user.image,
        },
      });
    }

    if (user.is_blacklisted) {
      return NextResponse.json({ error: "You are blacklisted" }, { status: 403 });
    }

    // Check if already entered
    const existing = await db.giveawayEntry.findUnique({
      where: { giveaway_id_user_id: { giveaway_id: giveawayId, user_id: session.user.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Already entered this giveaway" }, { status: 400 });
    }

    await db.giveawayEntry.create({
      data: { giveaway_id: giveawayId, user_id: session.user.id },
    });

    invalidateCache("giveaways:active");

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("api.giveaway.enter_failed", {
      userId: session.user.id,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
