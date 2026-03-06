import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { VERCEL_FUNCTION_BODY_LIMIT_BYTES } from "../../../lib/payloadSize";
import {
  getAllProductsForAdmin,
  hasBase64Images,
  replaceAllProductsInDatabase,
  validateProductsPayload,
} from "../../../lib/productsRepository";

async function isAuthenticated(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  return !!token;
}

/*
========================
GET — list products
========================
*/
export async function GET(req: NextRequest) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const products = await getAllProductsForAdmin();
    return NextResponse.json(products);
  } catch (error: unknown) {
    console.error("PRODUCTS GET ERROR:", error);

    return NextResponse.json(
      {
        error: "Read failed",
        message:
          error instanceof Error ? error.message : "Getting products failed",
      },
      { status: 500 },
    );
  }
}

/*
========================
POST / PUT — rewrite catalog
========================
*/

export async function PUT(req: NextRequest) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const bodyText = await req.text();
    const bodyBytes = Buffer.byteLength(bodyText, "utf8");

    if (!bodyText.trim()) {
      return NextResponse.json(
        { error: "Update failed", message: "Empty request body" },
        { status: 400 },
      );
    }

    if (bodyBytes > VERCEL_FUNCTION_BODY_LIMIT_BYTES) {
      return NextResponse.json(
        {
          error: "Payload too large",
          message: `Request body is too large for Vercel Functions limit (${Math.round((VERCEL_FUNCTION_BODY_LIMIT_BYTES / 1024 / 1024) * 10) / 10} MB).`,
        },
        { status: 413 },
      );
    }

    let products: unknown;
    try {
      products = JSON.parse(bodyText);
    } catch {
      return NextResponse.json(
        { error: "", message: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    if (!Array.isArray(products)) {
      return NextResponse.json(
        {
          error: "Update failed",
          message: "Products payload must be an array",
        },
        { status: 400 },
      );
    }

    if (hasBase64Images(products as DTProduct[])) {
      return NextResponse.json(
        {
          error: "Update failed",
          message:
            "Обнаружены изображения в формате base64. Сначала загрузите изображения как файлы.",
        },
        { status: 400 },
      );
    }

    const normalizedProducts = products as DTProduct[];
    const validationError = validateProductsPayload(normalizedProducts);
    if (validationError) {
      return NextResponse.json(
        { error: "Update failed", message: validationError },
        { status: 400 },
      );
    }

    await replaceAllProductsInDatabase(normalizedProducts);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("PRODUCTS UPDATE ERROR:", error);

    return NextResponse.json(
      {
        error: "Update failed",
        message: error instanceof Error ? error.message : "Update failed",
      },
      { status: 500 },
    );
  }
}
