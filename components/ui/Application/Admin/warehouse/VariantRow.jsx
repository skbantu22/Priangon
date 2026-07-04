"use client";

import React from "react";
import Image from "next/image";
import { Pencil } from "lucide-react";

export default function VariantRow({ item, onEdit }) {
  // ✅ ১. সেফ ইমেজ পাথ হ্যান্ডলিং (রুট লেভেল অথবা নেস্টেড ভেরিয়েন্ট আইডি দুইটাই চেক করবে)
  const image =
    item?.variantId?.media?.[0]?.secure_url ||
    item?.productId?.media?.[0]?.secure_url ||
    item?.media?.[0]?.secure_url ||
    "/placeholder.png";

  // ✅ ২. ডেটা সিঙ্ক করার জন্য ফলব্যাক চেইন (যদি ডেটা সরাসরি আইটেমে থাকে অথবা variantId-র ভেতরে থাকে)
  const color = item?.color || item?.variantId?.color || "No Color";
  const size = item?.size || item?.variantId?.size || "No Size";
  const sku = item?.sku || item?.variantId?.sku || "-";

  return (
    <div className="flex items-center justify-between border-b px-6 py-4 hover:bg-gray-50 transition duration-150">
      {/* Left */}
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-lg border overflow-hidden bg-gray-100 flex items-center justify-center">
          <Image
            src={image}
            alt={item?.productId?.name || item?.name || "Product"}
            width={80}
            height={80}
            className="object-cover w-full h-full"
            unoptimized // যদি এক্সটার্নাল ক্লাউডিনারি/মিডিয়া ইউআরএল হোস্ট কনফিগ করা না থাকে তবে ক্র্যাশ এড়াতে
          />
        </div>

        <div>
          <h3 className="font-semibold text-lg">
            {item?.productId?.name || item?.name || "Product"}
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
          {/* 👑 রিয়েল-টাইম লেটেস্ট স্টক ডেটা */}
          <p className="text-2xl font-bold text-green-600">
            {item?.stock ?? 0}
          </p>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500">Reserved</p>
          {/* 👑 রিয়েল-টাইম লেটেস্ট রিজার্ভড স্টক ডেটা */}
          <p className="text-2xl font-bold text-red-500">
            {item?.reservedStock ?? 0}
          </p>
        </div>
      </div>

      {/* Right */}
      <button
        onClick={onEdit}
        className="bg-black text-white px-5 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition active:scale-95"
      >
        <Pencil size={16} />
        Edit
      </button>
    </div>
  );
}
