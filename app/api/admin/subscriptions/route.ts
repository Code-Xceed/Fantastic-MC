import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { action, userId, timeSec, massTimeSec } = await req.json();

    if (action === "add" && userId && timeSec) {
      const user = await db.user.findUnique({ where: { user_id: userId } });
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

      const now = Date.now() / 1000;
      if (user.subscription_stage === "Premium" && user.subscription_time_left && user.subscription_time_left > now) {
        await db.user.update({
          where: { user_id: userId },
          data: { subscription_time_left: user.subscription_time_left + timeSec },
        });
      } else {
        await db.user.update({
          where: { user_id: userId },
          data: {
            subscription_time_left: now + timeSec,
            subscription_stage: "Premium",
          },
        });
      }
      return NextResponse.json({ success: true, action: "add" });
    }

    if (action === "set" && userId && timeSec !== undefined) {
      const now = Date.now() / 1000;
      await db.user.update({
        where: { user_id: userId },
        data: {
          subscription_time_left: now + timeSec,
          subscription_stage: timeSec > 0 ? "Premium" : "Free",
        },
      });
      return NextResponse.json({ success: true, action: "set" });
    }

    if (action === "remove" && userId) {
      await db.user.update({
        where: { user_id: userId },
        data: { subscription_time_left: null, subscription_stage: "Free" },
      });
      return NextResponse.json({ success: true, action: "remove" });
    }

    if (action === "massadd" && massTimeSec) {
      const premiumUsers = await db.user.findMany({
        where: { subscription_stage: "Premium" },
      });
      const now = Date.now() / 1000;

      for (const user of premiumUsers) {
        if (user.subscription_time_left && user.subscription_time_left > now) {
          await db.user.update({
            where: { user_id: user.user_id },
            data: { subscription_time_left: user.subscription_time_left + massTimeSec },
          });
        }
      }

      return NextResponse.json({ success: true, count: premiumUsers.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error managing subscriptions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
