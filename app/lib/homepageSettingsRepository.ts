import homepageData from "../../configs/homepage.json";
import { getPrismaClient } from "./prisma";

const HOMEPAGE_SETTINGS_ID = "default";

type HomepageSettingsConfig = {
  recentProducts?: {
    enabled?: boolean;
  };
  weeklyOffers?: {
    enabled?: boolean;
  };
};

type HomepageVisibilityState = {
  recentProductsEnabled: boolean;
  weeklyOffersEnabled: boolean;
};

const HOMEPAGE_CONFIG = homepageData as HomepageSettingsConfig;

function getFallbackVisibilityState(): HomepageVisibilityState {
  return {
    recentProductsEnabled: HOMEPAGE_CONFIG.recentProducts?.enabled ?? true,
    weeklyOffersEnabled: HOMEPAGE_CONFIG.weeklyOffers?.enabled ?? true,
  };
}

function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function getHomepageVisibilityState(): Promise<HomepageVisibilityState> {
  const fallback = getFallbackVisibilityState();

  if (!isDatabaseConfigured()) {
    return fallback;
  }

  try {
    const prisma = getPrismaClient();
    const row = await prisma.homepageSettings.findUnique({
      where: { id: HOMEPAGE_SETTINGS_ID },
    });

    if (!row) {
      return fallback;
    }

    return {
      recentProductsEnabled: row.recentProductsEnabled,
      weeklyOffersEnabled: row.weeklyOffersEnabled,
    };
  } catch (error) {
    console.error("Failed to read homepage visibility settings from DB:", error);
    return fallback;
  }
}

export async function saveHomepageVisibilityState(
  nextState: HomepageVisibilityState,
): Promise<HomepageVisibilityState> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const prisma = getPrismaClient();
  const row = await prisma.homepageSettings.upsert({
    where: { id: HOMEPAGE_SETTINGS_ID },
    update: {
      recentProductsEnabled: nextState.recentProductsEnabled,
      weeklyOffersEnabled: nextState.weeklyOffersEnabled,
    },
    create: {
      id: HOMEPAGE_SETTINGS_ID,
      recentProductsEnabled: nextState.recentProductsEnabled,
      weeklyOffersEnabled: nextState.weeklyOffersEnabled,
    },
  });

  return {
    recentProductsEnabled: row.recentProductsEnabled,
    weeklyOffersEnabled: row.weeklyOffersEnabled,
  };
}
