"use client";

export default function Pagination({ page, pages, setPage }) {
  return (
    <div className="flex justify-center gap-3 mt-5">
      <button disabled={page === 1} onClick={() => setPage(page - 1)}>
        Prev
      </button>

      <span>
        {page} / {pages}
      </span>

      <button disabled={page === pages} onClick={() => setPage(page + 1)}>
        Next
      </button>
    </div>
  );
}
