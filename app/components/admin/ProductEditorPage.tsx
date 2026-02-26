"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import GlobalLoader from "../GlobalLoader";
import ProductForm from "./ProductForm";
import ConfirmModal from "../common/ConfirmModal";
import {
  ADMIN_PROPAGATION_WARNING_DESCRIPTION,
  ADMIN_PROPAGATION_WARNING_TITLE,
  queueAdminProductToast,
  shouldShowAdminPropagationWarning,
} from "../../lib/adminProductToast";
import {
  formatBytes,
  getJsonPayloadSizeBytes,
  SAFE_FUNCTION_BODY_LIMIT_BYTES,
  VERCEL_FUNCTION_BODY_LIMIT_BYTES,
} from "../../lib/payloadSize";
import { cloneProduct, createEmptyProduct } from "../../services/admin/productEditor";
import { readApiErrorMessage } from "../../services/shared/http";

type Props = {
  mode: "create" | "edit";
  productId?: string;
};

export default function ProductEditorPage({ mode, productId }: Props) {
  const router = useRouter();
  const [products, setProducts] = useState<DTProduct[]>([]);
  const [product, setProduct] = useState<DTProduct | null>(null);
  const [initialProduct, setInitialProduct] = useState<DTProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);

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
          setInitialProduct(null);
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

  const hasChanges =
    mode === "create"
      ? true
      : Boolean(
          product &&
            initialProduct &&
            JSON.stringify(product) !== JSON.stringify(initialProduct),
        );

  const handleSave = async () => {
    if (!product || isSaving || (mode === "edit" && !hasChanges)) return;

    if (shouldShowAdminPropagationWarning()) {
      toast.warning(ADMIN_PROPAGATION_WARNING_TITLE, {
        description: ADMIN_PROPAGATION_WARNING_DESCRIPTION,
        duration: 7000,
      });
    }

    const now = new Date().toISOString();
    const productWithDates: DTProduct = {
      ...product,
      Currency: "RUR",
      CreatedAt:
        mode === "create"
          ? product.CreatedAt || now
          : product.CreatedAt || now,
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

    const payloadBytes = getJsonPayloadSizeBytes(updatedProducts);
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
        body: JSON.stringify(updatedProducts),
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

      toast.dismiss(loadingToastId);
      queueAdminProductToast({
        type: "success",
        message:
          mode === "create"
            ? "Товар успешно добавлен"
            : "Изменения товара успешно сохранены",
        description: "Изменения в меню могут появиться в течение нескольких минут.",
        delayMs: 500,
      });

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
        canSave={mode === "create" || hasChanges}
        isSaving={isSaving}
        onChange={updateField}
        onSave={handleSave}
        onCancel={() => setIsExitConfirmOpen(true)}
      />

      <ConfirmModal
        open={isExitConfirmOpen}
        title="Выйти без сохранения?"
        description="Несохраненные изменения будут потеряны."
        confirmText="Выйти"
        cancelText="Остаться"
        onConfirm={() => {
          setIsExitConfirmOpen(false);
          router.push("/admin");
        }}
        onCancel={() => setIsExitConfirmOpen(false)}
      />
    </div>
  );
}
