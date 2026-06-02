import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  signAdminSessionToken,
  verifyAdminPassword,
} from "../../../lib/adminAuthCore";
import { getAdminSessionCookieOptions } from "../../../lib/adminAuth";
import { getPrismaClient } from "../../../lib/prisma";

export const runtime = "nodejs";

const maxLoginPayloadBytes = 8 * 1024;
const loginWindowMs = 60 * 1000;
const maxFailedAttempts = 8;
const failedAttempts = new Map<string, { count: number; resetAt: number }>();

function getClientAddress(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (forwardedFor?.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(address: string) {
  const now = Date.now();
  const entry = failedAttempts.get(address);

  if (!entry || entry.resetAt <= now) {
    failedAttempts.set(address, { count: 0, resetAt: now + loginWindowMs });
    return false;
  }

  return entry.count >= maxFailedAttempts;
}

function recordFailedAttempt(address: string) {
  const now = Date.now();
  const entry = failedAttempts.get(address);

  if (!entry || entry.resetAt <= now) {
    failedAttempts.set(address, { count: 1, resetAt: now + loginWindowMs });
    return;
  }

  entry.count += 1;
}

function clearFailedAttempts(address: string) {
  failedAttempts.delete(address);
}

export async function POST(req: NextRequest) {
  const address = getClientAddress(req);

  if (isRateLimited(address)) {
    return NextResponse.json(
      {
        error: "Too many requests",
        message: "Слишком много попыток входа. Попробуйте позже.",
      },
      { status: 429 },
    );
  }

  let payload: { username?: unknown; password?: unknown };

  try {
    const rawBody = await req.text();

    if (Buffer.byteLength(rawBody, "utf8") > maxLoginPayloadBytes) {
      return NextResponse.json(
        {
          error: "Payload too large",
          message: "Слишком большой запрос авторизации.",
        },
        { status: 413 },
      );
    }

    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      {
        error: "Invalid request",
        message: "Некорректный запрос авторизации.",
      },
      { status: 400 },
    );
  }

  const username =
    typeof payload.username === "string" ? payload.username.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!username || !password) {
    return NextResponse.json(
      {
        error: "Invalid credentials",
        message: "Введите логин и пароль.",
      },
      { status: 400 },
    );
  }

  const prisma = getPrismaClient();
  const adminUser = await prisma.adminUser.findUnique({
    where: { username },
  });

  if (!adminUser || !verifyAdminPassword(password, adminUser.passwordHash)) {
    recordFailedAttempt(address);

    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "Неверный логин или пароль.",
      },
      { status: 401 },
    );
  }

  clearFailedAttempts(address);

  const sessionToken = signAdminSessionToken(adminUser.username);
  const response = NextResponse.json({
    authenticated: true,
    username: adminUser.username,
  });

  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    sessionToken,
    getAdminSessionCookieOptions(),
  );

  return response;
}
