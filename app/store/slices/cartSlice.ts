// -----------------------------
// store/slices/cartSlice.ts
// Purpose: Redux slice to manage cart state (add/remove items, total, etc.)
// -----------------------------

import { createSlice, PayloadAction } from "@reduxjs/toolkit";


interface CartState {
  items: DTCartItem[];
}

const CART_UPDATED_AT_KEY = "cart_updated_at";
const CART_AUTO_CLEARED_NOTICE_KEY = "cart_auto_cleared_notice_v1";
const CART_TTL_MS = 24 * 60 * 60 * 1000;

const toCartItem = (product: DTProduct | DTCartItem): DTCartItem => ({
  ID: product.ID,
  Slug: product.Slug,
  Title: product.Title,
  RegularPrice: product.RegularPrice,
  SalePrice: product.SalePrice || "",
  FeatureImageURL: product.FeatureImageURL || "/placeholder.png",
  Currency: product.Currency || "RUR",
  quantity:
    "quantity" in product && typeof product.quantity === "number"
      ? Math.max(1, product.quantity)
      : 1,
});

const hasExpiredCart = () => {
  try {
    const raw = localStorage.getItem(CART_UPDATED_AT_KEY);
    if (!raw) return false;

    const timestamp = Number(raw);
    if (!Number.isFinite(timestamp)) return false;

    return Date.now() - timestamp > CART_TTL_MS;
  } catch {
    return false;
  }
};

const loadFromLocalStorage = (): DTCartItem[] => {
  try {
    if (hasExpiredCart()) {
      localStorage.removeItem("cart");
      localStorage.setItem(CART_UPDATED_AT_KEY, String(Date.now()));
      localStorage.setItem(CART_AUTO_CLEARED_NOTICE_KEY, String(Date.now()));
      return [];
    }

    const data = localStorage.getItem("cart");
    if (!data) return [];

    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];

    // Migrate legacy heavy cart payloads to compact cart items.
    const compactItems = parsed
      .filter((item): item is DTProduct | DTCartItem => !!item && typeof item === "object")
      .map((item) => toCartItem(item));

    try {
      localStorage.setItem("cart", JSON.stringify(compactItems));
      localStorage.setItem(CART_UPDATED_AT_KEY, String(Date.now()));
    } catch {
      // Ignore secondary write errors during hydration migration.
    }

    return compactItems;
  } catch {
    return [];
  }
};

const saveToLocalStorage = (items: DTCartItem[]) => {
  try {
    localStorage.setItem("cart", JSON.stringify(items));
    localStorage.setItem(CART_UPDATED_AT_KEY, String(Date.now()));
  } catch (error) {
    console.error("Failed to persist cart in localStorage:", error);
  }
};

const initialState: CartState = {
  items: typeof window !== "undefined" ? loadFromLocalStorage() : [],
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<DTProduct>) => {
      const existing = state.items.find((item) => item.ID === action.payload.ID);
      if (existing) {
        existing.quantity += 1;
      } else {
        state.items.push(toCartItem(action.payload));
      }
      saveToLocalStorage(state.items);
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.ID !== action.payload);
      saveToLocalStorage(state.items);
    },
    updateQuantity: (
      state,
      action: PayloadAction<{ id: string; quantity: number }>
    ) => {
      const item = state.items.find((item) => item.ID === action.payload.id);
      if (item) {
        item.quantity = action.payload.quantity;
      }
      saveToLocalStorage(state.items);
    },
    clearCart: (state) => {
      state.items = [];
      saveToLocalStorage([]);
    },
    setCartItems: (state, action: PayloadAction<DTCartItem[]>) => {
      state.items = action.payload.map((item) => toCartItem(item));
      saveToLocalStorage(state.items);
    },
    reconcileCartWithCatalog: (state, action: PayloadAction<DTProduct[]>) => {
      const catalogById = new Map(action.payload.map((item) => [item.ID, item]));

      const reconciled = state.items
        .map((cartItem) => {
          const actualProduct = catalogById.get(cartItem.ID);
          if (!actualProduct) return null;

          return {
            ...cartItem,
            Title: actualProduct.Title,
            Slug: actualProduct.Slug,
            RegularPrice: actualProduct.RegularPrice,
            SalePrice: actualProduct.SalePrice || "",
            FeatureImageURL:
              actualProduct.FeatureImageURL || "/placeholder.png",
            Currency: actualProduct.Currency || "RUR",
          } satisfies DTCartItem;
        })
        .filter((item): item is DTCartItem => item !== null);

      state.items = reconciled;
      saveToLocalStorage(state.items);
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  setCartItems,
  reconcileCartWithCatalog,
} = cartSlice.actions;
export default cartSlice.reducer;
