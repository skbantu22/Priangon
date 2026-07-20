"use client";

import OrderRow from "./OrderRow";
import { Loader2, PackageSearch } from "lucide-react";

export default function OrderTable({ orders = [], loading = false }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow p-12">
        <div className="flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />

          <p className="text-gray-500 font-medium">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="bg-white rounded-xl shadow p-16">
        <div className="flex flex-col items-center justify-center gap-4">
          <PackageSearch className="w-16 h-16 text-gray-300" />

          <h2 className="text-xl font-semibold text-gray-700">
            No Orders Found
          </h2>

          <p className="text-gray-500">No orders match your current filters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
        <h2 className="font-semibold text-lg">POS Orders</h2>

        <span className="text-sm text-gray-500">
          Total: <span className="font-semibold">{orders.length}</span>
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead className="bg-gray-100 border-b">
            <tr className="text-left text-sm font-semibold text-gray-700">
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order) => (
              <OrderRow key={order._id} order={order} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
