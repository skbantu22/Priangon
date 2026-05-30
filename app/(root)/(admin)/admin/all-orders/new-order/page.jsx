"use client";
import React, { useState, useMemo } from "react";
import {
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  Trash2,
  MoreVertical,
  Eye,
  EyeOff,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Calendar,
  MapPin,
  Mail,
  Phone,
  Package,
  SlidersHorizontal,
  RefreshCw,
  X,
  FileSpreadsheet,
  FileJson,
  ShoppingBag,
  Truck,
  ListFilter,
  Send,
  Check,
} from "lucide-react";

const MOCK_ORDERS = [
  {
    id: "ORD-9923",
    customer: {
      name: "Sophia Martinez",
      email: "sophia.m@example.com",
      phone: "+1 (555) 019-2834",
      avatar:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80&q=80",
    },
    date: "2026-05-28",
    status: "Delivered",
    total: 349.99,
    items: [
      { name: "Premium Wireless Headphones", quantity: 1, price: 249.99 },
      { name: "USB-C Fast Charger Cabling", quantity: 2, price: 50.0 },
    ],
    payment: {
      method: "Credit Card",
      status: "Paid",
      transactionId: "TXN-8829103",
    },
    shipping: {
      address: "1428 Elm St, Oakland, CA 94607",
      carrier: "FedEx",
      trackingNumber: "FX-99281-US",
      status: "Delivered",
    },
  },
  {
    id: "ORD-9922",
    customer: {
      name: "Alexander Wright",
      email: "a.wright@example.com",
      phone: "+1 (555) 014-9988",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80",
    },
    date: "2026-05-27",
    status: "Processing",
    total: 1250.0,
    items: [
      { name: 'Ultra-Wide Gaming Monitor 34"', quantity: 1, price: 1250.0 },
    ],
    payment: { method: "PayPal", status: "Paid", transactionId: "TXN-3349102" },
    shipping: {
      address: "742 Evergreen Terrace, Springfield, OR 97477",
      carrier: "UPS",
      trackingNumber: "1Z-99AA1-992",
      status: "In Transit",
    },
  },
  {
    id: "ORD-9921",
    customer: {
      name: "Emma Watson",
      email: "emma.w@example.com",
      phone: "+1 (555) 012-3456",
      avatar:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=80&h=80&q=80",
    },
    date: "2026-05-26",
    status: "Pending",
    total: 89.5,
    items: [
      { name: "Ergonomic Memory Foam Wrist Rest", quantity: 2, price: 29.75 },
      { name: "Anti-Glare Screen Filter", quantity: 1, price: 30.0 },
    ],
    payment: {
      method: "Bank Transfer",
      status: "Awaiting",
      transactionId: "TXN-PENDING",
    },
    shipping: {
      address: "10 Downing St, London, SW1A 2AA",
      carrier: "None",
      trackingNumber: "Unassigned",
      status: "Label Pending",
    },
  },
  {
    id: "ORD-9920",
    customer: {
      name: "Liam Neeson",
      email: "taken@example.com",
      phone: "+1 (555) 017-8822",
      avatar:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&h=80&q=80",
    },
    date: "2026-05-25",
    status: "Cancelled",
    total: 45.0,
    items: [{ name: "Leather Passport Holder", quantity: 1, price: 45.0 }],
    payment: {
      method: "Credit Card",
      status: "Refunded",
      transactionId: "TXN-1102931",
    },
    shipping: {
      address: "55 Rue du Faubourg Saint-Honoré, Paris",
      carrier: "Colissimo",
      trackingNumber: "CO-88291-FR",
      status: "Cancelled",
    },
  },
  {
    id: "ORD-9919",
    customer: {
      name: "Olivia Brown",
      email: "olivia.b@example.com",
      phone: "+1 (555) 011-4455",
      avatar:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=80&h=80&q=80",
    },
    date: "2026-05-24",
    status: "Shipped",
    total: 580.0,
    items: [
      {
        name: "Mechanical Keyboard (Blue Switches)",
        quantity: 2,
        price: 190.0,
      },
      { name: "Precision Gaming Mouse", quantity: 2, price: 100.0 },
    ],
    payment: {
      method: "Apple Pay",
      status: "Paid",
      transactionId: "TXN-9023812",
    },
    shipping: {
      address: "221B Baker St, London, NW1 6XE",
      carrier: "DHL",
      trackingNumber: "DHL-19283-GB",
      status: "Out for Delivery",
    },
  },
  {
    id: "ORD-9918",
    customer: {
      name: "Noah Schnapp",
      email: "noah.s@example.com",
      phone: "+1 (555) 015-1122",
      avatar:
        "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=80&h=80&q=80",
    },
    date: "2026-05-23",
    status: "Delivered",
    total: 120.0,
    items: [
      { name: "Premium Coffee Beans Blend 1kg", quantity: 3, price: 40.0 },
    ],
    payment: {
      method: "Credit Card",
      status: "Paid",
      transactionId: "TXN-552912",
    },
    shipping: {
      address: "100 Pine St, San Francisco, CA 94111",
      carrier: "USPS",
      trackingNumber: "US-99210-SF",
      status: "Delivered",
    },
  },
  {
    id: "ORD-9917",
    customer: {
      name: "Isabella Garcia",
      email: "isabella.g@example.com",
      phone: "+1 (555) 018-7733",
      avatar:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=80&h=80&q=80",
    },
    date: "2026-05-22",
    status: "Processing",
    total: 675.5,
    items: [
      { name: "Smart Home Security Kit", quantity: 1, price: 499.0 },
      { name: "Smart Plug Mini x3", quantity: 3, price: 58.83 },
    ],
    payment: { method: "PayPal", status: "Paid", transactionId: "TXN-661203" },
    shipping: {
      address: "350 5th Ave, New York, NY 10118",
      carrier: "FedEx",
      trackingNumber: "FX-11029-NY",
      status: "Label Created",
    },
  },
  {
    id: "ORD-9916",
    customer: {
      name: "James Bond",
      email: "double07@example.com",
      phone: "+1 (555) 007-9999",
      avatar:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=80&h=80&q=80",
    },
    date: "2026-05-20",
    status: "Delivered",
    total: 4500.0,
    items: [
      { name: "Custom Tailored Tuxedo Suit", quantity: 1, price: 4000.0 },
      { name: "Polished Cufflinks Set", quantity: 2, price: 250.0 },
    ],
    payment: {
      method: "Bank Transfer",
      status: "Paid",
      transactionId: "TXN-007007",
    },
    shipping: {
      address: "MI6 Headquarters, Vauxhall, London",
      carrier: "Special Courier",
      trackingNumber: "SC-CLND-007",
      status: "Delivered",
    },
  },
];

