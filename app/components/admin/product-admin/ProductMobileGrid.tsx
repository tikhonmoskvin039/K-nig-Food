"use client";

import ProductEditControl from "../ProductEditControl";
import { formatProductDate } from "../../../services/admin/productAdminTable";

type Props = {
  products: DTProduct[];
  selectedProductIds: string[];
  isSaving: boolean;
  emptyRowsCount: number;
  onToggleProductSelection: (productId: string) => void;
  onDeleteRequest: (product: DTProduct) => void;
};

export default function ProductMobileGrid({
  products,
  selectedProductIds,
  isSaving,
  emptyRowsCount,
  onToggleProductSelection,
  onDeleteRequest,
}: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
      {products.map((product) => (
        <article key={product.ID} className="rounded-xl bg-gray-50 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-gray-900 line-clamp-2">
              {product.Title}
            </h3>
            <input
              type="checkbox"
              checked={selectedProductIds.includes(product.ID)}
              onChange={() => onToggleProductSelection(product.ID)}
              disabled={isSaving}
              aria-label={`Выбрать товар ${product.Title}`}
            />
          </div>

          <div className="mt-2 space-y-1 text-sm text-gray-700">
            <p>Цена: {product.RegularPrice}</p>
            <p>
              Порция: {product.PortionWeight} {product.PortionUnit}
            </p>
            <p>Создан: {formatProductDate(product.CreatedAt)}</p>
            <p>Изменен: {formatProductDate(product.UpdatedAt)}</p>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <ProductEditControl
              productId={product.ID}
              className="w-full btn-secondary text-center"
            />
            <button
              type="button"
              onClick={() => onDeleteRequest(product)}
              disabled={isSaving}
              className="w-full btn-danger"
            >
              Удалить
            </button>
          </div>
        </article>
      ))}

      {Array.from({ length: emptyRowsCount }, (_, index) => (
        <article
          key={`mobile-empty-row-${index}`}
          aria-hidden="true"
          className="rounded-xl p-4 shadow-sm invisible pointer-events-none select-none"
        >
          <div className="h-[210px]" />
        </article>
      ))}
    </div>
  );
}
