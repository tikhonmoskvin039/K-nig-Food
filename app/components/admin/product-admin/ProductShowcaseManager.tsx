"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { sanitizeNumericString } from "../../../services/admin/productForm";
import {
  hasDiscountPrice,
  isNewArrivalProduct,
  isWeeklyOfferProduct,
  SHOWCASE_MAX_ITEMS,
  sortByShowcaseOrder,
} from "../../../utils/productShowcase";
import ButtonSpinner from "../../common/ButtonSpinner";
import ConfirmModal from "../../common/ConfirmModal";

type SaveProducts = (
  updatedProducts: DTProduct[],
  messages: { success: string; error: string },
) => Promise<boolean>;

type Props = {
  products: DTProduct[];
  isSaving: boolean;
  onProductsChange: (nextProducts: DTProduct[]) => void;
  onSaveProducts: SaveProducts;
};

type BlockKind = "new_arrivals" | "weekly_offers";

const slots = Array.from({ length: SHOWCASE_MAX_ITEMS }, (_, index) => index + 1);

const isAssigned = (product: DTProduct, block: BlockKind) =>
  block === "new_arrivals"
    ? isNewArrivalProduct(product)
    : isWeeklyOfferProduct(product);

const getOrder = (product: DTProduct, block: BlockKind) =>
  block === "new_arrivals"
    ? product.NewArrivalOrder || 0
    : product.WeeklyOfferOrder || 0;

const applyBlockState = (
  product: DTProduct,
  block: BlockKind,
  nextState: { enabled: boolean; order: number },
): DTProduct =>
  block === "new_arrivals"
    ? {
        ...product,
        IsNewArrival: nextState.enabled,
        NewArrivalOrder: nextState.order,
      }
    : {
        ...product,
        IsWeeklyOffer: nextState.enabled,
        WeeklyOfferOrder: nextState.order,
      };

const sortAssigned = (products: DTProduct[], block: BlockKind) =>
  sortByShowcaseOrder(
    products,
    block === "new_arrivals" ? "NewArrivalOrder" : "WeeklyOfferOrder",
  );

const normalizeBlock = (products: DTProduct[], block: BlockKind) => {
  const assigned = sortAssigned(
    products.filter((product) =>
      block === "weekly_offers"
        ? isAssigned(product, block) && hasDiscountPrice(product)
        : isAssigned(product, block),
    ),
    block,
  ).slice(0, SHOWCASE_MAX_ITEMS);

  const orderMap = new Map(assigned.map((item, index) => [item.ID, index + 1]));

  return products.map((product) => {
    const normalizedOrder = orderMap.get(product.ID);

    if (!normalizedOrder) {
      return applyBlockState(product, block, {
        enabled: false,
        order: 0,
      });
    }

    return applyBlockState(product, block, {
      enabled: true,
      order: normalizedOrder,
    });
  });
};

type BlockEditorProps = {
  block: BlockKind;
  title: string;
  subtitle: string;
  products: DTProduct[];
  categoryFilter: string;
  searchQuery: string;
  selectedProductId: string;
  isSaving: boolean;
  onCategoryFilterChange: (value: string) => void;
  onSearchQueryChange: (value: string) => void;
  onSelectedProductIdChange: (value: string) => void;
  onProductsChange: (nextProducts: DTProduct[]) => void;
};

