"use client";

import React from "react";

export default function ProductCard({ product, onClick }) {
  return (
    <div
      onClick={onClick}
      className="border rounded-xl p-4 cursor-pointer hover:shadow-md transition bg-white"
    >
      {/* Product Image */}
      <div className="w-full h-40 bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="object-cover w-full h-full"
          />
        ) : (
          <span className="text-gray-400 text-sm">No Image</span>
        )}
      </div>

      {/* Name */}
      <h3 className="font-semibold text-gray-800 line-clamp-1">
        {product.name}
      </h3>

      {/* Category */}
      <p className="text-xs text-gray-500 mt-1">
        {product.category || "Uncategorized"}
      </p>

      {/* Stock summary */}
      <div className="flex justify-between mt-3 text-sm">
        <div>
          <p className="text-xs text-gray-400">Total Stock</p>
          <p className="font-bold text-green-600">{product.totalStock || 0}</p>
        </div>

        <div>
          <p className="text-xs text-gray-400">Variants</p>
          <p className="font-bold text-gray-700">{product.variantCount || 0}</p>
        </div>
      </div>

      {/* Low stock warning */}
      {product.totalStock <= 5 && (
        <p className="text-xs text-red-500 mt-2">⚠ Low Stock</p>
      )}
    </div>
  );
}
