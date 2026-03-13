"use client";

import { useTheme } from "../context/ThemeContext";

type GlobalLoaderProps = {
  mode?: "fullscreen" | "inline";
  className?: string;
};

export default function GlobalLoader({
  mode = "fullscreen",
  className = "",
}: GlobalLoaderProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const fullscreenBackground = isDark ? "#111827" : "#f6f4ef";
  const containerClass =
    mode === "fullscreen"
      ? "fixed inset-0 flex items-center justify-center z-[220]"
      : "flex w-full items-center justify-center py-12";
  const spinnerClass = isDark
    ? "animate-spin rounded-full h-14 w-14 border-4 border-slate-700 border-t-amber-400"
    : "animate-spin rounded-full h-14 w-14 border-4 border-amber-200 border-t-amber-600";

  return (
    <div
      className={`${containerClass} ${className}`.trim()}
      style={mode === "fullscreen" ? { backgroundColor: fullscreenBackground } : undefined}
    >
      <div className={spinnerClass} />
    </div>
  );
}
