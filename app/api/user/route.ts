import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
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

    // Check active cooldowns
    const now = Date.now() / 1000;
    const cooldownData = user.user_cooldown as Record<string, string | null> | null;
    const freeCooldownEnd = cooldownData?.Free ? parseFloat(cooldownData.Free) : 0;
    const premiumCooldownEnd = cooldownData?.Premium ? parseFloat(cooldownData.Premium) : 0;

    const freeCooldownRemaining = freeCooldownEnd > now ? Math.ceil(freeCooldownEnd - now) : 0;
    const premiumCooldownRemaining = premiumCooldownEnd > now ? Math.ceil(premiumCooldownEnd - now) : 0;

    // Check subscription
    const hasSubscription =
      user.subscription_stage === "Premium" &&
      user.subscription_time_left &&
      user.subscription_time_left > now;

    return NextResponse.json({
      user: {
        id: user.user_id,
        username: user.username,
        avatar: user.avatar,
        amountGenned: user.amount_genned,
        premAmountGenned: user.prem_amount_genned,
        lastTimeGenned: user.last_time_genned,
        isBlacklisted: user.is_blacklisted,
        subscriptionStage: user.subscription_stage,
        subscriptionTimeLeft: user.subscription_time_left,
        hasSubscription,
        freeCooldownRemaining,
        premiumCooldownRemaining,
        notes: user.notes,
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
