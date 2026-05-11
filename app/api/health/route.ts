import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      database: "connected",
      version: "2.0.0",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      status: "error",
      database: "disconnected",
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
