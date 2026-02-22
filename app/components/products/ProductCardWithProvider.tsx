"use client";

import { Provider } from "react-redux";
import { store } from "../../store/store";
import ProductCard from "./ProductCard";

export default function ProductCardWithProvider({ product }: { product: DTProduct }) {
  return (
    <Provider store={store}>
      <ProductCard product={product} />
    </Provider>
  );
}
