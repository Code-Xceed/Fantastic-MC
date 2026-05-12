import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { getCached } from "@/lib/cache";
import { logger } from "@/lib/log";

export async function GET() {
  try {
    const cached = await getCached("services", () =>
      db.serviceConfig.findMany({
        where: { is_active: true },
        orderBy: { name: "asc" },
      })
    );

    const result = await getCached("services:stock-counts", async () =>
      Promise.all(
        cached.map(async (svc) => {
          const [freeCount, premiumCount] = await Promise.all([
            db.account.count({ where: { service_name: `${svc.name}_free` } }),
            db.account.count({ where: { service_name: `${svc.name}_premium` } }),
          ]);

          return {
            name: svc.name,
            displayName: svc.display_name || svc.name,
            iconUrl: svc.icon_url,
            freeStock: freeCount,
            premiumStock: premiumCount,
          };
        })
      )
    );

    return NextResponse.json({ services: result });
  } catch (error) {
    logger.error("api.services.failed", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ services: [] }, { status: 500 });
  }
}
