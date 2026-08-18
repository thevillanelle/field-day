import { NextResponse } from "next/server";

export function GET(req: Request) {
  if (process.env.NEXT_PUBLIC_DEV_BYPASS !== "true") {
    return NextResponse.json({ error: "not available" }, { status: 403 });
  }
  const origin = new URL(req.url).origin;
  const res = NextResponse.redirect(`${origin}/dashboard`);
  res.cookies.set("dev_preview", "1", {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return res;
}
