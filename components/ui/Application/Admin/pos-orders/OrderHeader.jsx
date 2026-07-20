"use client";

import { ShoppingBag } from "lucide-react";

export default function OrderHeader() {
  return (
    <div className="flex items-center justify-between bg-white rounded-xl shadow border px-5 py-4">
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-lg bg-orange-500 flex items-center justify-center">
          <ShoppingBag className="w-5 h-5 text-white" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-gray-800">POS Orders</h1>
          <p className="text-sm text-gray-500">Manage all showroom orders</p>
        </div>
      </div>
    </div>
  );
}
