import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding demo data...");

  // Create services
  const minecraft = await db.serviceConfig.upsert({
    where: { name: "minecraft" },
    update: {},
    create: { name: "minecraft", display_name: "Minecraft Java", is_active: true },
  });

  const minecraftBedrock = await db.serviceConfig.upsert({
    where: { name: "minecraft_bedrock" },
    update: {},
    create: { name: "minecraft_bedrock", display_name: "Minecraft Bedrock", is_active: true },
  });

  const spotify = await db.serviceConfig.upsert({
    where: { name: "spotify" },
    update: {},
    create: { name: "spotify", display_name: "Spotify Premium", is_active: true },
  });

  console.log("✅ Services created");

  // Add free stock
  const freeCombos = [
    "steve_mc@gmail.com:password123",
    "alex_mc@outlook.com:min3craft456",
    "creeper@yahoo.com:blast789",
    "enderman@gmail.com:teleport321",
    "zombie@hotmail.com:brains654",
    "skeleton@gmail.com:arrow987",
    "spider@outlook.com:web159",
    "ghast@yahoo.com:fireball753",
    "piglin@gmail.com:gold486",
    "wither@hotmail.com:destroy159",
  ];

  for (const combo of freeCombos) {
    await db.account.create({
      data: { service_name: "minecraft_free", combo },
    });
  }

  // Add premium stock
  const premiumCombos = [
    "premium_steve@gmail.com:prem12345",
    "premium_alex@outlook.com:prem67890",
    "premium_creeper@yahoo.com:prem11111",
    "premium_enderman@gmail.com:prem22222",
    "premium_zombie@hotmail.com:prem33333",
  ];

  for (const combo of premiumCombos) {
    await db.account.create({
      data: { service_name: "minecraft_premium", combo },
    });
  }

  // Bedrock free stock
  const bedrockFree = [
    "bedrock_player1@gmail.com:bedrock1",
    "bedrock_player2@outlook.com:bedrock2",
    "bedrock_player3@yahoo.com:bedrock3",
  ];

  for (const combo of bedrockFree) {
    await db.account.create({
      data: { service_name: "minecraft_bedrock_free", combo },
    });
  }

  // Spotify free stock
  const spotifyFree = [
    "spotify_user1@gmail.com:spoti123",
    "spotify_user2@outlook.com:spoti456",
    "spotify_user3@yahoo.com:spoti789",
    "spotify_user4@gmail.com:spoti012",
  ];

  for (const combo of spotifyFree) {
    await db.account.create({
      data: { service_name: "spotify_free", combo },
    });
  }

  console.log("✅ Stock added");

  // Create demo users
  await db.user.upsert({
    where: { user_id: "demo_admin_001" },
    update: {},
    create: {
      user_id: "demo_admin_001",
      username: "DemoAdmin",
      subscription_stage: "Premium",
      subscription_time_left: Date.now() / 1000 + 86400 * 30,
    },
  });

  await db.user.upsert({
    where: { user_id: "demo_user_001" },
    update: {},
    create: {
      user_id: "demo_user_001",
      username: "DemoUser",
      subscription_stage: "Free",
    },
  });

  // Create a regular user with some history
  await db.user.upsert({
    where: { user_id: "demo_regular_001" },
    update: {},
    create: {
      user_id: "demo_regular_001",
      username: "MCPlayer42",
      amount_genned: 3,
      last_time_genned: String(Date.now() / 1000 - 3600),
    },
  });

  // Add some generation history
  await db.generationHistory.createMany({
    data: [
      { user_id: "demo_regular_001", service_name: "minecraft", combo: "old_player@gmail.com:oldpass1", is_premium: false, generated_at: new Date(Date.now() - 86400000 * 3) },
      { user_id: "demo_regular_001", service_name: "minecraft", combo: "another_player@yahoo.com:oldpass2", is_premium: false, generated_at: new Date(Date.now() - 86400000 * 2) },
      { user_id: "demo_regular_001", service_name: "minecraft", combo: "third_player@hotmail.com:oldpass3", is_premium: false, generated_at: new Date(Date.now() - 86400000) },
    ],
  });

  console.log("✅ Demo users created");

  // Create an active giveaway
  await db.giveaway.create({
    data: {
      title: "Minecraft Premium Giveaway",
      description: "Win a premium Minecraft account! Open to all server members.",
      service_name: "minecraft",
      account_count: 2,
      is_premium: true,
      ends_at: new Date(Date.now() + 86400000 * 7),
      is_active: true,
    },
  });

  // Create a past giveaway
  await db.giveaway.create({
    data: {
      title: "Holiday Minecraft Giveaway",
      description: "Merry holidays! 3 free MC accounts.",
      service_name: "minecraft",
      account_count: 3,
      is_premium: false,
      ends_at: new Date(Date.now() - 86400000 * 2),
      is_active: false,
      winner_ids: "demo_regular_001",
    },
  });

  console.log("✅ Giveaways created");

  // Add entry for the regular user in the active giveaway
  const activeGiveaway = await db.giveaway.findFirst({ where: { is_active: true } });
  if (activeGiveaway) {
    await db.giveawayEntry.create({
      data: { giveaway_id: activeGiveaway.id, user_id: "demo_regular_001" },
    });
  }

  console.log("🌱 Seed complete!");
  console.log("");
  console.log("Demo accounts:");
  console.log("  Admin: demo_admin_001 (Premium, 30 days)");
  console.log("  User:  demo_user_001 (Free)");
  console.log("  User:  demo_regular_001 (Free, 3 gens)");
  console.log("");
  console.log("Stock:");
  console.log("  Minecraft Free: 10 accounts");
  console.log("  Minecraft Premium: 5 accounts");
  console.log("  Minecraft Bedrock Free: 3 accounts");
  console.log("  Spotify Free: 4 accounts");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
