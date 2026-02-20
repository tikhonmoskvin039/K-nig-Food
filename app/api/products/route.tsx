// app/api/products/route.ts
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import getProducts from "../../utils/getProducts";

/**
 * GET /api/products
 * Optionally pass ?slug=someSlug to fetch a single product.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    const products = await getProducts();

    if (slug) {
      const product = products.find((p) => p.Slug === slug);
      if (!product) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 },
        );
      }
      return NextResponse.json(product); // возвращаем полностью
    } else {
      return NextResponse.json(products); // возвращаем все товары полностью
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
