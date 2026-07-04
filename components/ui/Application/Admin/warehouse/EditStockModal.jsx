"use client";

import React, { useState } from "react";
import { X, Plus, Minus } from "lucide-react";
import axios from "axios";

export default function EditStockModal({ item, onClose, refresh }) {
  if (!item) return null;

  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  const image =
    item?.variantId?.media?.[0]?.secure_url ||
    item?.productId?.media?.[0]?.secure_url ||
    "/placeholder.png";

  const updateStock = async (type) => {
    try {
      setLoading(true);

      console.log("Updating Stock...");
      console.log({
        id: item._id,
        qty: Number(qty),
        type,
      });

      const res = await axios.patch("/api/warehouse-stock/update", {
        id: item._id,
        qty: Number(qty),
        type,
      });

      console.log("API Response:", res.data);

      alert("Stock Updated Successfully");

      refresh?.();

      onClose();
    } catch (err) {
      console.log(err);

      console.log(err.response?.data);

      alert(err.response?.data?.message || "Stock Update Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center border-b p-5">
          <div>
            <h2 className="font-bold text-lg">{item?.productId?.name}</h2>

            <p className="text-sm text-gray-500">
              {item?.variantId?.color} / {item?.variantId?.size}
            </p>
          </div>

          <button onClick={onClose}>
            <X />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <img
            src={image}
            className="w-full h-44 object-contain border rounded"
          />

          <div className="flex justify-between">
            <div>
              <p className="text-gray-500 text-sm">Current Stock</p>

              <p className="text-3xl font-bold text-green-600">{item.stock}</p>
            </div>

            <div>
              <p className="text-gray-500 text-sm">Reserved</p>

              <p className="text-3xl font-bold text-red-500">
                {item.reservedStock || 0}
              </p>
            </div>
          </div>

          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="border rounded w-full p-3"
          />

          <div className="flex gap-3">
            <button
              disabled={loading}
              onClick={() => updateStock("add")}
              className="flex-1 bg-green-600 text-white rounded p-3 flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Add Stock
            </button>

            <button
              disabled={loading}
              onClick={() => updateStock("remove")}
              className="flex-1 bg-red-600 text-white rounded p-3 flex items-center justify-center gap-2"
            >
              <Minus size={16} />
              Remove Stock
            </button>
          </div>

          <button onClick={onClose} className="w-full border rounded p-3">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
