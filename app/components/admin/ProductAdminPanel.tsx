"use client";

import { useEffect, useState } from "react";
import ProductFormModal from "./ProductFormModal";

export default function ProductAdminPanel() {
  const [products, setProducts] = useState<DTProduct[]>([]);

  const [editingProduct, setEditingProduct] = useState<DTProduct | null>(null);

  const isNew = !products.some((p) => p.ID === editingProduct?.ID);

  const loadProducts = async () => {
    try {
      const res = await fetch("/api/admin/products", {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to load products");

      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

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

  const deleteProduct = async (id: string) => {
    const filtered = products.filter((p) => p.ID !== id);
    await saveProducts(filtered);
  };

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

    const exists = products.some((p) => p.ID === editingProduct.ID);

    const updated = exists
      ? products.map((p) => (p.ID === editingProduct.ID ? editingProduct : p))
      : [...products, editingProduct];

    await saveProducts(updated);
    setEditingProduct(null);
  };

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

      {editingProduct && (
        <ProductFormModal
          product={editingProduct}
          isNew={isNew}
          onChange={updateProductField}
          onSave={saveEdit}
          onClose={() => setEditingProduct(null)}
        />
      )}
    </div>
  );
}
