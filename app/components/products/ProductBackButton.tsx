"use client";

export default function ProductBackButton() {
  return (
    <button
      type="button"
      className="inline-flex h-11 w-11 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 md:w-auto md:min-w-28 md:px-4"
      onClick={() => window.history.back()}
      aria-label="Назад"
      title="Назад"
    >
      <span className="material-icons text-[22px]" aria-hidden="true">
        arrow_back
      </span>
      <span className="hidden text-sm font-semibold md:inline">Назад</span>
    </button>
  );
}
