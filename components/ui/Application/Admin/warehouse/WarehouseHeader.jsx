"use client";

import React, { useMemo } from "react";

export default function WarehouseHeader({
  data,
  tab,
  setTab,
  search,
  setSearch,
  activeCategory,
  setActiveCategory,
}) {
  // Categories
  const categories = useMemo(() => {
    const set = new Set();

    data.forEach((item) => {
      const category =
        item.productId?.category?.name ||
        item.productId?.category ||
        "Uncategorized";

      set.add(category);
    });

    return [...set];
  }, [data]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">🏭 Warehouse Management</h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("stock")}
            className={`px-4 py-2 rounded border transition ${
              tab === "stock"
                ? "bg-black text-white"
                : "bg-white hover:bg-gray-100"
            }`}
          >
            Stock
          </button>

          <button
            onClick={() => setTab("history")}
            className={`px-4 py-2 rounded border transition ${
              tab === "history"
                ? "bg-black text-white"
                : "bg-white hover:bg-gray-100"
            }`}
          >
            History
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow border p-4 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Search */}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Product..."
            className="border rounded-lg px-4 py-2 w-full"
          />

          {/* Category */}
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="border rounded-lg px-4 py-2 w-full"
          >
            <option value="ALL">All Categories ({data.length})</option>

            {categories.map((cat) => {
              const count = data.filter((item) => {
                const category =
                  item.productId?.category?.name ||
                  item.productId?.category ||
                  "Uncategorized";

                return category === cat;
              }).length;

              return (
                <option key={cat} value={cat}>
                  {cat} ({count})
                </option>
              );
            })}
          </select>
        </div>
      </div>
    </>
  );
}
