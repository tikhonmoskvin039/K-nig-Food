"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { House } from "lucide-react";
import MobileMenu from "./MobileMenu";
import { getLocalization } from "../utils/getLocalization";
import ThemeToggleButton from "./ThemeToggleButton";

export default function Header() {
  const content = getLocalization();
  const pathname = usePathname();

  const [visible, setVisible] = useState(true);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const showBackHomeButton = pathname !== "/";

  useEffect(() => {
    const updateHeaderHeightVar = () => {
      const header = headerRef.current;
      if (!header) return;

      const height = Math.ceil(header.getBoundingClientRect().height);
      if (height <= 0) return;

      document.documentElement.style.setProperty("--header-height", `${height}px`);
    };

    updateHeaderHeightVar();

    const rafId = window.requestAnimationFrame(updateHeaderHeightVar);
    const resizeObserver = new ResizeObserver(updateHeaderHeightVar);
    if (headerRef.current) {
      resizeObserver.observe(headerRef.current);
    }

    window.addEventListener("resize", updateHeaderHeightVar);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateHeaderHeightVar);
    };
  }, []);

  useEffect(() => {
    let lastScroll = 0;

    const handleScroll = () => {
      const currentScroll = window.scrollY;

      if (currentScroll > lastScroll && currentScroll > 50) {
        setVisible(false); // scroll down
      } else {
        setVisible(true); // scroll up
      }

      lastScroll = currentScroll;
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.div
      ref={headerRef}
      initial={{ y: "0%" }}
      animate={{ y: visible ? "0%" : "-100%" }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="site-header-shell fixed top-0 left-0 w-full z-50"
    >
      <header
        className="border-b bg-(--color-surface)/90 text-(--color-foreground) backdrop-blur supports-[backdrop-filter]:bg-[color:var(--color-surface)]/85 shadow-sm"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="app-shell py-3.5 flex justify-between items-center gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <h1 className="text-2xl font-bold min-w-0 leading-tight">
                <Link
                  href="/"
                  className="text-(--color-foreground) hover:text-amber-700"
                >
                  {content.siteName}
                </Link>
              </h1>

              <div className="w-9 xl:w-33 shrink-0 flex items-center">
                {showBackHomeButton ? (
                  <Link
                    href="/"
                    className="inline-flex w-full items-center justify-center xl:justify-start gap-1.5 rounded-full border px-2.5 py-1.5 xl:px-3.5 xl:py-2 text-xs xl:text-sm font-semibold text-(--color-foreground) bg-(--color-surface)/85 hover:text-amber-700 hover:border-amber-300 hover:bg-amber-50/70 transition shadow-sm"
                    style={{ borderColor: "var(--color-border)" }}
                    data-haptic="medium"
                    aria-label="Вернуться на главную"
                    title="На главную"
                  >
                    <House size={16} />
                    <span className="hidden xl:inline">На главную</span>
                  </Link>
                ) : (
                  <span
                    aria-hidden="true"
                    className="h-9 w-full rounded-full opacity-0 pointer-events-none select-none"
                  />
                )}
              </div>
            </div>

            <strong className="mt-1 block text-sm text-(--color-muted) leading-snug">
              {content.siteTagline}
            </strong>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggleButton />
            <MobileMenu menuItems={content.menu} />
          </div>
        </div>
      </header>
    </motion.div>
  );
}
