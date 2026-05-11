"use client";

import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdSlot } from "@/components/AdSlot";
import {
  Gamepad2,
  Zap,
  Shield,
  Gift,
  Users,
  Clock,
} from "lucide-react";
import { useEffect, useState } from "react";

interface ServiceStock {
  name: string;
  displayName: string;
  freeStock: number;
  premiumStock: number;
}

export default function Home() {
  const { data: session } = useSession();
  const [stock, setStock] = useState<ServiceStock[]>([]);

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((data) => setStock(data.services || []))
      .catch(() => {});
  }, []);

  if (session) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h1 className="text-3xl font-bold">Welcome back, {session.user.name}!</h1>
        <p className="mt-2 text-muted-foreground">
          Head to your dashboard or generate an account.
        </p>
        <div className="mt-6 flex gap-3">
          <Button onClick={() => window.location.href = "/dashboard"}>Dashboard</Button>
          <Button variant="outline" onClick={() => window.location.href = "/services"}>Generate</Button>
        </div>
      </div>
    );
  }

  const totalStock = stock.reduce((a, s) => a + s.freeStock + s.premiumStock, 0);

  return (
    <div className="flex flex-col gap-16 pb-20">
      {/* Hero */}
      <section className="flex flex-col items-center text-center pt-12">
        <Badge variant="secondary" className="mb-4">
          <Zap className="mr-1 h-3 w-3" /> Free MC Accounts
        </Badge>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight max-w-3xl">
          Get <span className="text-primary">Minecraft</span> Alt Accounts
          <br />
          Instantly &amp; For Free
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          FMC Gen provides free and premium Minecraft alt accounts. Login with
          Discord, pick a service, and generate — it&apos;s that simple.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Button size="lg" onClick={() => signIn("discord")}>
            <Gamepad2 className="mr-2 h-5 w-5" />
            Login with Discord
          </Button>
          <Button size="lg" variant="outline" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
            Learn More
          </Button>
        </div>

        {totalStock > 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{totalStock}</span>{" "}
            accounts currently in stock
          </p>
        )}
      </section>

      <AdSlot format="banner" />

      {/* Features */}
      <section id="features" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            icon: Zap,
            title: "Instant Generation",
            desc: "Click generate and get your account instantly. No waiting, no hassle.",
          },
          {
            icon: Shield,
            title: "Premium Tier",
            desc: "Faster cooldowns and premium-only stock with a premium subscription.",
          },
          {
            icon: Gift,
            title: "Giveaways",
            desc: "Participate in giveaways for a chance to win premium accounts.",
          },
          {
            icon: Users,
            title: "Discord Integrated",
            desc: "Login with your Discord account. Must be a server member to use.",
          },
          {
            icon: Clock,
            title: "Fair Cooldowns",
            desc: "Role-based cooldown system ensures fair access for everyone.",
          },
          {
            icon: Gamepad2,
            title: "Multiple Services",
            desc: "Support for multiple game services with separate stock pools.",
          },
        ].map((f) => (
          <Card key={f.title} className="border-border/50">
            <CardContent className="flex flex-col gap-2 p-6">
              <f.icon className="h-8 w-8 text-primary" />
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Live stock preview */}
      {stock.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4">Live Stock</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stock.map((s) => (
              <Card key={s.name} className="border-border/50">
                <CardContent className="p-4">
                  <p className="font-semibold">{s.displayName || s.name}</p>
                  <div className="mt-2 flex gap-2">
                    <Badge variant="secondary">Free: {s.freeStock}</Badge>
                    <Badge>Premium: {s.premiumStock}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="flex flex-col items-center text-center py-12">
        <h2 className="text-3xl font-bold">Ready to get started?</h2>
        <p className="mt-2 text-muted-foreground max-w-md">
          Join our Discord server and login to start generating accounts right away.
        </p>
        <Button size="lg" className="mt-6" onClick={() => signIn("discord")}>
          <Gamepad2 className="mr-2 h-5 w-5" />
          Login with Discord
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 pt-6 pb-4 text-center text-sm text-muted-foreground">
        <p>FMC Gen — Free MC Account Generator</p>
      </footer>
    </div>
  );
}
