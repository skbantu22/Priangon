"use client";

import { useEffect, useMemo, useState } from "react";
import { showToast } from "@/lib/showToast";

import StockHeader from "@/components/ui/Application/Admin/stock-overview/StockHeader";
import StockGrid from "@/components/ui/Application/Admin/stock-overview/StockGrid";

const ITEMS_PER_PAGE = 12;

export default function StockOverviewPage() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("ALL");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  // ================= FETCH =================
  const fetchStock = async (q = "") => {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/stock/stock-overview?q=${encodeURIComponent(q)}`,
        { cache: "no-store" },
      );

      const result = await res.json();
      console.log("STOCK OVERVIEW RESULT:", result);

      if (result.success) {
        setData(result.data || []);
        setCurrentPage(1);
      } else {
        showToast(result.message || "Failed to load stock");
      }
    } catch (err) {
      console.error(err);
      showToast("Server Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock("");
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStock(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // ================= METRICS =================
  const metrics = useMemo(() => {
    let totalStock = 0;
    let totalItems = 0;
    let lowStock = 0;
    const zones = new Set();

    data.forEach((z) => {
      zones.add(z.showroom);

      z.items.forEach((i) => {
        totalStock += i.stock || 0;
        totalItems += 1;
        if ((i.stock || 0) <= 5) lowStock += 1;
      });
    });

    return {
      globalTotalStock: totalStock,
      globalTotalItems: totalItems,
      lowStockCount: lowStock,
      uniqueZones: Array.from(zones),
    };
  }, [data]);

  // ================= CATEGORIES (FIXED) =================
  const categories = useMemo(() => {
    const set = new Set();

    data.forEach((z) => {
      z.items?.forEach((i) => {
        const cat = i?.category;

        if (typeof cat === "string") {
          set.add(cat.trim().toLowerCase());
        }
      });
    });

    return Array.from(set);
  }, [data]);

  // ================= FILTER + PAGINATION =================
  const paginatedData = useMemo(() => {
    const filteredZones = data.filter((z) =>
      activeTab === "ALL" ? true : z.showroom === activeTab,
    );

    let allItems = [];

    filteredZones.forEach((z) => {
      z.items.forEach((i) => {
        allItems.push({
          ...i,
          zoneName: z.showroom,
          category:
            typeof i.category === "string"
              ? i.category.trim().toLowerCase()
              : "uncategorized",
        });
      });
    });

    const categoryFiltered =
      activeCategory === "ALL"
        ? allItems
        : allItems.filter(
            (i) => i.category?.toLowerCase() === activeCategory.toLowerCase(),
          );

    const totalPages = Math.ceil(categoryFiltered.length / ITEMS_PER_PAGE) || 1;

    const start = (currentPage - 1) * ITEMS_PER_PAGE;

    return {
      items: categoryFiltered.slice(start, start + ITEMS_PER_PAGE),
      totalPages,
      totalItems: categoryFiltered.length,
      hasData: categoryFiltered.length > 0,
    };
  }, [data, activeTab, activeCategory, currentPage]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* HEADER */}
      <StockHeader
        search={search}
        setSearch={setSearch}
        loading={loading}
        data={data}
        metrics={metrics}
      />

      <div className="max-w-[1400px] mx-auto p-4 space-y-6">
        {/* CATEGORY FILTER */}
        {!loading && categories.length > 0 && (
          <div className="mb-3 flex items-center gap-3">
            <select
              value={activeCategory}
              onChange={(e) => {
                setActiveCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="border px-3 py-2 rounded-md text-sm bg-white"
            >
              <option value="ALL">All Categories</option>

              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ZONE FILTER */}
        {!loading && data.length > 0 && (
          <div className="flex gap-2 overflow-x-auto border-b pb-2">
            <button
              onClick={() => {
                setActiveTab("ALL");
                setCurrentPage(1);
              }}
              className={`px-3 py-1 text-sm ${
                activeTab === "ALL"
                  ? "text-emerald-600 border-b-2 border-emerald-600"
                  : "text-gray-500"
              }`}
            >
              All ({metrics.globalTotalItems})
            </button>

            {metrics.uniqueZones.map((zoneName) => {
              const count = data
                .filter((z) => (z.showroom || "").trim() === zoneName)
                .reduce((acc, z) => acc + (z.items?.length || 0), 0);

              return (
                <button
                  key={zoneName}
                  onClick={() => {
                    setActiveTab(zoneName);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 text-sm ${
                    activeTab === zoneName
                      ? "text-emerald-600 border-b-2 border-emerald-600"
                      : "text-gray-500"
                  }`}
                >
                  {zoneName} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* LOADING */}
        {loading && <p className="text-center">Loading...</p>}

        {/* EMPTY */}
        {!loading && !paginatedData.hasData && (
          <p className="text-center text-gray-400">No stock found</p>
        )}

        {/* GRID */}
        {!loading && paginatedData.hasData && (
          <StockGrid items={paginatedData.items} activeTab={activeTab} />
        )}

        {/* PAGINATION */}
        {!loading && paginatedData.totalPages > 1 && (
          <div className="flex justify-between items-center pt-4 border-t">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>

            <span>
              {currentPage} / {paginatedData.totalPages}
            </span>

            <button
              disabled={currentPage === paginatedData.totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
