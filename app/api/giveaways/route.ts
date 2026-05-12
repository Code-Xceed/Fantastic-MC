import { db } from "@/lib/db";
import { getCached } from "@/lib/cache";
import { logger } from "@/lib/log";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const now = new Date();
    const giveaways = await getCached("giveaways:active", () =>
      db.giveaway.findMany({
        where: { is_active: true, ends_at: { gt: now } },
        orderBy: { ends_at: "asc" },
        include: { _count: { select: { entries: true } } },
      })
    );

    const pastGiveaways = await getCached("giveaways:past", () =>
      db.giveaway.findMany({
        where: { is_active: false },
        orderBy: { ends_at: "desc" },
        take: 10,
        include: { _count: { select: { entries: true } } },
      })
    );

    return NextResponse.json({
      active: giveaways.map((g) => ({
        id: g.id,
        title: g.title,
        description: g.description,
        service: g.service_name,
        accountCount: g.account_count,
        isPremium: g.is_premium,
        endsAt: g.ends_at,
        entryCount: g._count.entries,
      })),
      past: pastGiveaways.map((g) => ({
        id: g.id,
        title: g.title,
        service: g.service_name,
        accountCount: g.account_count,
        winnerIds: g.winner_ids,
        entryCount: g._count.entries,
        endedAt: g.ends_at,
      })),
    });
  } catch (error) {
    logger.error("api.giveaways.failed", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ active: [], past: [] }, { status: 500 });
  }
}
