"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useLocalization } from "../../context/LocalizationContext";

export default function HomepageBanner() {
  const { homepage } = useLocalization();

  if (!homepage?.banner) return null;

  const { title, subtitle, buttonText, ctaLink, imagePath } = homepage.banner;

  return (
    <section
      className="
        relative
        w-full
        min-h-[calc(100vh-var(--header-height))]
        flex
        justify-center
        items-center
        text-center
        overflow-hidden
        text-white
      "
    >
      {/* Background Image */}
      <Image
        src={imagePath}
        alt="Homepage banner"
        fill
        priority
        className="
    object-cover
    object-center
    md:object-[center_25%]
    xl:object-[center_20%]
    2xl:object-[center_15%]
    -z-10
  "
      />

      {/* Optional overlay for readability */}
      <div className="absolute inset-0 bg-black/40 -z-10" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-4xl mx-auto px-6 relative z-10"
      >
        <h2 className="text-3xl md:text-4xl font-extrabold mb-6 drop-shadow-lg">
          {title}
        </h2>

        <p className="text-lg mb-8 text-gray-200">{subtitle}</p>

        <Link
          href={ctaLink}
          className="
            bg-white text-gray-600
            hover:bg-gray-200 hover:text-gray-800
            px-8 py-4 rounded-full text-xl font-bold
            shadow-lg transition-transform
            hover:scale-110
          "
        >
          {buttonText}
        </Link>
      </motion.div>
    </section>
  );
}
