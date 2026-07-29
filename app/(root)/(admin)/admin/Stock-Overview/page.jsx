"use client";

import { useEffect, useMemo, useState } from "react";
import { showToast } from "@/lib/showToast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Layers,
  AlertTriangle,
  Store,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

import StockHeader from "@/components/ui/Application/Admin/stock-overview/StockHeader";
import StockGrid from "@/components/ui/Application/Admin/stock-overview/StockGrid";

const ITEMS_PER_PAGE = 12;

export default function StockOverviewPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  // 🚀 Debounce Search Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // ==========================================
  // 🚀 REACT QUERY FOR ZERO LOADING TIME CACHING
  // ==========================================
  const {
    data: stockResult,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["stock-overview", debouncedSearch],
    queryFn: async () => {
      const res = await fetch(
        `/api/stock/stock-overview?q=${encodeURIComponent(debouncedSearch)}`,
        {
          headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
          cache: "no-store",
        },
      );
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to load stock");
      }
      return result.data || [];
    },
    staleTime: 1000 * 60 * 3, // 🚀 ৩ মিনিট পর্যন্ত ডাটা ফ্রেশ রাখবে
    gcTime: 1000 * 60 * 10, // 🚀 ১০ মিনিট মেমোরিতে ধরে রাখবে
    refetchOnWindowFocus: false,
  });

  const data = stockResult || [];

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

  // ================= CATEGORIES =================
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
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900 pb-12">
      {/* HEADER */}
      <StockHeader
        search={search}
        setSearch={setSearch}
        loading={isFetching}
        data={data}
        metrics={metrics}
      />

      <div className="max-w-[1450px] mx-auto px-4 sm:px-6 space-y-6 mt-6">
        {/* STATS METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Total Stock
              </p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                {metrics.globalTotalStock}
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <Package className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Total Products
              </p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                {metrics.globalTotalItems}
              </h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Low Stock Alert
              </p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">
                {metrics.lowStockCount}
              </h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Active Showrooms
              </p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                {metrics.uniqueZones.length}
              </h3>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <Store className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* CONTROLS BAR (Category Filter & Showroom Tabs) */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* ZONE / SHOWROOM TABS */}
          {!isLoading && data.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <button
                onClick={() => {
                  setActiveTab("ALL");
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                  activeTab === "ALL"
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                All Showrooms ({metrics.globalTotalStock})
              </button>

              {metrics.uniqueZones.map((zoneName) => {
                const count = data
                  .filter((z) => (z.showroom || "").trim() === zoneName)
                  .reduce(
                    (acc, z) =>
                      acc +
                      (z.items?.reduce(
                        (sum, item) => sum + Number(item.stock || 0),
                        0,
                      ) || 0),
                    0,
                  );

                return (
                  <button
                    key={zoneName}
                    onClick={() => {
                      setActiveTab(zoneName);
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                      activeTab === zoneName
                        ? "bg-gray-900 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {zoneName} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* CATEGORY FILTER DROPDOWN */}
          {!isLoading && categories.length > 0 && (
            <div className="flex items-center gap-2 min-w-[200px]">
              <select
                value={activeCategory}
                onChange={(e) => {
                  setActiveCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full border border-gray-200 px-3 py-2 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all"
              >
                <option value="ALL">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="capitalize">
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* LOADING STATE */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <p className="text-sm font-medium text-gray-500">
              Loading stock details...
            </p>
          </div>
        )}

        {/* EMPTY STATE */}
        {!isLoading && !paginatedData.hasData && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-gray-800">
              No stock found
            </h3>
            <p className="text-sm text-gray-400">
              Try changing your search query or filters.
            </p>
          </div>
        )}

        {/* GRID */}
        {!isLoading && paginatedData.hasData && (
          <StockGrid items={paginatedData.items} activeTab={activeTab} />
        )}

        {/* PAGINATION */}
        {!isLoading && paginatedData.totalPages > 1 && (
          <div className="bg-white px-6 py-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="flex items-center gap-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>

            <span className="text-sm font-semibold text-gray-700">
              Page {currentPage} of {paginatedData.totalPages}
            </span>

            <button
              disabled={currentPage === paginatedData.totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="flex items-center gap-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
