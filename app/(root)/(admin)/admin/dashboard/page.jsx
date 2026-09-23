"use client";

import { useEffect, useState } from "react";
import { MotionConfig, animate, motion, useMotionValue, useTransform } from "framer-motion";
import Image from "next/image";
import { skipOptimize } from "@/lib/imageSrc";
import Link from "next/link";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Store,
  TrendingUp,
  Wallet,
  UserRoundX,
  Smartphone,
  CalendarRange,
  Boxes,
  ShieldCheck,
  AlertTriangle,
  Banknote,
  CreditCard,
  Loader2,
} from "lucide-react";

const SERIES = [1, 2, 3, 4, 5].map((n) => `var(--series-${n})`);

const money = (n) =>
  `৳${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const compact = (n) =>
  n >= 1e7
    ? `${(n / 1e7).toFixed(1)}Cr`
    : n >= 1e5
      ? `${(n / 1e5).toFixed(1)}L`
      : n >= 1e3
        ? `${Math.round(n / 1e3)}k`
        : String(n);
const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const isoDay = (d) => {
  const local = new Date(d.getTime() + 6 * 3600 * 1000);
  return local.toISOString().slice(0, 10);
};

// ---------------------------------------------------------------------------
// building blocks
// ---------------------------------------------------------------------------
const TONES = {
  orange: "bg-orange-50 dark:bg-orange-500/10 [&_.kpi-icon]:bg-orange-500",
  indigo: "bg-indigo-50 dark:bg-indigo-500/10 [&_.kpi-icon]:bg-indigo-600",
  violet: "bg-violet-50 dark:bg-violet-500/10 [&_.kpi-icon]:bg-violet-600",
  emerald: "bg-emerald-50 dark:bg-emerald-500/10 [&_.kpi-icon]:bg-emerald-600",
  cyan: "bg-cyan-50 dark:bg-cyan-500/10 [&_.kpi-icon]:bg-cyan-600",
  rose: "bg-rose-50 dark:bg-rose-500/10 [&_.kpi-icon]:bg-rose-500",
  red: "bg-red-50 dark:bg-red-500/10 [&_.kpi-icon]:bg-red-600",
  amber: "bg-amber-50 dark:bg-amber-500/10 [&_.kpi-icon]:bg-amber-500",
};

// tiles fade up one after another; panels slide in as they scroll into view
const EASE = [0.16, 1, 0.3, 1];
const tileList = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } } };
const tileItem = {
  hidden: { opacity: 0, y: -22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

// counts from the last shown value (0 on first load) up to the new one
function CountUp({ value, format = (n) => Math.round(n).toLocaleString("en-US") }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => format(v));
  useEffect(() => {
    const controls = animate(mv, Number(value) || 0, { duration: 1.6, ease: EASE });
    return () => controls.stop();
  }, [value, mv]);
  return <motion.span>{text}</motion.span>;
}

function Kpi({ icon: Icon, tone, value, label, sub, href, children }) {
  const body = (
    <motion.div
      variants={tileItem}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className={`flex h-full items-center gap-4 rounded-2xl border border-black/5 p-5 shadow-sm transition-shadow dark:border-white/10 ${TONES[tone]} ${href ? "hover:shadow-lg" : ""}`}
    >
      <span className="kpi-icon flex size-14 shrink-0 items-center justify-center rounded-xl text-white shadow-sm">
        <Icon className="size-7" />
      </span>
      <div className="min-w-0 flex-1">
        {children || (
          <p className="truncate text-2xl font-bold text-gray-900 tabular-nums dark:text-white">
            {value}
          </p>
        )}
        <p className="text-[15px] text-gray-600 dark:text-gray-100">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-200">{sub}</p>}
      </div>
    </motion.div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function Panel({ title, action, children, className = "" }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: -20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.7, ease: EASE }}
      className={`flex flex-col rounded-2xl border border-gray-200/70 bg-card p-5 shadow-sm dark:border-white/10 ${className}`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        {action}
      </div>
      {children}
    </motion.section>
  );
}

function Empty({ children = "No data for this period" }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{children}</p>;
}

function ListHead({ cols }) {
  return (
    <div className="flex items-center gap-3 rounded-full bg-primary/10 px-3 py-2 text-[13px] font-semibold text-gray-800 dark:text-gray-100">
      {cols}
    </div>
  );
}

function ChartTooltip({ active, payload, label, render }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-white/10 dark:bg-card">
      {render(payload[0].payload, label)}
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function Dashboard() {
  const today = new Date();
  const [chart, setChart] = useState("daily");
  const [period, setPeriod] = useState(isoDay(today).slice(0, 7)); // YYYY-MM
  const [from, setFrom] = useState(isoDay(new Date(today.getTime() - 29 * 864e5)));
  const [to, setTo] = useState(isoDay(today));
  const [limit, setLimit] = useState(10);

  const params = new URLSearchParams({
    chart,
    period,
    from,
    to,
    limit: String(limit),
  });

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ["dashboard-mobile", params.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/mobile?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed");
      return json;
    },
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Loading dashboard...
      </div>
    );
  }
  if (isError || !data) {
    return <Empty>Could not load the dashboard. Please refresh.</Empty>;
  }

  const k = data.kpis;
  const year = Number(period.slice(0, 4));
  const catTotal = data.topCategories.reduce((s, c) => s + c.revenue, 0);
  const payTotal = data.payments.reduce((s, p) => s + p.amount, 0);

  const pill = (active) =>
    `h-9 rounded-lg px-4 text-sm font-semibold transition ${
      active
        ? "bg-primary text-white shadow-md shadow-primary/30"
        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-100"
    }`;
  const input =
    "h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-primary dark:border-white/10 dark:bg-card";

  return (
    <MotionConfig reducedMotion="user">
    <div className="dash-viz space-y-5">
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Sales, stock, dues and warranty at a glance
            {isFetching && <Loader2 className="ml-2 inline size-3.5 animate-spin" />}
          </p>
        </div>
      </motion.div>

      {/* ================= KPI TILES ================= */}
      <motion.div
        variants={tileList}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Kpi
          icon={Store}
          tone="orange"
          value={<CountUp value={k.pendingDealerOrders ?? 0} />}
          label="New Dealer Orders"
          sub="Waiting to be invoiced"
          href="/admin/partner-orders"
        />
        <Kpi
          icon={TrendingUp}
          tone="emerald"
          value={<CountUp value={k.todaySales} format={money} />}
          label="Today's Sales"
          sub={`${k.todayOrders} invoices · ${k.todayUnits} items`}
          href="/admin/all-orders/pos-orders"
        />
        <Kpi
          icon={Wallet}
          tone="amber"
          value={<CountUp value={k.todayReceived} format={money} />}
          label="Today's Money Received"
          sub={k.todayDueAdded > 0 ? `${money(k.todayDueAdded)} added to due today` : "No new due today"}
        />
        <Kpi
          icon={UserRoundX}
          tone="indigo"
          value={<CountUp value={k.customersDue} format={money} />}
          label="Customers Due"
          sub={`${k.dueCustomers} customers owe money`}
        />
        <Kpi
          icon={Smartphone}
          tone="violet"
          value={<CountUp value={k.todayPhones} />}
          label="Phones / Serial Items Sold Today"
          sub="Counted by IMEI / serial"
        />
        <Kpi
          icon={CalendarRange}
          tone="cyan"
          value={<CountUp value={k.monthSales} format={money} />}
          label="This Month's Sales"
          sub={`${k.monthOrders} invoices`}
        />
        <Kpi
          icon={Boxes}
          tone="rose"
          value={<CountUp value={k.stockValue} format={money} />}
          label="Stock Value (selling price)"
          sub={`${k.stockUnits.toLocaleString()} units · ${k.lowStockCount} low`}
          href="/admin/Stock-Overview"
        />
        <Kpi
          icon={ShieldCheck}
          tone="red"
          value={<CountUp value={k.openClaims} />}
          label="Open Warranty Claims"
          sub={`${k.readyClaims} ready to deliver · ${k.expiringSoon} expiring in 30 days`}
          href="/admin/warranty"
        />
      </motion.div>

      {/* ================= SALES OVERVIEW + CATEGORIES ================= */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Sales Overview"
          action={
            <div className="flex flex-wrap items-center gap-2">
              {["daily", "monthly", "yearly"].map((c) => (
                <button key={c} type="button" onClick={() => setChart(c)} className={pill(chart === c)}>
                  {c[0].toUpperCase() + c.slice(1)}
                </button>
              ))}
              {chart === "daily" && (
                <input type="month" value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} className={input} />
              )}
              {chart !== "daily" && (
                <select
                  value={year}
                  onChange={(e) => setPeriod(`${e.target.value}-${period.slice(5, 7)}`)}
                  className={input}
                >
                  {Array.from({ length: 6 }, (_, i) => today.getFullYear() - i).map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              )}
            </div>
          }
        >
          <p className="-mt-2 mb-3 text-sm text-gray-600 dark:text-gray-100">
            Total Sale:{" "}
            <span className="font-bold text-gray-900 tabular-nums dark:text-white">{money(data.chartTotal)}</span>
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.salesChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--viz-sales)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--viz-sales)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--viz-grid)" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--viz-axis)", fontSize: 12 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={compact} tick={{ fill: "var(--viz-axis)", fontSize: 12 }} axisLine={false} tickLine={false} width={48} />
                <Tooltip
                  cursor={{ stroke: "var(--viz-axis)", strokeDasharray: "3 3" }}
                  content={
                    <ChartTooltip
                      render={(p) => (
                        <>
                          <p className="font-semibold">
                            {chart === "daily" ? fmtDate(p.key) : p.label}
                          </p>
                          <p className="tabular-nums">Sales: {money(p.sales)}</p>
                          <p className="text-muted-foreground">{p.orders} invoices</p>
                        </>
                      )}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="var(--viz-sales)"
                  strokeWidth={2}
                  fill="url(#salesFill)"
                  dot={{ r: 3, strokeWidth: 2, fill: "var(--viz-surface)" }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--viz-surface)" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Top Categories" action={<span className="text-xs text-muted-foreground">{fmtDate(from)} – {fmtDate(to)}</span>}>
          {data.topCategories.length === 0 ? (
            <Empty />
          ) : (
            <>
              <div className="relative h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.topCategories}
                      dataKey="revenue"
                      nameKey="name"
                      innerRadius="62%"
                      outerRadius="92%"
                      stroke="var(--viz-surface)"
                      strokeWidth={2}
                      paddingAngle={1}
                    >
                      {data.topCategories.map((c, i) => (
                        <Cell key={c.name} fill={SERIES[i]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={
                        <ChartTooltip
                          render={(p) => (
                            <>
                              <p className="font-semibold">{p.name}</p>
                              <p className="tabular-nums">
                                {money(p.revenue)} · {Math.round((p.revenue / catTotal) * 100)}%
                              </p>
                            </>
                          )}
                        />
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="text-lg font-bold tabular-nums">{compact(catTotal)}</span>
                </div>
              </div>
              {/* legend with values: identity never by color alone */}
              <ul className="mt-3 space-y-1.5 text-sm">
                {data.topCategories.map((c, i) => (
                  <li key={c.name} className="flex items-center gap-2">
                    <span className="size-3 shrink-0 rounded-sm" style={{ background: SERIES[i] }} />
                    <span className="min-w-0 flex-1 truncate text-gray-700 dark:text-gray-200">{c.name}</span>
                    <span className="tabular-nums text-gray-900 dark:text-white">{money(c.revenue)}</span>
                    <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                      {Math.round((c.revenue / catTotal) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      </div>

      {/* ================= RANGE FILTER (for the ranking widgets) ================= */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200/70 bg-card px-4 py-3 dark:border-white/10">
        <span className="text-sm font-semibold">Period for rankings:</span>
        <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className={input} />
        <span className="text-sm text-muted-foreground">to</span>
        <input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} className={input} />
        <span className="ml-2 text-sm font-semibold">Show top</span>
        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className={input}>
          {[5, 10, 20].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </div>

      {/* ================= LOW STOCK + TOP BRANDS ================= */}
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title={
            <span className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" /> Low Stock Alert
            </span>
          }
          action={<span className="text-xs text-muted-foreground">5 pcs or less</span>}
        >
          <ListHead
            cols={
              <>
                <span className="w-6 text-center">Sl</span>
                <span className="flex-1">Product</span>
                <span>Stock Qty</span>
              </>
            }
          />
          {data.lowStock.length === 0 ? (
            <Empty>All items are well stocked 👍</Empty>
          ) : (
            <ul className="mt-1 max-h-80 divide-y divide-gray-100 overflow-y-auto dark:divide-white/10">
              {data.lowStock.map((s, i) => (
                <li key={s._id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="w-6 text-center text-sm text-muted-foreground">{i + 1}.</span>
                  <div className="relative size-11 shrink-0 overflow-hidden rounded-full bg-gray-50">
                    <Image src={s.image || "/placeholder.png"} alt="" fill sizes="44px" className="object-contain" unoptimized={skipOptimize(s.image)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.variant}</p>
                  </div>
                  <span
                    className={`min-w-12 rounded-md px-3 py-1 text-center text-sm font-bold tabular-nums ${
                      s.stock <= 0 ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400"
                    }`}
                  >
                    {s.stock}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Top Brands" action={<span className="text-xs text-muted-foreground">by sales amount</span>}>
          {data.topBrands.length === 0 ? (
            <Empty />
          ) : (
            <div style={{ height: Math.max(180, data.topBrands.length * 42) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topBrands} layout="vertical" margin={{ top: 0, right: 64, left: 8, bottom: 0 }} barCategoryGap={8}>
                  <CartesianGrid stroke="var(--viz-grid)" strokeDasharray="4 4" horizontal={false} />
                  <XAxis type="number" tickFormatter={compact} tick={{ fill: "var(--viz-axis)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fill: "var(--viz-axis)", fontSize: 13 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "var(--viz-grid)" }}
                    content={
                      <ChartTooltip
                        render={(p) => (
                          <>
                            <p className="font-semibold">{p.name}</p>
                            <p className="tabular-nums">{money(p.revenue)}</p>
                            <p className="text-muted-foreground">{p.qty} items sold</p>
                          </>
                        )}
                      />
                    }
                  />
                  <Bar dataKey="revenue" fill="var(--viz-sales)" radius={[0, 4, 4, 0]} maxBarSize={24}>
                    <LabelList dataKey="revenue" position="right" formatter={compact} style={{ fill: "var(--viz-axis)", fontSize: 12 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      {/* ================= TOP PRODUCTS + TOP CUSTOMERS ================= */}
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Top Products">
          <ListHead
            cols={
              <>
                <span className="w-6 text-center">Sl</span>
                <span className="flex-1">Product</span>
                <span className="w-14 text-right">Qty</span>
                <span className="w-28 text-right">Sales</span>
              </>
            }
          />
          {data.topProducts.length === 0 ? (
            <Empty />
          ) : (
            <ul className="mt-1 divide-y divide-gray-100 dark:divide-white/10">
              {data.topProducts.map((p, i) => (
                <li key={p._id} className="flex items-center gap-3 px-3 py-2">
                  <span className="w-6 text-center text-sm text-muted-foreground">{i + 1}</span>
                  <div className="relative size-9 shrink-0 overflow-hidden rounded-md bg-gray-50">
                    <Image src={p.image || "/placeholder.png"} alt="" fill sizes="36px" className="object-contain" unoptimized={skipOptimize(p.image)} />
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                  <span className="w-14 text-right text-sm tabular-nums">{p.qty}</span>
                  <span className="w-28 text-right text-sm font-semibold tabular-nums">{money(p.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Top Customers">
          <ListHead
            cols={
              <>
                <span className="w-6 text-center">Sl</span>
                <span className="flex-1">Customer</span>
                <span className="w-16 text-right">Invoices</span>
                <span className="w-28 text-right">Purchased</span>
              </>
            }
          />
          {data.topCustomers.length === 0 ? (
            <Empty />
          ) : (
            <ul className="mt-1 divide-y divide-gray-100 dark:divide-white/10">
              {data.topCustomers.map((c, i) => (
                <li key={c._id} className="flex items-center gap-3 px-3 py-2">
                  <span className="w-6 text-center text-sm text-muted-foreground">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c._id}
                      {c.due > 0 && <span className="text-red-600"> · due {money(c.due)}</span>}
                    </p>
                  </div>
                  <span className="w-16 text-right text-sm tabular-nums">{c.orders}</span>
                  <span className="w-28 text-right text-sm font-semibold tabular-nums">{money(c.spent)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ================= MONEY + DUES + WARRANTY ================= */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="Income by Account (Today)">
          {data.payments.length === 0 ? (
            <Empty>No payment received today</Empty>
          ) : (
            <ul className="space-y-2">
              {data.payments.map((p, i) => {
                const Icon = p.type === "Card" ? CreditCard : p.type === "Mobile Banking" ? Smartphone : Banknote;
                return (
                  <li key={`${p.type}-${p.option}`} className="rounded-xl bg-gray-50 p-3 dark:bg-white/5">
                    <div className="flex items-center gap-3">
                      <span className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                        {i + 1}
                      </span>
                      <Icon className="size-4 text-muted-foreground" />
                      <span className="flex-1 text-sm">
                        {p.option || p.type}
                        {p.option && <span className="text-muted-foreground"> ({p.type})</span>}
                      </span>
                      <span className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{money(p.amount)}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(p.amount / payTotal) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
              <li className="flex justify-between border-t border-gray-100 pt-2 text-sm font-semibold dark:border-white/10">
                <span>Total received</span>
                <span className="tabular-nums">{money(payTotal)}</span>
              </li>
            </ul>
          )}
        </Panel>

        <Panel title="Customer Due Amount" action={<span className="text-sm font-bold tabular-nums text-red-600">{money(k.customersDue)}</span>}>
          <ListHead
            cols={
              <>
                <span className="w-6 text-center">Sl</span>
                <span className="flex-1">Customer Name</span>
                <span>Due Amount</span>
              </>
            }
          />
          {data.customerDues.length === 0 ? (
            <Empty>No customer has due 🎉</Empty>
          ) : (
            <ul className="mt-1 max-h-80 space-y-1.5 overflow-y-auto pt-1">
              {data.customerDues.map((c, i) => (
                <li key={String(c._id)} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2 dark:bg-white/5">
                  <span className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </div>
                  <span className="rounded-md bg-red-100 px-2.5 py-1 text-sm font-bold tabular-nums text-red-600 dark:bg-red-500/15 dark:text-red-400">
                    {Math.round(c.due).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Warranty"
          action={
            <Link href="/admin/warranty" className="text-sm font-semibold text-primary hover:underline">
              Open →
            </Link>
          }
        >
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["Open", k.openClaims, "text-amber-600"],
              ["Ready", k.readyClaims, "text-emerald-600"],
              ["Delivered", data.claims.delivered || 0, "text-gray-600 dark:text-gray-100"],
            ].map(([label, n, color]) => (
              <div key={label} className="rounded-xl bg-gray-50 py-3 dark:bg-white/5">
                <p className={`text-xl font-bold tabular-nums ${color}`}>{n}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
          <p className="mb-2 mt-4 text-sm font-semibold">Warranty ending in 30 days</p>
          {data.expiring.length === 0 ? (
            <p className="text-sm text-muted-foreground">None</p>
          ) : (
            <ul className="max-h-56 space-y-1.5 overflow-y-auto">
              {data.expiring.map((e) => (
                <li key={`${e.orderNumber}-${e.imei}`} className="rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-white/5">
                  <div className="flex justify-between gap-2">
                    <span className="truncate font-medium">{e.productName}</span>
                    <span className="shrink-0 text-xs text-amber-700 dark:text-amber-400">{fmtDate(e.expiry)}</span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {e.customerName} {e.phone && `· ${e.phone}`} {e.imei && `· ${e.imei}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
    </MotionConfig>
  );
}
