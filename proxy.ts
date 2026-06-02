import { NextRequest, NextResponse } from "next/server";

const ADMIN_SESSION_COOKIE = "knig_admin_session";
const DEV_ADMIN_AUTH_SECRET = "knig-food-dev-admin-auth-secret";

function getAdminAuthSecret() {
  const configuredSecret = process.env.ADMIN_AUTH_SECRET;

  if (configuredSecret) {
    return configuredSecret;
  }

  return process.env.NODE_ENV === "production" ? "" : DEV_ADMIN_AUTH_SECRET;
}

function base64UrlDecode(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");

  return atob(paddedBase64);
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function constantTimeEqual(value: string, expectedValue: string) {
  if (value.length !== expectedValue.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < value.length; index += 1) {
    mismatch |= value.charCodeAt(index) ^ expectedValue.charCodeAt(index);
  }

  return mismatch === 0;
}

async function verifyAdminSessionToken(token: string | undefined) {
  if (!token) {
    return false;
  }

  const [body, signature] = token.split(".");
  const secret = getAdminAuthSecret();

  if (!body || !signature || !secret) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expectedSignature = base64UrlEncode(
    new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))),
  );

  if (!constantTimeEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(body)) as {
      type?: unknown;
      sub?: unknown;
      exp?: unknown;
    };

    return (
      payload.type === "admin-session" &&
      typeof payload.sub === "string" &&
      typeof payload.exp === "number" &&
      payload.exp >= Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAuthenticated = await verifyAdminSessionToken(
    req.cookies.get(ADMIN_SESSION_COOKIE)?.value,
  );

  if (pathname === "/admin/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    return NextResponse.next();
  }

  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
