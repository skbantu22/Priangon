"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import VariantRow from "@/components/ui/Application/Admin/warehouse/VariantRow";
import EditStockModal from "@/components/ui/Application/Admin/warehouse/EditStockModal";

export default function ProductModal({ product, onClose, refresh }) {
  const [editItem, setEditItem] = useState(null);
  const [productData, setProductData] = useState(product);

  useEffect(() => {
    if (product) {
      setProductData(JSON.parse(JSON.stringify(product)));
    }
  }, [product]);

  const variants = useMemo(() => productData?.variants || [], [productData]);

  // ডিবাগ করার জন্য: কনসোলে ভেরিয়েন্ট সংখ্যা চেক করুন
  useEffect(() => {
    console.log("Variants loaded:", variants.length);
  }, [variants]);

  const totalStock = useMemo(
    () => variants.reduce((sum, v) => sum + (v.stock || 0), 0),
    [variants],
  );

  const totalReserved = useMemo(
    () => variants.reduce((sum, v) => sum + (v.reservedStock || 0), 0),
    [variants],
  );

  const handleRefresh = async () => {
    if (!refresh) return;
    const allUpdatedProducts = await refresh();

    if (Array.isArray(allUpdatedProducts)) {
      const currentId = productData?._id || productData?.productId?._id;
      const latestProduct = allUpdatedProducts.find(
        (p) => (p._id || p.productId?._id) === currentId,
      );

      if (latestProduct) {
        setProductData(JSON.parse(JSON.stringify(latestProduct)));
      }
    }
  };

  if (!productData) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-5">
        {/* মেইন কন্টেইনারে flex flex-col যোগ করা হয়েছে যেন এটি পুরো জায়গা ব্যবহার করতে পারে */}
        <div className="bg-white rounded-xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
          {/* HEADER */}
          <div className="flex-shrink-0 flex justify-between items-center border-b px-6 py-4">
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
          <div className="flex-shrink-0 grid grid-cols-3 gap-4 p-5 border-b">
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

          {/* VARIANTS (Scrollable Area) */}
          {/* flex-1 এর মাধ্যমে এটি বাকি সব খালি জায়গা দখল করবে */}
          <div className="flex-1 overflow-y-auto p-2">
            {variants.length > 0 ? (
              variants.map((variant) => (
                <VariantRow
                  key={variant._id || Math.random()}
                  item={variant}
                  onEdit={() =>
                    setEditItem({
                      ...variant,
                      productId: productData.productId || productData,
                    })
                  }
                />
              ))
            ) : (
              <p className="text-center py-10 text-gray-400">
                No variants found.
              </p>
            )}
          </div>
        </div>
      </div>

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
