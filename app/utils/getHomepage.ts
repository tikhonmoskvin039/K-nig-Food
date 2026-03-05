import homepageData from "../../configs/homepage.json";

// Define Homepage Settings Structure
export interface HomepageSettings {
  banner: {
    enabled: boolean;
  };
  recentProducts: {
    enabled: boolean;
    count: number;
  };
  weeklyOffers: {
    enabled: boolean;
    count: number;
  };
  brandStory: {
    enabled: boolean;
  };
  testimonials: {
    enabled: boolean;
  };
  newsletter: {
    enabled: boolean;
  };
  brands: {
    enabled: boolean;
  };
}

// Fetch Homepage Settings
// Now using direct import for compatibility with Vercel
export const getHomepageSettings = (): HomepageSettings => {
  return homepageData as HomepageSettings;
};
