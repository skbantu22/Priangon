"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

import VariantRow from "@/components/ui/Application/Admin/warehouse/VariantRow";
import EditStockModal from "@/components/ui/Application/Admin/warehouse/EditStockModal";

export default function ProductModal({ product, onClose, refresh }) {
  const [editItem, setEditItem] = useState(null);

  if (!product) return null;

  const variants = product?.variants || [];

  const totalStock = variants.reduce((sum, item) => sum + (item.stock || 0), 0);

  const totalReserved = variants.reduce(
    (sum, item) => sum + (item.reservedStock || 0),
    0,
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-5">
        <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
          {/* HEADER */}
          <div className="flex justify-between items-center border-b px-6 py-4">
            <div>
              <h2 className="text-2xl font-bold">{product.name}</h2>
              <p className="text-gray-500 text-sm">
                Category: {product.category}
              </p>
            </div>

            <button onClick={onClose}>
              <X size={22} />
            </button>
          </div>

          {/* SUMMARY */}
          <div className="grid grid-cols-3 gap-4 p-5 border-b">
            <div className="bg-gray-100 rounded-lg p-4">
              <p className="text-gray-500 text-sm">Total Variants</p>
              <h3 className="text-3xl font-bold">{variants.length}</h3>
            </div>

            <div className="bg-gray-100 rounded-lg p-4">
              <p className="text-gray-500 text-sm">Total Stock</p>
              <h3 className="text-3xl font-bold text-green-600">
                {totalStock}
              </h3>
            </div>

            <div className="bg-gray-100 rounded-lg p-4">
              <p className="text-gray-500 text-sm">Reserved</p>
              <h3 className="text-3xl font-bold text-red-600">
                {totalReserved}
              </h3>
            </div>
          </div>

          {/* VARIANTS */}
          <div className="overflow-y-auto max-h-[500px]">
            {variants.map((variant) => (
              <VariantRow
                key={variant._id}
                item={variant}
                onEdit={() => setEditItem(variant)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editItem && (
        <EditStockModal
          item={editItem}
          refresh={refresh}
          onClose={() => setEditItem(null)}
        />
      )}
    </>
  );
}
