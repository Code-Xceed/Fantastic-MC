import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const services = await db.serviceConfig.findMany({
      where: { is_active: true },
      orderBy: { name: "asc" },
    });

    const result = [];

    for (const svc of services) {
      const freeCount = await db.account.count({
        where: { service_name: `${svc.name}_free` },
      });
      const premiumCount = await db.account.count({
        where: { service_name: `${svc.name}_premium` },
      });

      result.push({
        name: svc.name,
        displayName: svc.display_name || svc.name,
        iconUrl: svc.icon_url,
        freeStock: freeCount,
        premiumStock: premiumCount,
      });
    }

    return NextResponse.json({ services: result });
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json({ services: [] }, { status: 500 });
  }
}
