"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import {
  isNewArrivalProduct,
  isPromoProduct,
} from "../utils/productShowcase";

const CLIENT_PRODUCTS_CACHE_TTL_MS = 5 * 60_000;
const CLIENT_PRODUCTS_CACHE_KEY = "catalog_products_cache_v2";
let cachedProducts: DTProduct[] | null = null;
let cacheExpiresAt = 0;
let pendingProductsRequest: Promise<DTProduct[]> | null = null;

function readProductsFromSessionCache(): DTProduct[] | null {
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

async function loadProductsFromApi(): Promise<DTProduct[]> {
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

  pendingProductsRequest = fetch("/api/products", { cache: "force-cache" })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`Failed to load products (${res.status})`);
      }
      const data = await res.json();
      return Array.isArray(data) ? (data as DTProduct[]) : [];
    })
    .then((products) => {
      const expiresAt = Date.now() + CLIENT_PRODUCTS_CACHE_TTL_MS;
      cachedProducts = products;
      cacheExpiresAt = expiresAt;
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
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: string) => void;
  setSpecialFilter: (filter: "all" | "new" | "promo") => void;
  setSortBy: (sort: string) => void;
}

// Create context with default values
const ProductContext = createContext<ProductContextType | undefined>(undefined);

// Context provider component
export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<DTProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [specialFilter, setSpecialFilter] = useState<"all" | "new" | "promo">(
    "all",
  );
  const [sortBy, setSortBy] = useState<string>("name");

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
        product.ProductCategories.forEach((category) =>
          categoriesSet.add(category),
        );
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
