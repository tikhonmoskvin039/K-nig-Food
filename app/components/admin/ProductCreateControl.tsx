"use client";

import Link from "next/link";

type Props = {
  className?: string;
};

export default function ProductCreateControl({ className }: Props) {
  return (
    <Link
      href="/admin/products/new"
      className={
        className || "btn-primary w-full sm:w-auto"
      }
    >
      + Добавить товар
    </Link>
  );
}
