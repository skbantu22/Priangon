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

  const cards = [
    // =====================
    // TODAY
    // =====================
    {
      title: "Today's Sales",
      value: `৳ ${(summary.todaySales || 0).toLocaleString()}`,
      icon: Wallet,
      bg: "from-orange-500 to-red-500",
    },
    {
      title: "Today's POS Sales",
      value: `৳ ${(summary.todayPosSales || 0).toLocaleString()}`,
      icon: Wallet,
      bg: "from-orange-400 to-orange-600",
    },
    {
      title: "Today's Online Sales",
      value: `৳ ${(summary.todayOnlineSales || 0).toLocaleString()}`,
      icon: Wallet,
      bg: "from-red-400 to-pink-600",
    },

    // =====================
    // MONTHLY
    // =====================
    {
      title: "Monthly Sales",
      value: `৳ ${(summary.monthSales || 0).toLocaleString()}`,
      icon: DollarSign,
      bg: "from-green-500 to-emerald-600",
    },
    {
      title: "Monthly POS Sales",
      value: `৳ ${(summary.monthPosSales || 0).toLocaleString()}`,
      icon: DollarSign,
      bg: "from-green-400 to-green-700",
    },
    {
      title: "Monthly Online Sales",
      value: `৳ ${(summary.monthOnlineSales || 0).toLocaleString()}`,
      icon: DollarSign,
      bg: "from-emerald-400 to-teal-600",
    },

    // =====================
    // ALL TIME
    // =====================
    {
      title: "Total Sales",
      value: `৳ ${(summary.totalSales || 0).toLocaleString()}`,
      icon: DollarSign,
      bg: "from-blue-500 to-blue-700",
    },
    {
      title: "POS Sales",
      value: `৳ ${(summary.posSales || 0).toLocaleString()}`,
      icon: DollarSign,
      bg: "from-indigo-500 to-indigo-700",
    },
    {
      title: "Online Sales",
      value: `৳ ${(summary.onlineSales || 0).toLocaleString()}`,
      icon: DollarSign,
      bg: "from-purple-500 to-fuchsia-600",
    },

    // =====================
    // ORDERS
    // =====================
    {
      title: "Total Orders",
      value: summary.totalOrders || 0,
      icon: ShoppingCart,
      bg: "from-slate-700 to-slate-900",
    },
    {
      title: "Monthly Orders",
      value: summary.monthOrders || 0,
      icon: ShoppingCart,
      bg: "from-emerald-500 to-green-700",
    },
    {
      title: "POS Orders",
      value: summary.totalPosOrders || 0,
      icon: ShoppingCart,
      bg: "from-blue-500 to-indigo-700",
    },
    {
      title: "Online Orders",
      value: summary.totalOnlineOrders || 0,
      icon: ShoppingCart,
      bg: "from-violet-500 to-purple-700",
    },
    {
      title: "Today's POS Orders",
      value: summary.todayPosOrders || 0,
      icon: ShoppingCart,
      bg: "from-orange-500 to-red-500",
    },
    {
      title: "Today's Online Orders",
      value: summary.todayOnlineOrders || 0,
      icon: ShoppingCart,
      bg: "from-pink-500 to-rose-600",
    },
  ];
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${card.bg}
        p-6 text-white shadow-lg transition-all duration-300
        hover:-translate-y-2 hover:shadow-2xl`}
            >
              {/* Background Decoration */}
              <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-md group-hover:scale-125 transition duration-500" />

              <div className="absolute -bottom-12 -left-12 h-28 w-28 rounded-full bg-black/10 blur-md" />

              {/* Content */}
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white/80 uppercase tracking-wide">
                    {card.title}
                  </p>

                  <h2 className="mt-4 text-4xl font-extrabold tracking-tight">
                    {card.value}
                  </h2>
                </div>

                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 shadow-lg">
                  <Icon size={30} className="text-white" />
                </div>
              </div>

              {/* Bottom line */}
              <div className="relative z-10 mt-6 h-1 w-14 rounded-full bg-white/40 group-hover:w-24 transition-all duration-300" />
            </div>
          );
        })}
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
                  <th className="text-center py-4">POS Sales</th>
                  <th className="text-center py-4">Online Sales</th>
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
                      ৳ {Number(item.totalSales || 0).toLocaleString()}
                    </td>

                    <td className="text-center text-blue-600 font-semibold">
                      ৳ {Number(item.posSales || 0).toLocaleString()}
                    </td>

                    <td className="text-center text-purple-600 font-semibold">
                      ৳ {Number(item.onlineSales || 0).toLocaleString()}
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
