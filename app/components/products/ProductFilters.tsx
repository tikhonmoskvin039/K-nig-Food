"use client";

import { useLocalization } from "../../context/LocalizationContext";
import ClearFilterButton from "../common/ClearFilterButton";

interface ProductFiltersProps {
  searchQuery: string;
  categoryFilter: string;
  specialFilter: "all" | "new" | "promo";
  sortBy: string;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: string) => void;
  setSpecialFilter: (filter: "all" | "new" | "promo") => void;
  setSortBy: (sort: string) => void;
  categories: string[];
}

export default function ProductFilters({
  searchQuery,
  categoryFilter,
  specialFilter,
  sortBy,
  setSearchQuery,
  setCategoryFilter,
  setSpecialFilter,
  setSortBy,
  categories,
}: ProductFiltersProps) {
  const { labels } = useLocalization();

  // Handle search input change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query); // Update global search state in ProductContext
  };

  const handleCategoryChange = (category: string) => {
    setCategoryFilter(category);
  };

  const handleSpecialChange = (filter: "all" | "new" | "promo") => {
    setSpecialFilter(filter);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
  };

  return (
    <div className="surface-card p-4 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
            Поиск
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder={labels.searchPlaceholder}
              className="form-control pr-10"
            />
            {searchQuery && (
              <ClearFilterButton
                label="Очистить поиск"
                onClick={() => handleSearchChange("")}
              />
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
            Категория
          </label>
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(event) => handleCategoryChange(event.target.value)}
              className="form-control pr-16"
            >
              <option value="">{labels.allCategories}</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {categoryFilter && (
              <ClearFilterButton
                label="Очистить категорию"
                className="right-8"
                onClick={() => handleCategoryChange("")}
              />
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
            {labels.catalogSelection || "Подборка"}
          </label>
          <div className="relative">
            <select
              value={specialFilter}
              onChange={(event) =>
                handleSpecialChange(event.target.value as "all" | "new" | "promo")
              }
              className="form-control pr-16"
            >
              <option value="all">
                {labels.allProductsFilter || "Все товары"}
              </option>
              <option value="new">
                {labels.newProductsFilter || "Только новинки"}
              </option>
              <option value="promo">
                {labels.promoProductsFilter || "Только акции"}
              </option>
            </select>
            {specialFilter !== "all" && (
              <ClearFilterButton
                label="Очистить подборку"
                className="right-8"
                onClick={() => handleSpecialChange("all")}
              />
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
            Сортировка
          </label>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(event) => handleSortChange(event.target.value)}
              className="form-control pr-16"
            >
              <option value="name">{labels.sortByName}</option>
              <option value="price">{labels.sortByPrice}</option>
              <option value="newest">{labels.sortByNewest}</option>
            </select>
            {sortBy !== "name" && (
              <ClearFilterButton
                label="Очистить сортировку"
                className="right-8"
                onClick={() => handleSortChange("name")}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
