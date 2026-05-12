import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { logger } from "./log";

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

interface ReservedAccount {
  id: number;
  combo: string;
}

function getRoleConfig(): RoleConfig[] {
  try {
    const parsed = JSON.parse(process.env.ROLE_CONFIG || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    logger.warn("role_config.invalid");
    return [];
  }
}

function getDefaultCooldown(isPremium: boolean): number {
  const val = isPremium
    ? process.env.DEFAULT_PREMIUM_COOLDOWN
    : process.env.DEFAULT_FREE_COOLDOWN;
  return parseInt(val || (isPremium ? "60" : "600"), 10);
}

function parseCooldown(raw: unknown): CooldownMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { Free: null, Premium: null };
  return raw as CooldownMap;
}

function isPremiumUser(user: { subscription_stage: string; subscription_time_left: number | null }): boolean {
  const now = Date.now() / 1000;
  return user.subscription_stage === "Premium" && !!user.subscription_time_left && user.subscription_time_left > now;
}

async function getAdPolicy() {
  const settings = await db.siteSettings.findMany({
    where: { key: { in: ["ad_duration", "ad_enabled"] } },
  });
  const map = new Map(settings.map((s) => [s.key, s.value]));
  return {
    enabled: map.get("ad_enabled") !== "false",
    durationSeconds: Math.max(0, parseInt(map.get("ad_duration") || "30", 10) || 30),
  };
}

function getRoleCooldown(userRoles: string[], isPremium: boolean): number {
  const roleConfig = getRoleConfig();
  let minCooldown = Infinity;

  for (const role of roleConfig) {
    if (userRoles.includes(role.id)) {
      const cd = isPremium ? role.premium_cooldown : role.free_cooldown;
      if (Number.isFinite(cd) && cd < minCooldown) minCooldown = cd;
    }
  }

  return minCooldown === Infinity ? getDefaultCooldown(isPremium) : minCooldown;
}

function hasServiceAccess(userRoles: string[], service: string) {
  const roleConfig = getRoleConfig();
  if (roleConfig.length === 0) return true;

  return roleConfig.some(
    (role) =>
      userRoles.includes(role.id) &&
      (role.gen_access.includes(service) || role.gen_access.includes("all"))
  );
}

function getCooldownSeconds(
  customCooldown: unknown,
  tier: "Free" | "Premium",
  userRoles: string[],
  isPremium: boolean
) {
  const custom = parseCooldown(customCooldown)[tier];
  return custom != null ? Number(custom) : getRoleCooldown(userRoles, isPremium);
}

async function pickAvailableAccount(tx: Prisma.TransactionClient, serviceName: string) {
  const accounts = await tx.$queryRaw<ReservedAccount[]>`
    SELECT a.id, a.combo
    FROM "Account" a
    WHERE a.service_name = ${serviceName.toLowerCase()}
      AND NOT EXISTS (
        SELECT 1 FROM "PendingGeneration" p
        WHERE p.account_id = a.id AND p.expires_at > NOW()
      )
    ORDER BY RANDOM()
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  `;

  return accounts[0] ?? null;
}

async function completeGeneration(
  tx: Prisma.TransactionClient,
  user: {
    user_id: string;
    amount_genned: number;
    prem_amount_genned: number;
    user_cooldown: unknown;
    custom_cooldown: unknown;
  },
  account: ReservedAccount,
  service: string,
  isPremium: boolean,
  userRoles: string[],
  pendingToken?: string
) {
  const now = Date.now() / 1000;
  const tier = isPremium ? "Premium" : "Free";
  const cooldownSeconds = getCooldownSeconds(user.custom_cooldown, tier, userRoles, isPremium);
  const updatedCooldown: CooldownMap = {
    ...parseCooldown(user.user_cooldown),
    [tier]: String(Math.floor(now + cooldownSeconds)),
  };

  await tx.account.delete({ where: { id: account.id } });
  await tx.generationHistory.create({
    data: {
      user_id: user.user_id,
      service_name: service,
      combo: account.combo,
      is_premium: isPremium,
    },
  });
  await tx.user.update({
    where: { user_id: user.user_id },
    data: {
      amount_genned: { increment: isPremium ? 0 : 1 },
      prem_amount_genned: { increment: isPremium ? 1 : 0 },
      last_time_genned: String(now),
      user_cooldown: updatedCooldown,
    },
  });

  if (pendingToken) {
    await tx.pendingGeneration.delete({ where: { token: pendingToken } });
    await tx.adImpression.create({
      data: {
        user_id: user.user_id,
        service_name: service,
        provider: "propeller",
        zone_id: process.env.NEXT_PUBLIC_PROPELLER_ZONE_ID || null,
        completed: true,
      },
    });
  }
}

