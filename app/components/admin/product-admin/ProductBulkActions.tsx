"use client";

type Props = {
  allVisibleSelected: boolean;
  selectedProductsCount: number;
  isSaving: boolean;
  onToggleSelectAllVisible: (checked: boolean) => void;
  onOpenBulkDelete: () => void;
};

export default function ProductBulkActions({
  allVisibleSelected,
  selectedProductsCount,
  isSaving,
  onToggleSelectAllVisible,
  onOpenBulkDelete,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={allVisibleSelected}
          onChange={(e) => onToggleSelectAllVisible(e.target.checked)}
          disabled={isSaving}
        />
        Выбрать все на странице
      </label>

      <button
        type="button"
        onClick={onOpenBulkDelete}
        disabled={selectedProductsCount === 0 || isSaving}
        className="btn-danger"
      >
        Удалить выбранные ({selectedProductsCount})
      </button>
    </div>
  );
}
