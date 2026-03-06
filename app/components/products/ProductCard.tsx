"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getCurrencySymbol } from "../../utils/getCurrencySymbol";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { addToCart } from "../../store/slices/cartSlice";
import { useLocalization } from "../../context/LocalizationContext";
import { showMiniCart } from "../../utils/MiniCartController";
import { showAddedToCartToast } from "../../utils/cartToasts";
import {
  hasDiscountPrice,
  isNewArrivalProduct,
  isPromoProduct,
} from "../../utils/productShowcase";

interface ProductCardProps {
  product: DTProduct;
}

export default function ProductCard({ product }: ProductCardProps) {
  const hasDiscount = hasDiscountPrice(product);
  const isNew = isNewArrivalProduct(product);
  const isPromo = isPromoProduct(product);
  const regularPriceValue = Number(product.RegularPrice);
  const salePriceValue = Number(product.SalePrice);
  const discountPercent =
    hasDiscount &&
    Number.isFinite(regularPriceValue) &&
    Number.isFinite(salePriceValue) &&
    regularPriceValue > 0 &&
    salePriceValue >= 0 &&
    salePriceValue < regularPriceValue
      ? Math.round(((regularPriceValue - salePriceValue) / regularPriceValue) * 100)
      : null;
  const currencySymbol = getCurrencySymbol(product.Currency);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { labels } = useLocalization();
  const inCartQuantity = useAppSelector(
    (state) => state.cart.items.find((item) => item.ID === product.ID)?.quantity || 0,
  );

  const handleAddToCart = () => {
    dispatch(addToCart(product));
    showMiniCart();
    showAddedToCartToast(product.Title, () => router.push("/cart"));
  };

  return (
    <div className="surface-card overflow-hidden transition hover:-translate-y-0.5 flex flex-col h-full">
      {/* Product Image with Link to Product Page */}
      {/* Product Image with Overlay Portion Info */}
      <Link href={`/product/${product.Slug}`}>
        <div className="relative w-full aspect-4/3 group">
          <Image
            src={product.FeatureImageURL}
            alt={product.Title}
            fill
            className="object-cover rounded-t-lg transition group-hover:scale-105"
          />

          {/* Portion + Unit Badge */}
          {product.PortionUnit && (
            <div className="absolute bottom-2 right-2 bg-slate-900/60 text-white font-bold text-xs px-3 py-1 rounded-full backdrop-blur-sm">
              {product.PortionWeight} {product.PortionUnit}
            </div>
          )}

          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isNew && (
              <span className="bg-amber-500/95 text-white font-semibold text-[11px] px-2.5 py-1 rounded-full shadow-sm">
                Новинка
              </span>
            )}

            {isPromo && (
              <span className="inline-flex min-w-20 items-center justify-center text-center bg-rose-600/95 text-white font-semibold text-[11px] px-2.5 py-1 rounded-full shadow-sm">
                {discountPercent ? `Скидка ${discountPercent}%` : "Спеццена"}
              </span>
            )}

            {inCartQuantity > 0 && (
              <span className="bg-emerald-600/90 text-white font-semibold text-[11px] px-2.5 py-1 rounded-full backdrop-blur-sm">
                В корзине: {inCartQuantity}
              </span>
            )}
          </div>

        </div>
      </Link>

      {/* Product Info */}
      <div className="p-6 flex flex-col flex-1">
        <div className="flex flex-col flex-1 h-full">
          <h3 className="text-xl font-semibold text-gray-900 truncate">
            <Link
              href={`/product/${product.Slug}`}
              className="hover:text-amber-700"
            >
              {product.Title}
            </Link>
          </h3>

          <p className="text-gray-700 mt-2 text-sm line-clamp-2">
            {product.ShortDescription}
          </p>

          {/* Spacer pushes price block down */}
          <div className="grow" />

          {/* Price block */}
          <div className="mt-3">
            {hasDiscount ? (
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-red-600">
                  {product.SalePrice}
                  {currencySymbol}
                </span>
                <span className="text-slate-500 line-through">
                  {product.RegularPrice}
                  {currencySymbol}
                </span>
              </div>
            ) : (
              <span className="text-lg font-bold text-gray-900">
                {product.RegularPrice}
                {currencySymbol}
              </span>
            )}
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-4">
          {/* Main action buttons row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-stretch">
            <Link
              href={`/product/${product.Slug}`}
              className="btn-secondary w-full h-full min-h-11 justify-center text-center px-3 whitespace-normal leading-tight"
            >
              {labels.viewProduct || "Узнать больше"}
            </Link>

            <button
              onClick={handleAddToCart}
              className="w-full h-full min-h-11 btn-primary justify-center text-center px-3 whitespace-normal leading-tight"
            >
              {labels.addToCart || "Добавить в корзину"}
            </button>
          </div>

          <p
            className={`min-h-4 text-xs leading-4 transition-opacity ${
              inCartQuantity > 0
                ? "text-emerald-700 opacity-100"
                : "text-transparent opacity-0 pointer-events-none select-none"
            }`}
            aria-live="polite"
          >
            {inCartQuantity > 0
              ? `Уже добавлено в корзину: ${inCartQuantity} шт.`
              : "\u00A0"}
          </p>
        </div>
      </div>
    </div>
  );
}
