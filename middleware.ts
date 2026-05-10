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
    pathname.startsWith("/api/auth");

  if (isPublic) return NextResponse.next();

  // Not logged in → redirect to landing
  if (!session) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Admin routes require admin role
  if (pathname.startsWith("/admin") && !session.isAdmin) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
