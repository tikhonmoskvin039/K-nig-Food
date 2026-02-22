"use client";

import { useAppDispatch } from "../../store/hooks";
import { addToCart } from "../../store/slices/cartSlice";
import { useLocalization } from "../../context/LocalizationContext";
import { showMiniCart } from "../../utils/MiniCartController";

interface IAddToCartButtonProps {
  product: DTProduct;
}

export default function AddToCartButton({ product }: IAddToCartButtonProps) {
  const dispatch = useAppDispatch();
  const { labels } = useLocalization();

  const handleAddToCart = () => {
    dispatch(addToCart(product));

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Show mini cart popup
    showMiniCart();
  };

  return (
    <button
      onClick={handleAddToCart}
      className="mt-4 w-full sm:w-auto bg-gray-700 hover:bg-gray-800 text-white px-6 py-3 rounded-md text-sm font-semibold transition"
    >
      {labels.addToCart || "Add to Cart"}
    </button>
  );
}
