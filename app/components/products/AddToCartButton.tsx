"use client";

import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { addToCart } from "../../store/slices/cartSlice";
import { useLocalization } from "../../context/LocalizationContext";
import { showAddedToCartToast } from "../../utils/cartToasts";

interface IAddToCartButtonProps {
  product: DTProduct;
}

export default function AddToCartButton({ product }: IAddToCartButtonProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { labels } = useLocalization();
  const inCartQuantity = useAppSelector(
    (state) => state.cart.items.find((item) => item.ID === product.ID)?.quantity || 0,
  );

  const handleAddToCart = () => {
    dispatch(addToCart(product));
    showAddedToCartToast(product.Title, () => router.push("/cart"));
  };

  return (
    <div className="mt-4 flex flex-col gap-2">
      <button
        onClick={handleAddToCart}
        className="w-full sm:w-auto btn-primary min-h-11 min-w-44 justify-center"
      >
        {labels.addToCart || "Add to Cart"}
      </button>
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
  );
}
