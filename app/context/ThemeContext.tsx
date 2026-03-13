"use client";

import { createContext, useContext, useLayoutEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  theme: ThemeMode;
  toggleTheme: () => void;
};

const THEME_STORAGE_KEY = "kfood_theme_mode";
const LIGHT_THEME_COLOR = "#ffffff";
const DARK_THEME_COLOR = "#1f2937";
const SAFE_AREA_HEADER_BG_VAR = "--safe-area-header-bg";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function upsertMetaTag(name: string) {
  const existing = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (existing) return existing;

  const created = document.createElement("meta");
  created.setAttribute("name", name);
  document.head.appendChild(created);
  return created;
}

function applyThemeColorMeta(themeColor: string) {
  const existingThemeColorTags = Array.from(
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
  );

  if (existingThemeColorTags.length === 0) {
    const created = document.createElement("meta");
    created.setAttribute("name", "theme-color");
    created.setAttribute("content", themeColor);
    created.setAttribute("data-kfood-theme-color", "1");
    document.head.appendChild(created);
  } else {
    existingThemeColorTags.forEach((tag) => {
      tag.setAttribute("content", themeColor);
    });
  }

  // Safari may apply toolbar color with a small delay after dynamic updates.
  window.requestAnimationFrame(() => {
    const tags = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
    tags.forEach((tag) => {
      tag.setAttribute("content", themeColor);
    });
  });
}

function applyTheme(mode: ThemeMode) {
  const themeColor = mode === "dark" ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
  document.documentElement.setAttribute("data-theme", mode);
  document.documentElement.style.backgroundColor = themeColor;
  document.documentElement.style.setProperty(SAFE_AREA_HEADER_BG_VAR, themeColor);

  // Keep mobile browser UI color in sync with the in-app theme toggle.
  applyThemeColorMeta(themeColor);

  const appleStatusBar = upsertMetaTag("apple-mobile-web-app-status-bar-style");
  appleStatusBar.setAttribute(
    "content",
    mode === "dark" ? "black-translucent" : "default",
  );
}

function resolveInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "dark" || stored === "light") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => resolveInitialTheme());

  useLayoutEffect(() => {
    applyTheme(theme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme: () => {
        setTheme((prev) => (prev === "light" ? "dark" : "light"));
      },
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
