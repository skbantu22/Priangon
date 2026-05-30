"use client";

import React from "react";

const StatusTabs = ({
  statusFilter,
  setStatusFilter,
  setCurrentPage,
  addNotification,
  statusCounts,
}) => {
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
      {/* Label */}
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 pl-3 pr-2 hidden md:inline-block">
        Filter Status:
      </span>

      {/* Tabs */}
      {tabs.map((tab) => {
        const isActive = statusFilter === tab;
        const count = statusCounts?.[tab] || 0;

        return (
          <button
            key={tab}
            onClick={() => {
              setStatusFilter(tab);
              setCurrentPage(1);

              if (addNotification) {
                addNotification(`Viewing ${tab} orders.`, "info");
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              isActive
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                : "bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50"
            }`}
          >
            {/* Name */}
            <span>{tab}</span>

            {/* Count */}
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
};

export default StatusTabs;
