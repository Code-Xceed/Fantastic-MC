"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Shield, BarChart3, Package, Users, Crown, Gift, Settings } from "lucide-react";

const adminLinks = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/stock", label: "Stock", icon: Package },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: Crown },
  { href: "/admin/giveaways", label: "Giveaways", icon: Gift },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-52 shrink-0 space-y-1">
        <h2 className="flex items-center gap-2 text-lg font-bold mb-4">
          <Shield className="h-5 w-5" />
          Admin
        </h2>
        {adminLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
              pathname === link.href
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground"
            )}
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </Link>
        ))}
      </aside>

      {/* Mobile admin nav */}
      <div className="sticky top-16 z-30 -mx-4 flex gap-2 overflow-x-auto border-b bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        {adminLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent",
              pathname === link.href
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground"
            )}
          >
            <link.icon className="h-3 w-3" />
            {link.label}
          </Link>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