// Helper to get styled Status Badge
export function getStatusBadge(status) {
  switch (status) {
    case "Delivered":
      return (
        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
          <CheckCircle className="w-3.5 h-3.5" /> Delivered
        </span>
      );
    case "Processing":
      return (
        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800">
          <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" /> Processing
        </span>
      );
    case "Shipped":
      return (
        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
          <Truck className="w-3.5 h-3.5" /> Shipped
        </span>
      );
    case "Pending":
      return (
        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800">
          <Clock className="w-3.5 h-3.5" /> Pending
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-850 dark:text-slate-400">
          <XCircle className="w-3.5 h-3.5" /> Cancelled
        </span>
      );
  }
}

// ----------------- SUB-COMPONENTS -----------------

// Toast Notification Manager UI
function NotificationHUD({ notifications }) {
  return (
    <div className="fixed top-5 right-5 z-50 space-y-2 pointer-events-none">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`flex items-center gap-3 p-4 rounded-xl shadow-xl border text-sm font-semibold max-w-sm transition-all duration-300 transform translate-x-0 ${
            n.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-slate-800 dark:border-emerald-800 dark:text-emerald-400"
              : n.type === "error"
                ? "bg-rose-50 border-rose-300 text-rose-800 dark:bg-slate-800 dark:border-rose-800 dark:text-rose-400"
                : "bg-blue-50 border-blue-300 text-blue-800 dark:bg-slate-800 dark:border-indigo-800 dark:text-indigo-400"
          }`}
        >
          {n.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600" />
          )}
          <span className="flex-1">{n.message}</span>
        </div>
      ))}
    </div>
  );
}

