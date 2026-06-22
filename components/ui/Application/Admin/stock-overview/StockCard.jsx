export default function StockCard({ item, activeTab }) {
  const getStockStyle = (stock) => {
    if (stock <= 5) return "bg-red-50 text-red-600 border-red-100";
    if (stock <= 10) return "bg-amber-50 text-amber-700 border-amber-100";
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  };

  return (
    <div className="group flex sm:flex-col bg-white border rounded-xl p-2.5 hover:shadow-md transition">
      {/* IMAGE */}
      <div className="relative w-20 h-20 sm:w-full sm:h-40 bg-gray-50 rounded-lg overflow-hidden">
        <img
          src={item.image || "/placeholder.png"}
          className="w-full h-full object-contain group-hover:scale-105 transition"
          alt={item.productName}
        />

        {activeTab === "ALL" && (
          <span className="absolute top-1 left-1 text-[9px] bg-black/70 text-white px-1 rounded">
            {item.zoneName}
          </span>
        )}
      </div>

      {/* INFO */}
      <div className="flex flex-col justify-between flex-1 ml-2 sm:ml-0">
        <div>
          <h3 className="text-xs font-semibold line-clamp-1">
            {item.productName}
          </h3>
          <p className="text-[11px] text-gray-500">{item.variant}</p>
        </div>

        <div className="flex justify-between mt-2">
          <p className="text-xs font-bold">৳ {item.price}</p>

          <span
            className={`px-2 py-0.5 text-[11px] border rounded ${getStockStyle(
              item.stock,
            )}`}
          >
            {item.stock}
          </span>
        </div>
      </div>
    </div>
  );
}
