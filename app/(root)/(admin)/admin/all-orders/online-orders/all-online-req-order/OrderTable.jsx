"use client";

import { Eye, RefreshCcw } from "lucide-react";

export default function OrderTable({
  orders = [],
  loading = false,
  onRefresh,
  onView,
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow border p-20 text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-semibold text-gray-600">Loading Orders...</p>
      </div>
    );
  }

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  const approvedCount = orders.filter((o) => o.status === "approved").length;

  const rejectedCount = orders.filter((o) => o.status === "rejected").length;

  const statusClass = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  if (!orders.length) {
    return (
      <div className="bg-white rounded-xl border shadow p-20 text-center">
        <h2 className="text-2xl font-bold text-gray-700">No Order Found</h2>

        <button
          onClick={onRefresh}
          className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border shadow overflow-hidden">
      {/* Header */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 p-6 border-b bg-gray-50">
        <div>
          <h2 className="text-2xl font-bold">Showroom Order Requests</h2>

          <p className="text-gray-500 mt-1">Total Orders : {orders.length}</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="px-4 py-2 rounded-lg bg-yellow-100 text-yellow-700 font-bold">
            Pending : {pendingCount}
          </div>

          <div className="px-4 py-2 rounded-lg bg-green-100 text-green-700 font-bold">
            Approved : {approvedCount}
          </div>

          <div className="px-4 py-2 rounded-lg bg-red-100 text-red-700 font-bold">
            Rejected : {rejectedCount}
          </div>

          <button
            onClick={onRefresh}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg"
          >
            <RefreshCcw size={17} />
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr className="text-left text-sm">
              <th className="p-4 text-center w-16">#</th>

              <th className="p-4">Order No</th>

              <th className="p-4">Showroom</th>

              <th className="p-4">Customer</th>

              <th className="p-4 text-center">Items</th>

              <th className="p-4 text-right">Total</th>

              <th className="p-4 text-center">Status</th>

              <th className="p-4 text-center">Order Date</th>

              <th className="p-4 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order, index) => {
              const qty =
                order.items?.reduce(
                  (sum, item) => sum + Number(item.qty || 0),
                  0,
                ) || 0;

              return (
                <tr
                  key={order._id}
                  className="border-t hover:bg-blue-50 transition-all"
                >
                  <td className="p-4 text-center font-bold">{index + 1}</td>

                  <td className="p-4 font-bold whitespace-nowrap">
                    #{order._id.slice(-8).toUpperCase()}
                  </td>

                  <td className="p-4 whitespace-nowrap">
                    {order.showroomId?.name ||
                      order.showroom?.name ||
                      order.showroomId}
                  </td>

                  <td className="p-4">
                    <div className="font-semibold">
                      {order.customer?.name || "-"}
                    </div>

                    <div className="text-xs text-gray-500">
                      {order.customer?.phone || "-"}
                    </div>
                  </td>

                  <td className="p-4 text-center font-bold">{qty}</td>

                  <td className="p-4 text-right font-bold text-green-700">
                    ৳ {order.total}
                  </td>

                  <td className="p-4 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                        statusClass[order.status] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>

                  <td className="p-4 text-center text-sm whitespace-nowrap">
                    {new Date(order.createdAt).toLocaleString()}
                  </td>

                  <td className="p-4 text-center">
                    <button
                      onClick={() => onView(order)}
                      className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                    >
                      <Eye size={16} />
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
