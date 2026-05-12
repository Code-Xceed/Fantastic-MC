import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { logger } from "./log";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      image: string;
    };
    isAdmin: boolean;
    roles: string[];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "fallback_secret_for_build_12345678901234567890",
  trustHost: true,
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID || "missing_client_id",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "missing_client_secret",
      authorization:
        "https://discord.com/api/oauth2/authorize?scope=identify+guilds+guilds.members.read",
    }),
  ],
  pages: {
    error: "/",
    signIn: "/",
  },
  callbacks: {
    async signIn({ user }) {
      const guildId = process.env.DISCORD_GUILD_ID;
      const botToken = process.env.DISCORD_BOT_TOKEN;

      if (!guildId || !botToken) {
        logger.error("auth.discord_config_missing");
        return false;
      }

      try {
        const res = await fetch(
          `https://discord.com/api/guilds/${guildId}/members/${user.id}`,
          {
            headers: { Authorization: `Bot ${botToken}` },
          }
        );

        if (!res.ok) {
          logger.warn("auth.guild_member_check_failed", { status: res.status });
          return false;
        }

        const member = await res.json();
        const roleIds: string[] = member.roles || [];

        const adminRoleIds = (process.env.ADMIN_ROLE_IDS || "").split(",").filter(Boolean);
        const isAdmin = roleIds.some((r) => adminRoleIds.includes(r));

        (user as unknown as Record<string, unknown>).isAdmin = isAdmin;
        (user as unknown as Record<string, unknown>).roles = roleIds;

        return true;
      } catch (err) {
        logger.error("auth.guild_member_check_error", { error: err instanceof Error ? err.message : "unknown" });
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = (user as unknown as Record<string, unknown>).isAdmin;
        token.roles = (user as unknown as Record<string, unknown>).roles;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.isAdmin = token.isAdmin as boolean;
      session.roles = token.roles as string[];
      return session;
    },
  },
});
