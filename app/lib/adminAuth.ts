import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  verifyAdminSessionToken,
} from "./adminAuthCore";

type AdminTokenPayload = {
  sub: string;
  exp: number;
};

export type AdminSession = {
  username: string;
  expiresAt: number;
};

export function getAdminSessionFromToken(
  token: string | null | undefined,
): AdminSession | null {
  const payload = verifyAdminSessionToken(token) as AdminTokenPayload | null;

  if (!payload) {
    return null;
  }

  return {
    username: payload.sub,
    expiresAt: payload.exp,
  };
}

export function getAdminSessionFromRequest(req: NextRequest) {
  return getAdminSessionFromToken(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function getAdminSessionFromCookies() {
  const cookieStore = await cookies();
  return getAdminSessionFromToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export function getAdminSessionCookieOptions(maxAge = ADMIN_SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function getExpiredAdminSessionCookieOptions() {
  return getAdminSessionCookieOptions(0);
}
