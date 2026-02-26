import Link from "next/link";
import { getLocalization } from "../../utils/getLocalization";

export default async function BrandStory() {
  // Fetch localization data (Server-Side)
  const { homepage } = getLocalization();

  if (!homepage?.brandStory) {
    return null; // Prevent rendering if missing data
  }

  const { title, description, buttonText, ctaLink } = homepage.brandStory;

  return (
    <section className="relative w-full py-20 bg-linear-to-r from-slate-900 via-slate-800 to-slate-700 text-white">
      <div className="app-shell text-center">
        {/* Title */}
        <h2 className="text-4xl font-extrabold mb-6 tracking-wide">
          {title}
        </h2>

        {/* Description */}
        <p className="text-lg max-w-3xl mx-auto opacity-90">
          {description}
        </p>

        {/* Call to Action Button */}
        <Link
          href={ctaLink}
          className="mt-8 btn-primary text-lg px-8 py-3 rounded-full shadow-lg hover:scale-105"
        >
          {buttonText}
        </Link>
      </div>

      {/* Decorative Overlay */}
      <div className="absolute inset-0 bg-linear-to-b from-gray-800/30 to-transparent pointer-events-none"></div>
    </section>
  );
}
