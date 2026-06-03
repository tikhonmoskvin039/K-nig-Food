"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import {
  isNewArrivalProduct,
  isPromoProduct,
} from "../utils/productShowcase";
import {
  getCatalogProductsCacheKey,
  getCatalogProductsRevision,
} from "../utils/catalogProductsCache";

const CLIENT_PRODUCTS_CACHE_TTL_MS = 5 * 60_000;
const CLIENT_PRODUCTS_CACHE_KEY = getCatalogProductsCacheKey();
const PRODUCT_FILTERS_STORAGE_KEY = "catalog_product_filters_v1";
const SHOULD_CACHE_CLIENT_PRODUCTS = process.env.NODE_ENV !== "development";
let cachedProducts: DTProduct[] | null = null;
let cacheExpiresAt = 0;
let pendingProductsRequest: Promise<DTProduct[]> | null = null;
let knownCatalogRevision = 0;

type CatalogSpecialFilter = "all" | "new" | "promo";

type CatalogFiltersState = {
  searchQuery: string;
  categoryFilter: string;
  specialFilter: CatalogSpecialFilter;
  sortBy: string;
};

const DEFAULT_CATALOG_FILTERS: CatalogFiltersState = {
  searchQuery: "",
  categoryFilter: "",
  specialFilter: "all",
  sortBy: "name",
};

function isCatalogSpecialFilter(value: unknown): value is CatalogSpecialFilter {
  return value === "all" || value === "new" || value === "promo";
}

function readCatalogFilters(): CatalogFiltersState {
  if (typeof window === "undefined") return DEFAULT_CATALOG_FILTERS;

  try {
    const raw = window.localStorage.getItem(PRODUCT_FILTERS_STORAGE_KEY);
    if (!raw) return DEFAULT_CATALOG_FILTERS;

    const parsed = JSON.parse(raw) as Partial<CatalogFiltersState>;

    return {
      searchQuery:
        typeof parsed.searchQuery === "string"
          ? parsed.searchQuery
          : DEFAULT_CATALOG_FILTERS.searchQuery,
      categoryFilter:
        typeof parsed.categoryFilter === "string"
          ? parsed.categoryFilter
          : DEFAULT_CATALOG_FILTERS.categoryFilter,
      specialFilter: isCatalogSpecialFilter(parsed.specialFilter)
        ? parsed.specialFilter
        : DEFAULT_CATALOG_FILTERS.specialFilter,
      sortBy:
        typeof parsed.sortBy === "string"
          ? parsed.sortBy
          : DEFAULT_CATALOG_FILTERS.sortBy,
    };
  } catch {
    return DEFAULT_CATALOG_FILTERS;
  }
}

function resetInMemoryProductsCache() {
  cachedProducts = null;
  cacheExpiresAt = 0;
}

function syncWithCatalogRevision() {
  if (!SHOULD_CACHE_CLIENT_PRODUCTS) return;
  if (typeof window === "undefined") return;

  const revision = getCatalogProductsRevision();
  if (revision <= knownCatalogRevision) return;

  knownCatalogRevision = revision;
  resetInMemoryProductsCache();

  try {
    window.sessionStorage.removeItem(CLIENT_PRODUCTS_CACHE_KEY);
  } catch {
    // ignore storage errors
  }
}

function readProductsFromSessionCache(): DTProduct[] | null {
  if (!SHOULD_CACHE_CLIENT_PRODUCTS) return null;
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(CLIENT_PRODUCTS_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      expiresAt?: number;
      products?: DTProduct[];
    };

    if (
      !parsed ||
      !Array.isArray(parsed.products) ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }

    if (Date.now() >= parsed.expiresAt) {
      window.sessionStorage.removeItem(CLIENT_PRODUCTS_CACHE_KEY);
      return null;
    }

    return parsed.products;
  } catch {
    return null;
  }
}

function writeProductsToSessionCache(products: DTProduct[], expiresAt: number) {
  if (!SHOULD_CACHE_CLIENT_PRODUCTS) return;
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      CLIENT_PRODUCTS_CACHE_KEY,
      JSON.stringify({
        expiresAt,
        products,
      }),
    );
  } catch {
    // ignore storage errors
  }
}

