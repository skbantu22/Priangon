"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const Pagination = ({
  itemsPerPage,
  setItemsPerPage,
  currentPage,
  setCurrentPage,
  filteredLength,
  totalPages,
}) => {
  return (
    <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/30 dark:bg-slate-900/10">
      {/* Left Side */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500">Rows per page:</span>

        <select
          value={itemsPerPage}
          onChange={(e) => {
            setItemsPerPage(parseInt(e.target.value));
            setCurrentPage(1);
          }}
          className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
        >
          <option value={5}>5 Rows</option>
          <option value={10}>10 Rows</option>
          <option value={20}>20 Rows</option>
          <option value={50}>50 Rows</option>
        </select>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>

        <span className="text-xs text-slate-500">
          Showing{" "}
          {filteredLength > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
          {Math.min(currentPage * itemsPerPage, filteredLength)} of{" "}
          {filteredLength}
        </span>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-1.5">
        {/* Previous */}
        <button
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Pages */}
        {Array.from({ length: totalPages || 1 }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentPage(idx + 1)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              currentPage === idx + 1
                ? "bg-indigo-600 text-white"
                : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            }`}
          >
            {idx + 1}
          </button>
        ))}

        {/* Next */}
        <button
          onClick={() =>
            setCurrentPage((prev) => Math.min(totalPages || 1, prev + 1))
          }
          disabled={currentPage === totalPages || totalPages === 0}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
