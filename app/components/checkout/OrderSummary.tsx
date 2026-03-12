"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useLocalization } from "../../context/LocalizationContext";
import Image from "next/image";
import Link from "next/link";
import ConfirmModal from "../common/ConfirmModal";
import { clearDeliveryQuote, setFulfillmentMethod } from "../../store/slices/checkoutSlice";

export default function OrderSummary() {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((state) => state.cart.items);
  const checkout = useAppSelector((state) => state.checkout);
  const { labels } = useLocalization();
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [paymentStubOpened, setPaymentStubOpened] = useState(false);

  const itemsTotalAmount = cartItems.reduce(
    (acc, item) =>
      acc + item.quantity * parseFloat(item.SalePrice || item.RegularPrice),
    0,
  );

  const deliveryAmount =
    checkout.fulfillmentMethod === "delivery" && checkout.deliveryQuote
      ? Math.max(0, checkout.deliveryQuote.amount)
      : 0;

  const totalAmount = itemsTotalAmount + deliveryAmount;
  const isDelivery = checkout.fulfillmentMethod === "delivery";
  const isDeliveryAddressComplete =
    checkout.deliveryAddress.city.trim().length > 0 &&
    checkout.deliveryAddress.street.trim().length > 0 &&
    checkout.deliveryAddress.house.trim().length > 0;
  const hasValidDeliveryQuote =
    !isDelivery ||
    Boolean(
      checkout.deliveryQuote &&
        Number.isFinite(checkout.deliveryQuote.amount) &&
        checkout.deliveryQuote.amount > 0,
    );
  const isDeliveryAddressManuallyConfirmed =
    !isDelivery || checkout.deliveryAddressConfirmed;
  const deliveryAddressText = [
    checkout.deliveryAddress.city.trim(),
    checkout.deliveryAddress.street.trim(),
    checkout.deliveryAddress.house.trim()
      ? `д. ${checkout.deliveryAddress.house.trim()}`
      : "",
    checkout.deliveryAddress.apartment.trim()
      ? `кв. ${checkout.deliveryAddress.apartment.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join(", ");
  const canOpenPaymentStub =
    cartItems.length > 0 &&
    (!isDelivery ||
      (isDeliveryAddressComplete &&
        hasValidDeliveryQuote &&
        isDeliveryAddressManuallyConfirmed));
  const paymentDisabledReason =
    cartItems.length === 0
      ? "Корзина пуста."
      : isDelivery && !isDeliveryAddressComplete
        ? "Заполните обязательные поля доставки: город, улица и дом."
        : isDelivery && !isDeliveryAddressManuallyConfirmed
          ? "Подтвердите вручную проверку адреса доставки."
        : isDelivery && !hasValidDeliveryQuote
          ? "Добавьте стоимость доставки, чтобы продолжить."
          : "";

  const confirmCancelDelivery = () => {
    dispatch(clearDeliveryQuote());
    dispatch(setFulfillmentMethod("pickup"));
    setCancelModalOpen(false);
  };

  return (
    <div className="surface-card p-5 md:p-6">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">
        {labels.orderSummary || "Ваш заказ"}
      </h2>

      <div className="space-y-4">
        {cartItems.map((item) => (
          <div key={item.ID} className="flex items-center gap-4">
            <Image
              src={item.FeatureImageURL}
              alt={item.Title}
              width={60}
              height={60}
              className="rounded object-cover"
            />
            <div className="flex-1">
              <Link
                href={`/product/${item.Slug}`}
                className="text-sm font-medium text-slate-900 hover:text-amber-700"
              >
                {item.Title}
              </Link>
              <p className="text-sm text-slate-600">
                {labels.quantity || "Количество"}: {item.quantity} ×{" "}
                {parseFloat(item.SalePrice || item.RegularPrice).toFixed(2)} ₽
              </p>
            </div>
            <div className="text-sm font-medium text-slate-900">
              {(
                item.quantity * parseFloat(item.SalePrice || item.RegularPrice)
              ).toFixed(2)}{" "}
              ₽
            </div>
          </div>
        ))}

        <hr className="my-4 border-slate-200" />

        <div className="flex justify-between text-sm text-slate-700">
          <span>Товары:</span>
          <span>{itemsTotalAmount.toFixed(2)} ₽</span>
        </div>

        {checkout.fulfillmentMethod === "pickup" && (
          <div className="flex justify-between text-sm text-slate-700">
            <span>Самовывоз:</span>
            <span>0.00 ₽</span>
          </div>
        )}

        {checkout.fulfillmentMethod === "delivery" && checkout.deliveryQuote && (
          <>
            <div className="flex justify-between text-sm text-slate-700">
              <span>Доставка (Яндекс Go):</span>
              <span>{deliveryAmount.toFixed(2)} ₽</span>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                className="btn-danger-soft text-xs"
                onClick={() => setCancelModalOpen(true)}
              >
                Отменить доставку
              </button>
            </div>
          </>
        )}

        {checkout.fulfillmentMethod === "delivery" && !checkout.deliveryQuote && (
          <p className="text-sm text-amber-600">
            Добавьте стоимость доставки из Яндекс Go, чтобы включить ее в итог.
          </p>
        )}

        {checkout.fulfillmentMethod === "delivery" && (
          <div className="rounded-lg border p-3 bg-slate-50/70 dark:bg-slate-900/35">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1">
              Адрес доставки
            </p>
            <p className="text-sm text-slate-800">
              {deliveryAddressText || "Пока не выбран"}
            </p>
          </div>
        )}

        <div className="flex justify-between font-bold text-base text-slate-900">
          <span>{labels.total || "Итого"}:</span>
          <span>{totalAmount.toFixed(2)} ₽</span>
        </div>

        <div className="space-y-2 pt-2">
          <button
            id="checkout-pay-button"
            type="button"
            className="btn-primary w-full"
            disabled={!canOpenPaymentStub}
            onClick={() => setPaymentStubOpened(true)}
          >
            Оплатить
          </button>
          <p className="text-xs text-amber-700 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            Онлайн-оплата пока не подключена: модуль в разработке.
          </p>
          {paymentDisabledReason && (
            <p className="text-xs text-rose-600">{paymentDisabledReason}</p>
          )}
          {paymentStubOpened && canOpenPaymentStub && (
            <p className="text-xs text-emerald-700 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              Заглушка оплаты: интеграция платежного шлюза еще не завершена.
            </p>
          )}
        </div>
      </div>

      <ConfirmModal
        open={cancelModalOpen}
        title="Отменить доставку?"
        description="Доставка будет удалена из заказа, итог пересчитается как самовывоз."
        confirmText="Отменить доставку"
        cancelText="Назад"
        onConfirm={confirmCancelDelivery}
        onCancel={() => setCancelModalOpen(false)}
      />
    </div>
  );
}
