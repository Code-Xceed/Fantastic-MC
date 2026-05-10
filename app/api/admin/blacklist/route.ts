import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { userId, status } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { user_id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newStatus = status !== undefined ? status : !user.is_blacklisted;
    await db.user.update({
      where: { user_id: userId },
      data: { is_blacklisted: newStatus },
    });

    return NextResponse.json({ isBlacklisted: newStatus });
  } catch (error) {
    console.error("Error toggling blacklist:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