function BlockEditor({
  block,
  title,
  subtitle,
  products,
  categoryFilter,
  searchQuery,
  selectedProductId,
  isSaving,
  onCategoryFilterChange,
  onSearchQueryChange,
  onSelectedProductIdChange,
  onProductsChange,
}: BlockEditorProps) {
  const [removeCandidate, setRemoveCandidate] = useState<DTProduct | null>(null);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(products.flatMap((product) => product.ProductCategories || [])),
      ).sort((a, b) => a.localeCompare(b, "ru")),
    [products],
  );

  const eligibleProducts = useMemo(() => {
    return products
      .filter((product) => product.Enabled && product.CatalogVisible)
      .filter((product) =>
        block === "weekly_offers" ? hasDiscountPrice(product) : true,
      )
      .filter((product) =>
        categoryFilter === "all"
          ? true
          : product.ProductCategories.includes(categoryFilter),
      )
      .sort((a, b) => a.Title.localeCompare(b.Title, "ru"));
  }, [block, categoryFilter, products]);

  const assignedProducts = useMemo(
    () =>
      sortAssigned(
        products.filter((product) => isAssigned(product, block)),
        block,
      ),
    [block, products],
  );

  const occupiedSlots = useMemo(
    () =>
      assignedProducts
        .map((product) => getOrder(product, block))
        .filter((order) => order > 0 && order <= SHOWCASE_MAX_ITEMS)
        .sort((a, b) => a - b),
    [assignedProducts, block],
  );

  const freeSlots = slots.filter((slot) => !occupiedSlots.includes(slot));
  const allSlotsTaken = freeSlots.length === 0;
  const maxItemsReached = assignedProducts.length >= SHOWCASE_MAX_ITEMS;
  const addDisabledByLimit = allSlotsTaken || maxItemsReached;

  const assignedIds = new Set(assignedProducts.map((product) => product.ID));
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const addableProducts = eligibleProducts
    .filter((product) => !assignedIds.has(product.ID))
    .filter((product) => {
      if (!normalizedSearch) return true;

      return [
        product.Title,
        product.Slug,
        ...(product.ProductCategories || []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });

  const updateOrder = (productId: string, rawValue: string) => {
    const normalized = sanitizeNumericString(rawValue);
    const nextOrder = Number(normalized);

    if (!normalized) return;

    if (!Number.isFinite(nextOrder) || nextOrder < 1 || nextOrder > SHOWCASE_MAX_ITEMS) {
      toast.warning(`Введите цифру от 1 до ${SHOWCASE_MAX_ITEMS}`);
      return;
    }

    const isTaken = assignedProducts.some(
      (item) => item.ID !== productId && getOrder(item, block) === nextOrder,
    );

    if (isTaken) {
      toast.warning(`Позиция ${nextOrder} уже занята`);
      return;
    }

    const nextProducts = products.map((product) =>
      product.ID === productId
        ? applyBlockState(product, block, {
            enabled: true,
            order: nextOrder,
          })
        : product,
    );

    onProductsChange(nextProducts);
  };

  const removeFromBlock = (productId: string) => {
    const nextProducts = products.map((product) =>
      product.ID === productId
        ? applyBlockState(product, block, {
            enabled: false,
            order: 0,
          })
        : product,
    );
    onProductsChange(nextProducts);
  };

  const handleConfirmRemove = () => {
    if (!removeCandidate) return;
    removeFromBlock(removeCandidate.ID);
    setRemoveCandidate(null);
  };

  const addToBlock = () => {
    if (!selectedProductId) return;

    if (allSlotsTaken) {
      toast.warning("Все позиции (1-6) уже заняты. Освободите слот.");
      return;
    }

    if (maxItemsReached) {
      toast.warning(`В блоке уже максимум ${SHOWCASE_MAX_ITEMS} товаров.`);
      return;
    }

    const nextSlot = freeSlots[0];
    if (!nextSlot) return;

    const productToAdd = products.find((product) => product.ID === selectedProductId);
    if (!productToAdd) return;

    if (block === "weekly_offers" && !hasDiscountPrice(productToAdd)) {
      toast.warning("Для блока акций можно выбрать только товары со скидкой.");
      return;
    }

    const nextProducts = products.map((product) =>
      product.ID === selectedProductId
        ? applyBlockState(product, block, {
            enabled: true,
            order: nextSlot,
          })
        : product,
    );

    onProductsChange(nextProducts);
    onSelectedProductIdChange("");
  };

  return (
    <section
      className="rounded-2xl border p-4 md:p-5 space-y-4"
      style={{
        borderColor: "var(--color-border)",
        background:
          "color-mix(in srgb, var(--color-surface) 90%, var(--color-primary-soft) 10%)",
      }}
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-base md:text-lg font-semibold">{title}</h3>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          {subtitle}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span style={{ color: "var(--color-muted)" }}>Занятые позиции:</span>
        {occupiedSlots.length === 0 ? (
          <span style={{ color: "var(--color-muted)" }}>нет</span>
        ) : (
          occupiedSlots.map((slot) => (
            <span
              key={`${block}-slot-${slot}`}
              className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-100 px-2 font-semibold text-amber-800"
            >
              {slot}
            </span>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_minmax(220px,2fr)_auto] gap-3">
        <input
          type="text"
          className="form-control"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Живой поиск: название, slug, категория..."
          disabled={isSaving}
        />

        <select
          className="form-control"
          value={categoryFilter}
          onChange={(event) => onCategoryFilterChange(event.target.value)}
          disabled={isSaving}
        >
          <option value="all">Все категории</option>
          {categories.map((category) => (
            <option key={`${block}-category-${category}`} value={category}>
              {category}
            </option>
          ))}
        </select>

        <select
          className="form-control"
          value={selectedProductId}
          onChange={(event) => onSelectedProductIdChange(event.target.value)}
          disabled={isSaving || addableProducts.length === 0 || addDisabledByLimit}
        >
          <option value="">
            {addableProducts.length > 0
              ? "Выберите товар"
              : normalizedSearch
                ? "По запросу ничего не найдено"
                : "Нет доступных товаров для добавления"}
          </option>
          {addableProducts.map((product) => (
            <option key={`${block}-product-${product.ID}`} value={product.ID}>
              {product.Title}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="btn-primary min-w-36"
          onClick={addToBlock}
          disabled={
            isSaving ||
            !selectedProductId ||
            addableProducts.length === 0 ||
            addDisabledByLimit
          }
        >
          Добавить
        </button>
      </div>

      {addDisabledByLimit && (
        <p className="text-sm text-amber-700">
          {allSlotsTaken
            ? "Все позиции заняты. Чтобы добавить новый товар, сначала удалите один из текущих."
            : `В блоке уже максимум ${SHOWCASE_MAX_ITEMS} товаров. Удалите один товар, чтобы добавить другой.`}
        </p>
      )}

      {assignedProducts.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          Пока в блоке нет товаров. Добавьте позиции и назначьте им места 1-6.
        </p>
      ) : (
        <div className="space-y-2">
          {assignedProducts.map((product) => (
            <div
              key={`${block}-assigned-${product.ID}`}
              className="rounded-xl border px-3 py-2 md:px-4 md:py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              style={{
                borderColor: "var(--color-border)",
                background:
                  "color-mix(in srgb, var(--color-surface) 92%, var(--color-surface-soft) 8%)",
              }}
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{product.Title}</p>
                <p className="text-xs truncate" style={{ color: "var(--color-muted)" }}>
                  {(product.ProductCategories || []).join(" • ")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  className="form-control w-24 text-center"
                  value={String(getOrder(product, block) || "")}
                  onChange={(event) => updateOrder(product.ID, event.target.value)}
                  disabled={isSaving}
                  aria-label={`Позиция для товара ${product.Title}`}
                />

                <button
                  type="button"
                  className="btn-danger min-w-28"
                  onClick={() => setRemoveCandidate(product)}
                  disabled={isSaving}
                >
                  Убрать
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!removeCandidate}
        title="Убрать товар из блока?"
        description={
          removeCandidate
            ? `Товар "${removeCandidate.Title}" будет удален из блока "${title}".`
            : undefined
        }
        confirmText={isSaving ? <ButtonSpinner /> : "Убрать"}
        onConfirm={handleConfirmRemove}
        onCancel={() => setRemoveCandidate(null)}
      />
    </section>
  );
}

export default function ProductShowcaseManager({
  products,
  isSaving,
  onProductsChange,
  onSaveProducts,
}: Props) {
  const [newCategoryFilter, setNewCategoryFilter] = useState("all");
  const [weeklyCategoryFilter, setWeeklyCategoryFilter] = useState("all");
  const [newSearchQuery, setNewSearchQuery] = useState("");
  const [weeklySearchQuery, setWeeklySearchQuery] = useState("");
  const [newProductToAdd, setNewProductToAdd] = useState("");
  const [weeklyProductToAdd, setWeeklyProductToAdd] = useState("");

  const handleSave = async () => {
    const normalizedNew = normalizeBlock(products, "new_arrivals");
    const normalizedWeekly = normalizeBlock(normalizedNew, "weekly_offers");
    onProductsChange(normalizedWeekly);

    await onSaveProducts(normalizedWeekly, {
      success: "Блоки «Новинки» и «Предложения недели» сохранены",
      error: "Не удалось сохранить блоки витрины",
    });
  };

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl border p-4 md:p-5"
        style={{
          borderColor: "var(--color-border)",
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--color-primary-soft) 40%, var(--color-surface) 60%), var(--color-surface))",
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg md:text-xl font-semibold">Управление витриной</h2>
            <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
              Для каждого блока доступны позиции 1-6 без дублей. Если слоты заняты,
              добавить новый товар нельзя, пока не освободите место.
            </p>
          </div>

          <button
            type="button"
            className="btn-primary min-w-64"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <ButtonSpinner /> : "Сохранить блоки витрины"}
          </button>
        </div>
      </div>

      <BlockEditor
        block="new_arrivals"
        title="Блок «Новинки»"
        subtitle="Назначайте товары в позиции 1-6 для главной страницы."
        products={products}
        categoryFilter={newCategoryFilter}
        searchQuery={newSearchQuery}
        selectedProductId={newProductToAdd}
        isSaving={isSaving}
        onCategoryFilterChange={setNewCategoryFilter}
        onSearchQueryChange={setNewSearchQuery}
        onSelectedProductIdChange={setNewProductToAdd}
        onProductsChange={onProductsChange}
      />

      <BlockEditor
        block="weekly_offers"
        title="Блок «Предложения недели»"
        subtitle="В этот блок можно добавить только товары с акционной ценой."
        products={products}
        categoryFilter={weeklyCategoryFilter}
        searchQuery={weeklySearchQuery}
        selectedProductId={weeklyProductToAdd}
        isSaving={isSaving}
        onCategoryFilterChange={setWeeklyCategoryFilter}
        onSearchQueryChange={setWeeklySearchQuery}
        onSelectedProductIdChange={setWeeklyProductToAdd}
        onProductsChange={onProductsChange}
      />
    </div>
  );
}
