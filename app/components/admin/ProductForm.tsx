"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import Image from "next/image";
import ImageCropperModal from "./ImageCropperModal";
import {
  IMAGE_ACCEPT_ATTRIBUTE,
  IMAGE_SUPPORTED_FORMATS_LABEL,
  MAX_GALLERY_IMAGES,
  createUploadFileFromBlob,
  sanitizeNumericString,
  slugifyProductTitle,
  uploadImageToAdmin,
  validateImageFile,
} from "../../services/admin/productForm";
import { cropImageFile } from "../../services/admin/imageCropper";
import ButtonSpinner from "../common/ButtonSpinner";

type Props = {
  product: DTProduct;
  isNew: boolean;
  categories: string[];
  isSaving?: boolean;
  canSave?: boolean;
  onChange: (field: keyof DTProduct, value: DTProduct[keyof DTProduct]) => void;
  onSave: () => void;
  onCancel: () => void;
};

type FieldErrors = Partial<Record<keyof DTProduct, string>>;

type FileErrorState = {
  FeatureImageURL?: string;
  ProductImageGallery?: string;
};

type CropTarget = "feature" | "gallery";

type CropQueueState = {
  target: CropTarget;
  files: File[];
  currentIndex: number;
  previewUrl: string;
  isSubmitting: boolean;
};

