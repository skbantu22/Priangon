"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import VariantRow from "@/components/ui/Application/Admin/warehouse/VariantRow";
import EditStockModal from "@/components/ui/Application/Admin/warehouse/EditStockModal";

export default function ProductModal({ product, onClose, refresh }) {
  const [editItem, setEditItem] = useState(null);

  // ✅ সরাসরি প্রপস দিয়ে ইনিশিয়াজ করছি যেন ইনিশিয়াল রেন্ডারেই ডেটা থাকে
  const [productData, setProductData] = useState(product);

  useEffect(() => {
    if (product) {
      setProductData(JSON.parse(JSON.stringify(product)));
    }
  }, [product]);

  // 👑 হুক ৪ এবং ৫: এগুলোকে আমরা আর্লি রিটার্নের উপরে নিয়ে এসেছি যেন রিয়্যাক্ট সবসময় হুকগুলো খুঁজে পায়
  const variants = productData?.variants || [];

  // ✅ LIVE CALCULATION
  const totalStock = useMemo(
    () => variants.reduce((sum, v) => sum + (v.stock || 0), 0),
    [variants],
  );

  const totalReserved = useMemo(
    () => variants.reduce((sum, v) => sum + (v.reservedStock || 0), 0),
    [variants],
  );

  // ✅ AFTER STOCK UPDATE REFRESH HANDLER (FORCE REFERENCE UPDATE)
  const handleRefresh = async () => {
    if (!refresh) return;

    const allUpdatedProducts = await refresh();

    if (allUpdatedProducts && Array.isArray(allUpdatedProducts)) {
      const currentProductId = productData?._id || productData?.productId?._id;
      const latestProduct = allUpdatedProducts.find(
        (p) => (p._id || p.productId?._id) === currentProductId,
      );

      if (latestProduct) {
        setProductData(JSON.parse(JSON.stringify(latestProduct)));
      }
    }
  };

  // 👑 FIX: সমস্ত হুকের নিচে আর্লি রিটার্ন (Early Return) প্লেস করা হয়েছে
  if (!productData) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-5">
        <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
          {/* HEADER */}
          <div className="flex justify-between items-center border-b px-6 py-4">
            <div>
              <h2 className="text-2xl font-bold">
                {productData.name || productData.productId?.name}
              </h2>
              <p className="text-gray-500 text-sm">
                Category:{" "}
                {productData.category ||
                  productData.productId?.category ||
                  "N/A"}
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
            {variants.map((variant) => {
              return (
                <VariantRow
                  key={variant._id}
                  item={variant}
                  onEdit={() =>
                    setEditItem({
                      ...variant,
                      productId: productData.productId || productData,
                    })
                  }
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editItem && (
        <EditStockModal
          item={editItem}
          refresh={handleRefresh}
          onClose={() => setEditItem(null)}
        />
      )}
    </>
  );
}
