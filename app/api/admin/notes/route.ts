import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { userId, note } = await req.json();
    if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 });

    await db.user.update({
      where: { user_id: userId },
      data: { notes: note || null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting note:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
