"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import ConfirmModal from "../common/ConfirmModal";
import GlobalLoader from "../GlobalLoader";
import ProductCreateControl from "./ProductCreateControl";
import ProductEditControl from "./ProductEditControl";
import {
  ADMIN_PROPAGATION_WARNING_DESCRIPTION,
  ADMIN_PROPAGATION_WARNING_TITLE,
  popAdminProductToast,
  shouldShowAdminPropagationWarning,
} from "../../lib/adminProductToast";

type EnabledFilter = "all" | "enabled" | "disabled";
type VisibleFilter = "all" | "visible" | "hidden";
type SortBy =
  | "updated_desc"
  | "updated_asc"
  | "created_desc"
  | "created_asc"
  | "title_asc"
  | "title_desc"
  | "price_asc"
  | "price_desc";

type TableState = {
  search: string;
  category: string;
  currency: string;
  portionUnit: string;
  enabled: EnabledFilter;
  visible: VisibleFilter;
  minPrice: string;
  maxPrice: string;
  sortBy: SortBy;
  currentPage: number;
  selectedProductIds: string[];
};

const TABLE_STATE_STORAGE_KEY = "admin_products_table_state_v1";
const PAGE_SIZE = 10;
const DEFAULT_TABLE_STATE: TableState = {
  search: "",
  category: "all",
  currency: "all",
  portionUnit: "all",
  enabled: "all",
  visible: "all",
  minPrice: "",
  maxPrice: "",
  sortBy: "updated_desc",
  currentPage: 1,
  selectedProductIds: [],
};

const readTableState = (): TableState => {
  if (typeof window === "undefined") {
    return DEFAULT_TABLE_STATE;
  }

  try {
    const raw = localStorage.getItem(TABLE_STATE_STORAGE_KEY);
    if (!raw) return DEFAULT_TABLE_STATE;

    const parsed = JSON.parse(raw) as Partial<TableState>;
    return {
      ...DEFAULT_TABLE_STATE,
      ...parsed,
      currentPage:
        typeof parsed.currentPage === "number" && parsed.currentPage > 0
          ? Math.floor(parsed.currentPage)
          : DEFAULT_TABLE_STATE.currentPage,
      selectedProductIds: Array.isArray(parsed.selectedProductIds)
        ? parsed.selectedProductIds
        : [],
    };
  } catch {
    return DEFAULT_TABLE_STATE;
  }
};

