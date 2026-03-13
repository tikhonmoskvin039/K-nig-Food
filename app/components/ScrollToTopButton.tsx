"use client";
import { useCallback, useEffect, useState } from "react";
import { ArrowUp, CreditCard } from "lucide-react";
import { usePathname } from "next/navigation";

const CHECKOUT_PAY_BUTTON_ID = "checkout-pay-button";

const ScrollToTopButton = () => {
  const pathname = usePathname();
  const isCheckoutPage = pathname === "/checkout";
  const [showScroll, setShowScroll] = useState(false);
  const [showCheckoutPayShortcut, setShowCheckoutPayShortcut] = useState(false);

  const evaluateFloatingButtons = useCallback(() => {
    if (typeof window === "undefined") return;

    setShowScroll(window.scrollY > 300);

    if (pathname !== "/checkout") {
      setShowCheckoutPayShortcut(false);
      return;
    }

    const payButton = document.getElementById(CHECKOUT_PAY_BUTTON_ID);
    if (!payButton) {
      setShowCheckoutPayShortcut(false);
      return;
    }

    const rect = payButton.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const isVisible = rect.top < viewportHeight && rect.bottom > 0;

    setShowCheckoutPayShortcut(!isVisible);
  }, [pathname]);

  useEffect(() => {
    let rafId = 0;
    const runEvaluate = () => {
      evaluateFloatingButtons();
      rafId = 0;
    };

    rafId = window.requestAnimationFrame(runEvaluate);

    const handleViewportChange = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(runEvaluate);
    };

    window.addEventListener("scroll", handleViewportChange, { passive: true });
    window.addEventListener("resize", handleViewportChange);

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", handleViewportChange);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, [evaluateFloatingButtons]);

  if (!showScroll && !showCheckoutPayShortcut) {
    return null;
  }

  const floatingActionBaseClass =
    "h-12 w-12 rounded-xl shadow-lg text-white transition flex items-center justify-center";
  const floatingContainerClass = isCheckoutPage
    ? "fixed bottom-[calc(var(--safe-area-bottom)+5rem)] right-4 md:right-8 md:bottom-8 z-[110] flex flex-col items-end gap-2"
    : "fixed bottom-[calc(var(--safe-area-bottom)+1rem)] right-4 md:right-8 md:bottom-8 z-[110] flex flex-col items-end gap-2";

  return (
    <div className={floatingContainerClass}>
      {showCheckoutPayShortcut ? (
        <>
          <button
            type="button"
            onClick={() => {
              document.getElementById(CHECKOUT_PAY_BUTTON_ID)?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }}
            className={`${floatingActionBaseClass} bg-cyan-600 hover:bg-cyan-700`}
            aria-label="К оплате"
            title="К оплате"
          >
            <CreditCard className="size-6" />
          </button>

          {showScroll ? (
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className={`${floatingActionBaseClass} bg-amber-600 hover:bg-amber-700`}
              aria-label="Наверх"
            >
              <ArrowUp className="size-6" />
            </button>
          ) : (
            <span
              className={`${floatingActionBaseClass} invisible pointer-events-none`}
              aria-hidden="true"
            />
          )}
        </>
      ) : (
        showScroll && (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className={`${floatingActionBaseClass} bg-amber-600 hover:bg-amber-700`}
            aria-label="Наверх"
          >
            <ArrowUp className="size-6" />
          </button>
        )
      )}
    </div>
  );
};

export default ScrollToTopButton;
