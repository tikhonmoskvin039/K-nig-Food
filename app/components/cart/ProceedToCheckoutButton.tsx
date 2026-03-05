"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ButtonSpinner from "../common/ButtonSpinner";

type Props = {
  label: string;
};

export default function ProceedToCheckoutButton({ label }: Props) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  return (
    <button
      type="button"
      className="btn-primary min-w-60 min-h-11"
      disabled={isNavigating}
      onClick={() => {
        setIsNavigating(true);
        router.push("/checkout");
      }}
    >
      {isNavigating ? <ButtonSpinner /> : label}
    </button>
  );
}
