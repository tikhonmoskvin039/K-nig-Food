"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { useLocalization } from "../context/LocalizationContext";
import { ShoppingCart, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { removeFromCart } from "../store/slices/cartSlice";
import { registerMiniCartTrigger } from "../utils/MiniCartController";

type MiniCartProps = {
  onNavigate?: () => void;
};

export default function MiniCart({ onNavigate }: MiniCartProps) {
  const pathname = usePathname();
  const isCartPage = pathname === "/cart";
  const isPreviewEnabled = !isCartPage;

  const cartItems = useAppSelector((state) => state.cart.items);
  const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalAmount = cartItems.reduce(
    (acc, item) =>
      acc + item.quantity * parseFloat(item.SalePrice || item.RegularPrice),
    0,
  );

  const { labels } = useLocalization();
  const dispatch = useAppDispatch();

  const [isVisible, setIsVisible] = useState(false);
  const [canUseHoverPreview, setCanUseHoverPreview] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const clearHideTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const updateHoverSupport = () => {
      setCanUseHoverPreview(mediaQuery.matches);
      if (!mediaQuery.matches) {
        setIsVisible(false);
        clearHideTimeout();
      }
    };

    updateHoverSupport();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateHoverSupport);
      return () => mediaQuery.removeEventListener("change", updateHoverSupport);
    }

    mediaQuery.addListener(updateHoverSupport);
    return () => mediaQuery.removeListener(updateHoverSupport);
  }, []);

  useEffect(() => {
    registerMiniCartTrigger(() => {
      if (!isPreviewEnabled || !canUseHoverPreview) return;
      setIsVisible(true);
      clearHideTimeout();
    });
  }, [isPreviewEnabled, canUseHoverPreview]);

  useEffect(() => {
    if (!isVisible) return;

    const closePreview = (target?: EventTarget | null) => {
      const node = target instanceof Node ? target : null;
      if (node && containerRef.current?.contains(node)) {
        return;
      }

      setIsVisible(false);
      clearHideTimeout();
    };

    const handleTouchPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      closePreview(event.target);
    };

    const handleViewportChange = () => closePreview(null);

    window.addEventListener("pointerdown", handleTouchPointerDown, {
      passive: true,
    });
    window.addEventListener("scroll", handleViewportChange, { passive: true });
    window.addEventListener("touchmove", handleViewportChange, {
      passive: true,
    });

    return () => {
      window.removeEventListener("pointerdown", handleTouchPointerDown);
      window.removeEventListener("scroll", handleViewportChange);
      window.removeEventListener("touchmove", handleViewportChange);
    };
  }, [isVisible]);

  useEffect(
    () => () => {
      clearHideTimeout();
    },
    [],
  );

  const handleMouseEnter = () => {
    if (!isPreviewEnabled || !canUseHoverPreview) return;
    clearHideTimeout();
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    if (!isPreviewEnabled || !canUseHoverPreview) return;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 300);
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={containerRef}
    >
      {/* Cart Icon */}
      <Link
        href="/cart"
        className="relative flex items-center justify-center ml-2 mr-4"
        aria-label={labels.viewCart || "View cart"}
        onClick={() => {
          onNavigate?.();
          setIsVisible(false);
          clearHideTimeout();
        }}
      >
        <ShoppingCart size={24} />
        <span
          suppressHydrationWarning
          className="absolute -top-2 -right-2.5 bg-amber-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full leading-none"
        >
          {totalQuantity}
        </span>
      </Link>

      {/* Mini Cart Dropdown */}
      {isPreviewEnabled && isVisible && (
        <div className="absolute right-0 mt-2 w-88 surface-card z-50 p-4">
          {cartItems.length === 0 ? (
            <p className="text-slate-600 text-sm text-center">
              <Link
                href="/products"
                className="font-semibold text-amber-700 hover:text-amber-800 hover:underline"
              >
                {labels.cartEmpty || "Добавьте товары, чтобы продолжить."}
              </Link>
            </p>
          ) : (
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {cartItems.map((item) => {
                const price = parseFloat(item.SalePrice || item.RegularPrice);
                const itemTotal = (price * item.quantity).toFixed(2);

                return (
                  <div key={item.ID} className="flex items-start gap-4">
                    <Image
                      src={item.FeatureImageURL}
                      alt={item.Title}
                      width={60}
                      height={80}
                      className="rounded object-cover"
                    />
                    <div className="flex-1">
                      <Link
                        href={`/product/${item.Slug}`}
                        className="text-sm font-semibold text-slate-900 hover:text-amber-700"
                        onClick={() => {
                          onNavigate?.();
                          setIsVisible(false);
                        }}
                      >
                        {item.Title}
                      </Link>
                      <p className="text-sm text-slate-600">
                        {labels.quantity || "Количество"}: {item.quantity} ×{" "}
                        {price.toFixed(2)} ₽
                      </p>
                      <p className="text-sm text-slate-900 font-medium">
                        {labels.total || "Итого"}: {itemTotal} ₽
                      </p>
                    </div>
                    <button
                      onClick={() => dispatch(removeFromCart(item.ID))}
                      className="text-gray-400 hover:text-red-600"
                      title={labels.remove || "Удалить"}
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Total & View Cart Button */}
          {cartItems.length > 0 && (
            <>
              <hr className="my-4" />
              <div className="flex justify-between items-center text-sm font-semibold text-slate-900">
                <span>{labels.total || "Итого"}:</span>
                <span>{totalAmount.toFixed(2)} ₽</span>
              </div>
              <Link
                href="/cart"
                className="mt-4 btn-secondary w-full"
                onClick={() => {
                  onNavigate?.();
                  setIsVisible(false);
                }}
              >
                {labels.viewCart || "Посмотореть корзину"}
              </Link>

              <Link
                href="/checkout"
                className="mt-3 btn-primary w-full"
                onClick={() => {
                  onNavigate?.();
                  setIsVisible(false);
                }}
              >
                {labels.proceedToCheckout || "Перейти к оформлению заказа"}
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
