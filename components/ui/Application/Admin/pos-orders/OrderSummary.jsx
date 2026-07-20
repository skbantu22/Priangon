"use client";

import {
  ShoppingCart,
  DollarSign,
  Wallet,
  Store,
  TrendingUp,
} from "lucide-react";

export default function OrderSummary({ summary = {} }) {
  const showroomSales = summary.showroomSales || [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Orders */}
        <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Orders</p>

              <h2 className="text-4xl font-bold mt-2">
                {summary.totalOrders || 0}
              </h2>
            </div>

            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
              <ShoppingCart size={28} />
            </div>
          </div>
        </div>

        {/* Total Sales */}
        <div className="rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Total Sales</p>

              <h2 className="text-4xl font-bold mt-2">
                ৳ {(summary.totalSales || 0).toLocaleString()}
              </h2>
            </div>

            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
              <DollarSign size={28} />
            </div>
          </div>
        </div>

        {/* Today's Sales */}
        <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Today's Sales</p>

              <h2 className="text-4xl font-bold mt-2">
                ৳ {(summary.todaySales || 0).toLocaleString()}
              </h2>
            </div>

            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
              <Wallet size={28} />
            </div>
          </div>
        </div>
      </div>

      {/* Showroom Performance */}
      <div className="bg-white rounded-2xl shadow border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-orange-500 flex items-center justify-center">
              <Store className="text-white" size={22} />
            </div>

            <div>
              <h3 className="font-bold text-lg">Showroom Performance</h3>

              <p className="text-sm text-gray-500">Sales report by showroom</p>
            </div>
          </div>
        </div>

        {showroomSales.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            No showroom sales found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-gray-600">
                  <th className="text-left px-6 py-4">Showroom</th>
                  <th className="text-center py-4">Orders</th>
                  <th className="text-center py-4">Sales</th>
                  <th className="text-center py-4">Performance</th>
                </tr>
              </thead>

              <tbody>
                {showroomSales.map((item) => (
                  <tr
                    key={item.showroomId}
                    className="border-t hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-4 font-medium">
                      {item.showroomName}
                    </td>

                    <td className="text-center font-semibold">
                      {item.totalOrders}
                    </td>

                    <td className="text-center font-bold text-green-600">
                      ৳ {Number(item.totalSales).toLocaleString()}
                    </td>

                    <td className="text-center">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                        <TrendingUp size={15} />
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
