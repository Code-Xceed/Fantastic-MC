import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Public routes
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/api/services") ||
    pathname.startsWith("/api/giveaways") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/settings");

  if (isPublic) return NextResponse.next();

  // Not logged in → redirect to landing
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Admin routes require admin role — return 404 to hide existence
  if ((pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) && !session.isAdmin) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.rewrite(new URL("/not-found", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
