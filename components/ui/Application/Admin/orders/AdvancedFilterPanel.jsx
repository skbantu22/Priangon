"use client";

import React from "react";
import { Filter, DollarSign, CreditCard, PackageCheck } from "lucide-react";

const AdvancedFilterPanel = ({
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
}) => {
  if (!isOpen) return null;

  const clearFilters = () => {
    setStatusFilter("All");
    setPaymentFilter("All");
    setMinPrice("");
    setMaxPrice("");
    setCurrentPage(1);

    if (addNotification) {
      addNotification("Filters cleared successfully.", "info");
    }
  };

  return (
    <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/20">
      <div className="p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />

            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Advanced Filters
            </h2>
          </div>

          <button
            onClick={clearFilters}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors"
          >
            Clear All
          </button>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4" />
              Order Status
            </label>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Payment Filter */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4" />
              Payment Method
            </label>

            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Payments</option>
              <option value="COD">Cash On Delivery</option>
              <option value="Card">Card Payment</option>
              <option value="Bkash">Bkash</option>
              <option value="Nagad">Nagad</option>
            </select>
          </div>

          {/* Price Range */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" />
              Price Range
            </label>

            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => {
                  setMinPrice(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => {
                  setMaxPrice(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing{" "}
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {filteredCount}
            </span>{" "}
            filtered orders
          </p>

          <button
            onClick={() => {
              if (addNotification) {
                addNotification("Filters applied successfully.", "success");
              }
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedFilterPanel;
