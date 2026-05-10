import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { title, description, serviceName, accountCount, isPremium, endsAt } = await req.json();
    if (!title || !serviceName || !endsAt) {
      return NextResponse.json({ error: "Title, service, and end time required" }, { status: 400 });
    }

    const giveaway = await db.giveaway.create({
      data: {
        title,
        description: description || null,
        service_name: serviceName,
        account_count: accountCount || 1,
        is_premium: isPremium || false,
        ends_at: new Date(endsAt),
      },
    });

    return NextResponse.json({ giveaway });
  } catch (error) {
    console.error("Error creating giveaway:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const giveaways = await db.giveaway.findMany({
      orderBy: { created_at: "desc" },
      include: { _count: { select: { entries: true } } },
    });

    return NextResponse.json({
      giveaways: giveaways.map((g) => ({
        id: g.id,
        title: g.title,
        description: g.description,
        service: g.service_name,
        accountCount: g.account_count,
        isPremium: g.is_premium,
        endsAt: g.ends_at,
        isActive: g.is_active,
        winnerIds: g.winner_ids,
        entryCount: g._count.entries,
        createdAt: g.created_at,
      })),
    });
  } catch (error) {
    console.error("Error fetching giveaways:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
