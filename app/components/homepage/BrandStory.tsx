import Link from "next/link";
import Image from "next/image";
import { getLocalization } from "../../utils/getLocalization";

export default async function BrandStory() {
  // Fetch localization data (Server-Side)
  const { homepage } = getLocalization();

  if (!homepage?.brandStory) {
    return null; // Prevent rendering if missing data
  }

  const { title, description, buttonText, ctaLink, imagePath } = homepage.brandStory;
  const storyImage = imagePath || "/about-us.jpg";

  return (
    <section className="relative w-full py-14 md:py-18 bg-linear-to-r from-slate-900 via-slate-800 to-slate-700 text-white">
      <div className="app-shell">
        <div className="surface-card overflow-hidden border-white/12 bg-black/22">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="relative min-h-[260px] md:min-h-[560px]">
              <Image
                src={storyImage}
                alt={title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority={false}
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/38 via-transparent to-transparent" />
            </div>

            <div className="p-6 md:p-10 lg:p-12 flex flex-col justify-center">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-wide">
                {title}
              </h2>

              <p className="mt-6 text-base md:text-lg opacity-90 leading-relaxed whitespace-pre-line">
                {description}
              </p>

              <Link
                href={ctaLink}
                className="mt-8 w-full sm:w-auto btn-primary text-base md:text-lg px-6 py-3 rounded-full shadow-lg"
              >
                {buttonText}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Overlay */}
      <div className="absolute inset-0 bg-linear-to-b from-gray-800/30 to-transparent pointer-events-none"></div>
    </section>
  );
}
