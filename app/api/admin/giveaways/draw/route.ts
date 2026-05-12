import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { invalidateCache, invalidateUserCache } from "@/lib/cache";
import { logger } from "@/lib/log";
import { randomInt } from "crypto";
import { NextResponse } from "next/server";

function secureShuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { giveawayId } = await req.json();
    if (!giveawayId) {
      return NextResponse.json({ error: "Giveaway ID required" }, { status: 400 });
    }

    const giveaway = await db.giveaway.findUnique({
      where: { id: giveawayId },
      include: { entries: true },
    });

    if (!giveaway) {
      return NextResponse.json({ error: "Giveaway not found" }, { status: 404 });
    }

    if (!giveaway.is_active) {
      return NextResponse.json({ error: "Giveaway already ended" }, { status: 400 });
    }

    if (giveaway.entries.length === 0) {
      return NextResponse.json({ error: "No entries to draw from" }, { status: 400 });
    }

    const winnerCount = Math.min(giveaway.account_count, giveaway.entries.length);
    const shuffled = secureShuffle(giveaway.entries);
    const winnerEntries = shuffled.slice(0, winnerCount);
    const winnerIds = winnerEntries.map((e) => e.user_id);

    // Fetch accounts from stock
    const serviceName = giveaway.is_premium
      ? `${giveaway.service_name}_premium`
      : `${giveaway.service_name}_free`;

    const accounts = await db.account.findMany({
      where: { service_name: serviceName.toLowerCase() },
      take: winnerCount,
    });

    if (accounts.length < winnerCount) {
      return NextResponse.json({
        error: `Not enough stock. Need ${winnerCount}, have ${accounts.length}.`,
      }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      for (let i = 0; i < winnerCount; i++) {
        const account = accounts[i];
        const winnerId = winnerIds[i];

        await tx.account.delete({ where: { id: account.id } });
        await tx.generationHistory.create({
          data: {
            user_id: winnerId,
            service_name: giveaway.service_name,
            combo: account.combo,
            is_premium: giveaway.is_premium,
            source: "giveaway",
            giveaway_id: giveawayId,
          },
        });
        await tx.giveawayWin.create({
          data: {
            user_id: winnerId,
            giveaway_id: giveawayId,
            title: giveaway.title,
            service_name: giveaway.service_name,
            combo: account.combo,
            is_premium: giveaway.is_premium,
          },
        });
        await tx.user.update({
          where: { user_id: winnerId },
          data: {
            amount_genned: { increment: giveaway.is_premium ? 0 : 1 },
            prem_amount_genned: { increment: giveaway.is_premium ? 1 : 0 },
            last_time_genned: String(Date.now() / 1000),
          },
        });
      }

      await tx.giveaway.update({
        where: { id: giveawayId },
        data: { is_active: false, winner_ids: winnerIds.join(",") },
      });
    });

    winnerIds.forEach(invalidateUserCache);
    invalidateCache("giveaways:active");
    invalidateCache("giveaways:past");
    logger.info("api.admin.giveaway.drawn", { giveawayId, winnerCount });

    return NextResponse.json({ success: true, winnerIds });
  } catch (error) {
    logger.error("api.admin.giveaway.draw_failed", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
