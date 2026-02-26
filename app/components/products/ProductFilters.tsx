"use client";

import { useState } from "react";
import { useLocalization } from "../../context/LocalizationContext";

interface ProductFiltersProps {
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: string) => void;
  setSortBy: (sort: string) => void;
  categories: string[];
}

export default function ProductFilters({
  setSearchQuery,
  setCategoryFilter,
  setSortBy,
  categories,
}: ProductFiltersProps) {
  const { labels } = useLocalization();
  const [searchInput, setSearchInput] = useState(""); // Controlled search state

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchInput(query); // Update local state
    setSearchQuery(query); // Update global search state in ProductContext
  };

  return (
    <div className="surface-card p-4 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
            Поиск
          </span>
          <input
            type="text"
            value={searchInput}
            onChange={handleSearchChange}
            placeholder={labels.searchPlaceholder}
            className="form-control"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
            Категория
          </span>
          <select
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="form-control"
          >
            <option value="">{labels.allCategories}</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
            Сортировка
          </span>
          <select onChange={(e) => setSortBy(e.target.value)} className="form-control">
            <option value="name">{labels.sortByName}</option>
            <option value="price">{labels.sortByPrice}</option>
            <option value="newest">{labels.sortByNewest}</option>
          </select>
        </label>
      </div>
    </div>
  );
}
