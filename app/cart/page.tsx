"use client";

import { useMemo, useState } from "react";
import { Provider } from "react-redux";
import { store } from "../store/store";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { useLocalization } from "../context/LocalizationContext";
import Image from "next/image";
import Link from "next/link";
import {
  clearCart,
  removeFromCart,
  updateQuantity,
} from "../store/slices/cartSlice";
import { showMiniCart } from "../utils/MiniCartController";
import {
  CircleMinus,
  CirclePlus,
  Clock3,
  ShoppingCart,
  Tag,
  Trash2,
} from "lucide-react";
import ProceedToCheckoutButton from "../components/cart/ProceedToCheckoutButton";
import ConfirmModal from "../components/common/ConfirmModal";

const CART_UPDATED_AT_KEY = "cart_updated_at";
const CART_TTL_MS = 24 * 60 * 60 * 1000;

function CartContent() {
  const { labels } = useLocalization();
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.cart.items);
  const [isClearCartConfirmOpen, setIsClearCartConfirmOpen] = useState(false);

  const expiresAt = useMemo(() => {
    if (typeof window === "undefined" || items.length === 0) {
      return null;
    }

    const raw = localStorage.getItem(CART_UPDATED_AT_KEY);
    const updatedAt = raw ? Number(raw) : NaN;
    if (!Number.isFinite(updatedAt)) {
      return null;
    }

    return updatedAt + CART_TTL_MS;
  }, [items.length]);

  const total = items.reduce(
    (sum, item) =>
      sum + item.quantity * parseFloat(item.SalePrice || item.RegularPrice),
    0,
  );
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleQtyChange = (id: string, delta: number) => {
    const item = items.find((i) => i.ID === id);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty >= 1) {
      dispatch(updateQuantity({ id, quantity: newQty }));
      showMiniCart();
    }
  };

  const formattedExpiry = expiresAt
    ? new Date(expiresAt).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <section className="section-wrap min-h-[calc(100vh-var(--header-height))]">
      <div className="app-shell">
        <div className="mb-8 space-y-4">
          <h1 className="page-title text-center inline-flex w-full items-center justify-center gap-2">
            <ShoppingCart size={30} className="text-amber-600" />
            {labels.yourCart || "Ваша корзина"}
          </h1>

          {items.length > 0 && formattedExpiry && (
            <div className="cart-expiry-notice rounded-xl border px-4 py-3 text-sm flex items-start gap-2.5">
              <Clock3 size={18} className="mt-0.5 shrink-0" />
              <p>
                Товары в корзине хранятся 24 часа после последнего изменения.
                Если заказ не будет оформлен, корзина очистится автоматически{" "}
                <strong>{formattedExpiry}</strong>.
              </p>
            </div>
          )}

          {items.length > 0 && (
            <div className="flex justify-center sm:justify-end">
              <button
                type="button"
                className="btn-secondary text-rose-700 border-rose-300 hover:bg-rose-50/80 dark:hover:bg-rose-900/20"
                onClick={() => setIsClearCartConfirmOpen(true)}
              >
                <Trash2 size={16} />
                Очистить корзину
              </button>
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div className="mt-10 mb-30 text-center flex flex-col items-center gap-2">
            <ShoppingCart size={28} className="text-[color:var(--color-muted)]" />
            <p className="text-gray-600">{labels.cartEmpty || "Корзина пуста."}</p>
          </div>
        ) : (
          <>
            <div className="surface-card p-4 sm:p-5 space-y-6">
              {items.map((item) => {
                const price = parseFloat(item.SalePrice || item.RegularPrice);
                const itemTotal = price * item.quantity;

                return (
                  <div
                    key={item.ID}
                    className="flex flex-col sm:flex-row gap-4 sm:items-center border-b pb-4"
                  >
                    <Image
                      src={item.FeatureImageURL}
                      alt={item.Title}
                      width={80}
                      height={100}
                      className="object-cover rounded"
                    />
                    <div className="flex-1">
                      <Link
                        href={`/product/${item.Slug}`}
                        className="text-lg font-semibold text-slate-900 hover:text-amber-700"
                      >
                        {item.Title}
                      </Link>
                      <p className="text-sm text-slate-600 mt-1 inline-flex items-center gap-1.5">
                        <Tag size={14} />
                        {labels.price || "Цена"}: {price.toFixed(2)} ₽
                      </p>
                      <div className="flex items-center mt-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleQtyChange(item.ID, -1)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          aria-label={`Уменьшить количество ${item.Title}`}
                        >
                          <CircleMinus size={19} />
                        </button>
                        <span className="text-sm font-semibold min-w-7 text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQtyChange(item.ID, 1)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          aria-label={`Увеличить количество ${item.Title}`}
                        >
                          <CirclePlus size={19} />
                        </button>
                      </div>
                      <p className="text-sm text-slate-900 mt-1 inline-flex items-center gap-1.5">
                        <ShoppingCart size={14} />
                        {labels.total || "Итого"}: {itemTotal.toFixed(2)} ₽
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        dispatch(removeFromCart(item.ID));
                        showMiniCart();
                      }}
                      className="self-end sm:self-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-rose-950/30 transition"
                      title={labels.remove || "Удалить"}
                      aria-label={`${labels.remove || "Удалить"} ${item.Title}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 space-y-4 flex flex-col items-end">
              <p className="text-xl font-semibold text-slate-900 inline-flex items-center gap-2">
                <ShoppingCart size={18} className="text-amber-600" />
                {labels.total || "Всего"}: {total.toFixed(2)} ₽
              </p>

              <ProceedToCheckoutButton
                label={labels.proceedToCheckout || "Перейти к оформлению"}
              />
            </div>
          </>
        )}
      </div>

      <ConfirmModal
        open={isClearCartConfirmOpen}
        title="Очистить корзину полностью?"
        description={`Будет удалено ${items.length} товаров (${totalUnits} шт.). Это действие нельзя отменить.`}
        confirmText="Очистить"
        cancelText="Отмена"
        onConfirm={() => {
          dispatch(clearCart());
          showMiniCart();
          setIsClearCartConfirmOpen(false);
        }}
        onCancel={() => setIsClearCartConfirmOpen(false)}
      />
    </section>
  );
}

export default function CartPage() {
  return (
    <Provider store={store}>
      <CartContent />
    </Provider>
  );
}
