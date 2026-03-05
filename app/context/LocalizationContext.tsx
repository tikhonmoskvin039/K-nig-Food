"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getLocalization } from "../utils/getLocalization";

// Define Localization Structure
interface LocalizationData {
  labels: { [key: string]: string };
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
    newsletter: {
      title: string;
      description: string;
      placeholder: string;
      buttonText: string;
    };
  };
  about: {
    title: string;
    imagePath: string;
    content: string;
  };
  contactForm: {
    title: string;
    subtitle: string;
    nameLabel: string;
    emailLabel: string;
    messageLabel: string;
    namePlaceholder: string;
    emailPlaceholder: string;
    messagePlaceholder: string;
    buttonText: string;
    successMessage: string;
    errorMessage: string;
  };
  email: string;
  phone: string;
  address: string;
  siteName: string;
  siteTagline: string;
  copyright: string;
}

// Create Context
const LocalizationContext = createContext<LocalizationData | null>(null);
const LOCALIZATION_CACHE_KEY = "localization_cache_v1";
const LOCALIZATION_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const FALLBACK_LOCALIZATION = getLocalization() as unknown as LocalizationData;

export function LocalizationProvider({ children }: { children: React.ReactNode }) {
  const [localization, setLocalization] = useState<LocalizationData | null>(
    FALLBACK_LOCALIZATION,
  );

  useEffect(() => {
    const hydrateFromStorage = () => {
      try {
        const raw = sessionStorage.getItem(LOCALIZATION_CACHE_KEY);
        if (!raw) return;

        const parsed = JSON.parse(raw) as {
          expiresAt?: number;
          localization?: LocalizationData;
        };

        if (
          parsed?.expiresAt &&
          parsed.expiresAt > Date.now() &&
          parsed.localization
        ) {
          setLocalization(parsed.localization);
        }
      } catch {
        // ignore cache read errors
      }
    };

    const fetchFreshLocalization = async () => {
      try {
        const response = await fetch("/api/localization", {
          cache: "force-cache",
        });
        if (!response.ok) return;

        const data = (await response.json()) as LocalizationData;
        setLocalization(data);

        sessionStorage.setItem(
          LOCALIZATION_CACHE_KEY,
          JSON.stringify({
            expiresAt: Date.now() + LOCALIZATION_CACHE_TTL_MS,
            localization: data,
          }),
        );
      } catch {
        // no-op
      }
    };

    hydrateFromStorage();
    fetchFreshLocalization();
  }, []);

  return <LocalizationContext.Provider value={localization}>{children}</LocalizationContext.Provider>;
}

// Hook for using localization data
export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error("useLocalization must be used within LocalizationProvider");
  }
  return context;
}
