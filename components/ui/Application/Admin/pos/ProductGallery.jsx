import Image from "next/image";

export default function ProductGallery({
  products,
  loading,
  search,
  setSearch,
  setOpenProduct,
}) {
  console.log("Products:", products);

  return (
    <div className="lg:col-span-8 p-6 overflow-y-auto max-h-screen">
      <div className="mb-6 shadow-sm rounded-xl bg-white p-2 border border-gray-100">
        <input
          className="w-full p-3 bg-gray-50 focus:bg-white border-0 focus:ring-2 focus:ring-green-500 rounded-lg text-gray-700 outline-none transition-all placeholder-gray-400 font-medium"
          placeholder="🔍 Search products or scan barcode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500 animate-pulse font-medium">
            Loading products...
          </p>
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
          {products.map((p) => (
            <div
              key={p._id}
              onClick={() => setOpenProduct(p)}
              className="group relative border border-gray-200/80 rounded-2xl p-3 cursor-pointer bg-white shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="relative h-32 w-full bg-gray-50 rounded-xl flex items-center justify-center p-2 overflow-hidden">
                <Image
                  src={p.media?.[0]?.secure_url || "/placeholder.png"}
                  width={120}
                  height={120}
                  className="object-contain transition-transform duration-300 group-hover:scale-105"
                  alt={p.name}
                />
              </div>
              <div className="mt-3">
                <h3 className="text-gray-800 font-bold text-sm line-clamp-2 min-h-[40px]">
                  {p.name}
                </h3>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xl font-black text-gray-900">
                    {Number(p.sellingPrice).toLocaleString()}৳
                  </span>
                  <span className="text-[10px] bg-gray-100 px-2 py-1 rounded font-bold text-gray-500">
                    {p.variants?.length || 0} Var
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <p>No products found matching your search.</p>
        </div>
      )}
    </div>
  );
}
