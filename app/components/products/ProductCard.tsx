"use client";

import Link from "next/link";
import Image from "next/image";
import { getCurrencySymbol } from "../../utils/getCurrencySymbol";
import { useAppDispatch } from "../../store/hooks";
import { addToCart } from "../../store/slices/cartSlice";
import { useLocalization } from "../../context/LocalizationContext";
import { showMiniCart } from "../../utils/MiniCartController";

interface ProductCardProps {
  product: DTProduct;
}

export default function ProductCard({ product }: ProductCardProps) {
  const hasDiscount =
    parseFloat(product.SalePrice) < parseFloat(product.RegularPrice);
  const currencySymbol = getCurrencySymbol(product.Currency);
  const dispatch = useAppDispatch();
  const { labels } = useLocalization();

  const handleAddToCart = () => {
    dispatch(addToCart(product));

    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: "smooth" });

    showMiniCart();
  };

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden transition hover:scale-105 flex flex-col h-full">
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
            <div className="absolute bottom-2 right-2 bg-gray-700/40 text-white font-bold text-xs px-3 py-1 rounded-full backdrop-blur-sm">
              {product.PortionWeight} {product.PortionUnit}
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
              className="hover:text-gray-600"
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
                <span className="text-gray-500 line-through">
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
              <span className="w-full h-full flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-semibold text-center transition">
                {labels.viewProduct || "Узнать больше"}
              </span>
            </Link>

            <button
              onClick={handleAddToCart}
              className="w-full sm:w-1/2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-semibold text-center transition"
            >
              {labels.addToCart || "Добавить в корзину"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
