import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname, origin } = req.nextUrl;
  const isProtected = pathname.startsWith("/admin") || pathname.startsWith("/secretary") || pathname.startsWith("/me");
  const hasToken = req.cookies.get("access_token");

  // If not logged in, block protected routes
  if (!hasToken && isProtected) {
    const url = new URL("/login", origin);
    return NextResponse.redirect(url);
  }

  // If already logged in, avoid showing the login page
  if (hasToken && pathname === "/login") {
    const url = new URL("/me", origin);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/me",
    "/admin/:path*",
    "/secretary/:path*",
  ],
};
