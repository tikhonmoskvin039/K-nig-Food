"use client";

export default function GlobalLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm z-50">
      <div className="animate-spin rounded-full h-14 w-14 border-4 border-gray-300 border-t-gray-700" />
    </div>
  );
}
