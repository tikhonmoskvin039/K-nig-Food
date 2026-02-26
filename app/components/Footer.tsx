import Link from "next/link";
import {
  SiFacebook,
  SiInstagram,
  SiLinkedin,
  SiTelegram,
  SiX,
  SiYoutube,
} from "react-icons/si";
import ScrollToTopButton from "./ScrollToTopButton";
import { getLocalization } from "../utils/getLocalization";

// Define TypeScript interfaces
interface FooterLink {
  label: string;
  href: string;
}

// Map icon strings to components
const iconMap: Record<DTSocialIcon, React.ElementType> = {
  SiFacebook: SiFacebook,
  SiTelegram: SiTelegram,
  SiX: SiX,
  SiInstagram: SiInstagram,
  SiLinkedin: SiLinkedin,
  SiYoutube: SiYoutube,
};

export default function Footer() {
  const content = getLocalization();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 text-slate-200 pt-12 pb-10 relative">
      <div className="app-shell grid grid-cols-1 md:grid-cols-3 gap-10 text-center md:text-left">
        <div>
          <h3 className="text-xl font-semibold mb-4 text-white">
            {content.labels.quickLinks}
          </h3>
          <ul className="space-y-2">
            {content.footerLinks.map((link: FooterLink) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-slate-300 hover:text-amber-300 transition"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4 text-white">
            {content.contactForm.title}
          </h3>
          <p>
            <Link
              href="/contact"
              className="text-slate-300 hover:text-amber-300 transition"
            >
              {content.contactForm.subtitle}
            </Link>
          </p>
          {content.phone && (
            <p>
              {content.labels.phone}:{" "}
              <a
                href={`tel:${content.phone}`}
                className="text-slate-300 hover:text-amber-300 transition"
              >
                {content.phone}
              </a>
            </p>
          )}
          {content.address && <p>{content.labels.address}: {content.address}</p>}
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4 text-white">
            {content.labels.followUs}
          </h3>
          <div className="flex justify-center md:justify-start space-x-4">
            {content.socialLinks.map((social) => {
              const IconComponent = iconMap[social.icon as DTSocialIcon];
              return (
                <Link
                  key={social.id}
                  href={social.url}
                  target="_blank"
                  className="text-slate-300 hover:text-amber-300 transition"
                >
                  <IconComponent size={24} />
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="text-center text-sm mt-8 text-slate-400">
        © {currentYear} Все права защищены.
        <span className="mx-1">|</span>
        <Link
          href="https://github.com/tikhonmoskvin039/K-nig-Food"
          target="_blank"
          className="text-slate-300 hover:text-amber-300 transition"
        >
          Powered by König Food
        </Link>
      </div>

      <ScrollToTopButton />
    </footer>
  );
}
