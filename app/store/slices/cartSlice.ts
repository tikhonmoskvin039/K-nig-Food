// -----------------------------
// store/slices/cartSlice.ts
// Purpose: Redux slice to manage cart state (add/remove items, total, etc.)
// -----------------------------

import { createSlice, PayloadAction } from "@reduxjs/toolkit";


interface CartState {
  items: DTCartItem[];
}

const loadFromLocalStorage = (): DTCartItem[] => {
  try {
    const data = localStorage.getItem("cart");
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveToLocalStorage = (items: DTCartItem[]) => {
  localStorage.setItem("cart", JSON.stringify(items));
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
        state.items.push({ ...action.payload, quantity: 1 });
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
      state.items = action.payload;
      saveToLocalStorage(state.items);
    },    
  },
});

export const { addToCart, removeFromCart, updateQuantity, clearCart, setCartItems } = cartSlice.actions;
export default cartSlice.reducer;
