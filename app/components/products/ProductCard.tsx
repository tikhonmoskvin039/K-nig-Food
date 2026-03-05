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

interface ProductCardProps {
  product: DTProduct;
}

export default function ProductCard({ product }: ProductCardProps) {
  const hasDiscount =
    parseFloat(product.SalePrice) < parseFloat(product.RegularPrice);
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

          {inCartQuantity > 0 && (
            <div className="absolute top-2 left-2 bg-emerald-600/90 text-white font-semibold text-xs px-3 py-1 rounded-full backdrop-blur-sm">
              В корзине: {inCartQuantity}
            </div>
          )}
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
          <div className="flex flex-col sm:flex-row gap-2">
            <Link href={`/product/${product.Slug}`} className="sm:w-1/2">
              <span className="btn-secondary w-full h-full">
                {labels.viewProduct || "Узнать больше"}
              </span>
            </Link>

            <button
              onClick={handleAddToCart}
              className="w-full sm:w-1/2 btn-primary"
            >
              {labels.addToCart || "Добавить в корзину"}
              {inCartQuantity > 0 && (
                <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs font-semibold">
                  {inCartQuantity}
                </span>
              )}
            </button>
          </div>

          {inCartQuantity > 0 && (
            <p className="text-xs text-emerald-700">
              Уже добавлено в корзину: {inCartQuantity} шт.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
