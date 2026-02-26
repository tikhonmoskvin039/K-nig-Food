import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (pathname === "/admin/login") {
    if (token) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
