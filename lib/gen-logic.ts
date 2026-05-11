import { db } from "./db";
import { randomUUID } from "crypto";

interface RoleConfig {
  id: string;
  free_cooldown: number;
  premium_cooldown: number;
  gen_access: string[];
  remove_if_expired: boolean;
}

interface CooldownMap {
  Free: string | null;
  Premium: string | null;
  [key: string]: string | null;
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

function parseCooldown(raw: unknown): CooldownMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { Free: null, Premium: null };
  return raw as CooldownMap;
}

function isPremiumUser(user: { subscription_stage: string; subscription_time_left: number | null }): boolean {
  const now = Date.now() / 1000;
  return user.subscription_stage === "Premium" && !!user.subscription_time_left && user.subscription_time_left > now;
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

/**
 * Reserve an account for generation. Returns a claim token.
 * For premium/admin users, the account is returned immediately (no ad required).
 * For free users, the account is reserved and must be claimed after watching an ad.
 */
export async function reserveAccount(
  userId: string,
  service: string,
  isPremium: boolean,
  userRoles: string[],
  isAdmin: boolean
): Promise<{ success: boolean; error?: string; token?: string; account?: string; requiresAd?: boolean; cooldownRemaining?: number }> {
  // 1. Ensure user exists
  let user = await db.user.findUnique({ where: { user_id: userId } });
  if (!user) {
    user = await db.user.create({
      data: { user_id: userId, subscription_stage: "Free", is_admin: isAdmin },
    });
  }

  // 2. Blacklist check
  if (user.is_blacklisted) {
    return { success: false, error: "You are blacklisted from using this service." };
  }

  // 3. Subscription check for premium
  if (isPremium && !isPremiumUser(user)) {
    return { success: false, error: "You don't have an active premium subscription." };
  }

  // 4. Role access check
  const roleConfig = getRoleConfig();
  if (roleConfig.length > 0 && userRoles.length > 0) {
    const hasAccess = roleConfig.some(
      (r) =>
        userRoles.includes(r.id) &&
        (r.gen_access.includes(service) || r.gen_access.includes("all"))
    );
    if (!hasAccess) {
      return { success: false, error: "Your role doesn't have access to this service." };
    }
  }

  // 5. Cooldown check
  const tier = isPremium ? "Premium" : "Free";
  const cooldownData = parseCooldown(user.user_cooldown);
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

  const randomAccounts = await db.$queryRaw<Array<{ id: number; combo: string }>>`
    SELECT id, combo FROM "Account" WHERE service_name = ${serviceName.toLowerCase()} ORDER BY RANDOM() LIMIT 1
  `;

  if (randomAccounts.length === 0) {
    return { success: false, error: "No stock left for this service." };
  }

  const account = randomAccounts[0];

  // Premium/admin users get account immediately, no ad
  const skipAd = isPremium || isAdmin;

  if (skipAd) {
    // Complete the generation immediately in a transaction
    const now = Date.now() / 1000;
    const roleCooldown = getRoleCooldown(userRoles, isPremium);
    const customCooldownData = parseCooldown(user.custom_cooldown);
    const customCooldown = customCooldownData[tier];
    const cooldownSeconds = customCooldown != null ? Number(customCooldown) : roleCooldown;

    const updatedCooldown: CooldownMap = {
      ...parseCooldown(user.user_cooldown),
      [tier]: String(Math.floor(now + cooldownSeconds)),
    };

    await db.$transaction([
      db.account.delete({ where: { id: account.id } }),
      db.generationHistory.create({
        data: {
          user_id: userId,
          service_name: service,
          combo: account.combo,
          is_premium: isPremium,
        },
      }),
      db.user.update({
        where: { user_id: userId },
        data: {
          amount_genned: isPremium ? user.amount_genned : user.amount_genned + 1,
          prem_amount_genned: isPremium ? user.prem_amount_genned + 1 : user.prem_amount_genned,
          last_time_genned: String(now),
          user_cooldown: updatedCooldown,
        },
      }),
    ]);

    return { success: true, account: account.combo, requiresAd: false };
  }

  // Free user: reserve the account and return a token
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min TTL

  await db.pendingGeneration.create({
    data: {
      token,
      user_id: userId,
      service_name: service,
      account_id: account.id,
      is_premium: isPremium,
      expires_at: expiresAt,
    },
  });

  return { success: true, token, requiresAd: true };
}

/**
 * Claim a reserved account after watching an ad.
 */
export async function claimAccount(
  token: string
): Promise<{ success: boolean; error?: string; account?: string }> {
  const pending = await db.pendingGeneration.findUnique({
    where: { token },
  });

  if (!pending) {
    return { success: false, error: "Invalid or expired claim token." };
  }

  if (new Date() > pending.expires_at) {
    await db.pendingGeneration.delete({ where: { token } });
    return { success: false, error: "Claim token has expired. Please try again." };
  }

  // Fetch the reserved account
  const account = await db.account.findUnique({ where: { id: pending.account_id } });
  if (!account) {
    await db.pendingGeneration.delete({ where: { token } });
    return { success: false, error: "Reserved account no longer available. Please try again." };
  }

  const user = await db.user.findUnique({ where: { user_id: pending.user_id } });
  if (!user) {
    return { success: false, error: "User not found." };
  }

  // Complete the generation in a transaction
  const now = Date.now() / 1000;
  const tier = pending.is_premium ? "Premium" : "Free";
  const cooldownSeconds = getDefaultCooldown(pending.is_premium);

  const updatedCooldown: CooldownMap = {
    ...parseCooldown(user.user_cooldown),
    [tier]: String(Math.floor(now + cooldownSeconds)),
  };

  await db.$transaction([
    db.account.delete({ where: { id: account.id } }),
    db.generationHistory.create({
      data: {
        user_id: pending.user_id,
        service_name: pending.service_name,
        combo: account.combo,
        is_premium: pending.is_premium,
      },
    }),
    db.user.update({
      where: { user_id: pending.user_id },
      data: {
        amount_genned: pending.is_premium ? user.amount_genned : user.amount_genned + 1,
        prem_amount_genned: pending.is_premium ? user.prem_amount_genned + 1 : user.prem_amount_genned,
        last_time_genned: String(now),
        user_cooldown: updatedCooldown,
      },
    }),
    db.pendingGeneration.delete({ where: { token } }),
    db.adImpression.create({
      data: {
        user_id: pending.user_id,
        service_name: pending.service_name,
        provider: "propeller",
        zone_id: process.env.NEXT_PUBLIC_PROPELLER_ZONE_ID || null,
        completed: true,
      },
    }),
  ]);

  return { success: true, account: account.combo };
}

/**
 * Clean up expired pending generations (call periodically)
 */
export async function cleanupExpiredPending() {
  const result = await db.pendingGeneration.deleteMany({
    where: { expires_at: { lt: new Date() } },
  });
  return result.count;
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