export default function ProductAdminPanel() {
  const [products, setProducts] = useState<DTProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DTProduct | null>(null);
  const [tableState, setTableState] = useState<TableState>(readTableState);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(TABLE_STATE_STORAGE_KEY, JSON.stringify(tableState));
  }, [tableState]);

  useEffect(() => {
    const pendingToast = popAdminProductToast();
    if (!pendingToast) return;

    window.setTimeout(() => {
      if (pendingToast.type === "error") {
        toast.error(pendingToast.message, {
          description: pendingToast.description,
        });
        return;
      }

      if (pendingToast.type === "warning") {
        toast.warning(pendingToast.message, {
          description: pendingToast.description,
        });
        return;
      }

      if (pendingToast.type === "info") {
        toast.info(pendingToast.message, {
          description: pendingToast.description,
        });
        return;
      }

      toast.success(pendingToast.message, {
        description: pendingToast.description,
      });
    }, pendingToast.delayMs ?? 0);
  }, []);

  const loadProducts = async ({ showErrorToast = true } = {}) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/products", {
        credentials: "include",
      });

      if (!res.ok) {
        let message = "Не удалось загрузить товары";
        try {
          const payload = (await res.json()) as {
            message?: string;
            error?: string;
          };
          if (payload.message) {
            message = payload.message;
          } else if (payload.error) {
            message = payload.error;
          }
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const data = await res.json();
      const nextProducts = Array.isArray(data) ? (data as DTProduct[]) : [];
      setProducts(nextProducts);
      setTableState((prev) => ({
        ...prev,
        selectedProductIds: prev.selectedProductIds.filter((id) =>
          nextProducts.some((product) => product.ID === id),
        ),
      }));
      return true;
    } catch (error) {
      console.error(error);
      if (showErrorToast) {
        toast.error("Ошибка загрузки товаров", {
          description: error instanceof Error ? error.message : "Попробуйте позже",
        });
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const saveProducts = async (
    updated: DTProduct[],
    messages: {
      success: string;
      error: string;
    },
  ) => {
    setIsSaving(true);

    if (shouldShowAdminPropagationWarning()) {
      toast.warning(ADMIN_PROPAGATION_WARNING_TITLE, {
        description: ADMIN_PROPAGATION_WARNING_DESCRIPTION,
        duration: 7000,
      });
    }

    const loadingToastId = toast.loading("Сохраняем изменения...");

    try {
      const res = await fetch("/api/admin/products", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updated),
      });

      if (!res.ok) {
        let message = "Не удалось сохранить изменения";
        try {
          const payload = (await res.json()) as {
            message?: string;
            error?: string;
          };
          if (payload.message) {
            message = payload.message;
          } else if (payload.error) {
            message = payload.error;
          }
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const isReloaded = await loadProducts({ showErrorToast: false });
      toast.dismiss(loadingToastId);

      if (isReloaded) {
        toast.success(messages.success, {
          description: "Изменения в меню могут появиться в течение нескольких минут.",
        });
      } else {
        toast.warning(
          `${messages.success}. Но не удалось обновить список автоматически.`,
          {
            description: "Обновление меню на сайте также может занять несколько минут.",
          },
        );
      }
      return true;
    } catch (error) {
      console.error(error);
      toast.dismiss(loadingToastId);
      toast.error(messages.error, {
        description: error instanceof Error ? error.message : "Попробуйте еще раз",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    const filtered = products.filter((p) => p.ID !== deleteTarget.ID);
    const title = deleteTarget.Title;

    const ok = await saveProducts(filtered, {
      success: `Товар "${title}" удален`,
      error: `Не удалось удалить товар "${title}"`,
    });
    if (!ok) return;

    setTableState((prev) => ({
      ...prev,
      selectedProductIds: prev.selectedProductIds.filter(
        (id) => id !== deleteTarget.ID,
      ),
    }));
    setDeleteTarget(null);
  };

  const handleConfirmBulkDelete = async () => {
    if (tableState.selectedProductIds.length === 0) return;

    const selectedSet = new Set(tableState.selectedProductIds);
    const filtered = products.filter((product) => !selectedSet.has(product.ID));
    const count = tableState.selectedProductIds.length;

    const ok = await saveProducts(filtered, {
      success: `Удалено товаров: ${count}`,
      error: "Не удалось удалить выбранные товары",
    });
    if (!ok) return;

    setTableState((prev) => ({
      ...prev,
      selectedProductIds: [],
    }));
    setIsBulkDeleteOpen(false);
  };

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(products.flatMap((product) => product.ProductCategories || [])),
      ).sort(),
    [products],
  );

  const currencyOptions = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((product) => product.Currency)
            .filter((currency) => currency && currency.trim()),
        ),
      ).sort(),
    [products],
  );

  const portionUnitOptions = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((product) => product.PortionUnit)
            .filter((unit) => unit && unit.trim()),
        ),
      ).sort(),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const normalizedSearch = tableState.search.trim().toLowerCase();
    const minPrice = tableState.minPrice ? Number(tableState.minPrice) : null;
    const maxPrice = tableState.maxPrice ? Number(tableState.maxPrice) : null;

    let result = [...products];

    if (normalizedSearch) {
      result = result.filter((product) =>
        [
          product.Title,
          product.Slug,
          product.ShortDescription,
          product.LongDescription,
          (product.ProductCategories || []).join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch),
      );
    }

    if (tableState.category !== "all") {
      result = result.filter((product) =>
        product.ProductCategories.includes(tableState.category),
      );
    }

    if (tableState.currency !== "all") {
      result = result.filter((product) => product.Currency === tableState.currency);
    }

    if (tableState.portionUnit !== "all") {
      result = result.filter(
        (product) => product.PortionUnit === tableState.portionUnit,
      );
    }

    if (tableState.enabled === "enabled") {
      result = result.filter((product) => product.Enabled);
    }
    if (tableState.enabled === "disabled") {
      result = result.filter((product) => !product.Enabled);
    }

    if (tableState.visible === "visible") {
      result = result.filter((product) => product.CatalogVisible);
    }
    if (tableState.visible === "hidden") {
      result = result.filter((product) => !product.CatalogVisible);
    }

    if (minPrice !== null && Number.isFinite(minPrice)) {
      result = result.filter((product) => Number(product.RegularPrice) >= minPrice);
    }

    if (maxPrice !== null && Number.isFinite(maxPrice)) {
      result = result.filter((product) => Number(product.RegularPrice) <= maxPrice);
    }

    const getCreated = (product: DTProduct) =>
      product.CreatedAt ? Date.parse(product.CreatedAt) : 0;
    const getUpdated = (product: DTProduct) =>
      product.UpdatedAt ? Date.parse(product.UpdatedAt) : 0;
    const getPrice = (product: DTProduct) => Number(product.RegularPrice) || 0;

    switch (tableState.sortBy) {
      case "updated_asc":
        result.sort((a, b) => getUpdated(a) - getUpdated(b));
        break;
      case "created_desc":
        result.sort((a, b) => getCreated(b) - getCreated(a));
        break;
      case "created_asc":
        result.sort((a, b) => getCreated(a) - getCreated(b));
        break;
      case "title_asc":
        result.sort((a, b) => a.Title.localeCompare(b.Title));
        break;
      case "title_desc":
        result.sort((a, b) => b.Title.localeCompare(a.Title));
        break;
      case "price_asc":
        result.sort((a, b) => getPrice(a) - getPrice(b));
        break;
      case "price_desc":
        result.sort((a, b) => getPrice(b) - getPrice(a));
        break;
      case "updated_desc":
      default:
        result.sort((a, b) => getUpdated(b) - getUpdated(a));
        break;
    }

    return result;
  }, [products, tableState]);

  const visibleProductIds = filteredProducts.map((product) => product.ID);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(tableState.currentPage, 1), totalPages);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const currentPageProductIds = paginatedProducts.map((product) => product.ID);
  const emptyRowsCount = Math.max(PAGE_SIZE - paginatedProducts.length, 0);

  useEffect(() => {
    if (tableState.currentPage !== currentPage) {
      setTableState((prev) => ({ ...prev, currentPage }));
    }
  }, [currentPage, tableState.currentPage]);

  const visibleProductIdsForSelection = currentPageProductIds;
  const allVisibleSelected =
    visibleProductIdsForSelection.length > 0 &&
    visibleProductIdsForSelection.every((id) =>
      tableState.selectedProductIds.includes(id),
    );
  const selectedProductsCount = tableState.selectedProductIds.length;

  const handleToggleProductSelection = (productId: string) => {
    setTableState((prev) => ({
      ...prev,
      selectedProductIds: prev.selectedProductIds.includes(productId)
        ? prev.selectedProductIds.filter((id) => id !== productId)
        : [...prev.selectedProductIds, productId],
    }));
  };

  const handleToggleSelectAllVisible = (checked: boolean) => {
    setTableState((prev) => {
      const selected = new Set(prev.selectedProductIds);

      if (checked) {
        visibleProductIdsForSelection.forEach((id) => selected.add(id));
      } else {
        visibleProductIdsForSelection.forEach((id) => selected.delete(id));
      }

      return {
        ...prev,
        selectedProductIds: Array.from(selected),
      };
    });
  };

  const setFilter = <K extends keyof Omit<TableState, "selectedProductIds">>(
    key: K,
    value: TableState[K],
  ) => {
    setTableState((prev) => ({ ...prev, [key]: value, currentPage: 1 }));
  };

  const hasActiveFilters =
    tableState.search !== DEFAULT_TABLE_STATE.search ||
    tableState.category !== DEFAULT_TABLE_STATE.category ||
    tableState.currency !== DEFAULT_TABLE_STATE.currency ||
    tableState.portionUnit !== DEFAULT_TABLE_STATE.portionUnit ||
    tableState.enabled !== DEFAULT_TABLE_STATE.enabled ||
    tableState.visible !== DEFAULT_TABLE_STATE.visible ||
    tableState.minPrice !== DEFAULT_TABLE_STATE.minPrice ||
    tableState.maxPrice !== DEFAULT_TABLE_STATE.maxPrice ||
    tableState.sortBy !== DEFAULT_TABLE_STATE.sortBy;

  const resetFilters = () => {
    setTableState((prev) => ({
      ...DEFAULT_TABLE_STATE,
      selectedProductIds: prev.selectedProductIds,
    }));
  };

  const setCurrentPage = (page: number) => {
    const safePage = Math.min(Math.max(page, 1), totalPages);
    setTableState((prev) => ({ ...prev, currentPage: safePage }));
  };

  const formatDate = (value?: string) => {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filterControlClass =
    "w-full border border-gray-300 bg-white/90 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-amber-300 focus:border-amber-400";
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
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-xl md:text-2xl font-bold">Каталог товаров</h2>
        <ProductCreateControl />
      </div>

      {!isLoading && products.length > 0 && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-sm p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm md:text-base font-semibold text-gray-800">
              Фильтры и поиск
            </h3>
            <span className="text-xs md:text-sm text-gray-600 bg-white/80 border border-gray-200 rounded-full px-3 py-1">
              Найдено: {filteredProducts.length} • Страница {currentPage}/
              {totalPages}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="space-y-1">
              <p className={filterLabelClass}>Поиск</p>
              <input
                type="text"
                value={tableState.search}
                onChange={(e) => setFilter("search", e.target.value)}
                placeholder="Живой поиск: название, slug, категория..."
                className={getFilterClass(isSearchActive)}
              />
            </div>

            <div className="space-y-1">
              <p className={filterLabelClass}>Категория</p>
              <select
                value={tableState.category}
                onChange={(e) => setFilter("category", e.target.value)}
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
                onChange={(e) => setFilter("currency", e.target.value)}
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
                onChange={(e) => setFilter("portionUnit", e.target.value)}
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
                onChange={(e) =>
                  setFilter("enabled", e.target.value as EnabledFilter)
                }
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
                onChange={(e) =>
                  setFilter("visible", e.target.value as VisibleFilter)
                }
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
                onChange={(e) =>
                  setFilter("minPrice", e.target.value.replace(/[^\d]/g, ""))
                }
                placeholder="От"
                className={getFilterClass(isMinPriceActive)}
              />
            </div>

            <div className="space-y-1">
              <p className={filterLabelClass}>Макс. цена</p>
              <input
                type="text"
                value={tableState.maxPrice}
                onChange={(e) =>
                  setFilter("maxPrice", e.target.value.replace(/[^\d]/g, ""))
                }
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
                  onChange={(e) => setFilter("sortBy", e.target.value as SortBy)}
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
                onClick={resetFilters}
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
      )}

      {!isLoading && filteredProducts.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={(e) => handleToggleSelectAllVisible(e.target.checked)}
              disabled={isSaving}
            />
            Выбрать все на странице
          </label>

          <button
            type="button"
            onClick={() => setIsBulkDeleteOpen(true)}
            disabled={selectedProductsCount === 0 || isSaving}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50"
          >
            Удалить выбранные ({selectedProductsCount})
          </button>
        </div>
      )}

      {isLoading ? (
        <GlobalLoader mode="inline" className="min-h-[50vh]" />
      ) : (
        <>
          {filteredProducts.length === 0 ? (
            <div className="text-center text-gray-500 py-16">
              По текущим фильтрам товары не найдены
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
                {paginatedProducts.map((product) => (
                  <article
                    key={product.ID}
                    className="rounded-xl bg-gray-50 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-gray-900 line-clamp-2">
                        {product.Title}
                      </h3>
                      <input
                        type="checkbox"
                        checked={tableState.selectedProductIds.includes(product.ID)}
                        onChange={() => handleToggleProductSelection(product.ID)}
                        disabled={isSaving}
                        aria-label={`Выбрать товар ${product.Title}`}
                      />
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-gray-700">
                      <p>Цена: {product.RegularPrice}</p>
                      <p>
                        Порция: {product.PortionWeight} {product.PortionUnit}
                      </p>
                      <p>Создан: {formatDate(product.CreatedAt)}</p>
                      <p>Изменен: {formatDate(product.UpdatedAt)}</p>
                    </div>
                    <div className="mt-4 flex flex-col gap-2">
                      <ProductEditControl
                        productId={product.ID}
                        className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded inline-flex items-center justify-center text-center"
                      />
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(product)}
                        disabled={isSaving}
                        className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50"
                      >
                        Удалить
                      </button>
                    </div>
                  </article>
                ))}

                {Array.from({ length: emptyRowsCount }, (_, index) => (
                  <article
                    key={`mobile-empty-row-${index}`}
                    aria-hidden="true"
                    className="rounded-xl p-4 shadow-sm invisible pointer-events-none select-none"
                  >
                    <div className="h-[210px]" />
                  </article>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[1040px] table-fixed">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 text-center w-12">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={(e) =>
                            handleToggleSelectAllVisible(e.target.checked)
                          }
                          disabled={isSaving}
                          aria-label="Выбрать все товары на странице"
                        />
                      </th>
                      <th className="p-3 text-left text-sm lg:text-base w-[35%]">
                        Название
                      </th>
                      <th className="p-3 text-center text-sm lg:text-base w-[10%]">
                        Цена
                      </th>
                      <th className="p-3 text-center text-sm lg:text-base w-[12%]">
                        Порция
                      </th>
                      <th className="p-3 text-center text-sm lg:text-base w-[14%]">
                        Создан
                      </th>
                      <th className="p-3 text-center text-sm lg:text-base w-[14%]">
                        Изменен
                      </th>
                      <th className="p-3 text-center text-sm lg:text-base w-[15%]">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map((product) => (
                      <tr
                        key={product.ID}
                        className="border-t hover:bg-gray-50 h-[58px]"
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={tableState.selectedProductIds.includes(
                              product.ID,
                            )}
                            onChange={() => handleToggleProductSelection(product.ID)}
                            disabled={isSaving}
                            aria-label={`Выбрать товар ${product.Title}`}
                          />
                        </td>
                        <td className="p-3">
                          <div className="truncate" title={product.Title}>
                            {product.Title}
                          </div>
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {product.RegularPrice}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {product.PortionWeight} {product.PortionUnit}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {formatDate(product.CreatedAt)}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {formatDate(product.UpdatedAt)}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-2 justify-center">
                            <ProductEditControl productId={product.ID} />
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(product)}
                              disabled={isSaving}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50"
                            >
                              Удалить
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {Array.from({ length: emptyRowsCount }, (_, index) => (
                      <tr
                        key={`desktop-empty-row-${index}`}
                        aria-hidden="true"
                        className="border-t h-[58px]"
                      >
                        <td className="p-3">&nbsp;</td>
                        <td className="p-3">&nbsp;</td>
                        <td className="p-3">&nbsp;</td>
                        <td className="p-3">&nbsp;</td>
                        <td className="p-3">&nbsp;</td>
                        <td className="p-3">&nbsp;</td>
                        <td className="p-3">&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded border border-gray-300 bg-white text-gray-800 disabled:opacity-50"
                  >
                    Назад
                  </button>

                  {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                    (page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1.5 rounded border ${
                          page === currentPage
                            ? "bg-gray-800 text-white border-gray-800"
                            : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    ),
                  )}

                  <button
                    type="button"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded border border-gray-300 bg-white text-gray-800 disabled:opacity-50"
                  >
                    Вперед
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Удалить товар?"
        description={`Вы действительно хотите удалить "${deleteTarget?.Title}"? Это действие нельзя отменить.`}
        confirmText="Удалить"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmModal
        open={isBulkDeleteOpen}
        title="Удалить выбранные товары?"
        description={`Выбрано товаров: ${selectedProductsCount}. Это действие нельзя отменить.`}
        confirmText="Удалить выбранные"
        onConfirm={handleConfirmBulkDelete}
        onCancel={() => setIsBulkDeleteOpen(false)}
      />
    </div>
  );
}
