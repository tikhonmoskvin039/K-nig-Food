"use client";

import { useEffect } from "react";
import { Provider } from "react-redux";
import { store } from "./store/store";
import {
  loadCartItemsFromStorage,
  setCartItems,
} from "./store/slices/cartSlice";

let isCartHydrated = false;

function CartHydrator() {
  useEffect(() => {
    if (isCartHydrated) return;
    if (typeof window === "undefined") return;

    isCartHydrated = true;
    const items = loadCartItemsFromStorage();
    store.dispatch(setCartItems(items));
  }, []);

  return null;
}

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <CartHydrator />
      {children}
    </Provider>
  );
}
