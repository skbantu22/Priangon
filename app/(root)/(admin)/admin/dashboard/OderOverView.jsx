"use client";

import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useEffect, useState } from "react";
import useFetch from "@/hooks/useFetch";

export const description = "A bar chart";


const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const chartConfig = {
  amount: {
    label: "Amount",
    color: "var(--chart-1)",
  },
};

export function OderOverView() {

const [chartData, setChartData] = useState([])
const { data: monthlySales, loading } = useFetch('/api/dashboard/admin/monthly-sales')
  useEffect(() => {
  if (monthlySales && monthlySales.success) {
    const getChartData = months.map((month, index) => {
      const monthData = monthlySales.data.find(item => item._id.month === index + 1)

      return {
        month: month,
        amount: monthData ? monthData.totalSales : 0
      }
    })

    setChartData(getChartData)
  }

}, [monthlySales])
  return (
    <Card>
      <CardHeader>
        <CardTitle>Order OverView</CardTitle>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart data={chartData}>
            <CartesianGrid vertical={false} />

            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />

            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />

            <Bar
              dataKey="amount"
              fill="var(--color-desktop)"
              radius={8}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>

      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Trending up by 5.2% this month
          <TrendingUp className="h-4 w-4" />
        </div>

        <div className="text-muted-foreground leading-none">
          Showing total Orderss for the last 12 months
        </div>
      </CardFooter>
    </Card>
  );
}