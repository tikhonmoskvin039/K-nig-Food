"use client";

type GlobalLoaderProps = {
  mode?: "fullscreen" | "inline";
  className?: string;
};

export default function GlobalLoader({
  mode = "fullscreen",
  className = "",
}: GlobalLoaderProps) {
  const containerClass =
    mode === "fullscreen"
      ? "fixed inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm z-50"
      : "flex w-full items-center justify-center py-12";

  return (
    <div className={`${containerClass} ${className}`.trim()}>
      <div className="animate-spin rounded-full h-14 w-14 border-4 border-gray-300 border-t-gray-700" />
    </div>
  );
}
