"use client";

import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";

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

  const slugify = (value: string) => {
    const map: Record<string, string> = {
      а: "a",
      б: "b",
      в: "v",
      г: "g",
      д: "d",
      е: "e",
      ё: "e",
      ж: "zh",
      з: "z",
      и: "i",
      й: "y",
      к: "k",
      л: "l",
      м: "m",
      н: "n",
      о: "o",
      п: "p",
      р: "r",
      с: "s",
      т: "t",
      у: "u",
      ф: "f",
      х: "h",
      ц: "ts",
      ч: "ch",
      ш: "sh",
      щ: "sch",
      ъ: "",
      ы: "y",
      ь: "",
      э: "e",
      ю: "yu",
      я: "ya",
    };

    return value
      .trim()
      .toLowerCase()
      .split("")
      .map((char) => map[char] ?? char)
      .join("")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-+/g, "-");
  };

  const sanitizeNumericString = (value: string) => value.replace(/[^\d]/g, "");

  const validateJpgFile = (file: File): string | null => {
    const isJpg = file.name.toLowerCase().endsWith(".jpg");

    if (!isJpg) {
      return `Формат файла "${file.name}" должен быть .jpg`;
    }

    if (file.size > 5 * 1024 * 1024) {
      return `Файл "${file.name}" больше 5 МБ`;
    }

    return null;
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("File read failed"));
      reader.readAsDataURL(file);
    });

  const handleFeatureImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const error = validateJpgFile(file);
    if (error) {
      setFileErrors((prev) => ({ ...prev, FeatureImageURL: error }));
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      onChange("FeatureImageURL", dataUrl);
      setFileErrors((prev) => ({ ...prev, FeatureImageURL: undefined }));
    } catch {
      setFileErrors((prev) => ({
        ...prev,
        FeatureImageURL: "Не удалось прочитать файл",
      }));
    }
  };

  const handleGalleryImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      const error = validateJpgFile(file);
      if (error) {
        setFileErrors((prev) => ({ ...prev, ProductImageGallery: error }));
        event.target.value = "";
        return;
      }
    }

    const totalCount = product.ProductImageGallery.length + files.length;
    if (totalCount > 5) {
      setFileErrors((prev) => ({
        ...prev,
        ProductImageGallery:
          "В галерее может быть максимум 5 изображений (включая уже добавленные).",
      }));
      event.target.value = "";
      return;
    }

    try {
      const dataUrls = await Promise.all(files.map(readFileAsDataUrl));
      onChange("ProductImageGallery", [
        ...product.ProductImageGallery,
        ...dataUrls,
      ]);
      setFileErrors((prev) => ({ ...prev, ProductImageGallery: undefined }));
    } catch {
      setFileErrors((prev) => ({
        ...prev,
        ProductImageGallery: "Не удалось прочитать файлы галереи",
      }));
    }
  };

  const removeGalleryImage = (index: number) => {
    const updated = product.ProductImageGallery.filter((_, i) => i !== index);
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

    return errors;
  }, [
    product.Currency,
    product.FeatureImageURL,
    product.LongDescription,
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
  const saveDisabled = hasErrors || isSaving || !canSave;

  const handleTitleChange = (value: string) => {
    const currentAutoSlug = slugify(product.Title);
    const nextAutoSlug = slugify(value);

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
          onChange={(e) => handleTitleChange(e.target.value)}
        />
        {renderFieldError(mergedErrors.Title)}
      </div>

      <div className="space-y-1">
        {renderFieldLabel("Slug")}
        <input
          className="form-control"
          placeholder="Слаг, например: borsch-domashniy"
          value={product.Slug}
          onChange={(e) => onChange("Slug", e.target.value.toLowerCase())}
        />
        {renderFieldError(mergedErrors.Slug)}
      </div>

      <div className="space-y-1">
        {renderFieldLabel("Статус товара")}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={product.Enabled}
              onChange={(e) => onChange("Enabled", e.target.checked)}
            />
            Активен
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={product.CatalogVisible}
              onChange={(e) => onChange("CatalogVisible", e.target.checked)}
            />
            Показывать в каталоге
          </label>
        </div>
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
            onChange={(e) =>
              onChange("RegularPrice", sanitizeNumericString(e.target.value))
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
            onChange={(e) =>
              onChange("SalePrice", sanitizeNumericString(e.target.value))
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
            onChange={(e) => {
              const normalized = sanitizeNumericString(e.target.value);
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
            onChange={(e) => onChange("PortionUnit", e.target.value)}
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
          onChange={(e) => {
            const nextCategory = e.target.value;
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
          onChange={(e) => onChange("ShortDescription", e.target.value)}
        />
        {renderFieldError(mergedErrors.ShortDescription)}
      </div>

      <div className="space-y-1">
        {renderFieldLabel("Полное описание")}
        <textarea
          className="form-control min-h-28"
          placeholder="Полное описание, например: Готовим на наваристом бульоне..."
          value={product.LongDescription}
          onChange={(e) => onChange("LongDescription", e.target.value)}
        />
        {renderFieldError(mergedErrors.LongDescription)}
      </div>

      <div className="space-y-2">
        {renderFieldLabel("Главное изображение (.jpg до 5 МБ)")}

        <label className="btn-secondary cursor-pointer">
          Загрузить главное изображение
          <input
            type="file"
            accept=".jpg"
            onChange={handleFeatureImage}
            className="hidden"
          />
        </label>

        {product.FeatureImageURL && (
          <img
            src={product.FeatureImageURL}
            alt="Главное изображение"
            className="w-40 h-40 object-cover rounded border"
          />
        )}

        {renderFieldError(mergedErrors.FeatureImageURL)}
      </div>

      <div className="space-y-2">
        {renderFieldLabel("Галерея (.jpg до 5 МБ, максимум 5)")}

        <label className="btn-secondary cursor-pointer">
          Загрузить изображения галереи
          <input
            type="file"
            accept=".jpg"
            multiple
            onChange={handleGalleryImages}
            className="hidden"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {product.ProductImageGallery.map((url, index) => (
            <div key={`${url}-${index}`} className="relative">
              <img
                src={url}
                alt={`Галерея ${index + 1}`}
                className="w-24 h-24 object-cover rounded border"
              />
              <button
                type="button"
                onClick={() => removeGalleryImage(index)}
                className="absolute -top-2 -right-2 bg-black/70 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
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
          className="btn-secondary"
          disabled={isSaving}
        >
          Отмена
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="btn-primary min-w-32"
          disabled={saveDisabled}
        >
          {isSaving ? (
            <span className="inline-block h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          ) : isNew ? (
            "Добавить"
          ) : (
            "Сохранить"
          )}
        </button>
      </div>
    </div>
  );
}