export async function reserveAccount(
  userId: string,
  service: string,
  isPremium: boolean,
  userRoles: string[],
  isAdmin: boolean
): Promise<{ success: boolean; error?: string; token?: string; account?: string; requiresAd?: boolean; cooldownRemaining?: number; claimableAt?: string }> {
  let user = await db.user.findUnique({ where: { user_id: userId } });
  if (!user) {
    user = await db.user.create({
      data: { user_id: userId, subscription_stage: "Free", is_admin: isAdmin },
    });
  }

  if (user.is_blacklisted) {
    return { success: false, error: "You are blacklisted from using this service." };
  }

  if (isPremium && !isPremiumUser(user)) {
    return { success: false, error: "You don't have an active premium subscription." };
  }

  if (!hasServiceAccess(userRoles, service)) {
    return { success: false, error: "Your role doesn't have access to this service." };
  }

  const tier = isPremium ? "Premium" : "Free";
  const cooldownEnd = parseCooldown(user.user_cooldown)[tier];
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

  const adPolicy = await getAdPolicy();
  const serviceName = isPremium ? `${service}_premium` : `${service}_free`;
  const skipAd = isPremium || isAdmin || !adPolicy.enabled || adPolicy.durationSeconds === 0;

  try {
    return await db.$transaction(async (tx) => {
      await tx.pendingGeneration.deleteMany({ where: { expires_at: { lt: new Date() } } });

      const account = await pickAvailableAccount(tx, serviceName);
      if (!account) {
        return { success: false, error: "No stock left for this service." };
      }

      if (skipAd) {
        await completeGeneration(tx, user, account, service, isPremium, userRoles);
        logger.info("generation.completed", { userId, service, isPremium, skippedAd: true });
        return { success: true, account: account.combo, requiresAd: false };
      }

      const token = randomUUID();
      const claimableAt = new Date(Date.now() + adPolicy.durationSeconds * 1000);
      const expiresAt = new Date(Date.now() + Math.max(5 * 60, adPolicy.durationSeconds + 60) * 1000);

      await tx.pendingGeneration.create({
        data: {
          token,
          user_id: userId,
          service_name: service,
          account_id: account.id,
          is_premium: isPremium,
          claimable_at: claimableAt,
          expires_at: expiresAt,
        },
      });

      logger.info("generation.reserved", { userId, service, accountId: account.id });
      return { success: true, token, requiresAd: true, claimableAt: claimableAt.toISOString() };
    });
  } catch (error) {
    logger.error("generation.reserve_failed", { userId, service, error: error instanceof Error ? error.message : "unknown" });
    return { success: false, error: "Unable to reserve stock. Please try again." };
  }
}

export async function claimAccount(
  token: string,
  userId: string,
  userRoles: string[]
): Promise<{ success: boolean; error?: string; account?: string; retryAfter?: number }> {
  try {
    return await db.$transaction(async (tx) => {
      const pending = await tx.pendingGeneration.findUnique({ where: { token } });

      if (!pending || pending.user_id !== userId) {
        return { success: false, error: "Invalid or expired claim token." };
      }

      const now = new Date();
      if (now > pending.expires_at) {
        await tx.pendingGeneration.delete({ where: { token } });
        return { success: false, error: "Claim token has expired. Please try again." };
      }

      if (now < pending.claimable_at) {
        return {
          success: false,
          error: "Ad watch time has not completed yet.",
          retryAfter: Math.ceil((pending.claimable_at.getTime() - now.getTime()) / 1000),
        };
      }

      const account = await tx.account.findUnique({ where: { id: pending.account_id } });
      if (!account) {
        await tx.pendingGeneration.delete({ where: { token } });
        return { success: false, error: "Reserved account no longer available. Please try again." };
      }

      const user = await tx.user.findUnique({ where: { user_id: pending.user_id } });
      if (!user || user.is_blacklisted) {
        return { success: false, error: "User is not allowed to claim this account." };
      }

      await completeGeneration(tx, user, account, pending.service_name, pending.is_premium, userRoles, token);
      logger.info("generation.claimed", { userId, service: pending.service_name, accountId: account.id });
      return { success: true, account: account.combo };
    });
  } catch (error) {
    logger.error("generation.claim_failed", { userId, error: error instanceof Error ? error.message : "unknown" });
    return { success: false, error: "Unable to claim account. Please try again." };
  }
}

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
  const maskedEmail =
    email.length > 3 ? email.substring(0, 3) + "***@" + (email.split("@")[1] || "***") : "***";
  return `${maskedEmail}:${"*".repeat(Math.min(pass.length, 8))}`;
}
