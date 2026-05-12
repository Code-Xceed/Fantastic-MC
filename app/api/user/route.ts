import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { maskCombo } from "@/lib/gen-logic";
import { getCached } from "@/lib/cache";
import { logger } from "@/lib/log";
import { NextResponse } from "next/server";

function cooldownRemaining(raw: unknown, tier: "Free" | "Premium") {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return 0;
  const value = (raw as Record<string, string | null>)[tier];
  if (!value) return 0;
  return Math.max(0, Math.ceil(parseFloat(value) - Date.now() / 1000));
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const user = await getCached(`user:${session.user.id}`, () =>
      db.user.findUnique({
        where: { user_id: session.user.id },
      })
    );

    const [history, total, unreadWins] = await Promise.all([
      getCached(`user:${session.user.id}:history:list`, () =>
        db.generationHistory.findMany({
          where: { user_id: session.user.id },
          orderBy: { generated_at: "desc" },
          take: 20,
        })
      ),
      getCached(`user:${session.user.id}:history:count`, () =>
        db.generationHistory.count({
          where: { user_id: session.user.id },
        })
      ),
      getCached(`user:wins:${session.user.id}`, () =>
        db.giveawayWin.count({
          where: { user_id: session.user.id, is_read: false },
        })
      ),
    ]);

    const isPremium =
      user?.subscription_stage === "Premium" &&
      !!user.subscription_time_left &&
      user.subscription_time_left > Date.now() / 1000;

    return NextResponse.json({
      user: user
        ? {
            id: user.user_id,
            username: user.username,
            avatar: user.avatar,
            amountGenned: user.amount_genned || 0,
            premAmountGenned: user.prem_amount_genned || 0,
            totalAccounts: total,
            lastTimeGenned: user.last_time_genned,
            isBlacklisted: user.is_blacklisted,
            subscriptionStage: isPremium ? "Premium" : "Free",
            subscriptionTimeLeft: user.subscription_time_left,
            hasSubscription: isPremium,
            freeCooldownRemaining: cooldownRemaining(user.user_cooldown, "Free"),
            premiumCooldownRemaining: cooldownRemaining(user.user_cooldown, "Premium"),
            unreadWins,
          }
        : null,
      history: history.map((h) => ({
        id: h.id,
        service: h.service_name,
        combo: maskCombo(h.combo),
        isPremium: h.is_premium,
        source: h.source,
        giveawayId: h.giveaway_id,
        generatedAt: h.generated_at,
      })),
      total,
      totalPages: Math.ceil(total / 20),
    });
  } catch (error) {
    logger.error("api.user.failed", {
      userId: session.user.id,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
