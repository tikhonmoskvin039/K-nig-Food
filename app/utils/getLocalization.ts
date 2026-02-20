import localeData from "../../configs/locale.ru.json";

// Define Localization Structure
interface LocalizationData {
  phone: string;
  address: string;
  siteName: string;
  siteTagline: string;
  labels: {
    phone: string;
    address: string;
    quickLinks: string;
    contactUs: string;
    followUs: string;
    searchPlaceholder: string;
    allCategories: string;
    sortByName: string;
    sortByPrice: string;
    sortByNewest: string;
    loadingProducts: string;
    noProductsFound: string;
    productDetails: string;
    products: string;
    recentProducts: string;
    orderConfirmationTitle: string;
    orderConfirmationMessage: string;
  };
  menu: { label: string; href: string }[];
  footerLinks: { label: string; href: string }[];
  socialLinks: { id: string; icon: string; url: string }[];
  homepage: {
    banner: {
      title: string;
      subtitle: string;
      buttonText: string;
      imagePath: string;
      ctaLink: string;
    };
    brandStory: {
      title: string;
      description: string;
      buttonText: string;
      ctaLink: string;
    };
    testimonialsTitle: string;
    testimonials: {
      id: number;
      name: string;
      avatar: string;
      rating: number;
      review: string;
    }[];
    brandsTitle: string;
    brands: { name: string; logo: string }[];
  };
  about: {
    title: string,
    imagePath: string,
    content: string
  },
  copyright: string;
  contactForm: {
    title: string,
    subtitle: string
  }
}

// Fetch Localization Data
// Now using direct import for compatibility with Vercel
export const getLocalization = (): LocalizationData => {
  return localeData as LocalizationData;
};
