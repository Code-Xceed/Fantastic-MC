# FMC Gen — Full Setup & Operations Guide

Complete guide to setting up, deploying, and operating the FMC Gen website from scratch.

---

## Table of Contents

1. [Discord Bot & OAuth Setup](#1-discord-bot--oauth-setup)
2. [PropellerAds Setup (Ad Monetization)](#2-propellerads-setup-ad-monetization)
3. [Vercel Deployment](#3-vercel-deployment)
4. [Environment Variables](#4-environment-variables)
5. [Database Setup](#5-database-setup)
6. [First-Time Admin Setup](#6-first-time-admin-setup)
7. [Day-to-Day Operations](#7-day-to-day-operations)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Discord Bot & OAuth Setup

### Step 1: Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** → name it `FMC Gen` (or your preferred name)
3. Note down the **Application ID** — this is your `DISCORD_CLIENT_ID`

### Step 2: Configure OAuth2

1. In your application, go to **OAuth2** → **General**
2. Click **Reset Secret** → copy the Client Secret → this is your `DISCORD_CLIENT_SECRET`
3. Under **Redirects**, add:
   - `http://localhost:3000/api/auth/callback/discord` (for local dev)
   - `https://your-domain.vercel.app/api/auth/callback/discord` (for production)
4. Save changes

### Step 3: Create a Bot

1. Go to **Bot** in the left sidebar
2. Click **Reset Token** → copy the Bot Token → this is your `DISCORD_BOT_TOKEN`
3. ⚠️ **Save this token securely — it's shown only once**
4. Under **Privileged Gateway Intents**, enable ALL three:
   - ✅ Presence Intent
   - ✅ Server Members Intent
   - ✅ Message Content Intent
5. Save changes

### Step 4: Invite the Bot to Your Server

1. Go to **OAuth2** → **URL Generator**
2. Under **Scopes**, select: `bot`
3. Under **Bot Permissions**, select:
   - ✅ Read Members (this is the key one — the bot needs to read member roles)
4. Copy the generated URL at the bottom
5. Open it in your browser and invite the bot to your Discord server

### Step 5: Get Your Server ID and Role IDs

1. Open Discord → Settings → Advanced → enable **Developer Mode**
2. Right-click your Discord server name → **Copy Server ID** → this is your `DISCORD_GUILD_ID`
3. Right-click the admin role in your server → **Copy Role ID**
4. If you have multiple admin roles, right-click each one and copy their IDs
5. Combine them with commas → this is your `ADMIN_ROLE_IDS` (e.g., `123456789,987654321`)

### Step 6: Verify Bot Is Working

1. In your Discord server, check the member list — the bot should appear
2. The bot must be able to see all members (this is why Server Members Intent is required)
3. If the bot can't see members, the login will fail with "Guild member check failed"

---

## 2. PropellerAds Setup (Ad Monetization)

### Step 1: Create a PropellerAds Account

1. Go to [propellerads.com](https://propellerads.com) and sign up as a **Publisher**
2. Fill in your website details:
   - Website URL: `https://your-domain.vercel.app`
   - Category: Gaming / Entertainment
   - Traffic: Worldwide (or select your target countries)
3. Wait for approval (usually 1-24 hours)

### Step 2: Create an Interstitial Zone (for the ad wall)

This is the full-screen ad that free users see for 30 seconds before getting their account.

1. In PropellerAds dashboard → **Sites** → click your approved site
2. Click **+ New Zone**
3. Zone type: **Interstitial / Full-Screen**
4. Name it: `FMC Gen - Generation Ad Wall`
5. Click **Create**
6. Copy the **Zone ID** (a number like `1234567`) → this is your `NEXT_PUBLIC_PROPELLER_ZONE_ID`

### Step 3: Create a Banner Zone (for sidebar/bottom ads)

These are the smaller ads shown on dashboard, services, and other pages.

1. Click **+ New Zone** again
2. Zone type: **Native Banner** or **Push Notification** (your choice)
3. Name it: `FMC Gen - Banner Ads`
4. Click **Create**
5. Copy the **Zone ID** → this is your `NEXT_PUBLIC_PROPELLER_BANNER_ZONE_ID`

### Step 4: How You Get Paid

- PropellerAds pays per 1000 ad impressions (CPM)
- Typical rates: **$0.50 - $5.00 per 1000 views** depending on visitor country
- US/UK/CA traffic pays the most
- Minimum payout: **$100** via PayPal, Wire Transfer, or Crypto
- Payouts are processed weekly

### Step 5: Revenue Estimation

If you have:
- 100 users generating 3 accounts/day each = 300 ad impressions/day
- Average CPM of $2.00
- Daily revenue: (300 / 1000) × $2.00 = **$0.60/day**
- Monthly revenue: ~**$18/month**

Scale to 1000 active users:
- 3000 impressions/day × $2.00 CPM = **$6/day** = **$180/month**

---

## 3. Vercel Deployment

### Step 1: Push Code to GitHub

Already done — code is at: `https://github.com/Code-Xceed/Fantastic-MC`

### Step 2: Import in Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click **Add New** → **Project**
3. Import the `Fantastic-MC` repository
4. **Framework Preset**: Next.js (auto-detected)
5. **Root Directory**: set to `web` (the Next.js app is inside the `web/` folder)

### Step 3: Add PostgreSQL Database

1. In your Vercel project → **Storage** tab
2. Click **Create Database** → select **Neon Postgres** (free tier available)
3. Click **Create** — this auto-sets `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING`
4. ⚠️ **Important**: When prompted for a prefix, leave it EMPTY (no prefix)

### Step 4: Set Environment Variables

In your Vercel project → **Settings** → **Environment Variables**, add ALL of these:

| Variable | Value | Where to get it |
|----------|-------|-----------------|
| `DISCORD_CLIENT_ID` | Your Discord app ID | Discord Developer Portal → OAuth2 → Client ID |
| `DISCORD_CLIENT_SECRET` | Your Discord secret | Discord Developer Portal → OAuth2 → Client Secret |
| `DISCORD_BOT_TOKEN` | Your bot token | Discord Developer Portal → Bot → Token |
| `DISCORD_GUILD_ID` | Your server ID | Right-click server → Copy ID |
| `ADMIN_ROLE_IDS` | Comma-separated role IDs | Right-click each admin role → Copy ID |
| `NEXTAUTH_SECRET` | Random 32+ char string | Run: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Your Vercel deployment URL |
| `NEXT_PUBLIC_PROPELLER_ZONE_ID` | Interstitial zone ID | PropellerAds dashboard |
| `NEXT_PUBLIC_PROPELLER_BANNER_ZONE_ID` | Banner zone ID | PropellerAds dashboard |
| `NEXT_PUBLIC_AD_SLOT_ENABLED` | `true` | Set to `true` |
| `DEFAULT_FREE_COOLDOWN` | `600` | 10 minutes in seconds |
| `DEFAULT_PREMIUM_COOLDOWN` | `60` | 1 minute in seconds |
| `ROLE_CONFIG` | `[]` | See Role Config section below |

### Step 5: Deploy

1. Click **Deploy** in Vercel
2. The build script automatically runs `prisma generate && prisma db push` to set up the database
3. Wait for deployment to complete
4. Visit your URL — you should see the landing page with "Login with Discord"

### Step 6: Set Discord Redirect URL

1. Go back to Discord Developer Portal → OAuth2 → Redirects
2. Add: `https://your-app.vercel.app/api/auth/callback/discord`
3. Save

---

## 4. Environment Variables Reference

### Required (App Won't Work Without These)

```
DISCORD_CLIENT_ID=1234567890123456789
DISCORD_CLIENT_SECRET=abc123def456ghi789
DISCORD_BOT_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.Gabc123.def456
DISCORD_GUILD_ID=987654321098765432
ADMIN_ROLE_IDS=111111111111111111,222222222222222222
NEXTAUTH_SECRET=generated-random-secret-string-here
NEXTAUTH_URL=https://your-app.vercel.app
POSTGRES_PRISMA_URL=postgresql://user:pass@host/db?sslmode=require
POSTGRES_URL_NON_POOLING=postgresql://user:pass@host/db?sslmode=require
```

### Ad Monetization

```
NEXT_PUBLIC_PROPELLER_ZONE_ID=1234567
NEXT_PUBLIC_PROPELLER_BANNER_ZONE_ID=7654321
NEXT_PUBLIC_AD_SLOT_ENABLED=true
```

### Cooldown Configuration

```
DEFAULT_FREE_COOLDOWN=600
DEFAULT_PREMIUM_COOLDOWN=60
ROLE_CONFIG=[]
```

### Role Config (Advanced)

If you want different Discord roles to have different cooldowns:

```json
[
  {
    "id": "ROLE_ID_HERE",
    "free_cooldown": 300,
    "premium_cooldown": 30,
    "gen_access": ["all"],
    "remove_if_expired": false
  },
  {
    "id": "ANOTHER_ROLE_ID",
    "free_cooldown": 600,
    "premium_cooldown": 60,
    "gen_access": ["minecraft"],
    "remove_if_expired": false
  }
]
```

- `id`: Discord role ID
- `free_cooldown`: Free tier cooldown in seconds
- `premium_cooldown`: Premium tier cooldown in seconds
- `gen_access`: Which services this role can access (`["all"]` for everything, or `["minecraft", "spotify"]` for specific ones)
- `remove_if_expired`: Whether to remove premium when subscription expires

Set this as a single-line JSON string in `ROLE_CONFIG`:
```
ROLE_CONFIG=[{"id":"111111111111111111","free_cooldown":300,"premium_cooldown":30,"gen_access":["all"],"remove_if_expired":false}]
```

---

## 5. Database Setup

### Automatic (Vercel)

When you deploy to Vercel with Neon Postgres, the database tables are created automatically by the build script (`prisma db push`).

### Manual (Local Development)

If you want to run locally:

1. Install PostgreSQL (or use a cloud DB like Neon, Supabase, or Railway)
2. Set `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING` in your `.env`
3. Run:
```bash
npx prisma db push
```

### Database Schema

The app uses these tables:

| Table | Purpose |
|-------|---------|
| `Account` | Stores account combos (email:password) with service_name |
| `User` | User profiles, cooldowns, subscription status, admin flag |
| `GenerationHistory` | Log of every account generated (who, what, when) |
| `Giveaway` | Active and past giveaways |
| `GiveawayEntry` | User entries into giveaways |
| `ServiceConfig` | Service definitions (name, display name, icon, active status) |
| `PendingGeneration` | Temporary reservations for the ad wall flow (5-min TTL) |
| `AdImpression` | Tracks ad views for analytics |
| `SiteSettings` | Configurable site settings (ad duration, maintenance mode, etc.) |

---

## 6. First-Time Admin Setup

After deploying, you need to add stock before users can generate accounts.

### Step 1: Login as Admin

1. Visit your site
2. Click **Login with Discord**
3. Authorize in Discord
4. You should be redirected to the Dashboard
5. If you have the admin role, you'll see **Admin** in the navbar

### Step 2: Create Services

1. Go to **Admin → Stock**
2. In the "Service Name" field, enter a service name (e.g., `minecraft`)
3. This automatically creates the service in ServiceConfig

### Step 3: Add Stock

1. In **Admin → Stock**, paste account combos (one per line):
   ```
   email1@gmail.com:password123
   email2@gmail.com:password456
   email3@gmail.com:password789
   ```
2. Select **Free** or **Premium** tier
3. Click **Add Stock**

The service name format in the database:
- Free accounts: `minecraft_free`
- Premium accounts: `minecraft_premium`

### Step 4: Configure Site Settings

1. Go to **Admin → Settings**
2. Set **Ad Duration**: 30 seconds (or your preference)
3. Set **Ads Enabled**: true
4. Set **Site Name**: FMC Gen (or your preferred name)

---

## 7. Day-to-Day Operations

### Adding More Stock

1. **Admin → Stock** → paste combos → select tier → Add
2. You can also upload a `.txt` file with one combo per line
3. Tip: Keep at least 50+ accounts in stock to avoid "No stock left" errors

### Managing Users

- **Admin → Users**: Search by Discord ID or username
  - **Blacklist**: Prevent a user from generating accounts
  - **Notes**: Add admin notes to a user (e.g., "suspected bot")
  - **Reset Cooldown**: Manually reset a user's cooldown
  - **Set Custom Cooldown**: Override the default cooldown for a specific user

### Managing Subscriptions

- **Admin → Subscriptions**: Grant premium access to users
  - **Add Premium**: Set duration (1 day, 7 days, 30 days, custom)
  - **Mass Extend**: Add time to ALL current premium users at once
  - Premium users skip the ad wall and get faster cooldowns

### Running Giveaways

1. **Admin → Giveaways → Create Giveaway**
   - Title: "Free Premium Minecraft Account"
   - Service: minecraft
   - Account Count: 1 (or more)
   - Premium: Yes/No
   - Ends At: Set a future date/time
2. Users enter on the **Giveaways** page
3. When ready, click **Draw** to randomly select winners
4. Accounts are automatically assigned to winners

### Monitoring

- **Admin → Overview**: See total users, stock levels, recent generations, low stock warnings
- **`/api/health`**: Returns database connectivity status (use for uptime monitoring)
- **PropellerAds Dashboard**: Check ad revenue, impressions, CPM rates

### Maintenance Mode

If you need to take the site down temporarily:
1. **Admin → Settings** → Enable **Maintenance Mode**
2. Users will see a maintenance page instead of the site
3. Admins can still access the site

---

## 8. Troubleshooting

### "There was a problem with the server configuration"

**Cause**: Missing or invalid `NEXTAUTH_SECRET`
**Fix**: Generate a new secret with `openssl rand -base64 32` and set it in Vercel env vars

### "Guild member check failed" / Login returns to homepage

**Cause**: Bot can't read server members
**Fix**:
1. Ensure **Server Members Intent** is enabled in Discord Developer Portal → Bot
2. Ensure the bot is IN your Discord server (invite it using the OAuth2 URL generator)
3. Ensure `DISCORD_GUILD_ID` is correct (right-click server → Copy ID)

### "The table does not exist" / Prisma errors

**Cause**: Database tables weren't created
**Fix**: 
1. In Vercel → Settings → Environment Variables, confirm `POSTGRES_PRISMA_URL` is set
2. Redeploy (the build script runs `prisma db push` automatically)
3. Or manually: go to Vercel → your deployment → run `npx prisma db push` in the build

### "No stock left for this service"

**Cause**: No accounts in the Account table for that service
**Fix**: Go to **Admin → Stock** and add accounts for that service

### Ads not showing

**Cause**: PropellerAds zone IDs not set or not approved yet
**Fix**:
1. Confirm `NEXT_PUBLIC_PROPELLER_ZONE_ID` is set in Vercel env vars
2. Confirm `NEXT_PUBLIC_AD_SLOT_ENABLED=true`
3. Wait for PropellerAds to approve your site (can take 24 hours)
4. If no zone ID is set, the ad overlay shows a placeholder countdown instead

### User can't see Admin panel

**Cause**: User doesn't have an admin role in Discord
**Fix**:
1. Confirm the user has one of the roles listed in `ADMIN_ROLE_IDS`
2. Confirm `ADMIN_ROLE_IDS` matches the actual Discord role IDs
3. Have the user log out and log back in (roles are checked on each login)

### Rate limit errors (429)

**Cause**: User is generating too fast
**Fix**: This is intentional — 10 generate requests per minute per user. Adjust in `app/api/generate/route.ts` if needed.

### Build fails on Vercel

**Cause**: Usually missing env vars or database connection issues
**Fix**:
1. Check Vercel build logs for the specific error
2. Ensure ALL required env vars are set
3. Ensure Neon Postgres is connected to the project
4. Try redeploying after fixing env vars

---

## Quick Reference: All URLs

| URL | Purpose |
|-----|---------|
| `/` | Landing page (public) |
| `/dashboard` | User dashboard (auth required) |
| `/services` | Generate accounts (auth required) |
| `/history` | Generation history (auth required) |
| `/giveaways` | Enter giveaways (auth required) |
| `/admin` | Admin overview (admin only) |
| `/admin/stock` | Manage stock (admin only) |
| `/admin/users` | Manage users (admin only) |
| `/admin/subscriptions` | Manage subscriptions (admin only) |
| `/admin/giveaways` | Manage giveaways (admin only) |
| `/admin/settings` | Site settings (admin only) |
| `/api/health` | Health check (public) |
| `/api/settings` | Site settings (public GET, admin POST) |
| `/api/generate` | Reserve an account (auth required) |
| `/api/generate/claim` | Claim after watching ad (auth required) |

---

## Security Checklist

- [ ] `NEXTAUTH_SECRET` is a strong random string (not "demo" or "secret")
- [ ] `DISCORD_BOT_TOKEN` is not exposed in client-side code
- [ ] `DISCORD_CLIENT_SECRET` is not exposed in client-side code
- [ ] Database URLs are only in server-side env vars
- [ ] Admin role IDs are correct and limited to trusted roles
- [ ] Rate limiting is active on generation endpoints
- [ ] Security headers are set (X-Frame-Options, etc.)
- [ ] `.env` file is in `.gitignore` (never commit secrets)
- [ ] PropellerAds zone IDs are `NEXT_PUBLIC_` (safe to expose — they're just ad zone identifiers)
