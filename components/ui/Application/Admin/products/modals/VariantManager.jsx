"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import AddVariantModal from "./AddVariantModal";
import EditVariantModal from "./EditVariantModal";
import { Pencil, Trash2, Plus } from "lucide-react";

export default function VariantManager({ productId }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(false);

  // FETCH
  const fetchVariants = useCallback(async () => {
    if (!productId) return;

    try {
      setLoading(true);

      const { data } = await axios.get(
        `/api/product-variant/find?productId=${productId}`,
      );

      if (data?.success) {
        setVariants(data.data);
      }
    } catch (error) {
      console.log("Fetch variants error:", error);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  // DELETE
  const deleteVariant = async (id) => {
    try {
      await axios.delete(`/api/product-variant/delete/${id}`);

      setVariants((prev) => prev.filter((v) => v._id !== id));
    } catch (error) {
      console.log("Delete error:", error);
    }
  };

  return (
    <div className="bg-white p-6 border space-y-4">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="font-black uppercase">Product Variants</h2>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 bg-black text-white px-3 py-1 text-xs font-bold"
        >
          <Plus size={16} /> ADD
        </button>
      </div>

      {/* LOADING */}
      {loading && <p className="text-sm text-gray-500">Loading...</p>}

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full border text-sm">
          <thead className="bg-black text-white">
            <tr>
              <th className="p-2">Images</th>
              <th className="p-2">SKU</th>
              <th className="p-2">Color</th>
              <th className="p-2">Size</th>
              <th className="p-2">Stock</th>
              <th className="p-2">MRP</th>
              <th className="p-2">Selling</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>

          <tbody>
            {variants.length === 0 && !loading && (
              <tr>
                <td colSpan="8" className="p-4 text-center">
                  No variants found
                </td>
              </tr>
            )}

            {variants.map((v) => (
              <tr key={v._id} className="border-t">
                {/* IMAGES */}
                <td className="p-2">
                  <div className="flex gap-1 overflow-x-auto max-w-[180px]">
                    {(v?.media?.length ? v.media : []).map((img, i) => (
                      <img
                        key={i}
                        src={img?.secure_url || "/placeholder.png"}
                        alt="variant"
                        className="w-10 h-10 object-cover border flex-shrink-0"
                      />
                    ))}

                    {!v?.media?.length && (
                      <span className="text-[10px] text-gray-400">
                        No image
                      </span>
                    )}
                  </div>
                </td>

                <td className="p-2">{v.sku}</td>
                <td className="p-2">{v.color}</td>
                <td className="p-2">{v.size}</td>
                <td className="p-2">{v.stock}</td>
                <td className="p-2">{v.mrp}</td>
                <td className="p-2">{v.sellingPrice}</td>

                <td className="p-2 flex gap-3">
                  {/* EDIT */}
                  <button
                    onClick={() => setEditingVariant(v)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Pencil size={18} />
                  </button>

                  {/* DELETE */}
                  <button
                    onClick={() => deleteVariant(v._id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ADD MODAL */}
      {isAddOpen && (
        <AddVariantModal
          productId={productId}
          close={() => {
            setIsAddOpen(false);
            fetchVariants();
          }}
        />
      )}

      {/* EDIT MODAL */}
      {editingVariant && (
        <EditVariantModal
          isOpen={!!editingVariant}
          setIsOpen={() => setEditingVariant(null)}
          editingVariant={editingVariant}
          setEditingVariant={setEditingVariant}
          saveEditedVariant={async (updated) => {
            try {
              await axios.put(
                `/api/product-variant/${editingVariant._id}`,
                updated,
              );

              setEditingVariant(null);
              fetchVariants();
            } catch (err) {
              console.log(err);
            }
          }}
        />
      )}
    </div>
  );
}
