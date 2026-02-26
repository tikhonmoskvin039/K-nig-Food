"use client";

import Link from "next/link";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { useLocalization } from "../context/LocalizationContext";
import { ShoppingCart, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { removeFromCart } from "../store/slices/cartSlice";
import { registerMiniCartTrigger } from "../utils/MiniCartController";

export default function MiniCart() {
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerMiniCartTrigger(() => {
      setIsVisible(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    });
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
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
      >
        <ShoppingCart size={24} />
        <span className="absolute -top-2 -right-2.5 bg-amber-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full leading-none">
          {totalQuantity}
        </span>
      </Link>

      {/* Mini Cart Dropdown */}
      {isVisible && (
        <div className="absolute right-0 mt-2 w-[22rem] surface-card z-50 p-4">
          {cartItems.length === 0 ? (
            <p className="text-slate-600 text-sm text-center">
              {labels.cartEmpty || "Your cart is empty."}
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
              >
                {labels.viewCart || "Посмотореть корзину"}
              </Link>

              <Link
                href="/checkout"
                className="mt-3 btn-primary w-full"
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
