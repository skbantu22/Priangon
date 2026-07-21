"use client";

import { useEffect, useState, useRef } from "react";
import axios from "axios";

export default function StockChecker() {
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const isSelectingRef = useRef(false);

  // Debounced search effect
  useEffect(() => {
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      return;
    }

    if (!search.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      loadProducts();
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  async function loadProducts() {
    try {
      const { data } = await axios.get("/api/stock-checker/search", {
        params: { search },
      });

      setSearchResults(data.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadProduct(productId) {
    try {
      setLoading(true);
      const { data } = await axios.get(`/api/stock-checker/${productId}`);
      setSelectedProduct(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl min-h-screen mx-auto px-3 py-2 md:p-5">
      {/* Search Input & Dropdown - z-index ও relative ঠিক করা হয়েছে */}
      {/* Search Input & Dropdown */}
      <div className="relative mb-4">
        <input
          className="w-full border rounded-xl p-3 text-sm md:text-base outline-none focus:ring-2 focus:ring-black/5 transition-all shadow-sm bg-white relative z-20"
          placeholder="Search Product / Barcode / SKU..."
          value={search}
          onChange={(e) => {
            const value = e.target.value;
            setSearch(value);

            if (!value.trim()) {
              setSelectedProduct(null);
              setSearchResults([]);
            }
          }}
        />

        {search && searchResults.length > 0 && (
          <>
            {/* ব্যাকগ্রাউন্ড ওভারলে যা ড্রপডাউনকে যেকোনো কন্টেইনারের ওপরে ফ্লোট করতে সাহায্য করবে */}
            <div
              className="fixed inset-0 z-30"
              onClick={() => setSearchResults([])}
            />

            <div className="absolute left-0 right-0 top-full mt-2 bg-white border rounded-xl shadow-2xl max-h-72 overflow-y-auto z-40">
              {searchResults.map((product) => (
                <div
                  key={product._id}
                  onClick={() => {
                    isSelectingRef.current = true;
                    setSearch(product.name);
                    setSearchResults([]);
                    setSelectedProduct(null);
                    loadProduct(product._id);
                  }}
                  className="flex items-center gap-3 p-2.5 md:p-3 hover:bg-gray-50 cursor-pointer border-b last:border-none"
                >
                  <img
                    src={
                      product.image ||
                      "https://placehold.co/80x80?text=No+Image"
                    }
                    alt={product.name}
                    className="w-12 h-12 md:w-14 md:h-14 object-contain border rounded bg-gray-50 flex-shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm md:text-base truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {product.category}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Products Section */}
      <div className="space-y-4 mt-3">
        {loading && (
          <div className="text-center py-10 text-sm text-gray-500">
            Loading...
          </div>
        )}

        {selectedProduct && (
          <details
            open
            className="border rounded-xl bg-white shadow-sm overflow-hidden"
          >
            <summary className="list-none cursor-pointer p-3 md:p-4 hover:bg-gray-50/50">
              <div className="flex items-center gap-3">
                <img
                  src={
                    selectedProduct.image ||
                    "https://placehold.co/80x80?text=No+Image"
                  }
                  alt={selectedProduct.name}
                  className="w-16 h-16 md:w-20 md:h-20 border rounded-lg object-contain bg-gray-50 flex-shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-base md:text-lg truncate">
                    {selectedProduct.name}
                  </h2>
                  <p className="text-xs md:text-sm text-gray-500 truncate">
                    {selectedProduct.category}
                  </p>
                </div>

                <div className="bg-black text-white px-2.5 py-1 text-xs md:text-sm rounded-full flex-shrink-0">
                  {selectedProduct.totalStock}
                </div>
              </div>
            </summary>

            <div className="border-t divide-y">
              {selectedProduct.variants?.map((variant) => (
                <div key={variant._id} className="p-3 md:p-4">
                  <div className="flex items-start gap-3">
                    <img
                      src={
                        variant.image ||
                        "https://placehold.co/80x80?text=No+Image"
                      }
                      alt={variant.color}
                      className="w-16 h-16 md:w-20 md:h-20 border rounded-lg object-contain bg-gray-50 flex-shrink-0"
                    />

                    <div className="flex-1 min-w-0 text-xs md:text-sm space-y-1">
                      <h3 className="font-semibold text-sm md:text-base text-gray-900 truncate">
                        {variant.color}
                      </h3>
                      <p className="text-gray-600">{variant.size}</p>
                      <p className="text-gray-500 truncate">
                        Barcode : {variant.barcode}
                      </p>
                      <p className="text-gray-500 truncate">
                        SKU : {variant.sku}
                      </p>

                      <div className="flex gap-2 pt-1 flex-wrap">
                        <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-medium">
                          Warehouse : {variant.warehouseStock}
                        </span>

                        <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-md text-xs font-medium">
                          Total : {variant.totalStock}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Showroom Stock Table */}
                  <div className="mt-3 overflow-x-auto rounded-lg border">
                    <table className="w-full text-xs md:text-sm">
                      <thead className="bg-gray-50 text-gray-700 border-b">
                        <tr>
                          <th className="text-left p-2.5 font-semibold">
                            Showroom
                          </th>
                          <th className="text-center p-2.5 font-semibold">
                            Stock
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {variant.showroomStocks?.map((s) => (
                          <tr
                            key={s.showroomId}
                            className="hover:bg-gray-50/50"
                          >
                            <td className="p-2.5 text-gray-800 truncate max-w-[180px] md:max-w-none">
                              {s.showroomName}
                            </td>
                            <td className="text-center p-2.5">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-block min-w-[24px] ${
                                  s.stock > 0
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {s.stock}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}

        {!loading &&
          !selectedProduct &&
          search.trim() &&
          searchResults.length === 0 && (
            <div className="text-center py-10 text-sm text-gray-500">
              No products found.
            </div>
          )}
      </div>
    </div>
  );
}
