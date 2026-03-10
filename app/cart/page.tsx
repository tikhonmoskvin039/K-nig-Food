"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  ArrowDownCircle,
  ChevronLeft,
  ChevronRight,
  CircleMinus,
  CirclePlus,
  Clock3,
  CreditCard,
  ShoppingCart,
  Tag,
  Trash2,
} from "lucide-react";
import ProceedToCheckoutButton from "../components/cart/ProceedToCheckoutButton";
import ConfirmModal from "../components/common/ConfirmModal";
import { isTouchLikeDevice, triggerHapticFeedback } from "../utils/haptics";

const CART_UPDATED_AT_KEY = "cart_updated_at";
const CART_TTL_MS = 24 * 60 * 60 * 1000;

type CartItemGalleryProps = {
  images: string[];
  title: string;
  className?: string;
};

function CartItemGallery({ images, title, className }: CartItemGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const safeActiveIndex =
    images.length > 0 ? Math.min(activeIndex, images.length - 1) : 0;

  const goToIndex = (nextIndex: number) => {
    if (images.length <= 1) return;

    if (nextIndex < 0) {
      setActiveIndex(images.length - 1);
      return;
    }

    if (nextIndex >= images.length) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex(nextIndex);
  };

  const goPrev = () => goToIndex(safeActiveIndex - 1);
  const goNext = () => goToIndex(safeActiveIndex + 1);

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-slate-100 ${className || ""}`}
      onTouchStart={(event) => {
        touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const touchStartX = touchStartXRef.current;
        touchStartXRef.current = null;
        if (touchStartX === null) return;

        const deltaX = event.changedTouches[0].clientX - touchStartX;
        if (Math.abs(deltaX) < 28) return;
        if (deltaX < 0) {
          goNext();
          return;
        }
        goPrev();
      }}
    >
      <div
        className="flex h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${safeActiveIndex * 100}%)` }}
      >
        {images.map((imageUrl, index) => (
          <div key={`${imageUrl}-${index}`} className="relative h-full min-w-full">
            <Image
              src={imageUrl}
              alt={`${title} (${index + 1})`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 45vw, 220px"
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            className="hidden md:inline-flex absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/70 transition"
            onClick={goPrev}
            aria-label={`Предыдущее изображение ${title}`}
          >
            <ChevronLeft size={16} />
          </button>

          <button
            type="button"
            className="hidden md:inline-flex absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/70 transition"
            onClick={goNext}
            aria-label={`Следующее изображение ${title}`}
          >
            <ChevronRight size={16} />
          </button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2 py-1">
            {images.map((_, index) => (
              <span
                key={`${title}-dot-${index}`}
                className={`h-1.5 w-1.5 rounded-full ${
                  index === safeActiveIndex ? "bg-white" : "bg-white/45"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CartContent() {
  const { labels } = useLocalization();
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.cart.items);
  const [isClearCartConfirmOpen, setIsClearCartConfirmOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<DTCartItem | null>(null);
  const [isCheckoutCtaInView, setIsCheckoutCtaInView] = useState(true);
  const [catalogProducts, setCatalogProducts] = useState<DTProduct[]>([]);
  const checkoutCtaRef = useRef<HTMLDivElement | null>(null);
  const emptyCartCtaRef = useRef<HTMLAnchorElement | null>(null);

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
  const catalogById = useMemo(
    () => new Map(catalogProducts.map((product) => [product.ID, product])),
    [catalogProducts],
  );

  useEffect(() => {
    if (items.length === 0) return;
    if (!checkoutCtaRef.current) return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsCheckoutCtaInView(entry?.isIntersecting ?? false);
      },
      { threshold: 0.35 },
    );

    observer.observe(checkoutCtaRef.current);

    return () => {
      observer.disconnect();
    };
  }, [items.length]);

  useEffect(() => {
    let isCancelled = false;

    const loadCatalog = async () => {
      try {
        const response = await fetch("/api/products", { cache: "no-store" });
        if (!response.ok) return;

        const payload = await response.json();
        if (!isCancelled && Array.isArray(payload)) {
          setCatalogProducts(payload as DTProduct[]);
        }
      } catch (error) {
        console.error("Не удалось загрузить галереи товаров для корзины", error);
      }
    };

    loadCatalog();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (items.length > 0) return;
    if (typeof window === "undefined") return;
    if (!isTouchLikeDevice()) return;

    const ctaNode = emptyCartCtaRef.current;

    const runAttentionPulse = () => {
      if (document.hidden) return;

      triggerHapticFeedback("light");
      if (!ctaNode) return;

      ctaNode.classList.add("cart-empty-cta-pop");
      window.setTimeout(() => {
        ctaNode.classList.remove("cart-empty-cta-pop");
      }, 280);
    };

    const initialTimeout = window.setTimeout(runAttentionPulse, 750);
    const intervalId = window.setInterval(runAttentionPulse, 4200);

    return () => {
      window.clearTimeout(initialTimeout);
      window.clearInterval(intervalId);
      ctaNode?.classList.remove("cart-empty-cta-pop");
    };
  }, [items.length]);

  const handleQtyChange = (id: string, delta: number) => {
    const item = items.find((i) => i.ID === id);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty >= 1) {
      dispatch(updateQuantity({ id, quantity: newQty }));
    }
  };

  const handleScrollToCheckout = () => {
    checkoutCtaRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const getItemImages = (item: DTCartItem) => {
    const catalogProduct = catalogById.get(item.ID);

    const images = Array.from(
      new Set([
        item.FeatureImageURL,
        catalogProduct?.FeatureImageURL,
        ...(catalogProduct?.ProductImageGallery || []),
      ]),
    ).filter((imageUrl): imageUrl is string => Boolean(imageUrl && imageUrl.trim()));

    return images.length > 0 ? images : ["/placeholder.png"];
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
        <div className="mb-8">
          <h1 className="page-title text-center inline-flex w-full items-center justify-center gap-2">
            <ShoppingCart size={30} className="text-amber-600" />
            {labels.yourCart || "Ваша корзина"}
          </h1>

          {items.length > 0 && formattedExpiry && (
            <div className="mt-8 cart-expiry-notice rounded-xl border px-4 py-3 text-sm flex items-start gap-2.5">
              <Clock3 size={18} className="mt-0.5 shrink-0" />
              <p>
                Товары в корзине хранятся 24 часа после последнего изменения.
                Если заказ не будет оформлен, корзина очистится автоматически{" "}
                <strong>{formattedExpiry}</strong>.
              </p>
            </div>
          )}

          {items.length > 0 && (
            <div className="mt-4 flex justify-center sm:justify-end">
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
            <ShoppingCart
              size={28}
              className="text-(--color-muted)"
            />
            <Link
              href="/products"
              ref={emptyCartCtaRef}
              className="cart-empty-cta-mobile text-gray-600 hover:text-amber-700 hover:underline font-medium"
            >
              {labels.cartEmpty || "Добавьте товары, чтобы продолжить."}
            </Link>
          </div>
        ) : (
          <>
            <div className="surface-card p-3 sm:p-5 space-y-3 sm:space-y-4">
              {items.map((item) => {
                const price = parseFloat(item.SalePrice || item.RegularPrice);
                const itemTotal = price * item.quantity;

                return (
                  <article
                    key={item.ID}
                    className="rounded-xl border overflow-hidden"
                    style={{
                      borderColor: "var(--color-border)",
                      background:
                        "color-mix(in srgb, var(--color-surface) 92%, var(--color-surface-soft) 8%)",
                    }}
                  >
                    <div className="flex h-full items-stretch">
                      <div className="relative w-1/2 shrink-0 self-stretch sm:w-55">
                        <CartItemGallery
                          images={getItemImages(item)}
                          title={item.Title}
                          className="absolute inset-0 h-full"
                        />
                      </div>

                      <div className="flex h-full min-w-0 flex-1 flex-col p-3 sm:p-4">
                        <Link
                          href={`/product/${item.Slug}`}
                          className="text-lg font-semibold text-slate-900 hover:text-amber-700 line-clamp-2 wrap-break-word leading-snug"
                        >
                          {item.Title}
                        </Link>

                        <p className="text-sm text-slate-600 mt-2 inline-flex items-center gap-1.5">
                          <Tag size={14} />
                          {labels.price || "Цена"}: {price.toFixed(2)} ₽
                        </p>

                        <p className="text-sm text-slate-900 mt-1 inline-flex items-center gap-1.5 font-medium whitespace-nowrap">
                          <ShoppingCart size={11} />
                          {labels.total || "Итого"}: {itemTotal.toFixed(2)} ₽
                        </p>

                        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                          <div className="inline-flex shrink-0 items-center rounded-full border px-1 py-0.5">
                            <button
                              type="button"
                              onClick={() => handleQtyChange(item.ID, -1)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              aria-label={`Уменьшить количество ${item.Title}`}
                            >
                              <CircleMinus size={13} />
                            </button>

                            <span className="min-w-6 text-center text-xs font-semibold">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleQtyChange(item.ID, 1)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              aria-label={`Увеличить количество ${item.Title}`}
                            >
                              <CirclePlus size={13} />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setDeleteCandidate(item)}
                            className="btn-danger min-h-8 h-8 w-8 px-0 shrink-0 lg:w-auto lg:px-3"
                            aria-label={`${labels.remove || "Удалить"} ${item.Title}`}
                          >
                            <Trash2 size={14} />
                            <span className="hidden lg:inline">Удалить</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div ref={checkoutCtaRef} className="mt-8 space-y-4 flex flex-col items-end">
              <p className="text-xl font-semibold text-slate-900 inline-flex items-center gap-2">
                <CreditCard size={18} className="text-amber-600" />
                {labels.total || "Всего"}: {total.toFixed(2)} ₽
              </p>

              <ProceedToCheckoutButton
                label={labels.proceedToCheckout || "Перейти к оформлению"}
              />
            </div>
          </>
        )}
      </div>

      {items.length > 0 && !isCheckoutCtaInView && (
        <button
          type="button"
          onClick={handleScrollToCheckout}
          className="fixed bottom-8 right-24 md:right-24 z-40 btn-primary min-h-12 px-5 text-base font-semibold shadow-lg md:cursor-pointer"
        >
          <ArrowDownCircle size={18} />
          К оплате
        </button>
      )}

      <ConfirmModal
        open={!!deleteCandidate}
        title="Удалить товар из корзины?"
        description={
          deleteCandidate
            ? `Товар "${deleteCandidate.Title}" будет удален из корзины.`
            : undefined
        }
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={() => {
          if (!deleteCandidate) return;
          dispatch(removeFromCart(deleteCandidate.ID));
          setDeleteCandidate(null);
        }}
        onCancel={() => setDeleteCandidate(null)}
      />

      <ConfirmModal
        open={isClearCartConfirmOpen}
        title="Очистить корзину полностью?"
        description={`Будет удалено ${items.length} товаров (${totalUnits} шт.). Это действие нельзя отменить.`}
        confirmText="Очистить"
        cancelText="Отмена"
        onConfirm={() => {
          dispatch(clearCart());
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
