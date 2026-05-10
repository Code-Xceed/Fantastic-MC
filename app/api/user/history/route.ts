import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { maskCombo } from "@/lib/gen-logic";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 20;
  const skip = (page - 1) * limit;

  try {
    const [history, total] = await Promise.all([
      db.generationHistory.findMany({
        where: { user_id: session.user.id },
        orderBy: { generated_at: "desc" },
        skip,
        take: limit,
      }),
      db.generationHistory.count({
        where: { user_id: session.user.id },
      }),
    ]);

    return NextResponse.json({
      history: history.map((h) => ({
        id: h.id,
        service: h.service_name,
        combo: maskCombo(h.combo),
        isPremium: h.is_premium,
        generatedAt: h.generated_at,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
