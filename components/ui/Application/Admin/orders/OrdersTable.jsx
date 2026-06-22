"use client";

import { useState } from "react";
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
  SquarePen,
  MapPinned,
  RotateCcw,
  User,
  Phone,
  Layers,
} from "lucide-react";
import { getStatusBadge } from "./utils/getStatusBadge";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function OrdersTable({
  paginatedOrders = [],
  selectedOrders = [],
  handleSelectRow,
  handleSelectAll,
  showCustomerColumn,
  handleSort,
  setSelectedOrderDetail,
  triggerCourierModal,
  handleSetStatus,
  handleDeleteOrders,
}) {
  const handlePrintSticker = (order) => {
    const courier = order?.payments?.[0]?.courier || {};
    const item = order?.items?.[0] || {};

    const printWindow = window.open("", "_blank");

    printWindow.document.write(`
    <html>
      <head>
        <title>Mini Thailand Sticker</title>
        <style>
          @page {
            size: 4in 6in;
            margin: 0;
          }

          body {
            margin: 0;
            padding: 10px;
            font-family: Arial, sans-serif;
            width: 4in;
            height: 6in;
          }

          .label {
            border: 2px solid #000;
            height: 100%;
            padding: 10px;
            box-sizing: border-box;
          }

          .header {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
          }

          .section {
            font-size: 13px;
            margin-bottom: 6px;
          }

          .title {
            font-weight: bold;
          }

          .box {
            border-top: 1px dashed #000;
            margin-top: 8px;
            padding-top: 8px;
          }
        </style>
      </head>

      <body>
        <div class="label">

          <div class="header">MINI THAILAND</div>

          <div class="section">
            <span class="title">Consignment ID:</span>
            ${courier?.consignmentId || "N/A"}
          </div>

          <div class="box">
            <div class="section">
              <span class="title">Customer:</span>
              ${order?.customer?.name || "N/A"}
            </div>

            <div class="section">
              <span class="title">Phone:</span>
              ${order?.customer?.phone || "N/A"}
            </div>

            <div class="section">
              <span class="title">Address:</span>
              ${order?.customer?.address || "N/A"}
            </div>
          </div>

          <div class="box">
            <div class="section">
              <span class="title">Product:</span>
              ${item?.name || "N/A"}
            </div>

            <div class="section">
              <span class="title">Price:</span>
              ৳${order?.total || 0}
            </div>

            <div class="section">
              <span class="title">Size:</span>
              ${item?.size || "N/A"}
            </div>

            <div class="section">
              <span class="title">Color:</span>
              ${item?.color || "N/A"}
            </div>
          </div>

        </div>

        <script>
          window.print();
          window.onafterprint = () => window.close();
        </script>
      </body>
    </html>
  `);

    printWindow.document.close();
  };
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
      {/* ========================================================
          DESKTOP VIEW: Traditional Table (Visible on MD screens up)
          ======================================================== */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {/* Checkbox */}
              <th className="p-4 w-12 text-center">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={
                    paginatedOrders.length > 0 &&
                    selectedOrders.length === paginatedOrders.length
                  }
                  className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                />
              </th>

              {/* Order ID */}
              <th
                onClick={() => handleSort("orderNumber")}
                className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 select-none transition"
              >
                <div className="flex items-center gap-1.5">
                  <span>Order ID</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </th>

              {/* Customer */}
              {showCustomerColumn && (
                <th
                  onClick={() => handleSort("customer")}
                  className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 select-none transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Customer</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
              )}

              {/* Products */}
              <th className="p-4 font-semibold">Products</th>

              {/* Date */}
              <th
                onClick={() => handleSort("createdAt")}
                className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 select-none transition"
              >
                <div className="flex items-center gap-1.5">
                  <span>Date</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </th>

              {/* Status */}
              <th
                onClick={() => handleSort("status")}
                className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 select-none transition"
              >
                <div className="flex items-center gap-1.5">
                  <span>Status</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </th>

              {/* Total */}
              <th
                onClick={() => handleSort("total")}
                className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 select-none text-right transition"
              >
                <div className="flex items-center gap-1.5 justify-end">
                  <span>Total Value</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </th>

              {/* Actions */}
              <th className="p-4 text-center font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            {paginatedOrders.length > 0 &&
              paginatedOrders.map((order) => {
                const isSelected = selectedOrders.includes(order._id);
                const formattedStatus =
                  order?.status?.charAt(0).toUpperCase() +
                  order?.status?.slice(1).toLowerCase();

                const courierData = order?.payments?.[0]?.courier || {};
                const courierStatus = courierData?.status;
                const trackingCode = courierData?.trackingCode || "";
                const consignmentId = courierData?.consignmentId || "";

                const hasCourier =
                  order?.status !== "pending" &&
                  (courierStatus === "created" ||
                    !!trackingCode ||
                    !!consignmentId);

                return (
                  <tr
                    key={order._id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors ${
                      isSelected ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(order._id)}
                        className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                      />
                    </td>

                    {/* Order Number */}
                    <td className="p-4 font-mono font-medium text-slate-900 dark:text-slate-100 text-xs whitespace-nowrap">
                      #{order?.orderNumber || "N/A"}
                    </td>

                    {/* Customer */}
                    {showCustomerColumn && (
                      <td className="p-4 min-w-[210px]">
                        <div className="space-y-0.5">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {order?.customer?.name || "No Name"}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
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
                            order?.items?.[0]?.media ||
                            "/placeholder-product.png"
                          }
                          alt={order?.items?.[0]?.name || "Product"}
                          className="w-10 h-10 rounded-lg object-cover bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800"
                        />
                        <div className="max-w-[200px]">
                          <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {order?.items?.[0]?.name || "Unnamed Product"}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Qty: {order?.items?.[0]?.quantity || 1}
                            {order?.items?.length > 1 && (
                              <span className="text-indigo-600 dark:text-indigo-400 font-medium ml-1.5">
                                +{order.items.length - 1} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="p-4 text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">
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
                    <td className="p-4 text-right font-semibold text-slate-950 dark:text-white whitespace-nowrap">
                      ৳{Number(order?.total || 0).toLocaleString()}
                    </td>

                    {/* Actions */}
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handlePrintSticker(order)}
                          title="Print 4x6 Sticker"
                          className="p-2 hover:bg-green-50 dark:hover:bg-green-950/40 rounded-lg text-green-600"
                        >
                          🖨️
                        </button>
                        <button
                          onClick={() => setSelectedOrderDetail(order)}
                          title="View Order"
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <ActionMenus
                          order={order}
                          hasCourier={hasCourier}
                          trackingCode={trackingCode}
                          consignmentId={consignmentId}
                          formattedStatus={formattedStatus}
                          triggerCourierModal={triggerCourierModal}
                          setSelectedOrderDetail={setSelectedOrderDetail}
                          handleSetStatus={handleSetStatus}
                          handleDeleteOrders={handleDeleteOrders}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* ========================================================
          MOBILE VIEW: Stacked Card Layout (Visible below MD breakpoint)
          ======================================================== */}
      <div className="block md:hidden divide-y divide-slate-200 dark:divide-slate-800">
        {paginatedOrders.length > 0
          ? paginatedOrders.map((order) => {
              const isSelected = selectedOrders.includes(order._id);
              const formattedStatus =
                order?.status?.charAt(0).toUpperCase() +
                order?.status?.slice(1).toLowerCase();

              const courierData = order?.payments?.[0]?.courier || {};
              const courierStatus = courierData?.status;
              const trackingCode = courierData?.trackingCode || "";
              const consignmentId = courierData?.consignmentId || "";

              const hasCourier =
                order?.status !== "pending" &&
                (courierStatus === "created" ||
                  !!trackingCode ||
                  !!consignmentId);

              return (
                <div
                  key={order._id}
                  className={`p-4 space-y-4 transition-colors ${
                    isSelected ? "bg-indigo-50/20 dark:bg-indigo-950/10" : ""
                  }`}
                >
                  {/* Mobile Header: Checkbox, Order ID, Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(order._id)}
                        className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5 cursor-pointer"
                      />
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                        #{order?.orderNumber || "N/A"}
                      </span>
                    </div>

                    {/* Status & Quick Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedOrderDetail(order)}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <ActionMenus
                        order={order}
                        hasCourier={hasCourier}
                        trackingCode={trackingCode}
                        consignmentId={consignmentId}
                        formattedStatus={formattedStatus}
                        triggerCourierModal={triggerCourierModal}
                        setSelectedOrderDetail={setSelectedOrderDetail}
                        handleSetStatus={handleSetStatus}
                        handleDeleteOrders={handleDeleteOrders}
                      />
                    </div>
                  </div>

                  {/* Main Product Meta */}
                  <div className="flex items-start gap-3 bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-900">
                    <img
                      src={
                        order?.items?.[0]?.media || "/placeholder-product.png"
                      }
                      alt={order?.items?.[0]?.name || "Product"}
                      className="w-12 h-12 rounded-lg object-cover bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 shrink-0"
                    />
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="font-medium text-slate-800 dark:text-slate-200 text-sm truncate">
                        {order?.items?.[0]?.name || "Unnamed Product"}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <span>Qty: {order?.items?.[0]?.quantity || 1}</span>
                        {order?.items?.length > 1 && (
                          <span className="inline-flex items-center gap-0.5 text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded">
                            <Layers className="w-3 h-3" /> +
                            {order.items.length - 1} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Customer Rows */}
                  {showCustomerColumn && (
                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-dashed border-slate-100 dark:border-slate-900 pt-3">
                      <div className="space-y-1">
                        <span className="text-slate-400 block font-medium uppercase tracking-wider text-[10px]">
                          Customer
                        </span>
                        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {order?.customer?.name || "No Name"}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-400 block font-medium uppercase tracking-wider text-[10px]">
                          Contact
                        </span>
                        <div className="text-slate-600 dark:text-slate-400 font-mono flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {order?.customer?.phone || "No Phone"}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer Metrics: Date, Status, Total */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
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

                    <div className="flex items-center gap-3">
                      <div>{getStatusBadge(formattedStatus)}</div>
                      <div className="text-base font-bold text-slate-900 dark:text-white">
                        ৳{Number(order?.total || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          : /* Empty State fallback rendered here globally if no orders exist */
            null}
      </div>

      {/* Global Empty Filter State */}
      {paginatedOrders.length === 0 && (
        <div className="p-16 text-center text-slate-400 dark:text-slate-500">
          <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
            <div className="p-4 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <ListFilter className="w-6 h-6 text-slate-400" />
            </div>
            <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              No orders match filter criteria
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Try widening your search bounds or updating your active system
              filters to reveal matching order logs.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Extracted Contextual Action Menus sub-component to eliminate duplicate drop-down definitions
 */
function ActionMenus({
  order,
  hasCourier,
  trackingCode,
  consignmentId,
  formattedStatus,
  triggerCourierModal,
  setSelectedOrderDetail,
  handleSetStatus,
  handleDeleteOrders,
}) {
  return (
    <>
      {/* Courier Dropdown Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {!hasCourier ? (
            <button
              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg text-blue-600 dark:text-blue-400 transition"
              title="Send To Courier"
            >
              <Truck className="w-4 h-4" />
            </button>
          ) : (
            <button
              className="p-2 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg text-amber-600 dark:text-amber-400 transition"
              title="Courier Actions"
            >
              <SquarePen className="w-4 h-4" />
            </button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 p-1.5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        >
          {!hasCourier ? (
            <DropdownMenuItem
              onClick={() => triggerCourierModal([order._id])}
              className="flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Truck className="w-3.5 h-3.5 text-blue-500" />
              Send to Courier
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem
                onClick={() => setSelectedOrderDetail(order)}
                className="flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer rounded-lg"
              >
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                View Courier Data
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  alert(
                    `Tracking: ${trackingCode}\nConsignment: ${consignmentId}`,
                  )
                }
                className="flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer rounded-lg"
              >
                <MapPinned className="w-3.5 h-3.5 text-slate-400" />
                Track Order
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => triggerCourierModal([order._id])}
                className="flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer rounded-lg"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                Resend to Courier
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Order Management Dropdown Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
            <MoreVertical className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-52 p-1.5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        >
          <div className="space-y-0.5">
            {["Pending", "Processing", "Shipped", "Delivered", "Cancelled"].map(
              (status) => {
                const lowerStatus = status.toLowerCase();
                const colorMap = {
                  pending: "text-rose-500",
                  processing: "text-amber-500",
                  shipped: "text-blue-500",
                  delivered: "text-emerald-500",
                  cancelled: "text-orange-500",
                };
                const IconMap = {
                  pending: Clock,
                  processing: Clock,
                  shipped: Send,
                  delivered: CheckCircle2,
                  cancelled: XCircle,
                };
                const Icon = IconMap[lowerStatus];

                if (formattedStatus === status) return null;

                return (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => handleSetStatus([order._id], lowerStatus)}
                    className="flex items-center gap-2 px-2.5 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer rounded-lg transition"
                  >
                    <Icon className={`w-3.5 h-3.5 ${colorMap[lowerStatus]}`} />
                    <span>Set as {status}</span>
                  </DropdownMenuItem>
                );
              },
            )}

            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-1" />

            <DropdownMenuItem
              onClick={() => handleDeleteOrders([order._id])}
              className="flex items-center gap-2 px-2.5 py-2.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer rounded-lg transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Order</span>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
