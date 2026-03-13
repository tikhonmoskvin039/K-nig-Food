"use client";

import { useTheme } from "../context/ThemeContext";

type GlobalLoaderProps = {
  mode?: "fullscreen" | "inline";
  className?: string;
  blockInteractions?: boolean;
};

export default function GlobalLoader({
  mode = "fullscreen",
  className = "",
  blockInteractions = true,
}: GlobalLoaderProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const fullscreenBackground = isDark ? "#111827" : "#f6f4ef";
  const interactionClass = blockInteractions ? "pointer-events-auto" : "pointer-events-none";
  const containerClass =
    mode === "fullscreen"
      ? `fixed inset-0 flex items-center justify-center z-[220] ${interactionClass}`
      : "flex w-full items-center justify-center py-12";
  const spinnerClass = isDark
    ? "animate-spin rounded-full h-14 w-14 border-4 border-slate-700 border-t-amber-400"
    : "animate-spin rounded-full h-14 w-14 border-4 border-amber-200 border-t-amber-600";

  return (
    <div
      className={`${containerClass} ${className}`.trim()}
      style={mode === "fullscreen" ? { backgroundColor: fullscreenBackground } : undefined}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className={spinnerClass} />
    </div>
  );
}
