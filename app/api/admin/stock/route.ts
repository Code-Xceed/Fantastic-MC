import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { service, combos, isPremium, removeCapture } = await req.json();
    if (!service || !combos || !Array.isArray(combos)) {
      return NextResponse.json({ error: "Service and combos array required" }, { status: 400 });
    }

    const serviceName = isPremium ? `${service}_premium` : `${service}_free`;

    // Get existing combos for deduplication
    const existing = await db.account.findMany({
      where: { service_name: serviceName.toLowerCase() },
      select: { combo: true },
    });
    const existingSet = new Set(existing.map((e) => e.combo));

    const toAdd: { service_name: string; combo: string }[] = [];
    let duplicateCount = 0;

    for (const raw of combos) {
      const trimmed = String(raw).trim();
      if (trimmed.length < 3) continue;

      const combo = removeCapture && trimmed.includes("|")
        ? trimmed.split("|")[0]
        : trimmed;

      if (existingSet.has(combo)) {
        duplicateCount++;
      } else {
        toAdd.push({ service_name: serviceName.toLowerCase(), combo });
        existingSet.add(combo);
      }
    }

    if (toAdd.length > 0) {
      await db.account.createMany({ data: toAdd });
    }

    // Ensure service config exists
    const existingConfig = await db.serviceConfig.findUnique({ where: { name: service } });
    if (!existingConfig) {
      await db.serviceConfig.create({
        data: { name: service, display_name: service, is_active: true },
      });
    }

    return NextResponse.json({
      added: toAdd.length,
      duplicates: duplicateCount,
    });
  } catch (error) {
    console.error("Error adding stock:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { service, isPremium } = await req.json();
    if (!service) {
      return NextResponse.json({ error: "Service required" }, { status: 400 });
    }

    const serviceName = isPremium ? `${service}_premium` : `${service}_free`;
    const result = await db.account.deleteMany({
      where: { service_name: serviceName.toLowerCase() },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error("Error clearing stock:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
