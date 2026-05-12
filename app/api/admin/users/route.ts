import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/log";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const filter = searchParams.get("filter") || "all";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

  try {
    const where = {
      ...(search
        ? { OR: [{ username: { contains: search, mode: "insensitive" as const } }, { user_id: { contains: search } }] }
        : {}),
      ...(filter === "premium" ? { subscription_stage: "Premium" } : {}),
      ...(filter === "blacklisted" ? { is_blacklisted: true } : {}),
    };

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.user.count({ where }),
    ]);

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.user_id,
        username: u.username,
        avatar: u.avatar,
        amountGenned: u.amount_genned,
        premAmountGenned: u.prem_amount_genned,
        isBlacklisted: u.is_blacklisted,
        subscriptionStage: u.subscription_stage,
        subscriptionTimeLeft: u.subscription_time_left,
        lastTimeGenned: u.last_time_genned,
        notes: u.notes,
        createdAt: u.created_at,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error("api.admin.users.failed", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
