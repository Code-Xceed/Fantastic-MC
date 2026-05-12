import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCached } from "@/lib/cache";
import { logger } from "@/lib/log";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const totalUsers = await db.user.count();
    const totalAccounts = await db.account.count();
    const activeGiveaways = await db.giveaway.count({ where: { is_active: true } });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const generatedToday = await db.generationHistory.count({
      where: { generated_at: { gte: today } },
    });

    const recentGenerations = await db.generationHistory.findMany({
      orderBy: { generated_at: "desc" },
      take: 20,
      include: { user: { select: { username: true, user_id: true } } },
    });

    // Low stock alerts (services with < 5 accounts)
    const services = await getCached("services", () => db.serviceConfig.findMany({ where: { is_active: true } }));
    const lowStock: string[] = [];
    for (const svc of services) {
      const freeCount = await db.account.count({ where: { service_name: `${svc.name}_free` } });
      const premCount = await db.account.count({ where: { service_name: `${svc.name}_premium` } });
      if (freeCount + premCount < 5) lowStock.push(svc.display_name || svc.name);
    }

    return NextResponse.json({
      totalUsers,
      totalAccounts,
      activeGiveaways,
      generatedToday,
      lowStock,
      recentGenerations: recentGenerations.map((r) => ({
        id: r.id,
        userId: r.user_id,
        username: r.user?.username,
        service: r.service_name,
        isPremium: r.is_premium,
        generatedAt: r.generated_at,
      })),
    });
  } catch (error) {
    logger.error("api.admin.overview.failed", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
