"use client";

import { ReduxProvider } from "../../providers";
import ProductCard from "./ProductCard";

export default function ProductCardWithProvider({ product }: { product: DTProduct }) {
  return (
    <ReduxProvider>
      <ProductCard product={product} />
    </ReduxProvider>
  );
}
