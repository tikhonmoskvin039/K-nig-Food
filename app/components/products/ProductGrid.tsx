"use client";

import { useState } from "react";
import ProductCard from "./ProductCard";
import ProductFilters from "./ProductFilters";
import { useProductContext } from "../../context/ProductContext";
import { useLocalization } from "../../context/LocalizationContext";

interface ProductGridProps {
  pageSize?: number;
}

export default function ProductGrid({ pageSize = 18 }: ProductGridProps) {
  const {
    filteredProducts,
    categories,
    setSearchQuery,
    setCategoryFilter,
    setSortBy,
  } = useProductContext();
  const { labels } = useLocalization();

  console.log(filteredProducts, Array.isArray(filteredProducts));

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate total pages
  const totalPages = Math.ceil(filteredProducts.length / pageSize);

  // Get products for the current page
  const displayedProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div>
      {/* Product Filters */}
      <ProductFilters
        setSearchQuery={setSearchQuery}
        setCategoryFilter={setCategoryFilter}
        setSortBy={setSortBy}
        categories={categories}
      />

      {/* Product Grid */}
      <div className="mt-6 min-h-[calc(100vh-var(--header-height-plus-top-section-height))]">
        {displayedProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
            {displayedProducts.map((product) => (
              <ProductCard key={product.ID} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-center px-4">
            <p className="text-gray-600 font-semibold text-lg sm:text-xl md:text-2xl lg:text-3xl">
              {labels.noProductsFound || "Товары не найдены..."}
            </p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center space-x-2">
          {/* Page Numbers */}
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 rounded-md border transition-all 
                ${currentPage === i + 1 ? "bg-gray-800 text-white" : "bg-white text-gray-800 hover:bg-gray-200"}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
