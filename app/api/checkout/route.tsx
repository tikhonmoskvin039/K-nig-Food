import { NextResponse } from "next/server";
import { getCheckoutSettings } from "../../utils/getCheckout"; // Use centralized utility

export async function GET() {
  try {
    const checkoutData = await getCheckoutSettings(); // Fetch settings from DB or fallback config
    return NextResponse.json(checkoutData);
  } catch (error) {
    console.error("Error loading checkout file:", error);
    return NextResponse.json({ error: "Failed to load checkout file" }, { status: 500 });
  }
}
