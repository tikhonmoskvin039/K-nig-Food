import homepageData from "../../configs/homepage.json";
import { getHomepageVisibilityState } from "../lib/homepageSettingsRepository";

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
export const getHomepageSettings = async (): Promise<HomepageSettings> => {
  const baseSettings = homepageData as HomepageSettings;
  const visibilityState = await getHomepageVisibilityState();

  return {
    ...baseSettings,
    recentProducts: {
      ...baseSettings.recentProducts,
      enabled: visibilityState.recentProductsEnabled,
    },
    weeklyOffers: {
      ...baseSettings.weeklyOffers,
      enabled: visibilityState.weeklyOffersEnabled,
    },
  };
};
