"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShoppingCart,
  Wallet,
  TrendingUp,
  BarChart3,
  Package,
} from "lucide-react";

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/dashboard/admin/stats");
        const json = await res.json();

        if (json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-gray-500 font-medium">Loading dashboard...</div>
    );
  }

  // 💰 Format helper (BDT style)
  const formatBDT = (value) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const stats = [
    {
      title: "Today's Orders",
      value: data.todayOrders,
      icon: ShoppingCart,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Total Orders",
      value: data.totalOrders,
      icon: Package,
      color: "text-gray-700",
      bg: "bg-gray-50",
    },
    {
      title: "Today's Sales",
      value: formatBDT(data.todaySales),
      icon: Wallet,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Monthly Sales",
      value: formatBDT(data.monthlySales),
      icon: TrendingUp,
      color: "text-green-700",
      bg: "bg-green-50",
    },
    {
      title: "Total Sales",
      value: formatBDT(data.totalSales),
      icon: BarChart3,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
  ];

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>

        <p className="text-gray-500 mt-1">Sales and order analytics summary</p>
      </div>

      {/* STATS GRID */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((item, i) => {
          const Icon = item.icon;

          return (
            <Card
              key={i}
              className="border border-gray-200 shadow-sm hover:shadow-md transition rounded-2xl"
            >
              <CardContent className="p-6 flex items-center justify-between">
                {/* TEXT */}
                <div>
                  <p className="text-sm text-gray-500">{item.title}</p>

                  <h2 className="text-xl font-bold text-gray-900 mt-2">
                    {item.value}
                  </h2>
                </div>

                {/* ICON */}
                <div
                  className={`h-12 w-12 flex items-center justify-center rounded-xl border ${item.bg}`}
                >
                  <Icon className={`h-6 w-6 ${item.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
