import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// Demo login: creates a user in DB and returns a redirect that auto-logs in
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role") || "user"; // "admin" or "user"

  const demoAdminId = "demo_admin_001";
  const demoUserId = "demo_user_001";
  const userId = role === "admin" ? demoAdminId : demoUserId;
  const username = role === "admin" ? "DemoAdmin" : "DemoUser";
  const isAdmin = role === "admin";

  // Ensure user exists in DB
  const existing = await db.user.findUnique({ where: { user_id: userId } });
  if (!existing) {
    await db.user.create({
      data: {
        user_id: userId,
        username,
        avatar: null,
        subscription_stage: isAdmin ? "Premium" : "Free",
        subscription_time_left: isAdmin ? Date.now() / 1000 + 86400 * 30 : null,
      },
    });
  }

  // Return user info - the client will use this to set a cookie
  return NextResponse.json({
    success: true,
    user: {
      id: userId,
      name: username,
      image: null,
      isAdmin,
      roles: isAdmin ? ["admin"] : [],
    },
  });
}
