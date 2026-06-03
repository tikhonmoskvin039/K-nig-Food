"use client";

import type {
  EnabledFilter,
  ShowcaseFilter,
  SortBy,
  TableState,
  VisibleFilter,
} from "../../../services/admin/productAdminTable";
import { DEFAULT_TABLE_STATE } from "../../../services/admin/productAdminTable";
import ClearFilterButton from "../../common/ClearFilterButton";

type Props = {
  tableState: TableState;
  categoryOptions: string[];
  portionUnitOptions: string[];
  filteredCount: number;
  currentPage: number;
  totalPages: number;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onPortionUnitChange: (value: string) => void;
  onEnabledChange: (value: EnabledFilter) => void;
  onVisibleChange: (value: VisibleFilter) => void;
  onShowcaseChange: (value: ShowcaseFilter) => void;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onSortByChange: (value: SortBy) => void;
  onResetFilters: () => void;
};

export default function ProductFiltersPanel({
  tableState,
  categoryOptions,
  portionUnitOptions,
  filteredCount,
  currentPage,
  totalPages,
  hasActiveFilters,
  onSearchChange,
  onCategoryChange,
  onPortionUnitChange,
  onEnabledChange,
  onVisibleChange,
  onShowcaseChange,
  onMinPriceChange,
  onMaxPriceChange,
  onSortByChange,
  onResetFilters,
}: Props) {
  const filterControlClass = "form-control";
  const filterControlActiveClass =
    "border-rose-500 shadow-[0_0_0_1px_rgba(244,63,94,0.45)] animate-[pulse_2.8s_ease-in-out_infinite]";
  const filterLabelClass =
    "text-xs font-semibold uppercase tracking-wide text-[color:var(--color-muted)]";

  const isSearchActive = tableState.search !== DEFAULT_TABLE_STATE.search;
  const isCategoryActive = tableState.category !== DEFAULT_TABLE_STATE.category;
  const isPortionUnitActive =
    tableState.portionUnit !== DEFAULT_TABLE_STATE.portionUnit;
  const isEnabledActive = tableState.enabled !== DEFAULT_TABLE_STATE.enabled;
  const isVisibleActive = tableState.visible !== DEFAULT_TABLE_STATE.visible;
  const isShowcaseActive = tableState.showcase !== DEFAULT_TABLE_STATE.showcase;
  const isMinPriceActive = tableState.minPrice !== DEFAULT_TABLE_STATE.minPrice;
  const isMaxPriceActive = tableState.maxPrice !== DEFAULT_TABLE_STATE.maxPrice;
  const isSortByActive = tableState.sortBy !== DEFAULT_TABLE_STATE.sortBy;

  const getFilterClass = (isActive: boolean) =>
    `${filterControlClass} ${isActive ? filterControlActiveClass : ""}`;
  const getInputClass = (isActive: boolean) =>
    `${getFilterClass(isActive)} pr-10`;
  const getSelectClass = (isActive: boolean) =>
    `${getFilterClass(isActive)} pr-16`;

  return (
    <div
      className="mb-5 rounded-2xl border p-4 md:p-5 space-y-4"
      style={{
        borderColor: "var(--color-border)",
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--color-primary-soft) 30%, var(--color-surface) 70%), var(--color-surface))",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm md:text-base font-semibold text-[color:var(--color-foreground)]">
          Фильтры и поиск
        </h3>
        <span
          className="text-xs md:text-sm rounded-full px-3 py-1"
          style={{
            color: "var(--color-muted)",
            border: "1px solid var(--color-border)",
            background: "color-mix(in srgb, var(--color-surface) 90%, transparent)",
          }}
        >
          Найдено: {filteredCount} • Страница {currentPage}/{totalPages}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="space-y-1">
          <p className={filterLabelClass}>Поиск</p>
          <div className="relative">
            <input
              type="text"
              value={tableState.search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Живой поиск: название, slug, категория..."
              className={getInputClass(isSearchActive)}
            />
            {isSearchActive && (
              <ClearFilterButton
                label="Очистить поиск"
                onClick={() => onSearchChange(DEFAULT_TABLE_STATE.search)}
              />
            )}
          </div>
        </div>

        <div className="space-y-1">
          <p className={filterLabelClass}>Категория</p>
          <div className="relative">
            <select
              value={tableState.category}
              onChange={(e) => onCategoryChange(e.target.value)}
              className={getSelectClass(isCategoryActive)}
            >
              <option value="all">Все категории</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {isCategoryActive && (
              <ClearFilterButton
                label="Очистить категорию"
                className="right-8"
                onClick={() => onCategoryChange(DEFAULT_TABLE_STATE.category)}
              />
            )}
          </div>
        </div>

        <div className="space-y-1">
          <p className={filterLabelClass}>Ед. измерения</p>
          <div className="relative">
            <select
              value={tableState.portionUnit}
              onChange={(e) => onPortionUnitChange(e.target.value)}
              className={getSelectClass(isPortionUnitActive)}
            >
              <option value="all">Все единицы</option>
              {portionUnitOptions.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
            {isPortionUnitActive && (
              <ClearFilterButton
                label="Очистить единицу измерения"
                className="right-8"
                onClick={() =>
                  onPortionUnitChange(DEFAULT_TABLE_STATE.portionUnit)
                }
              />
            )}
          </div>
        </div>

        <div className="space-y-1">
          <p className={filterLabelClass}>Активность</p>
          <div className="relative">
            <select
              value={tableState.enabled}
              onChange={(e) => onEnabledChange(e.target.value as EnabledFilter)}
              className={getSelectClass(isEnabledActive)}
            >
              <option value="all">Активность: все</option>
              <option value="enabled">Только активные</option>
              <option value="disabled">Только неактивные</option>
            </select>
            {isEnabledActive && (
              <ClearFilterButton
                label="Очистить активность"
                className="right-8"
                onClick={() => onEnabledChange(DEFAULT_TABLE_STATE.enabled)}
              />
            )}
          </div>
        </div>

        <div className="space-y-1">
          <p className={filterLabelClass}>Видимость</p>
          <div className="relative">
            <select
              value={tableState.visible}
              onChange={(e) => onVisibleChange(e.target.value as VisibleFilter)}
              className={getSelectClass(isVisibleActive)}
            >
              <option value="all">Видимость: все</option>
              <option value="visible">Только в каталоге</option>
              <option value="hidden">Скрытые из каталога</option>
            </select>
            {isVisibleActive && (
              <ClearFilterButton
                label="Очистить видимость"
                className="right-8"
                onClick={() => onVisibleChange(DEFAULT_TABLE_STATE.visible)}
              />
            )}
          </div>
        </div>

        <div className="space-y-1">
          <p className={filterLabelClass}>Мин. цена</p>
          <div className="relative">
            <input
              type="text"
              value={tableState.minPrice}
              onChange={(e) => onMinPriceChange(e.target.value)}
              placeholder="От"
              className={getInputClass(isMinPriceActive)}
            />
            {isMinPriceActive && (
              <ClearFilterButton
                label="Очистить минимальную цену"
                onClick={() => onMinPriceChange(DEFAULT_TABLE_STATE.minPrice)}
              />
            )}
          </div>
        </div>

        <div className="space-y-1">
          <p className={filterLabelClass}>Витрина</p>
          <div className="relative">
            <select
              value={tableState.showcase}
              onChange={(e) =>
                onShowcaseChange(e.target.value as ShowcaseFilter)
              }
              className={getSelectClass(isShowcaseActive)}
            >
              <option value="all">Все товары</option>
              <option value="new">Только новинки</option>
              <option value="weekly_offer">Только предложения недели</option>
              <option value="discounted">Только со скидкой</option>
            </select>
            {isShowcaseActive && (
              <ClearFilterButton
                label="Очистить витрину"
                className="right-8"
                onClick={() => onShowcaseChange(DEFAULT_TABLE_STATE.showcase)}
              />
            )}
          </div>
        </div>

        <div className="space-y-1">
          <p className={filterLabelClass}>Макс. цена</p>
          <div className="relative">
            <input
              type="text"
              value={tableState.maxPrice}
              onChange={(e) => onMaxPriceChange(e.target.value)}
              placeholder="До"
              className={getInputClass(isMaxPriceActive)}
            />
            {isMaxPriceActive && (
              <ClearFilterButton
                label="Очистить максимальную цену"
                onClick={() => onMaxPriceChange(DEFAULT_TABLE_STATE.maxPrice)}
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="space-y-1 w-full sm:w-auto">
            <p className={filterLabelClass}>Сортировка</p>
            <div className="relative">
              <select
                value={tableState.sortBy}
                onChange={(e) => onSortByChange(e.target.value as SortBy)}
                className={`${getSelectClass(isSortByActive)} w-full sm:w-auto`}
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
              {isSortByActive && (
                <ClearFilterButton
                  label="Очистить сортировку"
                  className="right-8"
                  onClick={() => onSortByChange(DEFAULT_TABLE_STATE.sortBy)}
                />
              )}
            </div>
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
