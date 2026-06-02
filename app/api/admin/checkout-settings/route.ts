import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "../../../lib/adminAuth";
import {
  getCheckoutSettingsState,
  saveCheckoutSettingsState,
} from "../../../lib/checkoutSettingsRepository";
import type { CheckoutPoint } from "../../../types/checkoutSettings";

function isAuthenticated(req: NextRequest) {
  return Boolean(getAdminSessionFromRequest(req));
}

function parsePoint(raw: unknown, fieldName: string): CheckoutPoint | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const point = raw as Record<string, unknown>;
  const label = typeof point.label === "string" ? point.label.trim() : "";
  const query = typeof point.query === "string" ? point.query.trim() : "";
  const lat = Number(point.lat);
  const lng = Number(point.lng);

  if (!label || !query || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    console.error(`CHECKOUT SETTINGS VALIDATION: invalid ${fieldName} point`, raw);
    return null;
  }

  return { label, query, lat, lng };
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await getCheckoutSettingsState();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("CHECKOUT SETTINGS GET ERROR:", error);
    return NextResponse.json(
      {
        error: "Read failed",
        message: "Не удалось загрузить настройки checkout.",
      },
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
      deliveryEnabled?: unknown;
      originPoint?: unknown;
      pickupPoint?: unknown;
    };

    if (typeof payload.deliveryEnabled !== "boolean") {
      return NextResponse.json(
        {
          error: "Validation failed",
          message: "Поле deliveryEnabled должно быть boolean.",
        },
        { status: 400 },
      );
    }

    const originPoint = parsePoint(payload.originPoint, "originPoint");
    const pickupPoint = parsePoint(payload.pickupPoint, "pickupPoint");

    if (!originPoint || !pickupPoint) {
      return NextResponse.json(
        {
          error: "Validation failed",
          message:
            "Точки originPoint и pickupPoint должны содержать label/query (строки) и lat/lng (числа).",
        },
        { status: 400 },
      );
    }

    const saved = await saveCheckoutSettingsState({
      deliveryEnabled: payload.deliveryEnabled,
      originPoint,
      pickupPoint,
    });

    return NextResponse.json(saved);
  } catch (error) {
    console.error("CHECKOUT SETTINGS PUT ERROR:", error);
    return NextResponse.json(
      {
        error: "Update failed",
        message:
          error instanceof Error
            ? error.message
            : "Не удалось сохранить настройки checkout.",
      },
      { status: 500 },
    );
  }
}

