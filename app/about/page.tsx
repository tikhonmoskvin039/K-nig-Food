import type { Metadata } from "next";
import Image from "next/image";
import { getLocalization } from "../utils/getLocalization";

export const metadata = ((): Metadata => {
  const { about, siteName } = getLocalization();
  return {
    title: `${about.title} - ${siteName}`,
    description: about.content.split("\n")[0], // Use first paragraph as description
  };
})();

export default function AboutPage() {
  const { about } = getLocalization();

  if (!about) return null;

  return (
    <section className="section-wrap min-h-[calc(100vh-var(--header-height))]">
      <div className="app-shell">
        <div className="surface-card relative overflow-hidden min-h-[520px] md:min-h-[620px]">
          <Image
            src={about.imagePath}
            alt={about.title}
            fill
            priority
            className="object-cover object-center"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/15 via-slate-900/25 to-slate-900/55" />

          <div className="relative z-10 h-full flex items-end md:items-stretch">
            <div className="w-full md:ml-auto md:w-[46%] bg-white/84 dark:bg-slate-900/70 backdrop-blur-sm border-t md:border-t-0 md:border-l border-white/45 dark:border-slate-200/15 p-5 md:p-8 lg:p-10">
              <h1 className="page-title mb-4 md:mb-5 text-slate-900 dark:text-slate-100">
                {about.title}
              </h1>
              <p className="text-base md:text-lg text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                {about.content}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
