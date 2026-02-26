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
        className ||
        "w-full sm:w-auto bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-center"
      }
    >
      + Добавить товар
    </Link>
  );
}
