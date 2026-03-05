"use client";

import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { addToCart } from "../../store/slices/cartSlice";
import { useLocalization } from "../../context/LocalizationContext";
import { showMiniCart } from "../../utils/MiniCartController";
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
    showMiniCart();
    showAddedToCartToast(product.Title, () => router.push("/cart"));
  };

  return (
    <div className="mt-4 flex flex-col gap-2">
      <button
        onClick={handleAddToCart}
        className="w-full sm:w-auto btn-primary"
      >
        {labels.addToCart || "Add to Cart"}
        {inCartQuantity > 0 && (
          <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs font-semibold">
            {inCartQuantity}
          </span>
        )}
      </button>
      {inCartQuantity > 0 && (
        <p className="text-xs text-emerald-700">
          Уже добавлено в корзину: {inCartQuantity} шт.
        </p>
      )}
    </div>
  );
}
