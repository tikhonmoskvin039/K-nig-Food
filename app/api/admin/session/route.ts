import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  signAdminSessionToken,
  verifyAdminLoginToken,
} from "../../../lib/adminAuthCore";
import {
  getAdminSessionCookieOptions,
  getAdminSessionFromRequest,
  getExpiredAdminSessionCookieOptions,
} from "../../../lib/adminAuth";

export const runtime = "nodejs";

type LoginTokenPayload = {
  sub: string;
};

export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);

  return NextResponse.json({
    authenticated: Boolean(session),
    username: session?.username ?? null,
    expiresAt: session?.expiresAt ?? null,
  });
}

export async function POST(req: NextRequest) {
  let payload: { loginToken?: unknown };

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request", message: "Некорректный запрос авторизации." },
      { status: 400 },
    );
  }

  const loginToken =
    typeof payload.loginToken === "string" ? payload.loginToken : "";
  const tokenPayload = verifyAdminLoginToken(loginToken) as LoginTokenPayload | null;

  if (!tokenPayload) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Сессия входа истекла." },
      { status: 401 },
    );
  }

  const sessionToken = signAdminSessionToken(tokenPayload.sub);
  const response = NextResponse.json({
    authenticated: true,
    username: tokenPayload.sub,
  });

  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    sessionToken,
    getAdminSessionCookieOptions(),
  );

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });

  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    "",
    getExpiredAdminSessionCookieOptions(),
  );

  return response;
}
