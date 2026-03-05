"use client";

import { useState } from "react";
import Link from "next/link";
import ProductCard from "./ProductCard";
import ProductFilters from "./ProductFilters";
import { useProductContext } from "../../context/ProductContext";
import { useLocalization } from "../../context/LocalizationContext";
import GlobalLoader from "../GlobalLoader";

interface ProductGridProps {
  pageSize?: number;
}

export default function ProductGrid({ pageSize = 18 }: ProductGridProps) {
  const {
    filteredProducts,
    isLoading,
    categories,
    setSearchQuery,
    setCategoryFilter,
    setSpecialFilter,
    setSortBy,
  } = useProductContext();
  const { labels } = useLocalization();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate total pages
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const safeCurrentPage =
    totalPages > 0 ? Math.min(currentPage, totalPages) : currentPage;

  // Get products for the current page
  const displayedProducts = filteredProducts.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize,
  );

  return (
    <div>
      {/* Product Filters */}
      <ProductFilters
        setSearchQuery={setSearchQuery}
        setCategoryFilter={setCategoryFilter}
        setSpecialFilter={setSpecialFilter}
        setSortBy={setSortBy}
        categories={categories}
      />

      {/* Product Grid */}
      <div className="mt-6 min-h-[calc(100vh-var(--header-height-plus-top-section-height))]">
        {isLoading ? (
          <GlobalLoader mode="inline" className="h-full min-h-[320px]" />
        ) : displayedProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {displayedProducts.map((product) => (
              <ProductCard key={product.ID} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-center px-4">
            <div className="surface-card-soft max-w-2xl w-full px-6 py-8 md:px-8 md:py-10">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xl font-bold">
                ?
              </div>
              <p className="text-gray-800 font-semibold text-xl md:text-2xl">
                {labels.noProductsFound || "Товары не найдены..."}
              </p>
              <p className="mt-2 text-sm md:text-base text-slate-600">
                {labels.noProductsHint ||
                  "Скоро здесь появятся новые позиции и специальные предложения."}
              </p>
              <div className="mt-6 flex justify-center">
                <Link href="/products" className="btn-primary min-w-44">
                  {labels.goToMenu || "Перейти в меню"}
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center flex-wrap gap-2">
          {/* Page Numbers */}
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`btn px-3 min-w-9 ${
                safeCurrentPage === i + 1
                  ? "bg-amber-600 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
