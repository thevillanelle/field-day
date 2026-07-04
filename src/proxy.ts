import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/games", "/api/auth"];

export function proxy(req: NextRequest & { auth: unknown }) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (!isPublic && !req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Wrap with NextAuth so req.auth is populated
export default auth(proxy as Parameters<typeof auth>[0]);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
