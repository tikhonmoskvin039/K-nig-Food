import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  getHomepageVisibilityState,
  saveHomepageVisibilityState,
} from "../../../lib/homepageSettingsRepository";

async function isAuthenticated(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  return !!token;
}

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await getHomepageVisibilityState();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("HOMEPAGE SETTINGS GET ERROR:", error);
    return NextResponse.json(
      { error: "Read failed", message: "Не удалось загрузить настройки главной." },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await req.json()) as {
      recentProductsEnabled?: unknown;
      weeklyOffersEnabled?: unknown;
    };

    if (
      typeof payload.recentProductsEnabled !== "boolean" ||
      typeof payload.weeklyOffersEnabled !== "boolean"
    ) {
      return NextResponse.json(
        {
          error: "Validation failed",
          message:
            "Оба поля (recentProductsEnabled, weeklyOffersEnabled) должны быть boolean.",
        },
        { status: 400 },
      );
    }

    const saved = await saveHomepageVisibilityState({
      recentProductsEnabled: payload.recentProductsEnabled,
      weeklyOffersEnabled: payload.weeklyOffersEnabled,
    });

    return NextResponse.json(saved);
  } catch (error) {
    console.error("HOMEPAGE SETTINGS PUT ERROR:", error);
    return NextResponse.json(
      {
        error: "Update failed",
        message:
          error instanceof Error
            ? error.message
            : "Не удалось сохранить настройки главной.",
      },
      { status: 500 },
    );
  }
}