export default function ProductForm({
  product,
  isNew,
  categories,
  isSaving = false,
  canSave = true,
  onChange,
  onSave,
  onCancel,
}: Props) {
  const [fileErrors, setFileErrors] = useState<FileErrorState>({});
  const [categoryToAdd, setCategoryToAdd] = useState("");
  const [cropQueue, setCropQueue] = useState<CropQueueState | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [draggedGalleryIndex, setDraggedGalleryIndex] = useState<number | null>(
    null,
  );

  useEffect(() => {
    const previewUrl = cropQueue?.previewUrl;
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [cropQueue?.previewUrl]);

  const startCropFlow = (target: CropTarget, files: File[]) => {
    if (files.length === 0) return;

    setCropQueue({
      target,
      files,
      currentIndex: 0,
      previewUrl: URL.createObjectURL(files[0]),
      isSubmitting: false,
    });
  };

  const moveToNextCropImage = () => {
    setCropQueue((prev) => {
      if (!prev) return prev;

      const nextIndex = prev.currentIndex + 1;
      if (nextIndex >= prev.files.length) {
        return null;
      }

      return {
        ...prev,
        currentIndex: nextIndex,
        previewUrl: URL.createObjectURL(prev.files[nextIndex]),
        isSubmitting: false,
      };
    });
  };

  const handleFeatureImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      setFileErrors((prev) => ({ ...prev, FeatureImageURL: error }));
      return;
    }

    setFileErrors((prev) => ({ ...prev, FeatureImageURL: undefined }));
    startCropFlow("feature", [file]);
  };

  const handleGalleryImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (files.length === 0) return;

    for (const file of files) {
      const error = validateImageFile(file);
      if (error) {
        setFileErrors((prev) => ({ ...prev, ProductImageGallery: error }));
        return;
      }
    }

    const totalCount = product.ProductImageGallery.length + files.length;
    if (totalCount > MAX_GALLERY_IMAGES) {
      setFileErrors((prev) => ({
        ...prev,
        ProductImageGallery: `В галерее может быть максимум ${MAX_GALLERY_IMAGES} изображений (включая уже добавленные).`,
      }));
      return;
    }

    setFileErrors((prev) => ({ ...prev, ProductImageGallery: undefined }));
    startCropFlow("gallery", files);
  };

  const handleCropConfirm = async ({
    croppedAreaPixels,
  }: {
    croppedAreaPixels: import("react-easy-crop").Area | null;
  }) => {
    if (!cropQueue) return;

    const activeFile = cropQueue.files[cropQueue.currentIndex];
    if (!activeFile) return;

    const errorField =
      cropQueue.target === "feature" ? "FeatureImageURL" : "ProductImageGallery";

    setCropQueue((prev) => (prev ? { ...prev, isSubmitting: true } : prev));
    setIsUploadingImage(true);

    try {
      const croppedBlob = await cropImageFile(activeFile, croppedAreaPixels);
      const preparedFile = createUploadFileFromBlob(
        croppedBlob,
        activeFile,
        `${cropQueue.target}-${cropQueue.currentIndex + 1}`,
      );
      const uploadSlug =
        product.Slug.trim() || slugifyProductTitle(product.Title) || "product";
      const imageUrl = await uploadImageToAdmin({
        file: preparedFile,
        slug: uploadSlug,
        type: cropQueue.target,
      });

      if (cropQueue.target === "feature") {
        onChange("FeatureImageURL", imageUrl);
      } else {
        onChange("ProductImageGallery", [...product.ProductImageGallery, imageUrl]);
      }

      setFileErrors((prev) => ({ ...prev, [errorField]: undefined }));
      moveToNextCropImage();
    } catch (error) {
      setFileErrors((prev) => ({
        ...prev,
        [errorField]:
          error instanceof Error
            ? error.message
            : "Не удалось обработать изображение",
      }));
      setCropQueue((prev) => (prev ? { ...prev, isSubmitting: false } : prev));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const cancelCropFlow = () => {
    setCropQueue(null);
    setIsUploadingImage(false);
  };

  const removeGalleryImage = (index: number) => {
    const updated = product.ProductImageGallery.filter((_, i) => i !== index);
    onChange("ProductImageGallery", updated);
  };

  const reorderGalleryImages = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || toIndex < 0) return;

    const updated = [...product.ProductImageGallery];
    const [moved] = updated.splice(fromIndex, 1);
    if (!moved) return;
    updated.splice(toIndex, 0, moved);
    onChange("ProductImageGallery", updated);
  };

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set([...categories, ...(product.ProductCategories || [])]),
      ).sort(),
    [categories, product.ProductCategories],
  );

  const validationErrors = useMemo<FieldErrors>(() => {
    const errors: FieldErrors = {};

    if (!product.Title.trim()) errors.Title = "Название обязательно.";
    if (!product.Slug.trim()) {
      errors.Slug = "Слаг обязателен.";
    } else if (!/^[a-z0-9-]+$/.test(product.Slug)) {
      errors.Slug =
        "Слаг должен содержать только английские буквы, цифры и '-'.";
    }

    if (!product.RegularPrice.trim()) errors.RegularPrice = "Цена обязательна.";

    if (
      product.SalePrice.trim() &&
      product.RegularPrice.trim() &&
      Number(product.SalePrice) === Number(product.RegularPrice)
    ) {
      errors.SalePrice =
        "Акционная цена должна отличаться от стандартной цены.";
    } else if (
      product.SalePrice.trim() &&
      product.RegularPrice.trim() &&
      Number(product.SalePrice) > Number(product.RegularPrice)
    ) {
      errors.SalePrice = "Акционная цена не может быть больше стандартной.";
    }

    if (product.PortionWeight <= 0) {
      errors.PortionWeight = "Вес/объём порции обязателен.";
    }
    if (!product.PortionUnit.trim()) {
      errors.PortionUnit = "Ед. измерения обязательна.";
    }
    if (!product.Currency.trim()) errors.Currency = "Валюта обязательна.";
    if (product.ProductCategories.length === 0) {
      errors.ProductCategories = "Выберите хотя бы одну категорию.";
    }
    if (!product.ShortDescription.trim()) {
      errors.ShortDescription = "Краткое описание обязательно.";
    }
    if (!product.LongDescription.trim()) {
      errors.LongDescription = "Полное описание обязательно.";
    }
    if (!product.FeatureImageURL.trim()) {
      errors.FeatureImageURL = "Главное изображение обязательно.";
    }
    if (
      product.IsNewArrival &&
      (!product.NewArrivalOrder || product.NewArrivalOrder < 1)
    ) {
      errors.NewArrivalOrder = "Для новинки укажите порядок (от 1).";
    }

    return errors;
  }, [
    product.Currency,
    product.FeatureImageURL,
    product.IsNewArrival,
    product.LongDescription,
    product.NewArrivalOrder,
    product.PortionUnit,
    product.PortionWeight,
    product.ProductCategories,
    product.RegularPrice,
    product.SalePrice,
    product.ShortDescription,
    product.Slug,
    product.Title,
  ]);

  const mergedErrors: FieldErrors = {
    ...validationErrors,
    ...(fileErrors.FeatureImageURL
      ? { FeatureImageURL: fileErrors.FeatureImageURL }
      : {}),
    ...(fileErrors.ProductImageGallery
      ? { ProductImageGallery: fileErrors.ProductImageGallery }
      : {}),
  };

  const hasErrors = Object.values(mergedErrors).some(Boolean);
  const isImageFlowActive = isUploadingImage || Boolean(cropQueue);
  const saveDisabled = hasErrors || isSaving || !canSave || isImageFlowActive;

  const handleTitleChange = (value: string) => {
    const currentAutoSlug = slugifyProductTitle(product.Title);
    const nextAutoSlug = slugifyProductTitle(value);

    onChange("Title", value);
    if (!product.Slug || product.Slug === currentAutoSlug) {
      onChange("Slug", nextAutoSlug);
    }
  };

  const handleSave = () => {
    if (saveDisabled) return;
    onSave();
  };

  const portionWeightValue =
    product.PortionWeight > 0 ? String(product.PortionWeight) : "";

  const newArrivalOrderValue =
    product.NewArrivalOrder && product.NewArrivalOrder > 0
      ? String(product.NewArrivalOrder)
      : "";

  const renderFieldError = (message?: string) => (
    <p
      className={`text-sm min-h-4 leading-4 ${message ? "text-red-600" : "text-transparent"}`}
      aria-live="polite"
    >
      {message || "\u00A0"}
    </p>
  );

  const renderFieldLabel = (label: string) => (
    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
      {label}
    </p>
  );

  return (
    <div className="surface-card p-4 sm:p-5 space-y-3">
      <h3 className="text-xl font-semibold">
        {isNew ? "Добавление товара" : "Редактирование товара"}
      </h3>

      <div className="space-y-1">
        {renderFieldLabel("Название")}
        <input
          className="form-control"
          placeholder="Название, например: Борщ домашний"
          value={product.Title}
          onChange={(event) => handleTitleChange(event.target.value)}
        />
        {renderFieldError(mergedErrors.Title)}
      </div>

      <div className="space-y-1">
        {renderFieldLabel("Slug")}
        <input
          className="form-control"
          placeholder="Слаг, например: borsch-domashniy"
          value={product.Slug}
          onChange={(event) => onChange("Slug", event.target.value.toLowerCase())}
        />
        {renderFieldError(mergedErrors.Slug)}
      </div>

      <div className="space-y-2">
        {renderFieldLabel("Статус товара")}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={product.Enabled}
              onChange={(event) => onChange("Enabled", event.target.checked)}
            />
            Активен
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={product.CatalogVisible}
              onChange={(event) =>
                onChange("CatalogVisible", event.target.checked)
              }
            />
            Показывать в каталоге
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(product.IsNewArrival)}
              onChange={(event) => {
                const checked = event.target.checked;
                onChange("IsNewArrival", checked);
                if (!checked) {
                  onChange("NewArrivalOrder", 0);
                }
              }}
            />
            Показывать в блоке &quot;Новинки&quot;
          </label>
        </div>

        {Boolean(product.IsNewArrival) && (
          <div className="space-y-1 sm:max-w-sm">
            {renderFieldLabel("Порядок в новинках (1, 2, 3...)")}
            <input
              className="form-control"
              placeholder="Например: 1"
              value={newArrivalOrderValue}
              inputMode="numeric"
              pattern="[0-9]*"
              onChange={(event) => {
                const normalized = sanitizeNumericString(event.target.value);
                onChange(
                  "NewArrivalOrder",
                  normalized ? Number(normalized) : 0,
                );
              }}
            />
            {renderFieldError(mergedErrors.NewArrivalOrder)}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          {renderFieldLabel("Стандартная цена")}
          <input
            className="form-control"
            placeholder="Цена, например: 350"
            value={product.RegularPrice}
            inputMode="numeric"
            pattern="[0-9]*"
            onChange={(event) =>
              onChange("RegularPrice", sanitizeNumericString(event.target.value))
            }
          />
          {renderFieldError(mergedErrors.RegularPrice)}
        </div>

        <div className="space-y-1">
          {renderFieldLabel("Акционная цена")}
          <input
            className="form-control"
            placeholder="Цена со скидкой (необязательно), например: 300"
            value={product.SalePrice}
            inputMode="numeric"
            pattern="[0-9]*"
            onChange={(event) =>
              onChange("SalePrice", sanitizeNumericString(event.target.value))
            }
          />
          {renderFieldError(mergedErrors.SalePrice)}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          {renderFieldLabel("Вес/объем порции")}
          <input
            className="form-control"
            placeholder="Порция, например: 300"
            value={portionWeightValue}
            inputMode="numeric"
            pattern="[0-9]*"
            onChange={(event) => {
              const normalized = sanitizeNumericString(event.target.value);
              onChange("PortionWeight", normalized ? Number(normalized) : 0);
            }}
          />
          {renderFieldError(mergedErrors.PortionWeight)}
        </div>

        <div className="space-y-1">
          {renderFieldLabel("Единица измерения")}
          <select
            className="form-control"
            value={product.PortionUnit}
            onChange={(event) => onChange("PortionUnit", event.target.value)}
          >
            <option value="" disabled>
              Ед. измерения
            </option>
            <option value="г">г</option>
            <option value="мл">мл</option>
          </select>
          {renderFieldError(mergedErrors.PortionUnit)}
        </div>
      </div>

      <div className="space-y-1">
        {renderFieldLabel("Валюта")}
        <input
          className="form-control bg-gray-100 text-gray-600 cursor-not-allowed"
          value="RUR (рубли)"
          disabled
          readOnly
        />
        {renderFieldError(mergedErrors.Currency)}
      </div>

      <div className="space-y-1">
        {renderFieldLabel("Категории")}
        <select
          className="form-control"
          value={categoryToAdd}
          onChange={(event) => {
            const nextCategory = event.target.value;
            setCategoryToAdd("");

            if (!nextCategory) return;
            if (product.ProductCategories.includes(nextCategory)) return;

            onChange("ProductCategories", [
              ...product.ProductCategories,
              nextCategory,
            ]);
          }}
        >
          <option value="">
            Выберите категорию/или несколько. Они будут отображаться в тегах
            ниже.
          </option>
          {categoryOptions.map((category) => {
            const isSelected = product.ProductCategories.includes(category);

            return (
              <option
                key={category}
                value={category}
                disabled={isSelected}
                className={isSelected ? "bg-yellow-100 text-gray-700" : ""}
                style={
                  isSelected
                    ? { backgroundColor: "#fef3c7", color: "#374151" }
                    : undefined
                }
              >
                {isSelected ? `${category} (выбрано)` : category}
              </option>
            );
          })}
        </select>
        <div className="flex flex-wrap gap-2 min-h-8">
          {product.ProductCategories.map((category) => (
            <button
              key={category}
              type="button"
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-800 border"
              onClick={() =>
                onChange(
                  "ProductCategories",
                  product.ProductCategories.filter((item) => item !== category),
                )
              }
            >
              {category}
              <span className="text-gray-500">x</span>
            </button>
          ))}
        </div>
        {renderFieldError(mergedErrors.ProductCategories)}
      </div>

      <div className="space-y-1">
        {renderFieldLabel("Краткое описание")}
        <textarea
          className="form-control min-h-20"
          placeholder="Краткое описание, например: Насыщенный борщ со сметаной"
          value={product.ShortDescription}
          onChange={(event) => onChange("ShortDescription", event.target.value)}
        />
        {renderFieldError(mergedErrors.ShortDescription)}
      </div>

      <div className="space-y-1">
        {renderFieldLabel("Полное описание")}
        <textarea
          className="form-control min-h-28"
          placeholder="Полное описание, например: Готовим на наваристом бульоне..."
          value={product.LongDescription}
          onChange={(event) => onChange("LongDescription", event.target.value)}
        />
        {renderFieldError(mergedErrors.LongDescription)}
      </div>

      <div className="space-y-2">
        {renderFieldLabel("Главное изображение (до 5 МБ)")}
        <p className="text-xs text-gray-500">
          Форматы: {IMAGE_SUPPORTED_FORMATS_LABEL}. Рекомендуемый размер для
          качества: 1200x1200 px (квадрат 1:1).
        </p>
        <p className="text-xs text-gray-500">
          {product.FeatureImageURL
            ? "Главное изображение уже загружено. Вы можете заменить его новым."
            : "Главное изображение пока не загружено."}
        </p>

        <label className="btn-secondary cursor-pointer">
          {product.FeatureImageURL
            ? "Заменить главное изображение"
            : "Загрузить главное изображение"}
          <input
            type="file"
            accept={IMAGE_ACCEPT_ATTRIBUTE}
            onChange={handleFeatureImage}
            className="hidden"
          />
        </label>

        {product.FeatureImageURL && (
          <Image
            src={product.FeatureImageURL}
            alt="Главное изображение"
            width={160}
            height={160}
            className="w-40 h-40 object-cover rounded border"
          />
        )}

        {renderFieldError(mergedErrors.FeatureImageURL)}
      </div>

      <div className="space-y-2">
        {renderFieldLabel(
          `Галерея (до 5 МБ на файл, максимум ${MAX_GALLERY_IMAGES})`,
        )}
        <p className="text-xs text-gray-500">
          Форматы: {IMAGE_SUPPORTED_FORMATS_LABEL}. Рекомендуемый размер для
          качества: 1600x900 px (16:9) или минимум 1200 px по длинной стороне.
        </p>
        <p className="text-xs text-gray-500">
          Загружено {product.ProductImageGallery.length} из {MAX_GALLERY_IMAGES}.
          {product.ProductImageGallery.length > 1
            ? " Перетащите карточки мышью, чтобы поменять порядок."
            : ""}
        </p>

        <label className="btn-secondary cursor-pointer">
          Загрузить изображения галереи
          <input
            type="file"
            accept={IMAGE_ACCEPT_ATTRIBUTE}
            multiple
            onChange={handleGalleryImages}
            className="hidden"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {product.ProductImageGallery.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className={`relative cursor-move transition ${draggedGalleryIndex === index ? "opacity-60" : ""}`}
              draggable
              onDragStart={() => setDraggedGalleryIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggedGalleryIndex !== null) {
                  reorderGalleryImages(draggedGalleryIndex, index);
                }
                setDraggedGalleryIndex(null);
              }}
              onDragEnd={() => setDraggedGalleryIndex(null)}
            >
              <Image
                src={url}
                alt={`Галерея ${index + 1}`}
                width={96}
                height={96}
                className="w-24 h-24 object-cover rounded border"
              />
              <button
                type="button"
                onClick={() => removeGalleryImage(index)}
                className="absolute -top-2 -right-2 bg-black/70 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                title="Удалить изображение"
              >
                x
              </button>
            </div>
          ))}
        </div>

        {renderFieldError(mergedErrors.ProductImageGallery)}
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary min-w-28"
          disabled={isSaving || isImageFlowActive}
        >
          Отмена
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="btn-primary min-w-32"
          disabled={saveDisabled}
        >
          {isSaving || isImageFlowActive ? (
            <ButtonSpinner />
          ) : isNew ? (
            "Добавить"
          ) : (
            "Сохранить"
          )}
        </button>
      </div>

      {cropQueue && (
        <ImageCropperModal
          key={cropQueue.previewUrl}
          open
          imageUrl={cropQueue.previewUrl}
          fileName={
            cropQueue.files[cropQueue.currentIndex]
              ? `${cropQueue.currentIndex + 1}/${cropQueue.files.length} - ${cropQueue.files[cropQueue.currentIndex].name}`
              : ""
          }
          isSubmitting={cropQueue.isSubmitting}
          onCancel={cancelCropFlow}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}
