import { db } from "./db";

interface RoleConfig {
  id: string;
  free_cooldown: number;
  premium_cooldown: number;
  gen_access: string[];
  remove_if_expired: boolean;
}

function getRoleConfig(): RoleConfig[] {
  try {
    return JSON.parse(process.env.ROLE_CONFIG || "[]");
  } catch {
    return [];
  }
}

function getDefaultCooldown(isPremium: boolean): number {
  const val = isPremium
    ? process.env.DEFAULT_PREMIUM_COOLDOWN
    : process.env.DEFAULT_FREE_COOLDOWN;
  return parseInt(val || "600", 10);
}

function parseCooldown(raw: Record<string, string | null> | null): Record<string, string | null> {
  if (!raw) return {};
  return raw;
}

export async function generateAccount(
  userId: string,
  service: string,
  isPremium: boolean,
  userRoles: string[]
) {
  // 1. Ensure user exists
  let user = await db.user.findUnique({ where: { user_id: userId } });
  if (!user) {
    user = await db.user.create({
      data: { user_id: userId, subscription_stage: "Free" },
    });
  }

  // 2. Blacklist check
  if (user.is_blacklisted) {
    return { success: false, error: "You are blacklisted from using this service." };
  }

  // 3. Subscription check for premium
  if (isPremium) {
    const now = Date.now() / 1000;
    if (
      user.subscription_stage === "Free" ||
      !user.subscription_time_left ||
      now >= user.subscription_time_left
    ) {
      return { success: false, error: "You don't have an active premium subscription." };
    }
  }

  // 4. Role access check
  const roleConfig = getRoleConfig();
  const hasAccess = roleConfig.some(
    (r) =>
      userRoles.includes(r.id) &&
      (r.gen_access.includes(service) || r.gen_access.includes("all"))
  );
  if (!hasAccess && userRoles.length > 0) {
    // Allow if no role config is defined (open access)
    if (roleConfig.length > 0) {
      return { success: false, error: "Your role doesn't have access to this service." };
    }
  }

  // 5. Cooldown check
  const tier = isPremium ? "Premium" : "Free";
  const cooldownData = parseCooldown(user.user_cooldown as unknown as Record<string, string | null> | null);
  const cooldownEnd = cooldownData[tier];

  if (cooldownEnd) {
    const endTime = parseFloat(cooldownEnd);
    const now = Date.now() / 1000;
    if (now < endTime) {
      const remaining = Math.ceil(endTime - now);
      return {
        success: false,
        error: `You are on cooldown. Try again in ${remaining} seconds.`,
        cooldownRemaining: remaining,
      };
    }
  }

  // 6. Fetch random account
  const serviceName = isPremium ? `${service}_premium` : `${service}_free`;

  // PostgreSQL: use ORDER BY RANDOM()
  const randomAccounts = await db.$queryRaw<Array<{ id: number; combo: string }>>`
    SELECT id, combo FROM "Account" WHERE service_name = ${serviceName.toLowerCase()} ORDER BY RANDOM() LIMIT 1
  `;

  if (randomAccounts.length === 0) {
    return { success: false, error: "No stock left for this service." };
  }

  const account = randomAccounts[0];

  // Delete the account
  await db.account.delete({ where: { id: account.id } });

  // 7. Record in history
  await db.generationHistory.create({
    data: {
      user_id: userId,
      service_name: service,
      combo: account.combo,
      is_premium: isPremium,
    },
  });

  // 8. Update user stats
  const now = Date.now() / 1000;
  const roleCooldown = getRoleCooldown(userRoles, isPremium);
  const customCooldownData = parseCooldown(user.custom_cooldown as unknown as Record<string, string | null> | null);
  const customCooldown = customCooldownData[tier];
  const cooldownSeconds = customCooldown != null ? Number(customCooldown) : roleCooldown;

  const updatedCooldown: Record<string, string | null> = {
    ...parseCooldown(user.user_cooldown as unknown as Record<string, string | null> | null),
    [tier]: String(Math.floor(now + cooldownSeconds)),
  };

  await db.user.update({
    where: { user_id: userId },
    data: {
      amount_genned: isPremium ? user.amount_genned : user.amount_genned + 1,
      prem_amount_genned: isPremium ? user.prem_amount_genned + 1 : user.prem_amount_genned,
      last_time_genned: String(now),
      user_cooldown: updatedCooldown,
    },
  });

  return { success: true, account: account.combo };
}

function getRoleCooldown(userRoles: string[], isPremium: boolean): number {
  const roleConfig = getRoleConfig();
  let minCooldown = Infinity;

  for (const role of roleConfig) {
    if (userRoles.includes(role.id)) {
      const cd = isPremium ? role.premium_cooldown : role.free_cooldown;
      if (cd < minCooldown) minCooldown = cd;
    }
  }

  return minCooldown === Infinity ? getDefaultCooldown(isPremium) : minCooldown;
}

export function formatCooldown(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.ceil(seconds % 60);

  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export function maskCombo(combo: string): string {
  const parts = combo.split(":");
  if (parts.length < 2) return combo.substring(0, 3) + "***";
  const email = parts[0];
  const pass = parts.slice(1).join(":");
  const maskedEmail = email.length > 3 ? email.substring(0, 3) + "***@" + (email.split("@")[1] || "***") : "***";
  return `${maskedEmail}:${"*".repeat(Math.min(pass.length, 8))}`;
}
