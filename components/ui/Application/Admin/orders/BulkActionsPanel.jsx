"use client";

import React from "react";

import { Trash2, Truck, CheckCircle2, X, PackageCheck } from "lucide-react";

const BulkActionsPanel = ({
  selectedOrders,
  triggerCourierModal,
  handleSetStatus,
  handleDeleteOrders,
  setSelectedOrders,
}) => {
  if (!selectedOrders || selectedOrders.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-slate-200 dark:border-slate-700 bg-indigo-50/40 dark:bg-indigo-950/10">
      <div className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
            <PackageCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {selectedOrders.length} Orders Selected
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Perform bulk operations instantly
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Ship */}
          <button
            onClick={() => triggerCourierModal(selectedOrders)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all"
          >
            <Truck className="w-4 h-4" />

            <span>Send Courier</span>
          </button>

          {/* Delivered */}
          <button
            onClick={() => handleSetStatus(selectedOrders, "Delivered")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />

            <span>Mark Delivered</span>
          </button>

          {/* Delete */}
          <button
            onClick={() => handleDeleteOrders(selectedOrders)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all"
          >
            <Trash2 className="w-4 h-4" />

            <span>Delete</span>
          </button>

          {/* Clear */}
          <button
            onClick={() => setSelectedOrders([])}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <X className="w-4 h-4" />

            <span>Clear</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkActionsPanel;
