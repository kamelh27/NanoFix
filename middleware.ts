import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Protect specific routes by requiring an auth cookie
const PROTECTED_PATHS = [
  "/dashboard",
  "/clients",
  "/devices",
  "/inventory",
  "/invoices",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get("auth_token")?.value;
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/clients/:path*",
    "/devices/:path*",
    "/inventory/:path*",
    "/invoices/:path*",
  ],
};
