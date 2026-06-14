"use client";

import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import ProductModal from "./modals/ProductModal";
import { showToast } from "@/lib/showToast";

const fetchProducts = async () => {
  const { data } = await axios.get("/api/product");
  return data?.data || [];
};

export default function ProductDashboard({ setView, setActiveProduct }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const queryClient = useQueryClient();

  // FETCH PRODUCTS (ONLY SOURCE OF TRUTH)
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  // DELETE PRODUCT (API ONLY)
  const deleteProduct = async (id) => {
    try {
      await axios.delete(`/api/product/delete?id=${id}`);
      showToast("success", "Product Deleted");

      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err) {
      showToast("error", "Failed to delete");
    }
  };

  // SEARCH FILTER
  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center gap-3">
        <h2 className="text-xl font-bold">Products</h2>

        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Search product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border p-2 rounded w-64"
          />

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>
      </div>

      {/* LOADING */}
      {isLoading && <div className="text-gray-500">Loading products...</div>}

      {/* EMPTY */}
      {!isLoading && filteredProducts.length === 0 && (
        <div className="text-center py-10 text-gray-500">No products found</div>
      )}

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredProducts.map((p) => (
          <div key={p._id} className="bg-white p-4 border rounded-lg shadow-sm">
            <h2 className="font-bold text-lg">{p.name}</h2>
            <p className="text-sm text-gray-500">{p.category}</p>

            <div className="flex justify-between mt-4">
              <button
                onClick={() => {
                  setActiveProduct(p);
                  setView("variants");
                }}
                className="text-sm bg-slate-100 px-3 py-1 rounded"
              >
                Manage
              </button>

              <button
                onClick={() => deleteProduct(p._id)}
                className="text-red-500"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
