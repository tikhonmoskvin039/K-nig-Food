/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const products = require("../configs/products.json");

const prisma = new PrismaClient();

function parseDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeProduct(product) {
  const now = new Date();

  return {
    id: String(product.ID || ""),
    title: String(product.Title || ""),
    slug: String(product.Slug || ""),
    enabled: Boolean(product.Enabled),
    catalogVisible: Boolean(product.CatalogVisible),
    portionWeight: Number(product.PortionWeight) || 0,
    portionUnit: String(product.PortionUnit || ""),
    productCategories: Array.isArray(product.ProductCategories)
      ? product.ProductCategories.map((category) => String(category))
      : [],
    featureImageUrl: String(product.FeatureImageURL || ""),
    productImageGallery: Array.isArray(product.ProductImageGallery)
      ? product.ProductImageGallery.map((url) => String(url))
      : [],
    isNewArrival:
      Boolean(product.IsNewArrival) ||
      (Number(product.NewArrivalOrder) || 0) > 0,
    newArrivalOrder: Number(product.NewArrivalOrder) || 0,
    shortDescription: String(product.ShortDescription || ""),
    longDescription: String(product.LongDescription || ""),
    regularPrice: String(product.RegularPrice || ""),
    salePrice: String(product.SalePrice || ""),
    currency: String(product.Currency || "RUR"),
    createdAt: parseDate(product.CreatedAt) || now,
    updatedAt: parseDate(product.UpdatedAt) || now,
  };
}

async function main() {
  if (!Array.isArray(products) || products.length === 0) {
    console.log("Skip seed: configs/products.json is empty.");
    return;
  }

  const existingCount = await prisma.product.count();
  if (existingCount > 0) {
    console.log(`Skip seed: products already exist (${existingCount}).`);
    return;
  }

  const normalizedProducts = products.map(normalizeProduct);
  await prisma.product.createMany({
    data: normalizedProducts,
    skipDuplicates: true,
  });

  console.log(`Seeded products: ${normalizedProducts.length}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
