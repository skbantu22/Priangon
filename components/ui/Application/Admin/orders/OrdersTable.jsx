"use client";

import {
  ArrowUpDown,
  Calendar,
  Eye,
  Truck,
  MoreVertical,
  Clock,
  Send,
  Trash2,
  ListFilter,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { getStatusBadge } from "./utils/getStatusBadge";

export default function OrdersTable({
  paginatedOrders,
  selectedOrders,
  handleSelectRow,
  handleSelectAll,
  filteredOrders,
  showCustomerColumn,
  handleSort,
  setSelectedOrderDetail,
  triggerCourierModal,
  handleSetStatus,
  handleDeleteOrders,
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        {/* =========================
            TABLE HEAD
        ========================= */}
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider">
            {/* Checkbox */}
            <th className="p-4 w-12 text-center">
              <input
                type="checkbox"
                onChange={handleSelectAll}
                checked={
                  paginatedOrders.length > 0 &&
                  selectedOrders.length === paginatedOrders.length
                }
                className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
            </th>

            {/* Order ID */}
            <th
              onClick={() => handleSort("orderNumber")}
              className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none"
            >
              <div className="flex items-center gap-1">
                <span>Order ID</span>
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
              </div>
            </th>

            {/* Customer */}
            {showCustomerColumn && (
              <th
                onClick={() => handleSort("customer")}
                className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Customer</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
            )}

            {/* Products */}
            <th className="p-4">
              <div className="flex items-center gap-1">
                <span>Products</span>
              </div>
            </th>

            {/* Date */}
            <th
              onClick={() => handleSort("createdAt")}
              className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none"
            >
              <div className="flex items-center gap-1">
                <span>Date</span>
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
              </div>
            </th>

            {/* Status */}
            <th
              onClick={() => handleSort("status")}
              className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none"
            >
              <div className="flex items-center gap-1">
                <span>Status</span>
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
              </div>
            </th>

            {/* Total */}
            <th
              onClick={() => handleSort("total")}
              className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none text-right"
            >
              <div className="flex items-center gap-1 justify-end">
                <span>Total Value</span>
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
              </div>
            </th>

            {/* Actions */}
            <th className="p-4 text-center">Actions</th>
          </tr>
        </thead>

        {/* =========================
            TABLE BODY
        ========================= */}
        <tbody className="divide-y divide-slate-150 dark:divide-slate-700/60 text-sm">
          {paginatedOrders.length > 0 ? (
            paginatedOrders.map((order) => {
              const isSelected = selectedOrders.includes(order._id);

              const formattedStatus =
                order?.status?.charAt(0).toUpperCase() +
                order?.status?.slice(1).toLowerCase();

              return (
                <tr
                  key={order._id}
                  className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                    isSelected ? "bg-indigo-50/35 dark:bg-indigo-950/15" : ""
                  }`}
                >
                  {/* Checkbox */}
                  <td className="p-4 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectRow(order._id)}
                      className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>

                  {/* Order Number */}
                  <td className="p-4 font-mono font-bold text-slate-900 dark:text-slate-100 text-xs whitespace-nowrap">
                    #{order?.orderNumber || "N/A"}
                  </td>

                  {/* Customer */}
                  {showCustomerColumn && (
                    <td className="p-4 min-w-[210px]">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {order?.customer?.name || "No Name"}
                        </div>

                        <div className="text-xs text-slate-400">
                          {order?.customer?.email || "No Email"}
                        </div>

                        <div className="text-xs text-slate-400">
                          {order?.customer?.phone || "No Phone"}
                        </div>
                      </div>
                    </td>
                  )}

                  {/* Products */}
                  <td className="p-4 min-w-[260px]">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          order?.items?.[0]?.media || "/placeholder-product.png"
                        }
                        alt={order?.items?.[0]?.name || "Product"}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                      />

                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">
                          {order?.items?.[0]?.name || "Unnamed Product"}
                        </div>

                        <div className="text-xs text-slate-400">
                          Qty: {order?.items?.[0]?.quantity || 1}
                        </div>

                        {order?.items?.length > 1 && (
                          <div className="text-[11px] text-indigo-500 font-medium">
                            +{order.items.length - 1} more products
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Date */}
                  <td className="p-4 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />

                      <span>
                        {order?.createdAt
                          ? new Date(order.createdAt).toLocaleDateString(
                              "en-BD",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )
                          : "No Date"}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="p-4">{getStatusBadge(formattedStatus)}</td>

                  {/* Total */}
                  <td className="p-4 text-right font-black text-slate-900 dark:text-white whitespace-nowrap">
                    ৳{Number(order?.total || 0).toLocaleString()}
                  </td>

                  {/* Actions */}
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* View */}
                      <button
                        onClick={() => setSelectedOrderDetail(order)}
                        title="View Order"
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 transition-colors"
                      >
                        <Eye className="w-4.5 h-4.5" />
                      </button>

                      {/* Courier */}
                      {["pending", "processing"].includes(
                        order?.status?.toLowerCase(),
                      ) && (
                        <button
                          onClick={() => triggerCourierModal([order._id])}
                          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400 transition-colors"
                          title="Send to Courier"
                        >
                          <Truck className="w-4.5 h-4.5" />
                        </button>
                      )}

                      {/* Dropdown */}
                      <div className="relative group">
                        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                          <MoreVertical className="w-4.5 h-4.5" />
                        </button>

                        <div className="absolute right-0 bottom-full mb-2 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl hidden group-hover:block z-20">
                          <div className="p-2 space-y-1">
                            {/* Pending */}
                            {formattedStatus !== "Pending" && (
                              <button
                                onClick={() =>
                                  handleSetStatus([order._id], "pending")
                                }
                                className="flex items-center gap-2 w-full text-left px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
                              >
                                <Clock className="w-3.5 h-3.5 text-rose-500" />
                                <span>Set as Pending</span>
                              </button>
                            )}

                            {/* Processing */}
                            {formattedStatus !== "Processing" && (
                              <button
                                onClick={() =>
                                  handleSetStatus([order._id], "processing")
                                }
                                className="flex items-center gap-2 w-full text-left px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
                              >
                                <Clock className="w-3.5 h-3.5 text-amber-500" />
                                <span>Set as Processing</span>
                              </button>
                            )}

                            {/* Shipped */}
                            {formattedStatus !== "Shipped" && (
                              <button
                                onClick={() =>
                                  handleSetStatus([order._id], "shipped")
                                }
                                className="flex items-center gap-2 w-full text-left px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
                              >
                                <Send className="w-3.5 h-3.5 text-blue-500" />
                                <span>Set as Shipped</span>
                              </button>
                            )}

                            {/* Delivered */}
                            {formattedStatus !== "Delivered" && (
                              <button
                                onClick={() =>
                                  handleSetStatus([order._id], "delivered")
                                }
                                className="flex items-center gap-2 w-full text-left px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Set as Delivered</span>
                              </button>
                            )}

                            {/* Cancelled */}
                            {formattedStatus !== "Cancelled" && (
                              <button
                                onClick={() =>
                                  handleSetStatus([order._id], "cancelled")
                                }
                                className="flex items-center gap-2 w-full text-left px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
                              >
                                <XCircle className="w-3.5 h-3.5 text-orange-500" />
                                <span>Set as Cancelled</span>
                              </button>
                            )}

                            <div className="h-px bg-slate-200 dark:bg-slate-700 my-1"></div>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteOrders([order._id])}
                              className="flex items-center gap-2 w-full text-left px-3 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Order</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={showCustomerColumn ? 8 : 7}
                className="p-12 text-center text-slate-400"
              >
                <div className="flex flex-col items-center justify-center gap-3">
                  <ListFilter className="w-10 h-10 text-slate-300" />

                  <span className="font-bold">
                    No orders match your filter criteria
                  </span>

                  <p className="text-xs max-w-xs mx-auto">
                    Try widening your search bounds or updating the status
                    selection to find what you are looking for.
                  </p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
