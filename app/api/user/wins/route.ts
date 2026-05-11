import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/user/wins — fetch unread giveaway wins for notification popup
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const wins = await db.giveawayWin.findMany({
      where: { user_id: session.user.id, is_read: false },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({
      wins: wins.map((w) => ({
        id: w.id,
        giveawayId: w.giveaway_id,
        title: w.title,
        serviceName: w.service_name,
        combo: w.combo,
        isPremium: w.is_premium,
        createdAt: w.created_at,
      })),
    });
  } catch (error) {
    console.error("Error fetching wins:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/user/wins — mark wins as read
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { winIds } = await req.json();

    if (Array.isArray(winIds) && winIds.length > 0) {
      await db.giveawayWin.updateMany({
        where: { id: { in: winIds }, user_id: session.user.id },
        data: { is_read: true },
      });
    } else {
      // Mark all as read
      await db.giveawayWin.updateMany({
        where: { user_id: session.user.id, is_read: false },
        data: { is_read: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking wins as read:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
