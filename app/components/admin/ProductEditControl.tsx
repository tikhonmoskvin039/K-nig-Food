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
        className || "btn-secondary px-3 py-1.5 text-center"
      }
    >
      Редактировать
    </Link>
  );
}
