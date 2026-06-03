"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import GlobalLoader from "../GlobalLoader";
import ProductForm from "./ProductForm";
import ConfirmModal from "../common/ConfirmModal";
import {
  queueAdminProductToast,
} from "../../lib/adminProductToast";
import {
  formatBytes,
  getJsonPayloadSizeBytes,
  SAFE_FUNCTION_BODY_LIMIT_BYTES,
  VERCEL_FUNCTION_BODY_LIMIT_BYTES,
} from "../../lib/payloadSize";
import {
  cloneProduct,
  createEmptyProduct,
  normalizeProductRecommendations,
} from "../../services/admin/productEditor";
import { readApiErrorMessage } from "../../services/shared/http";
import ButtonSpinner from "../common/ButtonSpinner";
import { invalidateCatalogProductsCache } from "../../utils/catalogProductsCache";
import { isOfflineQueuedResponse } from "../../lib/offlineRequestQueue";

type Props = {
  mode: "create" | "edit";
  productId?: string;
};

function getInternalNavigationPath(href: string) {
  if (typeof window === "undefined") return null;

  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return null;

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export default function ProductEditorPage({ mode, productId }: Props) {
  const router = useRouter();
  const [products, setProducts] = useState<DTProduct[]>([]);
  const [product, setProduct] = useState<DTProduct | null>(null);
  const [initialProduct, setInitialProduct] = useState<DTProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [pendingNavigationPath, setPendingNavigationPath] = useState<string | null>(
    null,
  );
  const allowNavigationRef = useRef(false);
  const currentHrefRef = useRef("");

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const res = await fetch("/api/admin/products", {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Не удалось загрузить каталог");
        }

        const data = await res.json();
        const productsArray = Array.isArray(data) ? (data as DTProduct[]) : [];
        setProducts(productsArray);

        if (mode === "create") {
          const nextProduct = createEmptyProduct();
          setProduct(nextProduct);
          setInitialProduct(cloneProduct(nextProduct));
          return;
        }

        const found = productsArray.find((item) => item.ID === productId);
        if (!found) {
          setLoadError("Товар не найден");
          toast.error("Товар не найден");
          setProduct(null);
          return;
        }

        const clonedProduct = cloneProduct(found);
        setProduct(clonedProduct);
        setInitialProduct(clonedProduct);
      } catch (error) {
        console.error(error);
        setLoadError("Ошибка загрузки данных");
        toast.error("Не удалось загрузить данные товара");
        setProduct(null);
        setInitialProduct(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, [mode, productId]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set([
          ...products.flatMap((item) => item.ProductCategories || []),
          ...(product?.ProductCategories || []),
        ]),
      ).sort(),
    [products, product?.ProductCategories],
  );

  const updateField = (
    field: keyof DTProduct,
    value: DTProduct[keyof DTProduct],
  ) => {
    setProduct((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  };

  const normalizedProductTitle = product?.Title.trim().replace(/\s+/g, " ").toLowerCase();
  const isDuplicateTitle = Boolean(
    product &&
      normalizedProductTitle &&
      products.some(
        (item) =>
          item.ID !== product.ID &&
          item.Title.trim().replace(/\s+/g, " ").toLowerCase() ===
            normalizedProductTitle,
      ),
  );
  const hasChanges = Boolean(
    product &&
      initialProduct &&
      JSON.stringify(product) !== JSON.stringify(initialProduct),
  );

  const requestNavigation = (path: string) => {
    if (!hasChanges || allowNavigationRef.current) {
      allowNavigationRef.current = true;
      router.push(path);
      return;
    }

    setPendingNavigationPath(path);
    setIsExitConfirmOpen(true);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    currentHrefRef.current = window.location.href;
  }, []);

  useEffect(() => {
    if (!hasChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowNavigationRef.current) return;

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasChanges]);

  useEffect(() => {
    if (!hasChanges) return;

    const handleDocumentClick = (event: MouseEvent) => {
      if (allowNavigationRef.current) return;
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const nextPath = getInternalNavigationPath(anchor.href);
      if (!nextPath) return;

      const currentPath = getInternalNavigationPath(window.location.href);
      if (nextPath === currentPath) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingNavigationPath(nextPath);
      setIsExitConfirmOpen(true);
    };

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [hasChanges]);

  useEffect(() => {
    if (!hasChanges) {
      if (typeof window !== "undefined") {
        currentHrefRef.current = window.location.href;
      }
      return;
    }

    const handlePopState = () => {
      if (allowNavigationRef.current) return;

      const targetHref = window.location.href;
      const previousHref = currentHrefRef.current || targetHref;
      const nextPath = getInternalNavigationPath(targetHref);

      window.history.pushState(null, "", previousHref);

      if (!nextPath) return;

      setPendingNavigationPath(nextPath);
      setIsExitConfirmOpen(true);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [hasChanges]);

  const handleSave = async () => {
    if (!product || isSaving || !hasChanges) return;

    const now = new Date().toISOString();
    const productWithDates: DTProduct = {
      ...product,
      Currency: "RUR",
      CreatedAt:
        mode === "create" ? product.CreatedAt || now : product.CreatedAt || now,
      UpdatedAt: now,
    };

    const updatedProducts =
      mode === "create"
        ? [...products, productWithDates]
        : products.map((item) =>
            item.ID === product.ID
              ? {
                  ...productWithDates,
                  CreatedAt: product.CreatedAt || item.CreatedAt || now,
                }
              : item,
          );
    const normalizedProducts =
      normalizeProductRecommendations(updatedProducts);

    const payloadBytes = getJsonPayloadSizeBytes(normalizedProducts);
    if (payloadBytes > SAFE_FUNCTION_BODY_LIMIT_BYTES) {
      toast.error("Слишком большой объем данных для публикации", {
        description: `Размер запроса: ${formatBytes(payloadBytes)}. Лимит Vercel: ${formatBytes(VERCEL_FUNCTION_BODY_LIMIT_BYTES)}. Уменьшите размер/количество изображений.`,
      });
      return;
    }

    setIsSaving(true);
    const loadingToastId = toast.loading(
      mode === "create" ? "Создаем товар..." : "Сохраняем изменения...",
    );

    try {
      const res = await fetch("/api/admin/products", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(normalizedProducts),
      });

      if (!res.ok) {
        if (res.status === 413) {
          throw new Error(
            `Размер запроса превышает лимит Vercel (${formatBytes(VERCEL_FUNCTION_BODY_LIMIT_BYTES)}).`,
          );
        }

        const message = await readApiErrorMessage(
          res,
          "Не удалось сохранить товар",
        );
        throw new Error(message);
      }
      if (isOfflineQueuedResponse(res)) {
        toast.dismiss(loadingToastId);
        queueAdminProductToast({
          type: "info",
          message: "Изменения поставлены в очередь",
          description: "Они отправятся автоматически при восстановлении сети.",
          delayMs: 500,
        });
        allowNavigationRef.current = true;
        router.push("/admin");
        router.refresh();
        return;
      }

      toast.dismiss(loadingToastId);
      invalidateCatalogProductsCache();
      queueAdminProductToast({
        type: "success",
        message:
          mode === "create"
            ? "Товар успешно добавлен"
            : "Изменения товара успешно сохранены",
        description: "Изменения в меню опубликованы.",
        delayMs: 500,
      });

      allowNavigationRef.current = true;
      router.push("/admin");
      router.refresh();
    } catch (error) {
      console.error(error);
      setLoadError("Ошибка сохранения");
      toast.dismiss(loadingToastId);
      toast.error(
        mode === "create"
          ? "Не удалось создать товар"
          : "Не удалось сохранить изменения",
        {
          description:
            error instanceof Error ? error.message : "Попробуйте еще раз",
        },
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <GlobalLoader mode="inline" className="min-h-[50vh]" />;
  }

  if (!product) {
    return (
      <div className="surface-card p-6 text-center space-y-4">
        <p className="text-red-600">{loadError || "Товар не найден"}</p>
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="btn-secondary"
        >
          Вернуться в админку
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loadError && (
        <div className="rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">
          {loadError}
        </div>
      )}

      <ProductForm
        product={product}
        isNew={mode === "create"}
        categories={categories}
        products={products}
        canSave={mode === "create" || hasChanges}
        duplicateTitleError={
          isDuplicateTitle ? "Товар с таким названием уже есть." : undefined
        }
        isSaving={isSaving}
        onChange={updateField}
        onSave={handleSave}
        onCancel={() => requestNavigation("/admin")}
      />

      <ConfirmModal
        open={isExitConfirmOpen}
        title="Выйти без сохранения?"
        description="Несохраненные изменения будут потеряны."
        confirmText={isLoading ? <ButtonSpinner /> : "Выйти"}
        cancelText="Остаться"
        onConfirm={() => {
          const nextPath = pendingNavigationPath || "/admin";
          allowNavigationRef.current = true;
          setIsExitConfirmOpen(false);
          setPendingNavigationPath(null);
          router.push(nextPath);
        }}
        onCancel={() => {
          setIsExitConfirmOpen(false);
          setPendingNavigationPath(null);
        }}
      />
    </div>
  );
}
