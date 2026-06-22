"use client";

export default function StockHeader({
  search,
  setSearch,
  loading,
  data,
  metrics,
}) {
  return (
    <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200/80">
      <div className="max-w-[1400px] mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* TITLE */}
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold">
              IMS
            </span>
            <h1 className="text-xl font-bold">Stock Hub</h1>
          </div>
          <p className="text-xs text-gray-500 hidden sm:block">
            Unified inventory tracking system
          </p>
        </div>

        {/* SEARCH */}
        <div className="w-full md:w-[340px]">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>
      </div>

      {/* METRICS */}
      {!loading && data.length > 0 && (
        <div className="max-w-[1400px] mx-auto px-4 pb-4 grid grid-cols-3 gap-3">
          <Metric label="Total Stock" value={metrics.globalTotalStock} />
          <Metric label="Total SKUs" value={metrics.globalTotalItems} />
          <Metric label="Low Stock" value={metrics.lowStockCount} danger />
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, danger }) {
  return (
    <div className="bg-white p-3 rounded-xl border shadow-sm">
      <p className="text-[11px] text-gray-400 uppercase">{label}</p>
      <p className={`text-lg font-bold ${danger ? "text-red-500" : ""}`}>
        {value}
      </p>
    </div>
  );
}
