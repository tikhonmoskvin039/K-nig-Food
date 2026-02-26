"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import MobileMenu from "./MobileMenu";
import { getLocalization } from "../utils/getLocalization";

export default function Header() {
  const content = getLocalization();

  const [visible, setVisible] = useState(true);

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
      initial={{ y: 0 }}
      animate={{ y: visible ? 0 : -120 }}
      transition={{ duration: 0.25 }}
      className="fixed top-0 left-0 w-full z-50"
    >
      <header className="border-b border-slate-200/80 bg-white/90 text-gray-900 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-sm">
        <div className="app-shell py-3.5 flex justify-between items-center gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">
              <Link href="/" className="text-gray-900 hover:text-amber-700">
                {content.siteName}
              </Link>
            </h1>
            <strong className="text-sm text-slate-600">{content.siteTagline}</strong>
          </div>

          <MobileMenu menuItems={content.menu} />
        </div>
      </header>
    </motion.div>
  );
}