// Click-Go Quick Status Filtering Tabs
function StatusTabs({
  statusFilter,
  setStatusFilter,
  setCurrentPage,
  addNotification,
  statusCounts,
}) {
  const tabs = [
    "All",
    "Pending",
    "Processing",
    "Shipped",
    "Delivered",
    "Cancelled",
  ];
  return (
    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2 overflow-x-auto scrollbar-none">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 pl-3 pr-2 hidden md:inline-block">
        Filter Status:
      </span>
      {tabs.map((tab) => {
        const isActive = statusFilter === tab;
        const count = statusCounts[tab];
        return (
          <button
            key={tab}
            onClick={() => {
              setStatusFilter(tab);
              setCurrentPage(1);
              addNotification(`Viewing ${tab} orders.`, "info");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              isActive
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                : "bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50"
            }`}
          >
            <span>{tab}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                isActive
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Drawer filters expansion panel
function AdvancedFilterPanel({
  isOpen,
  statusFilter,
  setStatusFilter,
  paymentFilter,
  setPaymentFilter,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  setCurrentPage,
  addNotification,
  filteredCount,
}) {
  if (!isOpen) return null;
  return (
    <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          Order Status
        </label>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full p-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active Fulfillments</option>
          <option value="Delivered">Delivered</option>
          <option value="Processing">Processing</option>
          <option value="Shipped">Shipped</option>
          <option value="Pending">Pending</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          Payment Method
        </label>
        <select
          value={paymentFilter}
          onChange={(e) => {
            setPaymentFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full p-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="All">All Methods</option>
          <option value="Credit Card">Credit Card</option>
          <option value="PayPal">PayPal</option>
          <option value="Bank Transfer">Bank Transfer</option>
          <option value="Apple Pay">Apple Pay</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          Price Threshold (Min)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            $
          </span>
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => {
              setMinPrice(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-7 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          Price Threshold (Max)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            $
          </span>
          <input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-7 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      <div className="col-span-1 sm:col-span-2 lg:col-span-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-4 mt-2">
        <span className="text-xs text-slate-400 font-semibold">
          {filteredCount} matching parameters found
        </span>
        <button
          onClick={() => {
            setStatusFilter("All");
            setPaymentFilter("All");
            setMinPrice("");
            setMaxPrice("");
            addNotification("Filters cleared.", "info");
          }}
          className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-bold flex items-center gap-1"
        >
          Reset all Filters
        </button>
      </div>
    </div>
  );
}

// Bulk action interactive banner HUD
function BulkActionsPanel({
  selectedOrders,
  triggerCourierModal,
  handleSetStatus,
  handleDeleteOrders,
  setSelectedOrders,
}) {
  if (selectedOrders.length === 0) return null;
  return (
    <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/50 border-b border-indigo-100 dark:border-indigo-900 flex flex-col md:flex-row md:items-center justify-between px-6 gap-3 animate-fade-in">
      <div className="flex items-center gap-3">
        <span className="text-xs font-black text-indigo-800 dark:text-indigo-300 uppercase tracking-widest bg-indigo-200/50 dark:bg-indigo-900/50 px-2 py-1 rounded">
          {selectedOrders.length} SELECTED
        </span>
        <p className="text-xs font-medium text-indigo-700 dark:text-indigo-400 hidden lg:block">
          Perform operations across multiple checkout files simultaneously
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => triggerCourierModal(selectedOrders)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all"
          title="Dispatch selected orders directly to courier integration"
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Send to Courier</span>
        </button>

        <button
          onClick={() => handleSetStatus(selectedOrders, "Pending")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 dark:bg-slate-900 dark:border-rose-900 dark:text-rose-400 rounded-lg shadow-sm transition-all"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Set Pending</span>
        </button>

        <button
          onClick={() => handleSetStatus(selectedOrders, "Shipped")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 dark:bg-slate-900 dark:border-amber-900 dark:text-amber-400 rounded-lg shadow-sm transition-all"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Set Shipped</span>
        </button>

        <button
          onClick={() => handleDeleteOrders(selectedOrders)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Selected</span>
        </button>

        <button
          onClick={() => setSelectedOrders([])}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 ml-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Table Grid Renderer Component
function OrdersTable({
  paginatedOrders,
  selectedOrders,
  handleSelectRow,
  handleSelectAll,
  filteredOrders,
  showCustomerColumn,
  sortBy,
  handleSort,
  setSelectedOrderDetail,
  triggerCourierModal,
  handleSetStatus,
  handleDeleteOrders,
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <th className="p-4 w-12 text-center">
              <input
                type="checkbox"
                onChange={handleSelectAll}
                checked={
                  filteredOrders.length > 0 &&
                  selectedOrders.length === filteredOrders.length
                }
                className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
            </th>
            <th
              onClick={() => handleSort("id")}
              className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none"
            >
              <div className="flex items-center gap-1">
                <span>Order ID</span>
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
              </div>
            </th>

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

            <th
              onClick={() => handleSort("date")}
              className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none"
            >
              <div className="flex items-center gap-1">
                <span>Date</span>
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
              </div>
            </th>
            <th
              onClick={() => handleSort("status")}
              className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none"
            >
              <div className="flex items-center gap-1">
                <span>Status</span>
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
              </div>
            </th>
            <th
              onClick={() => handleSort("total")}
              className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none text-right"
            >
              <div className="flex items-center gap-1 justify-end">
                <span>Total Value</span>
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
              </div>
            </th>
            <th className="p-4 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-150 dark:divide-slate-700/60 text-sm">
          {paginatedOrders.length > 0 ? (
            paginatedOrders.map((order) => {
              const isSelected = selectedOrders.includes(order.id);
              return (
                <tr
                  key={order.id}
                  className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                    isSelected ? "bg-indigo-50/35 dark:bg-indigo-950/15" : ""
                  }`}
                >
                  <td className="p-4 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectRow(order.id)}
                      className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="p-4 font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                    {order.id}
                  </td>

                  {showCustomerColumn && (
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={order.customer.avatar}
                          alt={order.customer.name}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        />
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {order.customer.name}
                          </div>
                          <div className="text-xs text-slate-400">
                            {order.customer.email}
                          </div>
                        </div>
                      </div>
                    </td>
                  )}

                  <td className="p-4 text-slate-500 dark:text-slate-400 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{order.date}</span>
                    </div>
                  </td>
                  <td className="p-4">{getStatusBadge(order.status)}</td>
                  <td className="p-4 text-right font-black text-slate-900 dark:text-white">
                    ${order.total.toFixed(2)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setSelectedOrderDetail(order)}
                        title="View full Order details"
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 transition-colors"
                      >
                        <Eye className="w-4.5 h-4.5" />
                      </button>

                      {/* Fast courier dispatch for rows */}
                      {(order.status === "Pending" ||
                        order.status === "Processing") && (
                        <button
                          onClick={() => triggerCourierModal([order.id])}
                          className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg text-blue-600 dark:text-blue-400 transition-colors"
                          title="Send directly to Courier (Ship)"
                        >
                          <Truck className="w-4.5 h-4.5" />
                        </button>
                      )}

                      <div className="relative group">
                        <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                          <MoreVertical className="w-4.5 h-4.5" />
                        </button>
                        <div className="absolute right-0 bottom-full mb-1.5 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl hidden group-hover:block z-10">
                          <div className="p-1 space-y-0.5">
                            <button
                              onClick={() =>
                                handleSetStatus([order.id], "Pending")
                              }
                              className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-semibold text-slate-750 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"
                            >
                              <Clock className="w-3.5 h-3.5 text-rose-500" />
                              <span>Set as Pending</span>
                            </button>
                            <button
                              onClick={() =>
                                handleSetStatus([order.id], "Shipped")
                              }
                              className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-semibold text-slate-750 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"
                            >
                              <Send className="w-3.5 h-3.5 text-amber-500" />
                              <span>Set as Shipped</span>
                            </button>
                            <div className="h-px bg-slate-150 dark:bg-slate-700 my-1"></div>
                            <button
                              onClick={() => handleDeleteOrders([order.id])}
                              className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-955/40 text-rose-600 rounded-md"
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
                colSpan={showCustomerColumn ? 7 : 6}
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

// Pagination Controls UI Component
function Pagination({
  itemsPerPage,
  setItemsPerPage,
  currentPage,
  setCurrentPage,
  filteredLength,
  totalPages,
}) {
  return (
    <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/30 dark:bg-slate-900/10">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Rows per page:</span>
        <select
          value={itemsPerPage}
          onChange={(e) => {
            setItemsPerPage(parseInt(e.target.value));
            setCurrentPage(1);
          }}
          className="p-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
        >
          <option value={5}>5 Rows</option>
          <option value={10}>10 Rows</option>
          <option value={20}>20 Rows</option>
        </select>
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
        <span className="text-xs text-slate-500">
          Showing{" "}
          {filteredLength > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
          {Math.min(currentPage * itemsPerPage, filteredLength)} of{" "}
          {filteredLength}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-955 hover:bg-slate-50 disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: totalPages }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentPage(idx + 1)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              currentPage === idx + 1
                ? "bg-indigo-600 text-white"
                : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-955 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
            }`}
          >
            {idx + 1}
          </button>
        ))}
        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-955 hover:bg-slate-50 disabled:opacity-50"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Order detail Drawer Panel UI
function OrderDetailDrawer({ order, onClose }) {
  if (!order) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-sm flex justify-end animate-fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-800 h-full shadow-2xl overflow-y-auto flex flex-col animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
          <div>
            <span className="text-[10px] font-black tracking-wider uppercase bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded">
              Order Dossier
            </span>
            <h2 className="text-xl font-black mt-1 text-slate-900 dark:text-white">
              {order.id}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {/* Status Header Block */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-150 dark:border-slate-700 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Process Status
              </span>
              <div className="mt-1">{getStatusBadge(order.status)}</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Registered Date
              </span>
              <p className="text-xs font-semibold mt-1">{order.date}</p>
            </div>
          </div>

          {/* Customer Info Card */}
          <div>
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">
              Customer Profile
            </h3>
            <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3.5">
              <div className="flex items-center gap-3">
                <img
                  src={order.customer.avatar}
                  alt={order.customer.name}
                  className="w-11 h-11 rounded-full object-cover border"
                />
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {order.customer.name}
                  </p>
                  <p className="text-xs text-slate-400">Account Verified</p>
                </div>
              </div>
              <div className="h-px bg-slate-100 dark:bg-slate-700/60"></div>
              <div className="grid grid-cols-1 gap-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-500" />
                  <span>{order.customer.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-500" />
                  <span>{order.customer.phone}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-rose-500 mt-0.5" />
                  <span className="leading-tight">
                    {order.shipping.address}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Package Delivery Tracker */}
          <div>
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">
              Delivery Tracker
            </h3>
            <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl space-y-4">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase">
                <span>Carrier: {order.shipping.carrier}</span>
                <span>No: {order.shipping.trackingNumber}</span>
              </div>

              <div className="relative pl-6 space-y-4 text-xs font-semibold">
                <div className="absolute left-1.5 top-1 bottom-1 w-0.5 bg-slate-200 dark:bg-slate-700"></div>

                <div className="relative">
                  <div
                    className={`absolute -left-[23px] top-0.5 w-3 h-3 rounded-full border-2 border-white ${
                      order.status === "Delivered"
                        ? "bg-emerald-500"
                        : "bg-slate-300"
                    }`}
                  ></div>
                  <p
                    className={
                      order.status === "Delivered"
                        ? "text-slate-900 dark:text-white"
                        : "text-slate-400"
                    }
                  >
                    Delivered to Destination
                  </p>
                </div>

                <div className="relative">
                  <div
                    className={`absolute -left-[23px] top-0.5 w-3 h-3 rounded-full border-2 border-white ${
                      ["Delivered", "Shipped"].includes(order.status)
                        ? "bg-indigo-500"
                        : "bg-slate-300"
                    }`}
                  ></div>
                  <p
                    className={
                      ["Delivered", "Shipped"].includes(order.status)
                        ? "text-slate-900 dark:text-white"
                        : "text-slate-400"
                    }
                  >
                    In Transit (Out for Delivery)
                  </p>
                </div>

                <div className="relative">
                  <div
                    className={`absolute -left-[23px] top-0.5 w-3 h-3 rounded-full border-2 border-white ${
                      ["Delivered", "Shipped", "Processing"].includes(
                        order.status,
                      )
                        ? "bg-amber-500"
                        : "bg-slate-300"
                    }`}
                  ></div>
                  <p
                    className={
                      ["Delivered", "Shipped", "Processing"].includes(
                        order.status,
                      )
                        ? "text-slate-900 dark:text-white"
                        : "text-slate-400"
                    }
                  >
                    Package Handed to Logistics Carrier
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Checkout Bill */}
          <div>
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">
              Itemized Receipt
            </h3>
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-700 grid grid-cols-4 font-bold text-slate-500 uppercase tracking-wider">
                <span className="col-span-2">Product name</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Price</span>
              </div>
              <div className="p-3 space-y-3">
                {order.items.map((i, idx) => (
                  <div key={idx} className="grid grid-cols-4 font-semibold">
                    <span className="col-span-2 text-slate-900 dark:text-white leading-tight">
                      {i.name}
                    </span>
                    <span className="text-center text-slate-500">
                      x{i.quantity}
                    </span>
                    <span className="text-right">
                      ${(i.price * i.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="bg-slate-50/50 dark:bg-slate-900/10 p-3 border-t border-slate-150 dark:border-slate-700 space-y-1.5 font-semibold text-slate-500">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${order.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-bold">
                  <span>Payment Method</span>
                  <span>
                    {order.payment.method} ({order.payment.status})
                  </span>
                </div>
                <div className="h-px bg-slate-150 dark:bg-slate-700 my-1"></div>
                <div className="flex justify-between text-sm font-black text-slate-950 dark:text-white">
                  <span>Grand Total</span>
                  <span>${order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Send to Courier Modal integration
function CourierModal({
  isOpen,
  onClose,
  targetsCount,
  selectedCarrier,
  setSelectedCarrier,
  onConfirm,
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex justify-center items-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md overflow-hidden animate-zoom-in">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 dark:bg-blue-950/40 rounded-lg">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Send to Courier</h3>
              <p className="text-xs text-slate-400">
                Dispatch {targetsCount} order(s) instantly
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-150 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-sm font-medium">
          <p className="text-xs text-slate-500 leading-relaxed dark:text-slate-400">
            You are about to transmit the selected order files to your
            fulfillment logistics network. This will automatically transition
            their status to{" "}
            <strong className="text-slate-800 dark:text-slate-200">
              Shipped
            </strong>{" "}
            and append a tracking sequence.
          </p>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
              Select Logistics Carrier
            </label>
            <div className="grid grid-cols-2 gap-2">
              {["UPS", "FedEx", "DHL", "USPS"].map((carrier) => (
                <button
                  key={carrier}
                  type="button"
                  onClick={() => setSelectedCarrier(carrier)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    selectedCarrier === carrier
                      ? "bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-950/40 dark:border-blue-500 dark:text-blue-400 ring-2 ring-blue-500/10"
                      : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span>{carrier} Shipping</span>
                  {selectedCarrier === carrier && (
                    <Check className="w-3.5 h-3.5" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700 mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 hover:bg-slate-200 rounded-xl font-bold text-xs"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/15"
            >
              Dispatch Cargo Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Create New Order Form Modal
function CreateOrderModal({
  isOpen,
  onClose,
  newOrder,
  setNewOrder,
  onSubmit,
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex justify-center items-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-xl overflow-hidden animate-zoom-in">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/30">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Generate Mock Order</h3>
              <p className="text-xs text-slate-400">
                Add a new structured order directly to memory
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-150 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4 text-sm font-medium">
          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-bold uppercase">
              Customer Profile
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Customer Name *"
                value={newOrder.customerName}
                onChange={(e) =>
                  setNewOrder({ ...newOrder, customerName: e.target.value })
                }
                className="w-full p-2.5 bg-slate-50 border dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={newOrder.customerEmail}
                onChange={(e) =>
                  setNewOrder({ ...newOrder, customerEmail: e.target.value })
                }
                className="w-full p-2.5 bg-slate-50 border dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-bold uppercase">
              Product Details
            </label>
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                required
                placeholder="Product Item *"
                value={newOrder.itemName}
                onChange={(e) =>
                  setNewOrder({ ...newOrder, itemName: e.target.value })
                }
                className="col-span-2 w-full p-2.5 bg-slate-50 border dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <input
                type="number"
                required
                placeholder="Price ($) *"
                value={newOrder.itemPrice}
                onChange={(e) =>
                  setNewOrder({ ...newOrder, itemPrice: e.target.value })
                }
                className="w-full p-2.5 bg-slate-50 border dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 font-bold uppercase mb-1.5">
                Payment Method
              </label>
              <select
                value={newOrder.paymentMethod}
                onChange={(e) =>
                  setNewOrder({ ...newOrder, paymentMethod: e.target.value })
                }
                className="w-full p-2.5 bg-slate-50 border dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="Credit Card">Credit Card</option>
                <option value="PayPal">PayPal</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Apple Pay">Apple Pay</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 font-bold uppercase mb-1.5">
                Starting Status
              </label>
              <select
                value={newOrder.status}
                onChange={(e) =>
                  setNewOrder({ ...newOrder, status: e.target.value })
                }
                className="w-full p-2.5 bg-slate-50 border dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 font-bold uppercase mb-1.5">
                Carrier Service
              </label>
              <select
                value={newOrder.carrier}
                onChange={(e) =>
                  setNewOrder({ ...newOrder, carrier: e.target.value })
                }
                className="w-full p-2.5 bg-slate-50 border dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="UPS">UPS Express</option>
                <option value="FedEx">FedEx Home</option>
                <option value="DHL">DHL Worldwide</option>
                <option value="USPS">USPS Priority</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-bold uppercase">
              Fulfillment Destination
            </label>
            <input
              type="text"
              required
              placeholder="Shipping Address *"
              value={newOrder.shippingAddress}
              onChange={(e) =>
                setNewOrder({ ...newOrder, shippingAddress: e.target.value })
              }
              className="w-full p-2.5 bg-slate-50 border dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 hover:bg-slate-200 rounded-xl font-bold text-xs"
            >
              Discard
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md"
            >
              Create Order Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------- MAIN APP COMPONENT -----------------

export default function App() {
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState({ field: "date", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // View States
  const [showCustomerColumn, setShowCustomerColumn] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Courier States
  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);
  const [courierTargets, setCourierTargets] = useState([]);
  const [selectedCarrier, setSelectedCarrier] = useState("UPS");

  // Toast notifications state
  const [notifications, setNotifications] = useState([]);

  // Form state for creating a new order
  const [newOrder, setNewOrder] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    status: "Pending",
    itemName: "",
    itemPrice: "",
    itemQty: 1,
    paymentMethod: "Credit Card",
    shippingAddress: "",
    carrier: "UPS",
  });

  const addNotification = (message, type = "success") => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4500);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedOrders(filteredOrders.map((o) => o.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectRow = (id) => {
    if (selectedOrders.includes(id)) {
      setSelectedOrders((prev) => prev.filter((item) => item !== id));
    } else {
      setSelectedOrders((prev) => [...prev, id]);
    }
  };

  const handleSetStatus = (ids, targetStatus) => {
    setOrders((prev) =>
      prev.map((order) =>
        ids.includes(order.id) ? { ...order, status: targetStatus } : order,
      ),
    );
    addNotification(
      `Successfully updated ${ids.length} order(s) to ${targetStatus}.`,
      "success",
    );
    setSelectedOrders([]);
  };

  const handleDeleteOrders = (ids) => {
    setOrders((prev) => prev.filter((order) => !ids.includes(order.id)));
    addNotification(
      `Successfully deleted ${ids.length} order file(s).`,
      "error",
    );
    setSelectedOrders([]);
  };

  const triggerCourierModal = (ids) => {
    setCourierTargets(ids);
    setIsCourierModalOpen(true);
  };

  const handleConfirmCourierDispatch = () => {
    if (courierTargets.length === 0) return;

    setOrders((prev) =>
      prev.map((order) => {
        if (courierTargets.includes(order.id)) {
          const trackingNum = `${selectedCarrier.substring(0, 2).toUpperCase()}-${Math.floor(100000 + Math.random() * 899999)}-US`;
          return {
            ...order,
            status: "Shipped",
            shipping: {
              ...order.shipping,
              carrier: selectedCarrier,
              trackingNumber: trackingNum,
              status: "In Transit",
            },
          };
        }
        return order;
      }),
    );

    addNotification(
      `Dispatched ${courierTargets.length} order(s) to ${selectedCarrier}! Tracking numbers generated.`,
      "success",
    );
    setIsCourierModalOpen(false);
    setSelectedOrders([]);
    setCourierTargets([]);
  };

  const handleSort = (field) => {
    const direction =
      sortBy.field === field && sortBy.direction === "asc" ? "desc" : "asc";
    setSortBy({ field, direction });
  };

  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        // Search matching
        const matchesSearch =
          order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.customer.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          order.customer.email
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          order.items.some((i) =>
            i.name.toLowerCase().includes(searchQuery.toLowerCase()),
          );

        // Status matching (Dynamic support for active status custom filter)
        let matchesStatus = false;
        if (statusFilter === "All") {
          matchesStatus = true;
        } else if (statusFilter === "Active") {
          matchesStatus =
            order.status === "Processing" || order.status === "Shipped";
        } else {
          matchesStatus = order.status === statusFilter;
        }

        // Payment matching
        const matchesPayment =
          paymentFilter === "All" || order.payment.method === paymentFilter;

        // Price range matching
        const val = order.total;
        const matchesMin = minPrice === "" || val >= parseFloat(minPrice);
        const matchesMax = maxPrice === "" || val <= parseFloat(maxPrice);

        return (
          matchesSearch &&
          matchesStatus &&
          matchesPayment &&
          matchesMin &&
          matchesMax
        );
      })
      .sort((a, b) => {
        let aVal, bVal;

        if (sortBy.field === "id") {
          aVal = a.id;
          bVal = b.id;
        } else if (sortBy.field === "customer") {
          aVal = a.customer.name;
          bVal = b.customer.name;
        } else if (sortBy.field === "date") {
          aVal = a.date;
          bVal = b.date;
        } else if (sortBy.field === "status") {
          aVal = a.status;
          bVal = b.status;
        } else if (sortBy.field === "total") {
          aVal = a.total;
          bVal = b.total;
        }

        if (aVal < bVal) return sortBy.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortBy.direction === "asc" ? 1 : -1;
        return 0;
      });
  }, [
    orders,
    searchQuery,
    statusFilter,
    paymentFilter,
    minPrice,
    maxPrice,
    sortBy,
  ]);

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;

  const stats = useMemo(() => {
    const totalRev = orders.reduce(
      (sum, o) => (o.status !== "Cancelled" ? sum + o.total : sum),
      0,
    );
    const active = orders.filter(
      (o) => o.status === "Processing" || o.status === "Shipped",
    ).length;
    const completed = orders.filter((o) => o.status === "Delivered").length;
    const pending = orders.filter((o) => o.status === "Pending").length;
    return { totalRev, active, completed, pending, totalCount: orders.length };
  }, [orders]);

  // Compute status counts for live quick-pill indicators
  const statusCounts = useMemo(() => {
    const counts = {
      All: orders.length,
      Pending: 0,
      Processing: 0,
      Shipped: 0,
      Delivered: 0,
      Cancelled: 0,
      Active: 0,
    };
    orders.forEach((o) => {
      if (counts[o.status] !== undefined) {
        counts[o.status]++;
      }
      if (o.status === "Processing" || o.status === "Shipped") {
        counts.Active++;
      }
    });
    return counts;
  }, [orders]);

  const handleCreateOrder = (e) => {
    e.preventDefault();
    if (
      !newOrder.customerName ||
      !newOrder.itemName ||
      !newOrder.itemPrice ||
      !newOrder.shippingAddress
    ) {
      addNotification("Please fill in all required fields", "error");
      return;
    }

    const calculatedTotal =
      parseFloat(newOrder.itemPrice) * parseInt(newOrder.itemQty);
    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const createdOrder = {
      id: orderId,
      customer: {
        name: newOrder.customerName,
        email:
          newOrder.customerEmail ||
          `${newOrder.customerName.toLowerCase().replace(/\s+/g, "")}@example.com`,
        phone: newOrder.customerPhone || "+1 (555) 000-0000",
        avatar:
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80",
      },
      date: new Date().toISOString().split("T")[0],
      status: newOrder.status,
      total: calculatedTotal,
      items: [
        {
          name: newOrder.itemName,
          quantity: parseInt(newOrder.itemQty),
          price: parseFloat(newOrder.itemPrice),
        },
      ],
      payment: {
        method: newOrder.paymentMethod,
        status:
          newOrder.status === "Delivered" ||
          newOrder.status === "Shipped" ||
          newOrder.status === "Processing"
            ? "Paid"
            : "Awaiting",
        transactionId: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      },
      shipping: {
        address: newOrder.shippingAddress,
        carrier: newOrder.carrier || "None",
        trackingNumber:
          newOrder.status === "Shipped"
            ? `UPS-${Math.floor(10000 + Math.random() * 90000)}-US`
            : "Unassigned",
        status:
          newOrder.status === "Delivered"
            ? "Delivered"
            : newOrder.status === "Shipped"
              ? "In Transit"
              : "Label Pending",
      },
    };

    setOrders([createdOrder, ...orders]);
    setIsCreateModalOpen(false);
    addNotification(`Successfully created order ${orderId}!`, "success");
    setNewOrder({
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      status: "Pending",
      itemName: "",
      itemPrice: "",
      itemQty: 1,
      paymentMethod: "Credit Card",
      shippingAddress: "",
      carrier: "UPS",
    });
  };

  const exportData = (format) => {
    let content = "";
    const name = `orders-export-${new Date().toISOString().split("T")[0]}`;

    if (format === "json") {
      content = JSON.stringify(filteredOrders, null, 2);
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${name}.json`;
      link.click();
      addNotification("Exported filtered orders as JSON file.", "success");
    } else {
      const headers = [
        "Order ID",
        "Customer Name",
        "Email",
        "Date",
        "Status",
        "Total Amount",
        "Items Count",
        "Payment Method",
      ];
      const rows = filteredOrders.map((o) => [
        o.id,
        o.customer.name,
        o.customer.email,
        o.date,
        o.status,
        o.total.toFixed(2),
        o.items.reduce((acc, curr) => acc + curr.quantity, 0),
        o.payment.method,
      ]);
      content = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([content], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${name}.csv`;
      link.click();
      addNotification(
        "Exported filtered orders as CSV spreadsheet.",
        "success",
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans antialiased transition-colors duration-300">
      {/* HUD Notifications */}
      <NotificationHUD notifications={notifications} />

      {/* Main Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">OrderHub</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Advanced Merchant Dashboard & Registry
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Order</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Click-Go Quick Filter Status Row */}
        <StatusTabs
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          setCurrentPage={setCurrentPage}
          addNotification={addNotification}
          statusCounts={statusCounts}
        />

        {/* Central Data Table Panel wrapper */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Controls Filter & Action Utility bar */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <div className="w-full md:w-80 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search orders, items..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
              {/* Show/Hide Customer Toggle Button */}
              <button
                onClick={() => {
                  setShowCustomerColumn(!showCustomerColumn);
                  addNotification(
                    showCustomerColumn
                      ? "Customer column hidden."
                      : "Customer column shown.",
                    "info",
                  );
                }}
                className={`flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl border transition-all ${
                  showCustomerColumn
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "bg-white border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
                }`}
              >
                {showCustomerColumn ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
                <span>
                  {showCustomerColumn ? "Customer On" : "Customer Off"}
                </span>
              </button>

              {/* Filters Toggle Button */}
              <button
                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                className={`flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl border transition-all ${
                  isFilterPanelOpen ||
                  statusFilter !== "All" ||
                  paymentFilter !== "All" ||
                  minPrice !== "" ||
                  maxPrice !== ""
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400"
                    : "bg-white border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filters</span>
                {(statusFilter !== "All" ||
                  paymentFilter !== "All" ||
                  minPrice !== "" ||
                  maxPrice !== "") && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                )}
              </button>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

              {/* Data Export dropdown menu */}
              <div className="relative group">
                <button className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold bg-white border border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 transition-all">
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
                <div className="absolute right-0 top-full mt-1.5 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl hidden group-hover:block z-20">
                  <div className="p-1.5 space-y-1">
                    <button
                      onClick={() => exportData("csv")}
                      className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Export CSV</span>
                    </button>
                    <button
                      onClick={() => exportData("json")}
                      className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <FileJson className="w-4 h-4 text-amber-600" />
                      <span>Export JSON</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Expanded Drawer Search Filter panel */}
          <AdvancedFilterPanel
            isOpen={isFilterPanelOpen}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            paymentFilter={paymentFilter}
            setPaymentFilter={setPaymentFilter}
            minPrice={minPrice}
            setMinPrice={setMinPrice}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            setCurrentPage={setCurrentPage}
            addNotification={addNotification}
            filteredCount={filteredOrders.length}
          />

          {/* Selected items Bulk HUD operations panel */}
          <BulkActionsPanel
            selectedOrders={selectedOrders}
            triggerCourierModal={triggerCourierModal}
            handleSetStatus={handleSetStatus}
            handleDeleteOrders={handleDeleteOrders}
            setSelectedOrders={setSelectedOrders}
          />

          {/* Primary Orders Data Grid */}
          <OrdersTable
            paginatedOrders={paginatedOrders}
            selectedOrders={selectedOrders}
            handleSelectRow={handleSelectRow}
            handleSelectAll={handleSelectAll}
            filteredOrders={filteredOrders}
            showCustomerColumn={showCustomerColumn}
            sortBy={sortBy}
            handleSort={handleSort}
            setSelectedOrderDetail={setSelectedOrderDetail}
            triggerCourierModal={triggerCourierModal}
            handleSetStatus={handleSetStatus}
            handleDeleteOrders={handleDeleteOrders}
          />

          {/* Footer Pagination details */}
          <Pagination
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            filteredLength={filteredOrders.length}
            totalPages={totalPages}
          />
        </div>
      </main>

      {/* Side Slider overlay detailed docket drawer */}
      <OrderDetailDrawer
        order={selectedOrderDetail}
        onClose={() => setSelectedOrderDetail(null)}
      />

      {/* Interactive Logistics Carrier Courier Dispatch Modal */}
      <CourierModal
        isOpen={isCourierModalOpen}
        onClose={() => setIsCourierModalOpen(false)}
        targetsCount={courierTargets.length}
        selectedCarrier={selectedCarrier}
        setSelectedCarrier={setSelectedCarrier}
        onConfirm={handleConfirmCourierDispatch}
      />

      {/* Generate Mock Order modal overlay form */}
      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        newOrder={newOrder}
        setNewOrder={setNewOrder}
        onSubmit={handleCreateOrder}
      />
    </div>
  );
}
