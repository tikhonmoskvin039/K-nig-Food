import fs from "fs";
import path from "path";
import type { Product as DbProduct } from "@prisma/client";
import { getPrismaClient, resolveDatabaseUrl } from "./prisma";

const SORT_BY_UPDATED_DESC = [
  { updatedAt: "desc" as const },
  { createdAt: "desc" as const },
];
const DEFAULT_PRODUCT_IMAGE_URL = "/placeholder.png";
const LOCAL_UPLOADS_PREFIX = "/products/uploads/";
const MEDIA_API_PREFIX = "/api/media/";
const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

function toSafeString(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => toSafeString(item))
    .map((item) => item.trim())
    .filter(Boolean);
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function toNumber(value: unknown, fallback = 0): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeProduct(product: DTProduct): DTProduct {
  const now = new Date().toISOString();
  const regularPrice = toSafeString(product.RegularPrice).trim();
  const salePrice = toSafeString(product.SalePrice).trim();
  const newArrivalOrder = Math.max(0, Math.floor(toNumber(product.NewArrivalOrder, 0)));
  const isNewArrival = toBoolean(product.IsNewArrival, false) || newArrivalOrder > 0;

  return {
    ID: toSafeString(product.ID).trim(),
    Title: toSafeString(product.Title).trim(),
    Slug: toSafeString(product.Slug).trim().toLowerCase(),
    Enabled: toBoolean(product.Enabled, true),
    CatalogVisible: toBoolean(product.CatalogVisible, true),
    PortionWeight: Math.max(0, Math.floor(toNumber(product.PortionWeight, 0))),
    PortionUnit: toSafeString(product.PortionUnit).trim(),
    ProductCategories: toStringArray(product.ProductCategories),
    FeatureImageURL: toSafeString(product.FeatureImageURL).trim(),
    ProductImageGallery: toStringArray(product.ProductImageGallery),
    IsNewArrival: isNewArrival,
    NewArrivalOrder: isNewArrival ? newArrivalOrder : 0,
    ShortDescription: toSafeString(product.ShortDescription).trim(),
    LongDescription: toSafeString(product.LongDescription).trim(),
    RegularPrice: regularPrice,
    SalePrice: salePrice,
    Currency: toSafeString(product.Currency || "RUR").trim() || "RUR",
    CreatedAt: parseDate(product.CreatedAt)?.toISOString() ?? now,
    UpdatedAt: parseDate(product.UpdatedAt)?.toISOString() ?? now,
  };
}

function normalizeProducts(products: DTProduct[]) {
  return products.map(normalizeProduct);
}

function removeQueryAndHash(url: string) {
  return url.split("#")[0]?.split("?")[0] ?? url;
}

function ensureLeadingSlash(url: string) {
  if (!url) return "";
  return url.startsWith("/") ? url : `/${url}`;
}

function isExistingLocalPublicAsset(url: string) {
  const normalized = removeQueryAndHash(ensureLeadingSlash(url));
  const safeRelativePath = normalized.replace(/^\/+/, "");
  const absolutePath = path.join(process.cwd(), "public", safeRelativePath);
  return fs.existsSync(absolutePath);
}

function sanitizeImageUrl(url: unknown) {
  const raw = toSafeString(url).trim();
  if (!raw) return DEFAULT_PRODUCT_IMAGE_URL;

  if (raw.startsWith("data:image/")) {
    return DEFAULT_PRODUCT_IMAGE_URL;
  }

  if (ABSOLUTE_URL_PATTERN.test(raw)) {
    return raw;
  }

  const normalized = ensureLeadingSlash(raw);

  if (normalized.startsWith(MEDIA_API_PREFIX)) {
    return normalized;
  }

  if (normalized.startsWith(LOCAL_UPLOADS_PREFIX)) {
    return isExistingLocalPublicAsset(normalized)
      ? normalized
      : DEFAULT_PRODUCT_IMAGE_URL;
  }

  if (normalized.startsWith("/")) {
    return isExistingLocalPublicAsset(normalized)
      ? normalized
      : DEFAULT_PRODUCT_IMAGE_URL;
  }

  return DEFAULT_PRODUCT_IMAGE_URL;
}

function sanitizeImageGallery(gallery: unknown) {
  return toStringArray(gallery).map((url) => sanitizeImageUrl(url));
}

export function isDatabaseConfigured() {
  return Boolean(resolveDatabaseUrl());
}

function mapDbProductToDto(product: DbProduct): DTProduct {
  return {
    ID: product.id,
    Title: product.title,
    Slug: product.slug,
    Enabled: product.enabled,
    CatalogVisible: product.catalogVisible,
    PortionWeight: product.portionWeight,
    PortionUnit: product.portionUnit,
    ProductCategories: product.productCategories,
    FeatureImageURL: sanitizeImageUrl(product.featureImageUrl),
    ProductImageGallery: sanitizeImageGallery(product.productImageGallery),
    IsNewArrival: product.isNewArrival,
    NewArrivalOrder: product.newArrivalOrder,
    ShortDescription: product.shortDescription,
    LongDescription: product.longDescription,
    RegularPrice: product.regularPrice,
    SalePrice: product.salePrice,
    Currency: product.currency,
    CreatedAt: product.createdAt.toISOString(),
    UpdatedAt: product.updatedAt.toISOString(),
  };
}

