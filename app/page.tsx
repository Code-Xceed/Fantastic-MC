"use client";

import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdSlot } from "@/components/AdSlot";
import { GiveawayWinPopup } from "@/components/GiveawayWinPopup";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Gamepad2,
  Zap,
  Shield,
  Gift,
  Users,
  Clock,
  ArrowRight,
} from "lucide-react";
import { useEffect, useState } from "react";

// Dynamically import the 3D Hero component with SSR disabled
// This prevents Next.js from trying to render WebGL on the server
const Hero3D = dynamic(() => import("@/components/Hero3D").then((mod) => mod.Hero3D), { 
  ssr: false,
  loading: () => <div className="absolute inset-0 -z-10 h-[80vh] w-full bg-background/50 animate-pulse" />
});

interface ServiceStock {
  name: string;
  displayName: string;
  freeStock: number;
  premiumStock: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

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
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center relative"
      >
        <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20"></div>
        
        <h1 className="text-4xl font-extrabold tracking-tight">Welcome back, {session.user.name}!</h1>
        <p className="mt-3 text-lg text-muted-foreground max-w-md">
          Ready to generate more accounts? Head to your dashboard or jump straight into the services.
        </p>
        <div className="mt-8 flex gap-4">
          <Button size="lg" onClick={() => window.location.href = "/dashboard"}>
            Dashboard
          </Button>
          <Button size="lg" variant="secondary" onClick={() => window.location.href = "/services"}>
            Generate <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <GiveawayWinPopup />
      </motion.div>
    );
  }

  const totalStock = stock.reduce((a, s) => a + s.freeStock + s.premiumStock, 0);

  return (
    <div className="relative flex flex-col gap-24 pb-20 overflow-hidden">
      {/* 3D Interactive Hero Background */}
      <Hero3D />

      {/* Hero Content (Overlaid on 3D scene) */}
      <motion.section 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative flex flex-col items-center text-center pt-24 min-h-[60vh] justify-center z-20 pointer-events-none"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Badge variant="outline" className="mb-6 py-1.5 px-4 rounded-full border-primary/20 bg-background/80 backdrop-blur-md text-primary shadow-lg pointer-events-auto">
            <Zap className="mr-2 h-3.5 w-3.5" /> Free MC Accounts Available
          </Badge>
        </motion.div>
        
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tighter max-w-4xl leading-[1.1] drop-shadow-2xl">
          Get <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Minecraft</span> Alt Accounts
          <br />
          Instantly &amp; For Free
        </h1>
        <p className="mt-6 max-w-2xl text-xl text-foreground font-medium drop-shadow-lg backdrop-blur-[2px] bg-background/10 rounded-xl p-2">
          FMC Gen provides a seamless, instant way to get free and premium Minecraft alt accounts. Login with Discord and start generating.
        </p>

        <motion.div 
          className="mt-10 flex flex-col sm:flex-row gap-4 pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-1" onClick={() => signIn("discord")}>
            <Gamepad2 className="mr-2 h-5 w-5" />
            Login with Discord
          </Button>
          <Button size="lg" variant="secondary" className="h-14 px-8 text-lg rounded-full shadow-xl bg-background/80 backdrop-blur-md hover:bg-background transition-all hover:-translate-y-1" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
            Explore Features
          </Button>
        </motion.div>

        {totalStock > 0 && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 text-sm font-medium text-foreground drop-shadow-md bg-background/20 px-3 py-1 rounded-full backdrop-blur-md"
          >
            <span className="font-bold">{totalStock.toLocaleString()}</span>{" "}
            accounts currently in stock
          </motion.p>
        )}
      </motion.section>

      <div className="z-20">
        <AdSlot format="banner" />
      </div>

      {/* Features */}
      <motion.section 
        id="features" 
        className="max-w-6xl mx-auto w-full z-20 relative"
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
      >
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight">Why Choose FMC Gen?</h2>
          <p className="text-muted-foreground mt-2">Built for speed, reliability, and fairness.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
              title: "Daily Giveaways",
              desc: "Participate in automated giveaways for a chance to win premium accounts.",
            },
            {
              icon: Users,
              title: "Discord Integration",
              desc: "Seamless login with your Discord account. Roles synced automatically.",
            },
            {
              icon: Clock,
              title: "Fair Cooldowns",
              desc: "Role-based cooldown system ensures fair access for everyone in the community.",
            },
            {
              icon: Gamepad2,
              title: "Multiple Services",
              desc: "Not just Minecraft. Support for multiple game services with separate stock pools.",
            },
          ].map((f) => (
            <motion.div key={f.title} variants={itemVariants}>
              <Card className="h-full border-border/50 bg-background/50 backdrop-blur-sm hover:bg-accent/40 transition-colors">
                <CardContent className="flex flex-col gap-3 p-8">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <f.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mt-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Live stock preview */}
      {stock.length > 0 && (
        <motion.section 
          className="max-w-6xl mx-auto w-full z-20 relative"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold tracking-tight">Live Stock</h2>
            <div className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stock.map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="border-border/50 bg-card overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-5 border-b border-border/50 bg-muted/20">
                      <p className="font-semibold text-lg">{s.displayName || s.name}</p>
                    </div>
                    <div className="p-5 flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Free</span>
                        <Badge variant="secondary" className="font-mono">{s.freeStock}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Premium</span>
                        <Badge className="bg-primary/20 text-primary hover:bg-primary/30 font-mono border-0">{s.premiumStock}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* CTA */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="flex flex-col items-center text-center py-20 px-4 mt-10 rounded-3xl bg-primary/5 border border-primary/10 max-w-4xl mx-auto w-full z-20 relative"
      >
        <h2 className="text-4xl font-bold tracking-tight">Ready to get started?</h2>
        <p className="mt-4 text-lg text-muted-foreground max-w-lg">
          Join thousands of other users. Login to start generating accounts right away.
        </p>
        <Button size="lg" className="mt-8 h-14 px-8 text-lg rounded-full shadow-lg hover:-translate-y-1 transition-all" onClick={() => signIn("discord")}>
          <Gamepad2 className="mr-2 h-5 w-5" />
          Login with Discord
        </Button>
      </motion.section>
    </div>
  );
}
