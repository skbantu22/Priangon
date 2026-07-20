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

  const formatBDT = (value = 0) =>
    new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(value);

  const stats = [
    {
      title: "Today's Orders",
      value: data?.todayOrders || 0,
      icon: ShoppingCart,
      bg: "bg-blue-50",
      iconBg: "bg-blue-500",
    },
    {
      title: "Total Orders",
      value: data?.totalOrders || 0,
      icon: Package,
      bg: "bg-orange-50",
      iconBg: "bg-orange-500",
    },
    {
      title: "Today's Sales",
      value: formatBDT(data?.todaySales),
      icon: Wallet,
      bg: "bg-green-50",
      iconBg: "bg-green-500",
    },
    {
      title: "Monthly Sales",
      value: formatBDT(data?.monthlySales),
      icon: TrendingUp,
      bg: "bg-purple-50",
      iconBg: "bg-purple-500",
    },
    {
      title: "Total Sales",
      value: formatBDT(data?.totalSales),
      icon: BarChart3,
      bg: "bg-emerald-50",
      iconBg: "bg-emerald-500",
    },
  ];

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard Overview</h1>

        <p className="text-sm text-gray-500 mt-1">Sales & Order Analytics</p>
      </div>

      {/* Cards */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        {loading
          ? [...Array(5)].map((_, i) => (
              <Card key={i} className="rounded-2xl">
                <CardContent className="p-6 animate-pulse">
                  <div className="flex justify-between items-center">
                    <div className="space-y-3">
                      <div className="h-3 w-24 rounded bg-gray-200" />
                      <div className="h-7 w-20 rounded bg-gray-300" />
                    </div>

                    <div className="h-12 w-12 rounded-xl bg-gray-200" />
                  </div>
                </CardContent>
              </Card>
            ))
          : stats.map((item, index) => {
              const Icon = item.icon;

              return (
                <Card
                  key={index}
                  className={`${item.bg} border-0 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">{item.title}</p>

                        <h2 className="text-2xl font-bold text-gray-900 mt-2">
                          {item.value}
                        </h2>
                      </div>

                      <div
                        className={`w-12 h-12 rounded-xl ${item.iconBg} flex items-center justify-center shadow-md`}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>
    </div>
  );
}
