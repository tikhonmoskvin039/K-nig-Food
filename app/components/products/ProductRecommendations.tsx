"use client";

import { useMemo, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ShoppingCart } from "lucide-react";
import { ReduxProvider } from "../../providers";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { addToCart } from "../../store/slices/cartSlice";
import { showAddedToCartToast } from "../../utils/cartToasts";
import { getCurrencySymbol } from "../../utils/getCurrencySymbol";

type Props = {
  products: DTProduct[];
  title: string;
};

function ProductRecommendationsContent({ products, title }: Props) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((state) => state.cart.items);
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const cartQuantityById = useMemo(
    () => new Map(cartItems.map((item) => [item.ID, item.quantity])),
    [cartItems],
  );

  const handleAddToCart = (product: DTProduct) => {
    dispatch(addToCart(product));
    showAddedToCartToast(product.Title, () => router.push("/cart"));
  };

  if (products.length === 0) return null;

  return (
    <section
      className="mt-8 overflow-hidden"
      aria-labelledby="recommended-products-title"
    >
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Подбор к блюду
          </p>
          <h2
            id="recommended-products-title"
            className="section-title mt-1 min-w-0"
          >
            {title}
          </h2>
        </div>
        <span className="inline-flex shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
          {products.length} в подборке
        </span>
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 md:grid md:grid-cols-2 md:overflow-visible xl:grid-cols-3">
        {products.map((product) => {
          const currencySymbol = getCurrencySymbol(product.Currency);
          const regularPrice = Number(product.RegularPrice);
          const salePrice = Number(product.SalePrice);
          const hasSalePrice =
            Number.isFinite(regularPrice) &&
            Number.isFinite(salePrice) &&
            salePrice > 0 &&
            salePrice < regularPrice;
          const currentPrice = hasSalePrice
            ? product.SalePrice
            : product.RegularPrice;
          const inCartQuantity = isHydrated
            ? cartQuantityById.get(product.ID) || 0
            : 0;
          const category = product.ProductCategories?.[0];
          const portionLabel =
            product.PortionWeight > 0 && product.PortionUnit
              ? `${product.PortionWeight} ${product.PortionUnit}`
              : "";

          return (
            <article
              key={product.ID}
              className="grid min-w-[min(86vw,23rem)] snap-start grid-cols-[6.5rem_minmax(0,1fr)] gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md sm:grid-cols-[7rem_minmax(0,1fr)] md:min-w-0"
            >
              <Link
                href={`/product/${product.Slug}`}
                className="relative aspect-square overflow-hidden rounded-md bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500"
                aria-label={`Открыть ${product.Title}`}
              >
                <Image
                  src={product.FeatureImageURL}
                  alt={product.Title}
                  fill
                  sizes="112px"
                  className="object-cover transition hover:scale-105"
                />
              </Link>

              <div className="flex min-w-0 flex-col">
                <div className="min-w-0">
                  <Link
                    href={`/product/${product.Slug}`}
                    className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950 hover:text-amber-700"
                  >
                    {product.Title}
                  </Link>
                  {(category || portionLabel) && (
                    <div className="mt-2 flex min-h-5 flex-wrap gap-1.5">
                      {category && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                          {category}
                        </span>
                      )}
                      {portionLabel && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          {portionLabel}
                        </span>
                      )}
                    </div>
                  )}
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                    {product.ShortDescription}
                  </p>
                </div>

                <div className="mt-auto pt-3">
                  <div className="flex min-h-6 flex-wrap items-center gap-2">
                    <span
                      className={`font-bold ${
                        hasSalePrice ? "text-red-600" : "text-slate-950"
                      }`}
                    >
                      {currentPrice}
                      {currencySymbol}
                    </span>
                    {hasSalePrice && (
                      <span className="text-xs text-slate-500 line-through">
                        {product.RegularPrice}
                        {currencySymbol}
                      </span>
                    )}
                    {inCartQuantity > 0 && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        В корзине {inCartQuantity}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2">
                    <Link
                      href={`/product/${product.Slug}`}
                      className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500"
                      aria-label={`Подробнее о ${product.Title}`}
                      title="Подробнее"
                    >
                      <ArrowUpRight size={17} />
                    </Link>
                    <button
                      type="button"
                      className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-md bg-amber-600 px-3 text-sm font-semibold text-white transition hover:bg-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500"
                      onClick={() => handleAddToCart(product)}
                      aria-label={`Добавить ${product.Title} в корзину`}
                    >
                      <ShoppingCart size={16} />
                      <span className="truncate">В корзину</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function ProductRecommendations(props: Props) {
  return (
    <ReduxProvider>
      <ProductRecommendationsContent {...props} />
    </ReduxProvider>
  );
}
