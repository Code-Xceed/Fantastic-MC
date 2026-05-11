import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

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

// Ensure NEXTAUTH_SECRET exists
if (!process.env.NEXTAUTH_SECRET) {
  console.error("NEXTAUTH_SECRET is not set. Authentication will not work.");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Discord({
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
        console.error("Missing DISCORD_GUILD_ID or DISCORD_BOT_TOKEN");
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
          console.error("Guild member check failed:", res.status);
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
        console.error("Error checking guild membership:", err);
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
