"use client";

import { useEffect } from "react";
import ProductGrid from "./ProductGrid";
import { useProductContext } from "../../context/ProductContext";

type SpecialFilter = "new" | "promo";

interface ProductGridSpecialProps {
  filter: SpecialFilter;
  pageSize?: number;
}

export default function ProductGridSpecial({
  filter,
  pageSize = 18,
}: ProductGridSpecialProps) {
  const {
    setSearchQuery,
    setCategoryFilter,
    setSpecialFilter,
    setSortBy,
  } = useProductContext();

  useEffect(() => {
    setSearchQuery("");
    setCategoryFilter("");
    setSortBy("name");
    setSpecialFilter(filter);

    return () => {
      setSpecialFilter("all");
      setSearchQuery("");
      setCategoryFilter("");
    };
  }, [filter, setCategoryFilter, setSearchQuery, setSortBy, setSpecialFilter]);

  return <ProductGrid pageSize={pageSize} />;
}
