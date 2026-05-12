"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gamepad2,
  LayoutDashboard,
  Server,
  History,
  Gift,
  Shield,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/services", label: "Services", icon: Server },
  { href: "/history", label: "History", icon: History },
  { href: "/giveaways", label: "Giveaways", icon: Gift },
];

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadWins, setUnreadWins] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch unread giveaway wins count
  useEffect(() => {
    if (session?.user?.id) {
      const loadUnreadWins = () => {
        fetch("/api/user/wins")
          .then((r) => r.json())
          .then((data) => setUnreadWins(data.wins?.length || 0))
          .catch(() => {});
      };
      loadUnreadWins();
      const timer = window.setInterval(loadUnreadWins, 30_000);
      return () => window.clearInterval(timer);
    }
  }, [session]);

  return (
    <header 
      className={cn(
        "fixed top-0 inset-x-0 z-50 w-full transition-all duration-300",
        scrolled 
          ? "border-b border-border/40 bg-background/70 backdrop-blur-xl shadow-sm" 
          : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-primary/10 p-1.5 rounded-lg group-hover:bg-primary/20 transition-colors">
            <Gamepad2 className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold tracking-tight text-lg">FMC Gen</span>
        </Link>

        {session && (
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors hover:text-foreground",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute inset-0 rounded-full bg-accent -z-10"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <link.icon className="h-4 w-4" />
                  {link.label}
                  {link.href === "/giveaways" && unreadWins > 0 && (
                    <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">
                      {unreadWins}
                    </span>
                  )}
                </Link>
              );
            })}
            {session.isAdmin && (
              <Link
                href="/admin"
                className={cn(
                  "relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors hover:text-foreground",
                  pathname?.startsWith("/admin") ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {pathname?.startsWith("/admin") && (
                  <motion.div
                    layoutId="navbar-indicator"
                    className="absolute inset-0 rounded-full bg-accent -z-10"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="relative flex h-9 w-9 items-center justify-center rounded-full hover:ring-2 hover:ring-primary/20 transition-all outline-none">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {session.user.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-xl">
                <div className="flex items-center gap-3 p-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={session.user.image || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {session.user.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-medium leading-none">{session.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.isAdmin ? "Administrator" : "Member"}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <Link href="/dashboard" className="block">
                  <DropdownMenuItem className="cursor-pointer rounded-md">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                </Link>
                {session.isAdmin && (
                  <Link href="/admin" className="block">
                    <DropdownMenuItem className="cursor-pointer rounded-md">
                      <Shield className="mr-2 h-4 w-4" />
                      Admin Panel
                    </DropdownMenuItem>
                  </Link>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer rounded-md text-red-500 focus:text-red-500 focus:bg-red-500/10">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => signIn("discord")} size="sm" className="rounded-full px-5">
              Login
            </Button>
          )}

          {session && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-full"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {session && mobileOpen && (
          <motion.nav 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-border/40 bg-background/95 backdrop-blur-xl"
          >
            <div className="px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <link.icon className="h-5 w-5" />
                  {link.label}
                  {link.href === "/giveaways" && unreadWins > 0 && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white font-bold">
                      {unreadWins}
                    </span>
                  )}
                </Link>
              ))}
              {session.isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                    pathname?.startsWith("/admin")
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Shield className="h-5 w-5" />
                  Admin
                </Link>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
