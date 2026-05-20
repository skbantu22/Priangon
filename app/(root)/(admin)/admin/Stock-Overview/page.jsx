"use client";

import { useEffect, useState, useMemo } from "react";
import { showToast } from "@/lib/showToast";

const ITEMS_PER_PAGE = 12;

export default function StockOverviewPage() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // UI Layout States
  const [activeTab, setActiveTab] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  // ================= FETCH STOCK =================
  const fetchStock = async (q = "") => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/stock/stock-overview?q=${encodeURIComponent(q)}`,
        { cache: "no-store" },
      );
      const result = await res.json();

      if (result.success) {
        setData(result.data || []);
        setCurrentPage(1); // Reset page on new search fetch
      } else {
        showToast(result.message || "Failed to load stock");
      }
    } catch (error) {
      console.log(error);
      showToast("Server Error");
    } finally {
      setLoading(false);
    }
  };

  // ================= INITIAL LOAD =================
  useEffect(() => {
    fetchStock("");
  }, []);

  // ================= SEARCH DEBOUNCE =================
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStock(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ================= HANDLERS =================
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setCurrentPage(1);
  };

  // ================= METRICS DATA CALCULATION =================
  const metrics = useMemo(() => {
    let globalTotalStock = 0;
    let globalTotalItems = 0;
    let lowStockCount = 0;
    const zonesList = new Set();

    data.forEach((zone) => {
      zonesList.add(zone.showroom);
      zone.items.forEach((item) => {
        globalTotalStock += item.stock || 0;
        globalTotalItems += 1;
        if (item.stock <= 5) lowStockCount += 1;
      });
    });

    return {
      globalTotalStock,
      globalTotalItems,
      lowStockCount,
      uniqueZones: Array.from(zonesList),
    };
  }, [data]);

  // ================= FILTER & PAGINATE ITEMS =================
  const paginatedData = useMemo(() => {
    // 1. Filter by location tab if not "ALL"
    const filteredZones = data.filter((zone) =>
      activeTab === "ALL" ? true : zone.showroom === activeTab,
    );

    // 2. Flatten all items matching the criteria
    let allMatchingItems = [];
    filteredZones.forEach((zone) => {
      zone.items.forEach((item) => {
        allMatchingItems.push({
          ...item,
          zoneName: zone.showroom,
        });
      });
    });

    const totalItems = allMatchingItems.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

    // 3. Slice array for current active page bounds
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const slicedItems = allMatchingItems.slice(
      startIndex,
      startIndex + ITEMS_PER_PAGE,
    );

    return {
      items: slicedItems,
      totalPages,
      totalItems,
      hasData: allMatchingItems.length > 0,
    };
  }, [data, activeTab, currentPage]);

  const getStockStyle = (stock) => {
    if (stock <= 5) return "bg-red-50 text-red-600 border-red-100";
    if (stock <= 10) return "bg-amber-50 text-amber-700 border-amber-100";
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  };

  return (
    <div className="min-h-screen bg-gray-50/50 antialiased text-gray-900">
      {/* ================= STICKY TOP NAVIGATION BAR ================= */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200/80">
        <div className="max-w-[1400px] mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-sm shadow-emerald-600/20">
                IMS
              </span>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">
                Stock Hub
              </h1>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">
              Unified cross-docking & distribution storage tracking
            </p>
          </div>

          {/* DYNAMIC SEARCH INPUT */}
          <div className="w-full md:w-[340px]">
            <input
              type="text"
              placeholder="Quick search products, variants, identifiers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-sm outline-none transition-all focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 placeholder:text-gray-400"
            />
          </div>
        </div>
      </div>

      {/* ================= MAIN CONTAINER BODY ================= */}
      <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">
        {/* ================= TOP ROW SUMMARIZED INFOCARDS ================= */}
        {!loading && data.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200/60 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Aggregate Gross Stock
              </span>
              <p className="text-xl md:text-2xl font-bold text-gray-900 mt-2">
                {metrics.globalTotalStock}{" "}
                <span className="text-xs font-medium text-gray-400">units</span>
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200/60 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Unique Active SKUs
              </span>
              <p className="text-xl md:text-2xl font-bold text-gray-900 mt-2">
                {metrics.globalTotalItems}{" "}
                <span className="text-xs font-medium text-gray-400">lines</span>
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200/60 shadow-sm col-span-2 lg:col-span-1 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Critical Reorder Alerts
              </span>
              <p
                className={`text-xl md:text-2xl font-bold mt-2 ${metrics.lowStockCount > 0 ? "text-rose-600" : "text-gray-900"}`}
              >
                {metrics.lowStockCount}{" "}
                <span className="text-xs font-medium text-gray-400">items</span>
              </p>
            </div>
          </div>
        )}

        {/* ================= SEGMENTED MODERN ZONE TABS ================= */}
        {!loading && data.length > 0 && (
          <div className="flex items-center overflow-x-auto pb-1 border-b border-gray-200 gap-1">
            <button
              onClick={() => handleTabChange("ALL")}
              className={`px-4 py-2 text-xs md:text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                activeTab === "ALL"
                  ? "border-emerald-600 text-emerald-600 font-semibold"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              🌐 All Zones ({metrics.globalTotalItems})
            </button>
            {metrics.uniqueZones.map((zoneName) => {
              const count =
                data.find((z) => z.showroom === zoneName)?.items?.length || 0;
              return (
                <button
                  key={zoneName}
                  onClick={() => handleTabChange(zoneName)}
                  className={`px-4 py-2 text-xs md:text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                    activeTab === zoneName
                      ? "border-emerald-600 text-emerald-600 font-semibold"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {zoneName === "Warehouse"
                    ? `🏭 ${zoneName}`
                    : `🏪 ${zoneName}`}{" "}
                  ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* ================= STATE HANDLING WRAPPERS ================= */}
        {loading && (
          <div className="flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-200/60 p-16 text-center">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <span className="text-sm text-gray-400 font-medium">
              Syncing distributed node databases...
            </span>
          </div>
        )}

        {!loading && !paginatedData.hasData && (
          <div className="bg-white rounded-2xl border border-gray-200/60 p-16 text-center max-w-md mx-auto">
            <p className="text-gray-400 text-sm font-medium">
              No inventory records match current scope parameters.
            </p>
          </div>
        )}

        {/* ================= GRID CONTENT PANEL ================= */}
        {!loading && paginatedData.hasData && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {paginatedData.items.map((item) => (
                <div
                  /* FIXED KEY EXPR: Combines location reference to guarantee uniqueness */
                  key={`${item.zoneName}-${item.variantId}`}
                  className="group flex sm:flex-col bg-white border border-gray-200/70 rounded-xl p-2.5 hover:shadow-md hover:border-gray-300 transition-all duration-200 gap-3 sm:gap-2.5"
                >
                  {/* DYNAMIC COMPACT WRAPPER */}
                  <div className="relative aspect-square w-20 h-20 sm:w-full sm:h-40 shrink-0 overflow-hidden rounded-lg bg-gray-50 border border-gray-100">
                    <img
                      src={item.image || "/placeholder.png"}
                      alt={item.productName}
                      className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                    />
                    {/* Floating Zone Tag */}
                    {activeTab === "ALL" && (
                      <span className="absolute top-1 left-1 bg-gray-900/80 text-white backdrop-blur-[2px] text-[9px] font-medium px-1.5 py-0.5 rounded-md tracking-wide hidden sm:inline-block">
                        {item.zoneName}
                      </span>
                    )}
                  </div>

                  {/* DETAILS BODY */}
                  <div className="flex flex-col justify-between flex-1 min-w-0">
                    <div>
                      <h3 className="font-semibold text-xs sm:text-sm text-gray-800 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                        {item.productName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5">
                        <span className="text-[11px] text-gray-500 font-medium">
                          {item.variant}
                        </span>
                        {item.barcode && (
                          <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">
                            • {item.barcode}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* PRICING AND BALANCES */}
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <p className="font-bold text-gray-900 text-xs sm:text-sm">
                        ৳ {item.price || 0}
                      </p>
                      <div
                        className={`px-2.5 py-0.5 rounded-md border text-[11px] font-bold tracking-wide min-w-[32px] text-center shadow-inner ${getStockStyle(
                          item.stock,
                        )}`}
                      >
                        {item.stock}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ================= COMPACT UI PAGINATION FOOTER ================= */}
            {paginatedData.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 pt-4 px-1">
                <p className="text-xs text-gray-500">
                  Showing{" "}
                  <span className="font-medium text-gray-800">
                    {Math.min(
                      paginatedData.totalItems,
                      (currentPage - 1) * ITEMS_PER_PAGE + 1,
                    )}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-gray-800">
                    {Math.min(
                      paginatedData.totalItems,
                      currentPage * ITEMS_PER_PAGE,
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-800">
                    {paginatedData.totalItems}
                  </span>{" "}
                  items
                </p>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 px-3 text-xs font-semibold rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-all"
                  >
                    Prev
                  </button>

                  <div className="flex items-center gap-1 text-xs text-gray-500 font-medium px-2">
                    <span className="text-gray-800 font-bold">
                      {currentPage}
                    </span>{" "}
                    / {paginatedData.totalPages}
                  </div>

                  <button
                    onClick={() =>
                      setCurrentPage((p) =>
                        Math.min(paginatedData.totalPages, p + 1),
                      )
                    }
                    disabled={currentPage === paginatedData.totalPages}
                    className="p-1.5 px-3 text-xs font-semibold rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
