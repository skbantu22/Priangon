"use client";

import React from "react";
import Image from "next/image";
import { Pencil } from "lucide-react";

export default function VariantRow({ item, onEdit }) {
  const image =
    item?.variantId?.media?.[0]?.secure_url ||
    item?.productId?.media?.[0]?.secure_url ||
    "/placeholder.png";

  const color = item?.variantId?.color || "No Color";
  const size = item?.variantId?.size || "No Size";
  const sku = item?.variantId?.sku || "-";

  return (
    <div className="flex items-center justify-between border-b px-6 py-4 hover:bg-gray-50">
      {/* Left */}
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-lg border overflow-hidden bg-gray-100 flex items-center justify-center">
          <Image
            src={image}
            alt={item?.productId?.name || "Product"}
            width={80}
            height={80}
            className="object-cover w-full h-full"
          />
        </div>

        <div>
          <h3 className="font-semibold text-lg">
            {item?.productId?.name || "Product"}
          </h3>

          <p className="text-gray-500 text-sm">
            Color: <span className="font-medium">{color}</span>
          </p>

          <p className="text-gray-500 text-sm">
            Size: <span className="font-medium">{size}</span>
          </p>

          <p className="text-gray-400 text-xs">SKU: {sku}</p>
        </div>
      </div>

      {/* Center */}
      <div className="flex gap-12">
        <div className="text-center">
          <p className="text-sm text-gray-500">Stock</p>
          <p className="text-2xl font-bold text-green-600">
            {item?.stock ?? 0}
          </p>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500">Reserved</p>
          <p className="text-2xl font-bold text-red-500">
            {item?.reservedStock ?? 0}
          </p>
        </div>
      </div>

      {/* Right */}
      <button
        onClick={onEdit}
        className="bg-black text-white px-5 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition"
      >
        <Pencil size={16} />
        Edit
      </button>
    </div>
  );
}