function mapDtoToDbProduct(product: DTProduct) {
  const normalized = normalizeProduct(product);
  const now = new Date();

  return {
    id: normalized.ID,
    title: normalized.Title,
    slug: normalized.Slug,
    enabled: normalized.Enabled,
    catalogVisible: normalized.CatalogVisible,
    portionWeight: normalized.PortionWeight,
    portionUnit: normalized.PortionUnit,
    productCategories: normalized.ProductCategories,
    featureImageUrl: normalized.FeatureImageURL,
    productImageGallery: normalized.ProductImageGallery,
    isNewArrival: Boolean(normalized.IsNewArrival),
    newArrivalOrder: normalized.NewArrivalOrder || 0,
    shortDescription: normalized.ShortDescription,
    longDescription: normalized.LongDescription,
    regularPrice: normalized.RegularPrice,
    salePrice: normalized.SalePrice,
    currency: normalized.Currency || "RUR",
    createdAt: parseDate(normalized.CreatedAt) ?? now,
    updatedAt: parseDate(normalized.UpdatedAt) ?? now,
  };
}

async function readProductsFromDatabase(): Promise<DTProduct[]> {
  if (!isDatabaseConfigured()) {
    throw new Error(
      "DATABASE_URL не настроен. Каталог доступен только через БД.",
    );
  }

  try {
    const prisma = getPrismaClient();
    const products = await prisma.product.findMany({
      orderBy: SORT_BY_UPDATED_DESC,
    });

    return products.map(mapDbProductToDto);
  } catch (error) {
    console.error("Failed to read products from database:", error);
    throw error instanceof Error
      ? error
      : new Error("Не удалось получить товары из БД.");
  }
}

export async function getAllProductsForAdmin(): Promise<DTProduct[]> {
  return readProductsFromDatabase();
}

export async function getAllProductsFromDatabase(): Promise<DTProduct[]> {
  return readProductsFromDatabase();
}

export async function replaceAllProductsInDatabase(products: DTProduct[]) {
  if (!isDatabaseConfigured()) {
    throw new Error(
      "DATABASE_URL не настроен. Подключите PostgreSQL, чтобы сохранять каталог.",
    );
  }

  const prisma = getPrismaClient();
  const normalized = normalizeProducts(products);
  const dbProducts = normalized.map(mapDtoToDbProduct);

  await prisma.$transaction(async (tx) => {
    await tx.product.deleteMany();

    if (dbProducts.length > 0) {
      await tx.product.createMany({
        data: dbProducts,
      });
    }
  });
}

export function hasBase64Images(products: DTProduct[]) {
  return products.some((product) => {
    const featureImage = product.FeatureImageURL || "";
    if (featureImage.startsWith("data:image/")) {
      return true;
    }

    return (product.ProductImageGallery || []).some((url) =>
      String(url || "").startsWith("data:image/"),
    );
  });
}

export function validateProductsPayload(products: DTProduct[]): string | null {
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();

  for (const [index, product] of products.entries()) {
    const row = index + 1;
    const normalized = normalizeProduct(product);

    if (!normalized.ID) {
      return `Товар #${row}: отсутствует ID.`;
    }
    if (!normalized.Title) {
      return `Товар #${row}: отсутствует название.`;
    }
    if (!normalized.Slug) {
      return `Товар #${row}: отсутствует slug.`;
    }
    if (!/^[a-z0-9-]+$/.test(normalized.Slug)) {
      return `Товар #${row}: slug "${normalized.Slug}" содержит недопустимые символы.`;
    }
    if (!normalized.RegularPrice) {
      return `Товар #${row}: отсутствует стандартная цена.`;
    }
    if (normalized.PortionWeight <= 0) {
      return `Товар #${row}: вес/объём порции должен быть больше 0.`;
    }
    if (!normalized.PortionUnit) {
      return `Товар #${row}: отсутствует единица измерения.`;
    }
    if (!normalized.Currency) {
      return `Товар #${row}: отсутствует валюта.`;
    }
    if (normalized.ProductCategories.length === 0) {
      return `Товар #${row}: нужно указать хотя бы одну категорию.`;
    }
    if (!normalized.ShortDescription) {
      return `Товар #${row}: отсутствует краткое описание.`;
    }
    if (!normalized.LongDescription) {
      return `Товар #${row}: отсутствует полное описание.`;
    }
    if (!normalized.FeatureImageURL) {
      return `Товар #${row}: отсутствует главное изображение.`;
    }

    const regularPrice = Number(normalized.RegularPrice);
    const salePrice = Number(normalized.SalePrice);
    const hasSalePrice = normalized.SalePrice.trim() !== "";

    if (seenIds.has(normalized.ID)) {
      return `Товар #${row}: дублируется ID "${normalized.ID}".`;
    }
    seenIds.add(normalized.ID);

    if (seenSlugs.has(normalized.Slug)) {
      return `Товар #${row}: дублируется slug "${normalized.Slug}".`;
    }
    seenSlugs.add(normalized.Slug);

    if (
      hasSalePrice &&
      Number.isFinite(regularPrice) &&
      Number.isFinite(salePrice) &&
      salePrice === regularPrice
    ) {
      return `Товар #${row}: акционная цена должна отличаться от стандартной.`;
    }

    if (
      hasSalePrice &&
      Number.isFinite(regularPrice) &&
      Number.isFinite(salePrice) &&
      salePrice > regularPrice
    ) {
      return `Товар #${row}: акционная цена не может быть больше стандартной.`;
    }
  }

  return null;
}
