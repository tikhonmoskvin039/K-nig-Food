import { toast } from "sonner";

export function showAddedToCartToast(
  productTitle: string,
  onOpenCart: () => void,
) {
  toast.custom(
    (toastId) => (
      <button
        type="button"
        onClick={() => {
          toast.dismiss(toastId);
          onOpenCart();
        }}
        className="w-full rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-left shadow-sm transition hover:bg-emerald-100"
      >
        <p className="text-sm font-semibold text-emerald-800">
          Товар добавлен в корзину
        </p>
        <p className="text-xs text-emerald-700 mt-0.5 line-clamp-1">
          {productTitle}
        </p>
        <p className="text-xs text-emerald-700/90 mt-1 underline">
          Нажмите, чтобы перейти в корзину
        </p>
      </button>
    ),
    { duration: 3500 },
  );
}
