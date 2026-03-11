"use client";

import { ReduxProvider } from "../../providers";
import AddToCartButton from "./AddToCartButton";

interface WrapperProps {
  product: DTProduct;
}

export default function AddToCartButtonWrapper({ product }: WrapperProps) {
  return (
    <ReduxProvider>
      <AddToCartButton product={product} />
    </ReduxProvider>
  );
}
