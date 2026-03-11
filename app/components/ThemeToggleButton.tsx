"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const showSun = isHydrated && theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="btn-secondary px-3 py-2 min-w-12"
      aria-label="Переключить тему"
      title="Переключить тему"
    >
      {showSun ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
