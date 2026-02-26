"use client";

import type {
  EnabledFilter,
  SortBy,
  TableState,
  VisibleFilter,
} from "../../../services/admin/productAdminTable";
import { DEFAULT_TABLE_STATE } from "../../../services/admin/productAdminTable";

type Props = {
  tableState: TableState;
  categoryOptions: string[];
  currencyOptions: string[];
  portionUnitOptions: string[];
  filteredCount: number;
  currentPage: number;
  totalPages: number;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onPortionUnitChange: (value: string) => void;
  onEnabledChange: (value: EnabledFilter) => void;
  onVisibleChange: (value: VisibleFilter) => void;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onSortByChange: (value: SortBy) => void;
  onResetFilters: () => void;
};

export default function ProductFiltersPanel({
  tableState,
  categoryOptions,
  currencyOptions,
  portionUnitOptions,
  filteredCount,
  currentPage,
  totalPages,
  hasActiveFilters,
  onSearchChange,
  onCategoryChange,
  onCurrencyChange,
  onPortionUnitChange,
  onEnabledChange,
  onVisibleChange,
  onMinPriceChange,
  onMaxPriceChange,
  onSortByChange,
  onResetFilters,
}: Props) {
  const filterControlClass = "form-control bg-white/90";
  const filterControlActiveClass =
    "border-rose-500 shadow-[0_0_0_1px_rgba(244,63,94,0.45)] animate-[pulse_2.8s_ease-in-out_infinite]";
  const filterLabelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-600";

  const isSearchActive = tableState.search !== DEFAULT_TABLE_STATE.search;
  const isCategoryActive = tableState.category !== DEFAULT_TABLE_STATE.category;
  const isCurrencyActive = tableState.currency !== DEFAULT_TABLE_STATE.currency;
  const isPortionUnitActive =
    tableState.portionUnit !== DEFAULT_TABLE_STATE.portionUnit;
  const isEnabledActive = tableState.enabled !== DEFAULT_TABLE_STATE.enabled;
  const isVisibleActive = tableState.visible !== DEFAULT_TABLE_STATE.visible;
  const isMinPriceActive = tableState.minPrice !== DEFAULT_TABLE_STATE.minPrice;
  const isMaxPriceActive = tableState.maxPrice !== DEFAULT_TABLE_STATE.maxPrice;
  const isSortByActive = tableState.sortBy !== DEFAULT_TABLE_STATE.sortBy;

  const getFilterClass = (isActive: boolean) =>
    `${filterControlClass} ${isActive ? filterControlActiveClass : ""}`;

  return (
    <div className="mb-5 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm md:text-base font-semibold text-gray-800">
          Фильтры и поиск
        </h3>
        <span className="text-xs md:text-sm text-gray-600 bg-white/80 border border-gray-200 rounded-full px-3 py-1">
          Найдено: {filteredCount} • Страница {currentPage}/{totalPages}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="space-y-1">
          <p className={filterLabelClass}>Поиск</p>
          <input
            type="text"
            value={tableState.search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Живой поиск: название, slug, категория..."
            className={getFilterClass(isSearchActive)}
          />
        </div>

        <div className="space-y-1">
          <p className={filterLabelClass}>Категория</p>
          <select
            value={tableState.category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className={getFilterClass(isCategoryActive)}
          >
            <option value="all">Все категории</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <p className={filterLabelClass}>Валюта</p>
          <select
            value={tableState.currency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className={getFilterClass(isCurrencyActive)}
          >
            <option value="all">Все валюты</option>
            {currencyOptions.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <p className={filterLabelClass}>Ед. измерения</p>
          <select
            value={tableState.portionUnit}
            onChange={(e) => onPortionUnitChange(e.target.value)}
            className={getFilterClass(isPortionUnitActive)}
          >
            <option value="all">Все единицы</option>
            {portionUnitOptions.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <p className={filterLabelClass}>Активность</p>
          <select
            value={tableState.enabled}
            onChange={(e) => onEnabledChange(e.target.value as EnabledFilter)}
            className={getFilterClass(isEnabledActive)}
          >
            <option value="all">Активность: все</option>
            <option value="enabled">Только активные</option>
            <option value="disabled">Только неактивные</option>
          </select>
        </div>

        <div className="space-y-1">
          <p className={filterLabelClass}>Видимость</p>
          <select
            value={tableState.visible}
            onChange={(e) => onVisibleChange(e.target.value as VisibleFilter)}
            className={getFilterClass(isVisibleActive)}
          >
            <option value="all">Видимость: все</option>
            <option value="visible">Только в каталоге</option>
            <option value="hidden">Скрытые из каталога</option>
          </select>
        </div>

        <div className="space-y-1">
          <p className={filterLabelClass}>Мин. цена</p>
          <input
            type="text"
            value={tableState.minPrice}
            onChange={(e) => onMinPriceChange(e.target.value)}
            placeholder="От"
            className={getFilterClass(isMinPriceActive)}
          />
        </div>

        <div className="space-y-1">
          <p className={filterLabelClass}>Макс. цена</p>
          <input
            type="text"
            value={tableState.maxPrice}
            onChange={(e) => onMaxPriceChange(e.target.value)}
            placeholder="До"
            className={getFilterClass(isMaxPriceActive)}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="space-y-1 w-full sm:w-auto">
            <p className={filterLabelClass}>Сортировка</p>
            <select
              value={tableState.sortBy}
              onChange={(e) => onSortByChange(e.target.value as SortBy)}
              className={`${getFilterClass(isSortByActive)} w-full sm:w-auto`}
            >
              <option value="updated_desc">Сначала недавно измененные</option>
              <option value="updated_asc">Сначала давно измененные</option>
              <option value="created_desc">Сначала недавно созданные</option>
              <option value="created_asc">Сначала давно созданные</option>
              <option value="title_asc">Название A-Z</option>
              <option value="title_desc">Название Z-A</option>
              <option value="price_asc">Цена по возрастанию</option>
              <option value="price_desc">Цена по убыванию</option>
            </select>
          </div>

          <button
            type="button"
            onClick={onResetFilters}
            className={`inline-flex items-center justify-center px-4 py-2 rounded-lg font-semibold shadow-sm hover:shadow-md transition sm:self-end ${
              hasActiveFilters
                ? "bg-rose-500 hover:bg-rose-600 text-white animate-[pulse_2.8s_ease-in-out_infinite]"
                : "bg-amber-400 hover:bg-amber-500 text-gray-900"
            }`}
          >
            Сбросить фильтры
          </button>
        </div>
      </div>
    </div>
  );
}
