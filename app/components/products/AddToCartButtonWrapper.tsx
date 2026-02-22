"use client";

import { Provider } from "react-redux";
import { store } from "../../store/store";
import AddToCartButton from "./AddToCartButton";

interface WrapperProps {
  product: DTProduct;
}

export default function AddToCartButtonWrapper({ product }: WrapperProps) {
  return (
    <Provider store={store}>
      <AddToCartButton product={product} />
    </Provider>
  );
}
