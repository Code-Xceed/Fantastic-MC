import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// Seed the database with demo data — call /api/demo/login to set up
export async function GET() {
  try {
    // Create services
    await db.serviceConfig.upsert({ where: { name: "minecraft" }, update: {}, create: { name: "minecraft", display_name: "Minecraft Java", is_active: true } });
    await db.serviceConfig.upsert({ where: { name: "minecraft_bedrock" }, update: {}, create: { name: "minecraft_bedrock", display_name: "Minecraft Bedrock", is_active: true } });
    await db.serviceConfig.upsert({ where: { name: "spotify" }, update: {}, create: { name: "spotify", display_name: "Spotify Premium", is_active: true } });

    // Add free stock
    const freeCombos = [
      "steve_mc@gmail.com:password123", "alex_mc@outlook.com:min3craft456",
      "creeper@yahoo.com:blast789", "enderman@gmail.com:teleport321",
      "zombie@hotmail.com:brains654", "skeleton@gmail.com:arrow987",
      "spider@outlook.com:web159", "ghast@yahoo.com:fireball753",
      "piglin@gmail.com:gold486", "wither@hotmail.com:destroy159",
    ];
    for (const combo of freeCombos) {
      const exists = await db.account.findFirst({ where: { service_name: "minecraft_free", combo } });
      if (!exists) await db.account.create({ data: { service_name: "minecraft_free", combo } });
    }

    // Add premium stock
    const premiumCombos = [
      "premium_steve@gmail.com:prem12345", "premium_alex@outlook.com:prem67890",
      "premium_creeper@yahoo.com:prem11111", "premium_enderman@gmail.com:prem22222",
      "premium_zombie@hotmail.com:prem33333",
    ];
    for (const combo of premiumCombos) {
      const exists = await db.account.findFirst({ where: { service_name: "minecraft_premium", combo } });
      if (!exists) await db.account.create({ data: { service_name: "minecraft_premium", combo } });
    }

    // Bedrock free stock
    for (const combo of ["bedrock_p1@gmail.com:bedrock1", "bedrock_p2@outlook.com:bedrock2", "bedrock_p3@yahoo.com:bedrock3"]) {
      const exists = await db.account.findFirst({ where: { service_name: "minecraft_bedrock_free", combo } });
      if (!exists) await db.account.create({ data: { service_name: "minecraft_bedrock_free", combo } });
    }

    // Spotify free stock
    for (const combo of ["spotify_u1@gmail.com:spoti123", "spotify_u2@outlook.com:spoti456", "spotify_u3@yahoo.com:spoti789", "spotify_u4@gmail.com:spoti012"]) {
      const exists = await db.account.findFirst({ where: { service_name: "spotify_free", combo } });
      if (!exists) await db.account.create({ data: { service_name: "spotify_free", combo } });
    }

    // Create demo users
    await db.user.upsert({ where: { user_id: "demo_admin_001" }, update: {}, create: { user_id: "demo_admin_001", username: "DemoAdmin", subscription_stage: "Premium", subscription_time_left: Date.now() / 1000 + 86400 * 30 } });
    await db.user.upsert({ where: { user_id: "demo_user_001" }, update: {}, create: { user_id: "demo_user_001", username: "DemoUser", subscription_stage: "Free" } });
    await db.user.upsert({ where: { user_id: "demo_regular_001" }, update: {}, create: { user_id: "demo_regular_001", username: "MCPlayer42", amount_genned: 3, last_time_genned: String(Date.now() / 1000 - 3600) } });

    // Add some generation history
    const historyCount = await db.generationHistory.count({ where: { user_id: "demo_regular_001" } });
    if (historyCount === 0) {
      await db.generationHistory.createMany({
        data: [
          { user_id: "demo_regular_001", service_name: "minecraft", combo: "old_player@gmail.com:oldpass1", is_premium: false, generated_at: new Date(Date.now() - 86400000 * 3) },
          { user_id: "demo_regular_001", service_name: "minecraft", combo: "another_player@yahoo.com:oldpass2", is_premium: false, generated_at: new Date(Date.now() - 86400000 * 2) },
          { user_id: "demo_regular_001", service_name: "minecraft", combo: "third_player@hotmail.com:oldpass3", is_premium: false, generated_at: new Date(Date.now() - 86400000) },
        ],
      });
    }

    // Create giveaways
    const activeGW = await db.giveaway.findFirst({ where: { is_active: true } });
    if (!activeGW) {
      const gw = await db.giveaway.create({
        data: { title: "Minecraft Premium Giveaway", description: "Win a premium Minecraft account!", service_name: "minecraft", account_count: 2, is_premium: true, ends_at: new Date(Date.now() + 86400000 * 7), is_active: true },
      });
      await db.giveawayEntry.create({ data: { giveaway_id: gw.id, user_id: "demo_regular_001" } });
    }

    const pastGW = await db.giveaway.findFirst({ where: { is_active: false } });
    if (!pastGW) {
      await db.giveaway.create({
        data: { title: "Holiday Minecraft Giveaway", description: "3 free MC accounts.", service_name: "minecraft", account_count: 3, is_premium: false, ends_at: new Date(Date.now() - 86400000 * 2), is_active: false, winner_ids: "demo_regular_001" },
      });
    }

    return NextResponse.json({ success: true, message: "Database seeded with demo data!" });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

