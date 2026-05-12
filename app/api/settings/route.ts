import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/log";
import { NextResponse } from "next/server";

// GET /api/settings — public site settings
export async function GET() {
  try {
    const settings = await db.siteSettings.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    return NextResponse.json({
      adDuration: parseInt(map.ad_duration || "30"),
      adEnabled: map.ad_enabled !== "false",
      maintenanceMode: map.maintenance_mode === "true",
      siteName: map.site_name || "FMC Gen",
    });
  } catch {
    return NextResponse.json({
      adDuration: 30,
      adEnabled: true,
      maintenanceMode: false,
      siteName: "FMC Gen",
    });
  }
}

// POST /api/settings — admin only, update settings
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const updates: { key: string; value: string }[] = body.updates;

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: "updates must be an array" }, { status: 400 });
    }

    for (const { key, value } of updates) {
      await db.siteSettings.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("api.settings.update_failed", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
