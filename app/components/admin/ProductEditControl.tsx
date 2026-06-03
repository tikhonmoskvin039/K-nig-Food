"use client";

import Link from "next/link";
import { CiEdit } from "react-icons/ci";

type Props = {
  productId: string;
  className?: string;
};

export default function ProductEditControl({ productId, className }: Props) {
  return (
    <Link
      href={`/admin/products/${encodeURIComponent(productId)}/edit`}
      className={className || "btn-secondary px-3 py-1.5 text-center"}
    >
      <CiEdit size={24} />
    </Link>
  );
}
