import { auth } from "@/lib/auth";
import { generateAccount } from "@/lib/gen-logic";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { service, isPremium } = body;

    if (!service) {
      return NextResponse.json({ error: "Service is required" }, { status: 400 });
    }

    // Check service exists and is active
    const svcConfig = await db.serviceConfig.findFirst({
      where: { name: service, is_active: true },
    });
    if (!svcConfig) {
      return NextResponse.json({ error: "Service not found or inactive" }, { status: 404 });
    }

    // Ensure user exists in DB
    let user = await db.user.findUnique({ where: { user_id: session.user.id } });
    if (!user) {
      user = await db.user.create({
        data: {
          user_id: session.user.id,
          username: session.user.name,
          avatar: session.user.image,
        },
      });
    } else {
      // Update username/avatar if changed
      await db.user.update({
        where: { user_id: session.user.id },
        data: {
          username: session.user.name,
          avatar: session.user.image,
        },
      });
    }

    const result = await generateAccount(
      session.user.id,
      service,
      isPremium || false,
      session.roles || []
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, cooldownRemaining: result.cooldownRemaining },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, account: result.account });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