async function fetchProductsFromApi(): Promise<DTProduct[]> {
  const res = await fetch("/api/products", { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Failed to load products (${res.status})`);
  }

  const data = await res.json();
  return Array.isArray(data) ? (data as DTProduct[]) : [];
}

async function loadProductsFromApi(): Promise<DTProduct[]> {
  if (!SHOULD_CACHE_CLIENT_PRODUCTS) {
    resetInMemoryProductsCache();

    try {
      window.sessionStorage.removeItem(CLIENT_PRODUCTS_CACHE_KEY);
    } catch {
      // ignore storage errors
    }

    return fetchProductsFromApi();
  }

  syncWithCatalogRevision();

  const now = Date.now();

  if (cachedProducts && now < cacheExpiresAt) {
    return cachedProducts;
  }

  const sessionCachedProducts = readProductsFromSessionCache();
  if (sessionCachedProducts) {
    cachedProducts = sessionCachedProducts;
    cacheExpiresAt = now + CLIENT_PRODUCTS_CACHE_TTL_MS;
    return sessionCachedProducts;
  }

  if (pendingProductsRequest) {
    return pendingProductsRequest;
  }

  pendingProductsRequest = fetchProductsFromApi()
    .then((products) => {
      const expiresAt = Date.now() + CLIENT_PRODUCTS_CACHE_TTL_MS;
      cachedProducts = products;
      cacheExpiresAt = expiresAt;
      knownCatalogRevision = Math.max(
        knownCatalogRevision,
        getCatalogProductsRevision(),
      );
      writeProductsToSessionCache(products, expiresAt);
      return products;
    })
    .finally(() => {
      pendingProductsRequest = null;
    });

  return pendingProductsRequest;
}

// Define context type
interface ProductContextType {
  products: DTProduct[];
  filteredProducts: DTProduct[];
  isLoading: boolean;
  categories: string[];
  searchQuery: string;
  categoryFilter: string;
  specialFilter: CatalogSpecialFilter;
  sortBy: string;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: string) => void;
  setSpecialFilter: (filter: CatalogSpecialFilter) => void;
  setSortBy: (sort: string) => void;
}

// Create context with default values
const ProductContext = createContext<ProductContextType | undefined>(undefined);

// Context provider component
export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<DTProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<CatalogFiltersState>(
    readCatalogFilters,
  );
  const { searchQuery, categoryFilter, specialFilter, sortBy } = filters;

  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const setCategoryFilter = useCallback((category: string) => {
    setFilters((prev) => ({ ...prev, categoryFilter: category }));
  }, []);

  const setSpecialFilter = useCallback((filter: CatalogSpecialFilter) => {
    setFilters((prev) => ({ ...prev, specialFilter: filter }));
  }, []);

  const setSortBy = useCallback((sort: string) => {
    setFilters((prev) => ({ ...prev, sortBy: sort }));
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        PRODUCT_FILTERS_STORAGE_KEY,
        JSON.stringify(filters),
      );
    } catch {
      // ignore storage errors
    }
  }, [filters]);

  useEffect(() => {
    let isCancelled = false;

    loadProductsFromApi()
      .then((productsArray) => {
        if (isCancelled) return;

        setProducts(productsArray);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error("Failed to load products", err);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    let updatedProducts = [...products];
    const getSortPrice = (product: DTProduct) => {
      const regularPrice = Number(product.RegularPrice);
      const salePrice = Number(product.SalePrice);
      if (
        Number.isFinite(regularPrice) &&
        Number.isFinite(salePrice) &&
        salePrice > 0 &&
        salePrice < regularPrice
      ) {
        return salePrice;
      }
      return Number.isFinite(regularPrice) ? regularPrice : 0;
    };

    if (searchQuery) {
      updatedProducts = updatedProducts.filter((product) =>
        product.Title.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (categoryFilter) {
      updatedProducts = updatedProducts.filter((product) =>
        product.ProductCategories.includes(categoryFilter),
      );
    }

    if (specialFilter === "new") {
      updatedProducts = updatedProducts.filter(isNewArrivalProduct);
    }

    if (specialFilter === "promo") {
      updatedProducts = updatedProducts.filter(isPromoProduct);
    }

    updatedProducts.sort((a, b) => {
      if (sortBy === "price") return getSortPrice(a) - getSortPrice(b);
      if (sortBy === "newest") return b.ID.localeCompare(a.ID);
      return a.Title.localeCompare(b.Title);
    });

    return updatedProducts;
  }, [searchQuery, categoryFilter, specialFilter, sortBy, products]);

  const categories = useMemo(() => {
    const categoriesSet = new Set<string>();
    products.forEach((product) => {
      if (Array.isArray(product.ProductCategories)) {
        product.ProductCategories.forEach((category) => {
          const normalized = String(category || "").trim();
          if (!normalized) return;
          categoriesSet.add(normalized);
        });
      }
    });

    return [...categoriesSet].sort();
  }, [products]);

  return (
    <ProductContext.Provider
      value={{
        products,
        filteredProducts,
        isLoading,
        categories,
        searchQuery,
        categoryFilter,
        specialFilter,
        sortBy,
        setSearchQuery,
        setCategoryFilter,
        setSpecialFilter,
        setSortBy,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
}

// Custom hook to use the product context
export function useProductContext() {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error("useProductContext must be used within a ProductProvider");
  }
  return context;
}
