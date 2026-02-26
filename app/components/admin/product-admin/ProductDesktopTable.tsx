"use client";

import ProductEditControl from "../ProductEditControl";
import { formatProductDate } from "../../../services/admin/productAdminTable";

type Props = {
  products: DTProduct[];
  selectedProductIds: string[];
  isSaving: boolean;
  allVisibleSelected: boolean;
  emptyRowsCount: number;
  onToggleSelectAllVisible: (checked: boolean) => void;
  onToggleProductSelection: (productId: string) => void;
  onDeleteRequest: (product: DTProduct) => void;
};

export default function ProductDesktopTable({
  products,
  selectedProductIds,
  isSaving,
  allVisibleSelected,
  emptyRowsCount,
  onToggleSelectAllVisible,
  onToggleProductSelection,
  onDeleteRequest,
}: Props) {
  return (
    <div className="hidden md:block overflow-x-auto table-shell">
      <table className="w-full min-w-[1040px] table-fixed">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-center w-12">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={(e) => onToggleSelectAllVisible(e.target.checked)}
                disabled={isSaving}
                aria-label="Выбрать все товары на странице"
              />
            </th>
            <th className="p-3 text-left text-sm lg:text-base w-[35%]">Название</th>
            <th className="p-3 text-center text-sm lg:text-base w-[10%]">Цена</th>
            <th className="p-3 text-center text-sm lg:text-base w-[12%]">Порция</th>
            <th className="p-3 text-center text-sm lg:text-base w-[14%]">Создан</th>
            <th className="p-3 text-center text-sm lg:text-base w-[14%]">Изменен</th>
            <th className="p-3 text-center text-sm lg:text-base w-[15%]">Действия</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.ID} className="border-t hover:bg-gray-50 h-[58px]">
              <td className="p-3 text-center">
                <input
                  type="checkbox"
                  checked={selectedProductIds.includes(product.ID)}
                  onChange={() => onToggleProductSelection(product.ID)}
                  disabled={isSaving}
                  aria-label={`Выбрать товар ${product.Title}`}
                />
              </td>
              <td className="p-3">
                <div className="truncate" title={product.Title}>
                  {product.Title}
                </div>
              </td>
              <td className="p-3 text-center whitespace-nowrap">
                {product.RegularPrice}
              </td>
              <td className="p-3 text-center whitespace-nowrap">
                {product.PortionWeight} {product.PortionUnit}
              </td>
              <td className="p-3 text-center whitespace-nowrap">
                {formatProductDate(product.CreatedAt)}
              </td>
              <td className="p-3 text-center whitespace-nowrap">
                {formatProductDate(product.UpdatedAt)}
              </td>
              <td className="p-3">
                <div className="flex flex-wrap gap-2 justify-center">
                  <ProductEditControl productId={product.ID} />
                  <button
                    type="button"
                    onClick={() => onDeleteRequest(product)}
                    disabled={isSaving}
                    className="btn-danger px-3 py-1.5"
                  >
                    Удалить
                  </button>
                </div>
              </td>
            </tr>
          ))}

          {Array.from({ length: emptyRowsCount }, (_, index) => (
            <tr
              key={`desktop-empty-row-${index}`}
              aria-hidden="true"
              className="border-t h-[58px]"
            >
              <td className="p-3">&nbsp;</td>
              <td className="p-3">&nbsp;</td>
              <td className="p-3">&nbsp;</td>
              <td className="p-3">&nbsp;</td>
              <td className="p-3">&nbsp;</td>
              <td className="p-3">&nbsp;</td>
              <td className="p-3">&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
