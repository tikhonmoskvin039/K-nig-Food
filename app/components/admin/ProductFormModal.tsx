"use client";

type Props = {
  product: DTProduct | null;
  isNew: boolean;
  onChange: (field: keyof DTProduct, value: string | number | boolean) => void;
  onSave: () => void;
  onClose: () => void;
};

export default function ProductFormModal({
  product,
  isNew,
  onChange,
  onSave,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl p-6 space-y-4">

        <h3 className="text-xl font-semibold">
          {isNew ? "Добавление товара" : "Редактирование товара"}
        </h3>

        <input
          className="w-full border p-2 rounded"
          placeholder="Название"
          value={product?.Title || ""}
          onChange={(e) => onChange("Title", e.target.value)}
        />

        <input
          className="w-full border p-2 rounded"
          placeholder="Цена"
          value={product?.RegularPrice || ""}
          onChange={(e) => onChange("RegularPrice", e.target.value)}
        />

        <input
          className="w-full border p-2 rounded"
          placeholder="Порция"
          value={product?.PortionWeight || 0}
          onChange={(e) =>
            onChange("PortionWeight", Number(e.target.value))
          }
        />

        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded"
          >
            Отмена
          </button>

          <button
            onClick={onSave}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            {isNew ? "Добавить" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}