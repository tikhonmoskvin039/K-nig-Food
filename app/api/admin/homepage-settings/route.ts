import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "../../../lib/adminAuth";
import {
  getHomepageVisibilityState,
  saveHomepageVisibilityState,
} from "../../../lib/homepageSettingsRepository";

function isAuthenticated(req: NextRequest) {
  return Boolean(getAdminSessionFromRequest(req));
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
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
  if (!isAuthenticated(req)) {
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
