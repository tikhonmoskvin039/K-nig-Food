"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import ConfirmModal from "../common/ConfirmModal";
import GlobalLoader from "../GlobalLoader";
import ProductCreateControl from "./ProductCreateControl";
import ProductBulkActions from "./product-admin/ProductBulkActions";
import ProductDesktopTable from "./product-admin/ProductDesktopTable";
import ProductFiltersPanel from "./product-admin/ProductFiltersPanel";
import ProductMobileGrid from "./product-admin/ProductMobileGrid";
import ProductPagination from "./product-admin/ProductPagination";
import ProductShowcaseManager from "./product-admin/ProductShowcaseManager";
import {
  ADMIN_PROPAGATION_WARNING_DESCRIPTION,
  ADMIN_PROPAGATION_WARNING_TITLE,
  popAdminProductToast,
  shouldShowAdminPropagationWarning,
} from "../../lib/adminProductToast";
import {
  formatBytes,
  getJsonPayloadSizeBytes,
  SAFE_FUNCTION_BODY_LIMIT_BYTES,
  VERCEL_FUNCTION_BODY_LIMIT_BYTES,
} from "../../lib/payloadSize";
import {
  DEFAULT_TABLE_STATE,
  PAGE_SIZE,
  TABLE_STATE_STORAGE_KEY,
  filterAndSortProducts,
  getCategoryOptions,
  getCurrencyOptions,
  getPortionUnitOptions,
  hasActiveProductFilters,
  readTableState,
  type EnabledFilter,
  type SortBy,
  type TableState,
  type VisibleFilter,
} from "../../services/admin/productAdminTable";
import { sanitizeNumericString } from "../../services/admin/productForm";
import { readApiErrorMessage } from "../../services/shared/http";
import ButtonSpinner from "../common/ButtonSpinner";
import { invalidateCatalogProductsCache } from "../../utils/catalogProductsCache";
import { isOfflineQueuedResponse } from "../../lib/offlineRequestQueue";

