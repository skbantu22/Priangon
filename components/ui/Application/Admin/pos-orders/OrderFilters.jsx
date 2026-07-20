"use client";

import { Store, Search, Calendar, RotateCcw, Filter } from "lucide-react";

export default function OrderFilters({
  showrooms = [],
  filters,
  setFilters,
  applyFilter,
  resetFilter,
}) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-xl bg-orange-500 flex items-center justify-center">
          <Store className="w-7 h-7 text-white" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-800">Order Filters</h2>
          <p className="text-sm text-gray-500">Filter POS Orders</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />

          <input
            type="text"
            placeholder="Search Order / Customer / Phone"
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                search: e.target.value,
              }))
            }
            className="w-full h-12 pl-10 pr-3 border rounded-lg"
          />
        </div>

        {/* Showroom */}
        <select
          value={filters.showroomId}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              showroomId: e.target.value,
            }))
          }
          className="h-12 border rounded-lg px-3"
        >
          <option value="all">All Showrooms</option>

          {showrooms.map((room) => (
            <option key={room._id} value={room._id}>
              {room.name}
            </option>
          ))}
        </select>

        {/* Payment */}
        <select
          value={filters.paymentMethod}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              paymentMethod: e.target.value,
            }))
          }
          className="h-12 border rounded-lg px-3"
        >
          <option value="">All Payment</option>
          <option value="Cash">Cash</option>
          <option value="Card">Card</option>
          <option value="Bank">Bank</option>
          <option value="Mobile Banking">Mobile Banking</option>
        </select>

        {/* Status */}
        <select
          value={filters.status}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              status: e.target.value,
            }))
          }
          className="h-12 border rounded-lg px-3"
        >
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
          <option value="Refunded">Refunded</option>
        </select>

        {/* Order Type */}
        <select
          value={filters.orderType}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              orderType: e.target.value,
            }))
          }
          className="h-12 border rounded-lg px-3"
        >
          <option value="">All Types</option>
          <option value="POS">POS</option>
          <option value="Online">Online</option>
          <option value="Exchange">Exchange</option>
        </select>

        {/* Date From */}
        <div className="relative">
          <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />

          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                dateFrom: e.target.value,
              }))
            }
            className="w-full h-12 pl-10 border rounded-lg"
          />
        </div>

        {/* Date To */}
        <div className="relative">
          <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />

          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                dateTo: e.target.value,
              }))
            }
            className="w-full h-12 pl-10 border rounded-lg"
          />
        </div>

        {/* Rows */}
        <select
          value={filters.limit}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              limit: Number(e.target.value),
            }))
          }
          className="h-12 border rounded-lg px-3"
        >
          <option value={10}>10 Rows</option>
          <option value={25}>25 Rows</option>
          <option value={50}>50 Rows</option>
          <option value={100}>100 Rows</option>
        </select>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={resetFilter}
          className="flex items-center gap-2 h-11 px-5 border rounded-lg hover:bg-gray-100"
        >
          <RotateCcw size={18} />
          Reset
        </button>

        <button
          onClick={applyFilter}
          className="flex items-center gap-2 h-11 px-6 rounded-lg bg-orange-500 text-white hover:bg-orange-600"
        >
          <Filter size={18} />
          Apply Filter
        </button>
      </div>
    </div>
  );
}
