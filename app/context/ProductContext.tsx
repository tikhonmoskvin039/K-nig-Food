"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

const CLIENT_PRODUCTS_CACHE_TTL_MS = 30_000;
let cachedProducts: DTProduct[] | null = null;
let cacheExpiresAt = 0;
let pendingProductsRequest: Promise<DTProduct[]> | null = null;

async function loadProductsFromApi(): Promise<DTProduct[]> {
  const now = Date.now();

  if (cachedProducts && now < cacheExpiresAt) {
    return cachedProducts;
  }

  if (pendingProductsRequest) {
    return pendingProductsRequest;
  }

  pendingProductsRequest = fetch("/api/products")
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`Failed to load products (${res.status})`);
      }
      const data = await res.json();
      return Array.isArray(data) ? (data as DTProduct[]) : [];
    })
    .then((products) => {
      cachedProducts = products;
      cacheExpiresAt = Date.now() + CLIENT_PRODUCTS_CACHE_TTL_MS;
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
  setFilteredProducts: (products: DTProduct[]) => void;
  categories: string[];
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: string) => void;
  setSortBy: (sort: string) => void;
}

// Create context with default values
const ProductContext = createContext<ProductContextType | undefined>(undefined);

// Context provider component
export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<DTProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<DTProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState<string>("name");

  useEffect(() => {
    let isCancelled = false;

    loadProductsFromApi()
      .then((productsArray) => {
        if (isCancelled) return;

        setProducts(productsArray);
        setFilteredProducts(productsArray);

        // Собираем категории только из массивов
        const categoriesSet = new Set<string>();
        productsArray.forEach((p) => {
          if (Array.isArray(p.ProductCategories)) {
            p.ProductCategories.forEach((cat) => categoriesSet.add(cat));
          }
        });

        setCategories([...categoriesSet].sort());
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

  useEffect(() => {
    let updatedProducts = [...products];

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

    updatedProducts.sort((a, b) => {
      if (sortBy === "price")
        return parseFloat(a.SalePrice) - parseFloat(b.SalePrice);
      if (sortBy === "newest") return b.ID.localeCompare(a.ID);
      return a.Title.localeCompare(b.Title);
    });

    setFilteredProducts(updatedProducts);
  }, [searchQuery, categoryFilter, sortBy, products]);

  return (
    <ProductContext.Provider
      value={{
        products,
        filteredProducts,
        isLoading,
        setFilteredProducts,
        categories,
        setSearchQuery,
        setCategoryFilter,
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
