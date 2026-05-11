# FMC Gen — Free MC Account Generator

A production-grade Next.js web dashboard for distributing Minecraft alt accounts. Users authenticate via Discord OAuth (must be a server member), generate accounts from a web UI, and admins manage everything through a full admin panel. Free users watch a 30-second ad before each generation.

## Features

- **Discord OAuth** — Users must be in your Discord server to login
- **Account Generation** — Reserve/claim pattern with ad wall for free users
- **Ad Monetization** — PropellerAds integration; free users watch 30s ad, premium/admin skip
- **Free & Premium Tiers** — Separate stock pools, different cooldowns
- **Subscription System** — Time-based premium access managed by admins
- **Generation History** — Full tracking of which account went to whom
- **Giveaways** — Create giveaways, users enter, admins draw winners
- **Admin Panel** — Manage stock, users, subscriptions, giveaways, site settings
- **Site Settings** — Configure ad duration, maintenance mode, site name from admin UI
- **Health Check** — `/api/health` endpoint for monitoring
- **Dark Mode** — Built-in dark theme

## Quick Start

### 1. Set up Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to **OAuth2** → Add redirect: `http://localhost:3000/api/auth/callback/discord`
4. Copy **Client ID** and **Client Secret**
5. Go to **Bot** → Reset token, copy **Bot Token**
6. Enable all **Privileged Gateway Intents**
7. Go to **OAuth2** → URL Generator → Select `bot` + `applications.commands`
8. Invite the bot to your server

### 2. Set up PropellerAds (for ad monetization)

1. Sign up at [propellerads.com](https://propellerads.com)
2. Create a new site and get approved
3. Create an **Interstitial/Full-screen** ad zone → copy the Zone ID
4. Create a **Native/Banner** ad zone → copy the Zone ID
5. Add these to your `.env`:
   ```
   NEXT_PUBLIC_PROPELLER_ZONE_ID=your_interstitial_zone_id
   NEXT_PUBLIC_PROPELLER_BANNER_ZONE_ID=your_banner_zone_id
   NEXT_PUBLIC_AD_SLOT_ENABLED=true
   ```

### 3. Configure Environment

Copy `.env.example` to `.env` and fill in:

```env
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_server_id
ADMIN_ROLE_IDS=role_id_1,role_id_2
NEXTAUTH_SECRET=openssl_rand_base64_32
NEXTAUTH_URL=http://localhost:3000
```

### 4. Set up Database

For **Vercel deployment**: Add Vercel Postgres storage to your project. The `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING` will be set automatically.

For **local development**: Use any PostgreSQL database and set the URLs manually.

Then run:

```bash
npx prisma db push
```

### 5. Install & Run

```bash
npm install
npx prisma generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Deploy to Vercel

1. Push this repo to GitHub
2. Import in [Vercel](https://vercel.com)
3. Add Vercel Postgres storage (no prefix)
4. Set all environment variables from `.env.example`
5. Deploy — `prisma db push` runs automatically during build

## Project Structure

```
web/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── dashboard/page.tsx          # User dashboard
│   ├── services/page.tsx           # Generate accounts (with ad wall)
│   ├── history/page.tsx            # Generation history
│   ├── giveaways/page.tsx          # User giveaways
│   ├── admin/                      # Admin panel
│   │   ├── page.tsx                # Overview
│   │   ├── stock/page.tsx          # Stock management
│   │   ├── users/page.tsx          # User management
│   │   ├── subscriptions/page.tsx  # Subscription management
│   │   ├── giveaways/page.tsx      # Giveaway management
│   │   └── settings/page.tsx       # Site settings
│   └── api/                        # API routes
│       ├── generate/               # Reserve & claim endpoints
│       ├── health/                 # Health check
│       └── settings/               # Site settings API
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── Navbar.tsx
│   ├── AdSlot.tsx                  # Banner ad component
│   ├── AdOverlay.tsx               # Full-screen ad overlay (30s)
│   └── Providers.tsx
├── lib/
│   ├── auth.ts                     # NextAuth config (Discord only)
│   ├── db.ts                       # Prisma client
│   ├── gen-logic.ts                # Reserve/claim generation logic
│   └── utils.ts                    # Utility functions
├── prisma/
│   └── schema.prisma               # Database schema
└── middleware.ts                   # Auth guard
```

## How the Ad System Works

1. **Free user** clicks "Watch Ad & Generate"
2. Backend reserves an account and returns a **claim token**
3. Frontend shows a **30-second ad overlay** (PropellerAds interstitial)
4. After 30s, user clicks "Claim Your Account"
5. Frontend sends the claim token → backend delivers the account
6. **Premium users and admins** skip the ad entirely — instant generation

## Admin Guide

### Adding Stock

1. Go to **Admin → Stock**
2. Enter service name (e.g. `minecraft`)
3. Paste account combos (one per line: `email:password`) or upload a `.txt` file
4. Select Free or Premium tier
5. Click **Add Stock**

### Managing Users

- **Admin → Users**: Search users, view details, toggle blacklist, set notes, manage cooldowns
- **Admin → Subscriptions**: Add/set/remove premium time, mass-extend all premiums

### Giveaways

1. **Admin → Giveaways → Create**: Set title, service, account count, end time
2. Users enter the giveaway on the Giveaways page
3. When ready, click **Draw** to randomly pick winners and assign accounts

### Site Settings

- **Admin → Settings**: Configure ad duration, enable/disable ads, set site name, toggle maintenance mode

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DISCORD_CLIENT_ID` | Discord OAuth client ID |
| `DISCORD_CLIENT_SECRET` | Discord OAuth client secret |
| `DISCORD_BOT_TOKEN` | Bot token (for guild membership check) |
| `DISCORD_GUILD_ID` | Your Discord server ID |
| `ADMIN_ROLE_IDS` | Comma-separated role IDs for admin access |
| `NEXTAUTH_SECRET` | Random secret for JWT signing |
| `NEXTAUTH_URL` | Your site URL |
| `POSTGRES_PRISMA_URL` | Prisma connection URL (auto-set by Vercel) |
| `POSTGRES_URL_NON_POOLING` | Direct DB URL (auto-set by Vercel) |
| `DEFAULT_FREE_COOLDOWN` | Default free cooldown in seconds (default: 600) |
| `DEFAULT_PREMIUM_COOLDOWN` | Default premium cooldown in seconds (default: 60) |
| `ROLE_CONFIG` | JSON array of role cooldown configs |
| `NEXT_PUBLIC_PROPELLER_ZONE_ID` | PropellerAds interstitial zone ID |
| `NEXT_PUBLIC_PROPELLER_BANNER_ZONE_ID` | PropellerAds banner zone ID |
| `NEXT_PUBLIC_AD_SLOT_ENABLED` | Enable ad slots (true/false) |
