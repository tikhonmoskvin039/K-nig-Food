"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocalization } from "../../context/LocalizationContext";
import { useProductContext } from "../../context/ProductContext";
import { useAppDispatch } from "../../store/hooks";
import { clearCart } from "../../store/slices/cartSlice";
import Image from "next/image";

export default function OrderSummaryClient() {
  const [order, setOrder] = useState<DTOrderData | null>(null);
  const { labels } = useLocalization();
  const { products } = useProductContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();


  useEffect(() => {
    const orderIdFromQuery = searchParams.get("orderId");
    const recent = localStorage.getItem("recentOrder");

    if (recent) {
      const parsed = JSON.parse(recent) as DTOrderData;

      setOrder(parsed);

      // Clear cart ONCE if we're redirected with orderId in query,
      if (orderIdFromQuery && parsed.orderId === orderIdFromQuery) {
        dispatch(clearCart());
      }
    } else {
      router.push("/cart");
    }
  }, [searchParams, router, dispatch]);

  if (!order) return null;

  const total = order.cartItems.reduce((sum, item) => {
    const price = parseFloat(item.SalePrice || item.RegularPrice);
    return sum + price * item.quantity;
  }, 0);

  const grandTotal = total;

  const getProductImage = (id: string): string => {
    const product = products.find((p) => p.ID === id);
    return product?.FeatureImageURL || "/placeholder.png";
  };

  const renderCustomerInfo = (title: string, data: DTAddress) => (
    <div className="mb-6">
      <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-700">
        {data.firstName} {data.lastName}
      </p>
      <p className="text-sm text-gray-700">{data.email}</p>
    </div>
  );

  return (
    <section className="max-w-4xl mx-auto py-10 px-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">
        {labels.orderSummary || "Ваш заказ"}
      </h1>
      <p className="text-gray-600 mt-3 mb-8">
        {labels.orderConfirmationMessage ||
          "Your order was placed successfully. We’ll notify you once it’s processed."}
      </p>
      <p className="text-sm text-gray-600 mb-4">
        {labels.orderId || "ID заказа"}: {order.orderId}
      </p>
      <p className="text-sm text-gray-600 mb-4">
        {labels.orderDate || "Дата заказа"}: {order.orderDate}
      </p>

      <div className="bg-white p-6 rounded-md shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          {labels.orderDetails || "Детали заказа"}
        </h2>

        <ul className="space-y-4">
          {order.cartItems.map((item) => {
            const price = parseFloat(item.SalePrice || item.RegularPrice);
            const imageUrl = getProductImage(item.ID);
            return (
              <li
                key={item.ID}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-4">
                  <Image
                    src={imageUrl}
                    alt={item.Title}
                    width={60}
                    height={80}
                    className="rounded object-cover"
                  />
                  <span className="text-gray-800">
                    {item.Title} × {item.quantity}
                  </span>
                </div>
                <span className="text-gray-700">
                  ${(price * item.quantity).toFixed(2)}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="border-t mt-6 pt-4 space-y-2 text-sm text-gray-700">
          <div className="flex justify-between font-semibold text-gray-900">
            <span>{labels.total || "Итого"}:</span>
            <span>{grandTotal.toFixed(2)} ₽</span>
          </div>
        </div>

        <div className="mt-8">
          {renderCustomerInfo(
            labels.customerInformation || "Информация о покупателе",
            order.billingForm,
          )}
        </div>
      </div>
    </section>
  );
}
