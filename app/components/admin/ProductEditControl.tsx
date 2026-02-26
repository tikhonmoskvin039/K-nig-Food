"use client";

import Link from "next/link";

type Props = {
  productId: string;
  className?: string;
};

export default function ProductEditControl({ productId, className }: Props) {
  return (
    <Link
      href={`/admin/products/${encodeURIComponent(productId)}/edit`}
      className={
        className ||
        "px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-center"
      }
    >
      Редактировать
    </Link>
  );
}
