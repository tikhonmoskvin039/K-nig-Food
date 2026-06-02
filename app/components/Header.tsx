"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import MobileMenu from "./MobileMenu";
import { getLocalization } from "../utils/getLocalization";
import ThemeToggleButton from "./ThemeToggleButton";

export default function Header() {
  const content = getLocalization();

  const [visible, setVisible] = useState(true);
  const headerRef = useRef<HTMLDivElement | null>(null);

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
    let lastScroll = window.scrollY;
    let rafId = 0;
    let ticking = false;

    const updateVisibility = () => {
      const currentScroll = window.scrollY;
      const shouldBeVisible = !(currentScroll > lastScroll && currentScroll > 50);
      setVisible((prev) => (prev === shouldBeVisible ? prev : shouldBeVisible));
      lastScroll = currentScroll;
      ticking = false;
    };

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      rafId = window.requestAnimationFrame(updateVisibility);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 right-0 pointer-events-none bg-(--safe-area-header-bg)"
        style={{
          height: "env(safe-area-inset-top, 0px)",
          zIndex: 1000000001,
        }}
      />

      <motion.div
        ref={headerRef}
        initial={{ y: "0%" }}
        animate={{ y: visible ? "0%" : "-100%" }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="site-header-shell fixed top-0 left-0 w-full z-50 bg-(--safe-area-header-bg)"
      >
        <header className="border-b border-(--color-border) bg-(--safe-area-header-bg) text-(--color-foreground) shadow-sm">
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
              </div>

            </div>

            <div className="flex items-center gap-2">
              <ThemeToggleButton />
              <MobileMenu menuItems={content.menu} />
            </div>
          </div>
        </header>
      </motion.div>
    </>
  );
}
