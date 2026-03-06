"use client";

import { Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggleButton() {
  const { toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="btn-secondary px-3 py-2 min-w-12"
      aria-label="Переключить тему"
      title="Переключить тему"
    >
      <Moon size={18} />
    </button>
  );
}
