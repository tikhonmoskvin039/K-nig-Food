"use client";

type Props = {
  currentPage: number;
  totalPages: number;
  onSetPage: (page: number) => void;
};

export default function ProductPagination({
  currentPage,
  totalPages,
  onSetPage,
}: Props) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onSetPage(currentPage - 1)}
        disabled={currentPage === 1}
        className="btn-secondary px-3 py-1.5"
      >
        Назад
      </button>

      {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onSetPage(page)}
          className={`btn px-3 py-1.5 border ${
            page === currentPage
              ? "bg-amber-600 text-white border-amber-600"
              : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
          }`}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onSetPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="btn-secondary px-3 py-1.5"
      >
        Вперед
      </button>
    </div>
  );
}
