"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";

export default function BulkSettings({ bulkData, setBulkData, onApplyAll }) {
  const [formData, setFormData] = useState({
    purchasePrice: "",
    sellingPrice: "",
    discountPercent: "",
    discountAmount: "",
    afterDiscount: "",
    openingStock: "",
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApply = () => {
    const newData = {
      ...bulkData,
      ...formData,
    };

    setBulkData(newData);
    onApplyAll(newData);
  };

  const fields = [
    "purchasePrice",
    "sellingPrice",
    "discountPercent",
    "discountAmount",
    "afterDiscount",
    "openingStock",
  ];

  return (
    <div className="bg-white p-6 border-2 border-black space-y-4">
      <h3 className="text-xs font-black uppercase">Price and Stock Bulk Set</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 items-end">
        {fields.map((field) => (
          <Input
            key={field}
            placeholder={field.replace(/([A-Z])/g, " $1")}
            value={formData[field]}
            onChange={(e) => handleChange(field, e.target.value)}
            className="border-black rounded-none h-10 capitalize"
          />
        ))}

        <button
          type="button"
          onClick={handleApply}
          className="bg-zinc-900 hover:bg-black text-white text-xs font-bold h-10 px-5"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
