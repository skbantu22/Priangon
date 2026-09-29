"use client";

import { ScanBarcode, X } from "lucide-react";

export default function PosMobileScanBar({
  search,
  setSearch,
  inputRef,
  onSearchKeyDown,
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <input
        type="checkbox"
        className="size-4 shrink-0 rounded border-gray-300 accent-[#2563eb]"
        aria-label="Scan mode"
      />
      <label className="flex h-10 min-w-0 flex-1 items-center overflow-hidden rounded-md border border-gray-300 bg-white focus-within:border-primary">
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={onSearchKeyDown}
          placeholder="Enter Product Name / Scan Barcode"
          className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
        />
        {search ? (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              inputRef?.current?.focus();
            }}
            className="px-2 text-gray-400"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        ) : null}
        <span className="flex h-full w-11 shrink-0 items-center justify-center border-l border-gray-200 bg-gray-50 text-gray-700">
          <ScanBarcode className="size-5" aria-hidden />
        </span>
      </label>
    </div>
  );
}