export default function ProductAdminPanel() {
  const [activeTab, setActiveTab] = useState<"catalog" | "showcase">("catalog");
  const [products, setProducts] = useState<DTProduct[]>([]);
  const [homepageVisibility, setHomepageVisibility] = useState<{
    recentProductsEnabled: boolean;
    weeklyOffersEnabled: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isHomepageVisibilityLoading, setIsHomepageVisibilityLoading] =
    useState(false);
  const [isHomepageVisibilitySaving, setIsHomepageVisibilitySaving] =
    useState(false);
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
      const response = await fetch("/api/admin/products", {
        credentials: "include",
      });

      if (!response.ok) {
        const message = await readApiErrorMessage(
          response,
          "Не удалось загрузить товары",
        );
        throw new Error(message);
      }

      const data = await response.json();
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
          description:
            error instanceof Error ? error.message : "Попробуйте позже",
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

  const loadHomepageVisibility = async ({ silent = false } = {}) => {
    if (!silent) {
      setIsHomepageVisibilityLoading(true);
    }

    try {
      const response = await fetch("/api/admin/homepage-settings", {
        credentials: "include",
      });

      if (!response.ok) {
        const message = await readApiErrorMessage(
          response,
          "Не удалось загрузить настройки главной",
        );
        throw new Error(message);
      }

      const data = (await response.json()) as {
        recentProductsEnabled?: boolean;
        weeklyOffersEnabled?: boolean;
      };

      setHomepageVisibility({
        recentProductsEnabled: Boolean(data.recentProductsEnabled),
        weeklyOffersEnabled: Boolean(data.weeklyOffersEnabled),
      });
      return true;
    } catch (error) {
      console.error(error);
      if (!silent) {
        toast.error("Ошибка загрузки настроек главной", {
          description:
            error instanceof Error ? error.message : "Попробуйте позже",
        });
      }
      return false;
    } finally {
      if (!silent) {
        setIsHomepageVisibilityLoading(false);
      }
    }
  };

  useEffect(() => {
    if (activeTab !== "showcase") return;
    if (homepageVisibility) return;
    loadHomepageVisibility();
  }, [activeTab, homepageVisibility]);

  const saveHomepageVisibility = async () => {
    if (!homepageVisibility || isHomepageVisibilitySaving) return;

    setIsHomepageVisibilitySaving(true);
    const loadingToastId = toast.loading("Сохраняем настройки главной...");

    try {
      const response = await fetch("/api/admin/homepage-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(homepageVisibility),
      });

      if (!response.ok) {
        const message = await readApiErrorMessage(
          response,
          "Не удалось сохранить настройки главной",
        );
        throw new Error(message);
      }
      if (isOfflineQueuedResponse(response)) {
        toast.dismiss(loadingToastId);
        toast.info("Сохранение поставлено в очередь.", {
          description: "Настройки отправятся автоматически при восстановлении сети.",
        });
        return true;
      }

      toast.dismiss(loadingToastId);
      toast.success("Настройки главной сохранены");
      return true;
    } catch (error) {
      console.error(error);
      toast.dismiss(loadingToastId);
      toast.error("Не удалось сохранить настройки главной", {
        description:
          error instanceof Error ? error.message : "Попробуйте еще раз",
      });
      return false;
    } finally {
      setIsHomepageVisibilitySaving(false);
    }
  };

  const saveProducts = async (
    updatedProducts: DTProduct[],
    messages: {
      success: string;
      error: string;
    },
  ) => {
    const payloadBytes = getJsonPayloadSizeBytes(updatedProducts);
    if (payloadBytes > SAFE_FUNCTION_BODY_LIMIT_BYTES) {
      toast.error("Слишком большой объем данных для сохранения", {
        description: `Размер запроса: ${formatBytes(payloadBytes)}. Лимит Vercel: ${formatBytes(VERCEL_FUNCTION_BODY_LIMIT_BYTES)}. Уменьшите размер/количество изображений.`,
      });
      return false;
    }

    setIsSaving(true);

    if (shouldShowAdminPropagationWarning()) {
      toast.warning(ADMIN_PROPAGATION_WARNING_TITLE, {
        description: ADMIN_PROPAGATION_WARNING_DESCRIPTION,
        duration: 7000,
      });
    }

    const loadingToastId = toast.loading("Сохраняем изменения...");

    try {
      const response = await fetch("/api/admin/products", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedProducts),
      });

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error(
            `Размер запроса превышает лимит Vercel (${formatBytes(VERCEL_FUNCTION_BODY_LIMIT_BYTES)}).`,
          );
        }

        const message = await readApiErrorMessage(
          response,
          "Не удалось сохранить изменения",
        );
        throw new Error(message);
      }
      if (isOfflineQueuedResponse(response)) {
        toast.dismiss(loadingToastId);
        toast.info("Изменения поставлены в очередь.", {
          description: "Они отправятся автоматически при восстановлении сети.",
        });
        return true;
      }

      invalidateCatalogProductsCache();
      const isReloaded = await loadProducts({ showErrorToast: false });
      toast.dismiss(loadingToastId);

      if (isReloaded) {
        toast.success(messages.success, {
          description:
            "Изменения в меню могут появиться в течение нескольких минут.",
        });
      } else {
        toast.warning(
          `${messages.success}. Но не удалось обновить список автоматически.`,
          {
            description:
              "Обновление меню на сайте также может занять несколько минут.",
          },
        );
      }

      return true;
    } catch (error) {
      console.error(error);
      toast.dismiss(loadingToastId);
      toast.error(messages.error, {
        description:
          error instanceof Error ? error.message : "Попробуйте еще раз",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const categoryOptions = useMemo(
    () => getCategoryOptions(products),
    [products],
  );
  const currencyOptions = useMemo(
    () => getCurrencyOptions(products),
    [products],
  );
  const portionUnitOptions = useMemo(
    () => getPortionUnitOptions(products),
    [products],
  );

  const filteredProducts = useMemo(
    () => filterAndSortProducts(products, tableState),
    [products, tableState],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PAGE_SIZE),
  );
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

  const allVisibleSelected =
    currentPageProductIds.length > 0 &&
    currentPageProductIds.every((id) =>
      tableState.selectedProductIds.includes(id),
    );
  const selectedProductsCount = tableState.selectedProductIds.length;
  const hasActiveFilters = hasActiveProductFilters(tableState);

  const setFilter = <K extends keyof Omit<TableState, "selectedProductIds">>(
    key: K,
    value: TableState[K],
  ) => {
    setTableState((prev) => ({ ...prev, [key]: value, currentPage: 1 }));
  };

  const setCurrentPage = (page: number) => {
    const safePage = Math.min(Math.max(page, 1), totalPages);
    setTableState((prev) => ({ ...prev, currentPage: safePage }));
  };

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
        currentPageProductIds.forEach((id) => selected.add(id));
      } else {
        currentPageProductIds.forEach((id) => selected.delete(id));
      }

      return {
        ...prev,
        selectedProductIds: Array.from(selected),
      };
    });
  };

  const resetFilters = () => {
    setTableState((prev) => ({
      ...DEFAULT_TABLE_STATE,
      selectedProductIds: prev.selectedProductIds,
    }));
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    const nextProducts = products.filter(
      (product) => product.ID !== deleteTarget.ID,
    );
    const title = deleteTarget.Title;

    const ok = await saveProducts(nextProducts, {
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
    const nextProducts = products.filter(
      (product) => !selectedSet.has(product.ID),
    );
    const count = tableState.selectedProductIds.length;

    const ok = await saveProducts(nextProducts, {
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

  return (
    <div className="surface-card p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold md:text-2xl">Каталог товаров</h2>
        <ProductCreateControl />
      </div>

      <div
        className="mb-6 inline-flex rounded-xl border p-1 gap-1"
        style={{
          borderColor: "var(--color-border)",
          background:
            "color-mix(in srgb, var(--color-surface-soft) 82%, var(--color-surface) 18%)",
        }}
      >
        <button
          type="button"
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === "catalog"
              ? "shadow-sm"
              : "hover:opacity-100 opacity-90"
          }`}
          style={
            activeTab === "catalog"
              ? {
                  background:
                    "color-mix(in srgb, var(--color-primary-soft) 30%, var(--color-surface) 70%)",
                  color: "var(--color-foreground)",
                  border: "1px solid color-mix(in srgb, var(--color-primary) 24%, var(--color-border))",
                }
              : { color: "var(--color-muted)" }
          }
          onClick={() => setActiveTab("catalog")}
          aria-pressed={activeTab === "catalog"}
        >
          Таблица и фильтры
        </button>
        <button
          type="button"
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === "showcase"
              ? "shadow-sm"
              : "hover:opacity-100 opacity-90"
          }`}
          style={
            activeTab === "showcase"
              ? {
                  background:
                    "color-mix(in srgb, var(--color-primary-soft) 30%, var(--color-surface) 70%)",
                  color: "var(--color-foreground)",
                  border: "1px solid color-mix(in srgb, var(--color-primary) 24%, var(--color-border))",
                }
              : { color: "var(--color-muted)" }
          }
          onClick={() => setActiveTab("showcase")}
          aria-pressed={activeTab === "showcase"}
        >
          Управление витриной
        </button>
      </div>

      {isLoading ? (
        <GlobalLoader mode="inline" className="min-h-[50vh]" />
      ) : activeTab === "showcase" ? (
        <div className="space-y-5">
          <div className="surface-card-soft p-4 md:p-5">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-lg font-semibold">
                  Видимость секций на главной
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Эти настройки определяют, видят ли пользователи блоки
                  «Новинки» и «Предложения недели» на главной странице и
                  соответствующие страницы в меню.
                </p>
              </div>

              {isHomepageVisibilityLoading || !homepageVisibility ? (
                <p className="text-sm text-slate-500">
                  Загружаем настройки...
                </p>
              ) : (
                <>
                  <label className="checkbox-card" data-checked={homepageVisibility.recentProductsEnabled}>
                    <input
                      type="checkbox"
                      checked={homepageVisibility.recentProductsEnabled}
                      onChange={(event) =>
                        setHomepageVisibility((prev) =>
                          prev
                            ? {
                                ...prev,
                                recentProductsEnabled: event.target.checked,
                              }
                            : prev,
                        )
                      }
                    />
                    <span className="font-medium select-none">
                      Показывать секцию «Новинки»
                    </span>
                  </label>

                  <label className="checkbox-card" data-checked={homepageVisibility.weeklyOffersEnabled}>
                    <input
                      type="checkbox"
                      checked={homepageVisibility.weeklyOffersEnabled}
                      onChange={(event) =>
                        setHomepageVisibility((prev) =>
                          prev
                            ? {
                                ...prev,
                                weeklyOffersEnabled: event.target.checked,
                              }
                            : prev,
                        )
                      }
                    />
                    <span className="font-medium select-none">
                      Показывать секцию «Предложения недели»
                    </span>
                  </label>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="btn-primary min-w-56"
                      onClick={saveHomepageVisibility}
                      disabled={isHomepageVisibilitySaving}
                    >
                      {isHomepageVisibilitySaving ? (
                        <ButtonSpinner />
                      ) : (
                        "Сохранить настройки секций"
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => loadHomepageVisibility()}
                      disabled={isHomepageVisibilitySaving || isHomepageVisibilityLoading}
                    >
                      Обновить из БД
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <ProductShowcaseManager
            products={products}
            isSaving={isSaving}
            onProductsChange={setProducts}
            onSaveProducts={saveProducts}
          />
        </div>
      ) : (
        <>
          {products.length > 0 && (
            <ProductFiltersPanel
              tableState={tableState}
              categoryOptions={categoryOptions}
              currencyOptions={currencyOptions}
              portionUnitOptions={portionUnitOptions}
              filteredCount={filteredProducts.length}
              currentPage={currentPage}
              totalPages={totalPages}
              hasActiveFilters={hasActiveFilters}
              onSearchChange={(value) => setFilter("search", value)}
              onCategoryChange={(value) => setFilter("category", value)}
              onCurrencyChange={(value) => setFilter("currency", value)}
              onPortionUnitChange={(value) => setFilter("portionUnit", value)}
              onEnabledChange={(value) =>
                setFilter("enabled", value as EnabledFilter)
              }
              onVisibleChange={(value) =>
                setFilter("visible", value as VisibleFilter)
              }
              onShowcaseChange={(value) => setFilter("showcase", value)}
              onMinPriceChange={(value) =>
                setFilter("minPrice", sanitizeNumericString(value))
              }
              onMaxPriceChange={(value) =>
                setFilter("maxPrice", sanitizeNumericString(value))
              }
              onSortByChange={(value) => setFilter("sortBy", value as SortBy)}
              onResetFilters={resetFilters}
            />
          )}

          {filteredProducts.length > 0 && (
            <ProductBulkActions
              allVisibleSelected={allVisibleSelected}
              selectedProductsCount={selectedProductsCount}
              isSaving={isSaving}
              onToggleSelectAllVisible={handleToggleSelectAllVisible}
              onOpenBulkDelete={() => setIsBulkDeleteOpen(true)}
            />
          )}

          {filteredProducts.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              По текущим фильтрам товары не найдены
            </div>
          ) : (
            <>
              <ProductMobileGrid
                products={paginatedProducts}
                selectedProductIds={tableState.selectedProductIds}
                isSaving={isSaving}
                emptyRowsCount={emptyRowsCount}
                onToggleProductSelection={handleToggleProductSelection}
                onDeleteRequest={setDeleteTarget}
              />

              <ProductDesktopTable
                products={paginatedProducts}
                selectedProductIds={tableState.selectedProductIds}
                isSaving={isSaving}
                allVisibleSelected={allVisibleSelected}
                emptyRowsCount={emptyRowsCount}
                onToggleSelectAllVisible={handleToggleSelectAllVisible}
                onToggleProductSelection={handleToggleProductSelection}
                onDeleteRequest={setDeleteTarget}
              />

              <ProductPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onSetPage={setCurrentPage}
              />
            </>
          )}
        </>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Удалить товар?"
        description={`Вы действительно хотите удалить "${deleteTarget?.Title}"? Это действие нельзя отменить.`}
        confirmText={isSaving ? <ButtonSpinner /> : "Удалить"}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmModal
        open={isBulkDeleteOpen}
        title="Удалить выбранные товары?"
        description={`Выбрано товаров: ${selectedProductsCount}. Это действие нельзя отменить.`}
        confirmText={isSaving ? <ButtonSpinner /> : "Удалить выбранные"}
        onConfirm={handleConfirmBulkDelete}
        onCancel={() => setIsBulkDeleteOpen(false)}
      />
    </div>
  );
}
