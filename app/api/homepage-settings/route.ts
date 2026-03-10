import { NextResponse } from "next/server";
import { getHomepageVisibilityState } from "../../lib/homepageSettingsRepository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getHomepageVisibilityState();
    return NextResponse.json(settings, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("PUBLIC HOMEPAGE SETTINGS GET ERROR:", error);
    return NextResponse.json(
      { error: "Read failed", message: "Не удалось загрузить настройки главной." },
      { status: 500 },
    );
  }
}
