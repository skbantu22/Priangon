"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { FiAlertTriangle, FiBarChart2, FiList } from "react-icons/fi";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { showToast } from "@/lib/showToast";
import {
  ADMIN_DASHBOARD,
  ADMIN_REPORT_PROFIT_LOSS,
} from "@/Route/Adminpannelroute";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_REPORT_PROFIT_LOSS, label: "Profit & Loss" },
];

const taka = (value) =>
  `৳ ${Math.round(Number(value) || 0).toLocaleString()}`;

const compact = (value) => {
  const n = Number(value) || 0;

  if (Math.abs(n) >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(0)}k`;

  return String(Math.round(n));
};

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

const today = () => new Date().toISOString().slice(0, 10);

// A single series, so the legend is the chart title and no second hue
// is needed. --chart-2 clears 3:1 contrast on both the light and the
// dark surface, which a dark-mode flip of --chart-1 does not.
const chartConfig = {
  netProfit: {
    label: "Net profit",
    color: "var(--chart-2)",
  },
};

const StatTile = ({ label, value, hint, tone }) => (
  <Card className="rounded shadow-sm">
    <CardContent className="p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold tabular-nums ${
          tone === "bad" ? "text-destructive" : ""
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </CardContent>
  </Card>
);

const ProfitLossPage = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => daysAgo(29));
  const [to, setTo] = useState(today);
  const [view, setView] = useState("chart");

  const loadReport = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await axios.get(
        `/api/reports/profit-loss?from=${from}&to=${to}`,
      );

      if (!data.success) {
        showToast("error", data.message || "Could not load the report");
        return;
      }

      setReport(data);
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not load the report",
      );
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    const timer = setTimeout(loadReport, 250);

    return () => clearTimeout(timer);
  }, [loadReport]);

  const summary = report?.summary;
  const daily = report?.daily || [];
  const expensesByCategory = report?.expensesByCategory || [];
  const unitsWithoutCost = report?.warnings?.unitsWithoutCost || 0;

  const maxExpense = expensesByCategory.reduce(
    (max, row) => Math.max(max, row.amount),
    0,
  );

  return (
    <div className="space-y-4">
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h4 className="text-xl font-semibold">Profit &amp; Loss</h4>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFrom(daysAgo(6));
                setTo(today());
              }}
            >
              7 days
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFrom(daysAgo(29));
                setTo(today());
              }}
            >
              30 days
            </Button>

            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-auto"
            />

            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-auto"
            />
          </div>
        </CardHeader>
      </Card>

      {loading || !summary ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatTile
              label="Revenue"
              value={taka(summary.revenue)}
              hint={`${summary.orders} sale${summary.orders === 1 ? "" : "s"}`}
            />

            <StatTile
              label="Cost of goods"
              value={taka(summary.cogs)}
              hint={`${summary.unitsSold} unit sold`}
            />

            <StatTile
              label="Gross profit"
              value={taka(summary.grossProfit)}
              hint={`${summary.grossMargin.toFixed(1)}% margin`}
              tone={summary.grossProfit < 0 ? "bad" : ""}
            />

            <StatTile
              label="Expenses"
              value={taka(summary.totalExpense)}
              hint={`${expensesByCategory.length} categor${
                expensesByCategory.length === 1 ? "y" : "ies"
              }`}
            />

            <StatTile
              label="Net profit"
              value={taka(summary.netProfit)}
              hint={`${summary.netMargin.toFixed(1)}% margin`}
              tone={summary.netProfit < 0 ? "bad" : ""}
            />
          </div>

          {unitsWithoutCost > 0 && (
            <div className="flex items-start gap-3 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <FiAlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <p>
                <span className="font-semibold">
                  {unitsWithoutCost} unit sold without a recorded purchase
                  price.
                </span>{" "}
                Profit above is higher than the real number for those units.
                Record purchases so every sale carries its cost.
              </p>
            </div>
          )}

          <Card className="py-0 rounded shadow-sm">
            <CardHeader className="pt-3 px-3 border-b flex flex-row items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold">Net profit per day</h4>
                <p className="text-sm text-muted-foreground">
                  Revenue minus cost of goods minus expenses
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={view === "chart" ? "default" : "outline"}
                  onClick={() => setView("chart")}
                >
                  <FiBarChart2 />
                </Button>

                <Button
                  size="sm"
                  variant={view === "table" ? "default" : "outline"}
                  onClick={() => setView("table")}
                >
                  <FiList />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="px-3 py-4">
              {daily.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No sale or expense in this range.
                </p>
              ) : view === "chart" ? (
                <ChartContainer config={chartConfig} className="h-72 w-full">
                  <LineChart
                    data={daily}
                    margin={{ left: 8, right: 16, top: 8, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} />

                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      minTickGap={24}
                      tickFormatter={(value) => value.slice(5)}
                    />

                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      tickFormatter={compact}
                    />

                    <ReferenceLine y={0} stroke="var(--border)" />

                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => taka(value)}
                        />
                      }
                    />

                    <Line
                      dataKey="netProfit"
                      type="monotone"
                      stroke="var(--color-netProfit)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="max-h-72 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Expense</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {daily.map((row) => (
                        <TableRow key={row.date}>
                          <TableCell>{row.date}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {taka(row.revenue)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {taka(row.cogs)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {taka(row.expense)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium tabular-nums ${
                              row.netProfit < 0 ? "text-destructive" : ""
                            }`}
                          >
                            {taka(row.netProfit)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="py-0 rounded shadow-sm">
            <CardHeader className="pt-3 px-3 border-b">
              <h4 className="text-lg font-semibold">Expenses by category</h4>
            </CardHeader>

            <CardContent className="px-3 py-4">
              {expensesByCategory.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No expense recorded in this range.
                </p>
              ) : (
                <ul className="space-y-3">
                  {expensesByCategory.map((row) => (
                    <li key={row.category}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-medium">{row.category}</span>
                        <span className="tabular-nums">
                          {taka(row.amount)}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {summary.totalExpense > 0
                              ? `${((row.amount / summary.totalExpense) * 100).toFixed(0)}%`
                              : ""}
                          </span>
                        </span>
                      </div>

                      <div className="mt-1 h-2 w-full rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${maxExpense > 0 ? (row.amount / maxExpense) * 100 : 0}%`,
                            backgroundColor: "var(--chart-2)",
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ProfitLossPage;
