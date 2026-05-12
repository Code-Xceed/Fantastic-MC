import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { invalidateCache } from "@/lib/cache";
import { logger } from "@/lib/log";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { userId, displayName, iconUrl, isActive } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "Service name required" }, { status: 400 });
    }

    const existing = await db.serviceConfig.findUnique({ where: { name: userId } });
    if (existing) {
      const updated = await db.serviceConfig.update({
        where: { name: userId },
        data: {
          display_name: displayName || existing.display_name,
          icon_url: iconUrl || existing.icon_url,
          is_active: isActive !== undefined ? isActive : existing.is_active,
        },
      });
      invalidateCache("services");
      invalidateCache("services:stock-counts");
      return NextResponse.json({ service: updated });
    } else {
      const created = await db.serviceConfig.create({
        data: {
          name: userId,
          display_name: displayName || userId,
          icon_url: iconUrl,
          is_active: isActive !== undefined ? isActive : true,
        },
      });
      invalidateCache("services");
      invalidateCache("services:stock-counts");
      return NextResponse.json({ service: created });
    }
  } catch (error) {
    logger.error("api.admin.service.failed", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
