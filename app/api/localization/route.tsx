import { NextResponse } from "next/server";
import { getLocalization } from "../../utils/getLocalization"; // Import centralized function

export async function GET() {
  try {
    const jsonData = getLocalization(); // Use getLocalization.ts
    const response = NextResponse.json(jsonData);
    response.headers.set(
      "Cache-Control",
      "public, max-age=300, s-maxage=600, stale-while-revalidate=1800",
    );
    return response;
  } catch (error) {
    console.error("Error loading localization file:", error);
    return NextResponse.json({ error: "Failed to load localization file" }, { status: 500 });
  }
}
