"use client";

import React from "react";
import { Input } from "@/components/ui/input";

export default function BulkSettings({ bulkData, setBulkData, onApplyAll }) {
  const handleBulkChange = (field, val) => {
    setBulkData((prev) => ({ ...prev, [field]: val }));
  };

  return (
    <div className="bg-white p-6 border-2 border-black space-y-4">
      <h3 className="text-xs font-black uppercase text-black tracking-wider">
        Price and Stock Bulk Set *
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 items-end">
        {[
          "purchasePrice",
          "sellingPrice",
          "discountPercent",
          "discountAmount",
          "afterDiscount",
          "openingStock",
        ].map((field) => (
          <div key={field}>
            <Input
              placeholder={field.replace(/([A-Z])/g, " $1")}
              value={bulkData[field]}
              onChange={(e) => handleBulkChange(field, e.target.value)}
              className="border-black rounded-none h-10 capitalize"
            />
          </div>
        ))}
        <div className="flex gap-2 w-full">
          <Input
            placeholder="Opening Stock Pur..."
            value={bulkData.openingStockPurchasePrice}
            onChange={(e) =>
              handleBulkChange("openingStockPurchasePrice", e.target.value)
            }
            className="flex-1 border-black rounded-none h-10"
          />
          <button
            type="button"
            onClick={onApplyAll}
            className="bg-zinc-900 hover:bg-black text-white text-[10px] font-black px-4 py-2 uppercase tracking-wider h-10 border border-black"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
