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
      {/* MAIN HEADER */}
      <header className="bg-white text-gray-900 py-4 px-4 flex justify-between items-center shadow-md">
        <div>
          <h1 className="text-2xl font-bold">
            <Link href="/" className="text-gray-900 hover:text-gray-700">
              {content.siteName}
            </Link>
          </h1>
          <strong className="text-gray-700">{content.siteTagline}</strong>
        </div>

        <MobileMenu menuItems={content.menu} />
      </header>
    </motion.div>
  );
}
