"use client";

import React from "react";
import Image from "next/image";

export default function HistoryList({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 text-center text-gray-500">
        No history found
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((item) => {
        const image =
          item?.variantId?.media?.[0]?.secure_url ||
          item?.productId?.media?.[0]?.secure_url ||
          "/placeholder.png";

        return (
          <div
            key={item._id}
            className="bg-white rounded-xl border p-4 flex items-center justify-between shadow-sm"
          >
            {/* Left */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg overflow-hidden border bg-gray-100">
                <Image
                  src={image}
                  alt={item?.productId?.name || "Product"}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <h3 className="font-semibold">
                  {item?.productId?.name || "Unknown Product"}
                </h3>

                <p className="text-sm text-gray-500">
                  Color: {item?.variantId?.color || "-"} | Size:{" "}
                  {item?.variantId?.size || "-"}
                </p>

                <p className="text-xs text-gray-400">
                  SKU: {item?.variantId?.sku || "-"}
                </p>

                {item?.note && (
                  <p className="text-xs text-blue-600 mt-1">
                    Note: {item.note}
                  </p>
                )}
              </div>
            </div>

            {/* Right */}
            <div className="text-right">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  item?.type === "add"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {item?.type?.toUpperCase()}
              </span>

              <p className="mt-2 font-bold text-lg">
                Qty: {item?.quantity || 0}
              </p>

              <p className="text-xs text-gray-500">
                {item?.createdAt
                  ? new Date(item.createdAt).toLocaleString()
                  : "-"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
