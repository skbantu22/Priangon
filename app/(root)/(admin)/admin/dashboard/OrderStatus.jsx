"use client";

import React, { useEffect, useState } from "react";
import { Label, Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import useFetch from "@/hooks/useFetch";

export const description = "A donut chart";

const chartConfig = {
  status: { label: "Status" },
  pending: { label: "Pending", color: "#3b82f6" },
  processing: { label: "Processing", color: "#eab308" },
  shipped: { label: "Shipped", color: "#06b6d4" },
  delivered: { label: "Delivered", color: "#22c55e" },
  cancelled: { label: "Cancelled", color: "#ef4444" },
  unverified: { label: "Unverified", color: "#f97316" },
};

export function OrderStatus() {
  const [chartData, setChartData] = useState([]);
  const { data: orderStatus, loading } = useFetch('/api/dashboard/admin/order-status');

  useEffect(() => {
    if (orderStatus?.success) {
      const newData = orderStatus.data.map(o => ({
        status: o._id,
        count: o.count,
        fill: `var(--color-${o._id})`,
      }));
      setChartData(newData);
    }
  }, [orderStatus]);

  const totalOrders = chartData.reduce((sum, item) => sum + (item.count || 0), 0);

  if (loading) return <div>Loading chart...</div>;

  const colors = {
    pending: "bg-blue-500",
    processing: "bg-yellow-500",
    shipped: "bg-cyan-500",
    delivered: "bg-green-500",
    cancelled: "bg-red-500",
    unverified: "bg-orange-500",
  };

  return (
    <div>
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Orders Status</CardTitle>
        </CardHeader>

        <CardContent className="flex-1 pb-0">
          <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="status"
                innerRadius={60}
                strokeWidth={8}
              >
                <Label
                  content={({ viewBox }) => {
                    if (!viewBox?.cx || !viewBox?.cy) return null;
                    const { cx, cy } = viewBox;
                    return (
                      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={cx} y={cy} className="fill-foreground text-3xl font-bold">
                          {totalOrders}
                        </tspan>
                        <tspan x={cx} y={cy + 24} className="fill-muted-foreground text-sm">
                          Orders
                        </tspan>
                      </text>
                    );
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="p-4 rounded-lg w-full max-w-sm">
        <ul className="space-y-3 text-sm">
          {chartData.map(item => (
            <li key={item.status} className="flex justify-between items-center">
              <span>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span>
              <span className={`${colors[item.status]} text-white rounded-full w-6 h-6 flex items-center justify-center text-xs`}>
                {item.count}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}