const CATALOG_PRODUCTS_CACHE_KEY = "catalog_products_cache_v3";
const CATALOG_PRODUCTS_REVISION_KEY = "catalog_products_revision_v1";

function safeReadNumber(value: string | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getCatalogProductsCacheKey() {
  return CATALOG_PRODUCTS_CACHE_KEY;
}

export function getCatalogProductsRevision(): number {
  if (typeof window === "undefined") return 0;

  try {
    return safeReadNumber(localStorage.getItem(CATALOG_PRODUCTS_REVISION_KEY));
  } catch {
    return 0;
  }
}

export function invalidateCatalogProductsCache() {
  if (typeof window === "undefined") return;

  const now = Date.now();

  try {
    localStorage.setItem(CATALOG_PRODUCTS_REVISION_KEY, String(now));
  } catch {
    // ignore storage errors
  }

  try {
    sessionStorage.removeItem(CATALOG_PRODUCTS_CACHE_KEY);
  } catch {
    // ignore storage errors
  }
}
