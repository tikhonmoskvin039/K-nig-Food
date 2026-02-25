"use client";

import { useEffect, useState } from "react";

export default function ProductAdminPanel() {
  const [products, setProducts] = useState<DTProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingProduct, setEditingProduct] = useState<DTProduct | null>(null);

  /*
  =====================
  Load Products
  =====================
  */
  const loadProducts = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/products", {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to load products");

      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  /*
  =====================
  Save Products Catalog
  Rewrite JSON file
  =====================
  */
  const saveProducts = async (updated: DTProduct[]) => {
    await fetch("/api/admin/products", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updated),
    });

    await loadProducts();
  };

  /*
  =====================
  Delete Product
  =====================
  */
  const deleteProduct = async (id: string) => {
    const filtered = products.filter((p) => p.ID !== id);
    await saveProducts(filtered);
  };

  /*
  =====================
  Edit Product (Simple Inline Editor)
  =====================
  */
  const updateProductField = (
    field: keyof DTProduct,
    value: string | number | boolean,
  ) => {
    if (!editingProduct) return;

    setEditingProduct({
      ...editingProduct,
      [field]: value,
    });
  };

  const saveEdit = async () => {
    if (!editingProduct) return;

    const updated = products.map((p) =>
      p.ID === editingProduct.ID ? editingProduct : p,
    );

    await saveProducts(updated);
    setEditingProduct(null);
  };

  /*
  =====================
  Render
  =====================
  */

  if (loading) {
    return <p className="text-gray-500">Загрузка каталога...</p>;
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex justify-between mb-6">
        <h2 className="text-2xl font-bold">Каталог товаров</h2>

        <button
          onClick={() =>
            setEditingProduct({
              ID: crypto.randomUUID(),
              Title: "",
              Slug: "",
              Enabled: true,
              CatalogVisible: true,
              PortionWeight: 0,
              PortionUnit: "г",
              ProductCategories: [],
              FeatureImageURL: "",
              ProductImageGallery: [],
              ShortDescription: "",
              LongDescription: "",
              RegularPrice: "0",
              SalePrice: "",
              Currency: "RUR",
            })
          }
          className="bg-gray-800 text-white px-4 py-2 rounded-lg"
        >
          + Добавить товар
        </button>
      </div>

      {/* TABLE */}
      <table className="w-full border rounded-lg overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left">Название</th>
            <th className="p-3">Цена</th>
            <th className="p-3">Порция</th>
            <th className="p-3">Действия</th>
          </tr>
        </thead>

        <tbody>
          {products.map((product) => (
            <tr key={product.ID} className="border-t hover:bg-gray-50">
              <td className="p-3">{product.Title}</td>

              <td className="p-3 text-center">{product.RegularPrice}</td>

              <td className="p-3 text-center">
                {product.PortionWeight} {product.PortionUnit}
              </td>

              <td className="p-3 flex gap-2 justify-center">
                <button
                  onClick={() => setEditingProduct(product)}
                  className="px-3 py-1 bg-blue-600 text-white rounded"
                >
                  Редактировать
                </button>

                <button
                  onClick={() => deleteProduct(product.ID)}
                  className="px-3 py-1 bg-red-600 text-white rounded"
                >
                  Удалить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* EDIT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white p-6 rounded-xl w-full max-w-2xl space-y-4">
            <input
              className="w-full border p-2 rounded"
              placeholder="Название"
              value={editingProduct.Title}
              onChange={(e) => updateProductField("Title", e.target.value)}
            />

            <input
              className="w-full border p-2 rounded"
              placeholder="Цена"
              value={editingProduct.RegularPrice}
              onChange={(e) =>
                updateProductField("RegularPrice", e.target.value)
              }
            />

            <input
              className="w-full border p-2 rounded"
              placeholder="Порция"
              value={editingProduct.PortionWeight}
              onChange={(e) =>
                updateProductField("PortionWeight", Number(e.target.value))
              }
            />

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 border rounded"
              >
                Отмена
              </button>

              <button
                onClick={saveEdit}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
