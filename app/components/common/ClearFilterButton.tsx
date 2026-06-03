"use client";

import { IoClose } from "react-icons/io5";

type Props = {
  label: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
};

export default function ClearFilterButton({
  label,
  onClick,
  className = "right-2",
  disabled = false,
}: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`absolute top-1/2 z-10 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500 disabled:pointer-events-none disabled:opacity-40 ${className}`}
    >
      <IoClose size={18} aria-hidden="true" />
    </button>
  );
}
