"use client";

import { createContext, useContext, useEffect, useState } from "react";
import GlobalLoader from "../components/GlobalLoader";
import type { CheckoutSettings } from "../types/checkoutSettings";

const CHECKOUT_SETTINGS_FALLBACK: CheckoutSettings = {
  paymentMethods: [],
  deliveryEnabled: true,
  originPoint: {
    label: "Кухня K-nig Food, Калининград, Красная 139Б",
    query: "Калининград, Красная 139Б",
    lat: 54.7384,
    lng: 20.4713,
  },
  pickupPoint: {
    label: "Калининград, Красная 139Б",
    query: "Калининград, Красная 139Б",
    lat: 54.7384,
    lng: 20.4713,
  },
};

function isValidCheckoutSettings(data: unknown): data is CheckoutSettings {
  if (!data || typeof data !== "object") return false;
  const typed = data as Record<string, unknown>;

  const hasDeliveryEnabled = typeof typed.deliveryEnabled === "boolean";
  const hasPoints =
    typed.originPoint &&
    typeof typed.originPoint === "object" &&
    typed.pickupPoint &&
    typeof typed.pickupPoint === "object";

  return hasDeliveryEnabled && Boolean(hasPoints);
}

// Create context
const CheckoutContext = createContext<CheckoutSettings | null>(null);

// Provider component
export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const [checkout, setCheckout] = useState<CheckoutSettings | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/checkout")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Checkout settings request failed: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setCheckout(
            isValidCheckoutSettings(data) ? data : CHECKOUT_SETTINGS_FALLBACK,
          );
        }
      })
      .catch((err) => {
        console.error("Failed to load checkout settings:", err);
        if (!cancelled) {
          setCheckout(CHECKOUT_SETTINGS_FALLBACK);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!checkout) {
    return (
      <div className="relative min-h-[calc(100vh-var(--header-height))]">
        <GlobalLoader mode="fullscreen" />
      </div>
    );
  }

  return (
    <CheckoutContext.Provider value={checkout}>
      {children}
    </CheckoutContext.Provider>
  );
}

// Hook to consume context
export function useCheckoutSettings() {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error("useCheckoutSettings must be used within CheckoutProvider");
  }
  return context;
}
