import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { action, userId, stage, timeSec } = await req.json();

    if (action === "set" && userId && stage && timeSec !== undefined) {
      const user = await db.user.findUnique({ where: { user_id: userId } });
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

      const cooldowns = (user.custom_cooldown || {}) as Record<string, number | null>;
      cooldowns[stage] = timeSec;

      await db.user.update({
        where: { user_id: userId },
        data: { custom_cooldown: cooldowns },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "reset" && userId && stage) {
      const user = await db.user.findUnique({ where: { user_id: userId } });
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

      const cooldowns = (user.user_cooldown || {}) as Record<string, string | null>;
      cooldowns[stage] = null;

      await db.user.update({
        where: { user_id: userId },
        data: { user_cooldown: cooldowns },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error managing cooldowns:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
