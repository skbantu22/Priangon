"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowRight,
  BookOpenText,
  CalendarRange,
  ClipboardList,
  HandCoins,
  Loader2,
  Package,
  ReceiptText,
  ShoppingCart,
  Smartphone,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { partnerMeQuery, money, fmtDate } from "@/lib/partnerQueries";
import { OrderStatus } from "@/components/ui/Application/Partner/OrderStatus";
import PartnerProducts from "./products/page";

// card background / icon square, the colours of the main dashboard
const TONES = {
  red: ["#ffebee", "#d32f2f"],
  emerald: ["#dcfbf5", "#00b293"],
  cyan: ["#e0f7fa", "#0097a7"],
  indigo: ["#e6e5ff", "#4429ff"],
  amber: ["#fffde7", "#f9a825"],
  violet: ["#eae0f3", "#851eec"],
  orange: ["#ffe8de", "#ff6a1f"],
  rose: ["#fce4ec", "#e91e63"],
};

const compact = (n) => (n >= 1e7 ? `${(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `${(n / 1e5).toFixed(1)}L` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));

function Kpi({ icon: Icon, tone, value, label, sub, href }) {
  const body = (
    <div style={{ background: TONES[tone][0] }} className="flex h-full items-center gap-3.5 p-[18px] transition-shadow hover:shadow-md dark:brightness-[0.35]">
      <span style={{ background: TONES[tone][1] }} className="flex size-[54px] shrink-0 items-center justify-center text-white">
        <Icon className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xl font-semibold leading-tight text-[#343a40] tabular-nums">{value}</p>
        <p className="text-[14.5px] text-[#495057]">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-[#6c757d]">{sub}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function Panel({ title, action, children, className = "" }) {
  return (
    <section className={`flex min-w-0 flex-col border border-[#eef0f3] bg-card shadow-[0_1px_3px_rgba(15,23,42,.06)] dark:border-white/10 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0f2f5] px-4 py-3 dark:border-white/10">
        <h2 className="text-base font-semibold text-[#343a40] dark:text-white">{title}</h2>
        {action}
      </div>
      <div className="min-h-0 flex-1 p-3.5">{children}</div>
    </section>
  );
}

const th = "border border-[#0a7a1f] bg-[#00801a] px-2.5 py-2 text-left text-[13px] font-semibold text-white";
const td = "border border-[#edf0f3] px-2.5 py-2 text-[13px] dark:border-white/10";

function AllLink({ href }) {
  return (
    <Link href={href} className="flex items-center gap-1 text-[13px] font-semibold text-[#188ae2] hover:underline">
      View all <ArrowRight className="size-3.5" />
    </Link>
  );
}

export default function PartnerDashboard() {
  const { data, isLoading, isError } = useQuery(partnerMeQuery);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Loading...
      </div>
    );
  }
  if (isError || !data?.success) {
    return <p className="py-20 text-center text-muted-foreground">Could not load your account.</p>;
  }

  const { customer, typeLabel, stats, recentInvoices, recentOrders, monthly = [], topProducts = [], lastPayment, canOrder } = data;
  const yearTotal = monthly.reduce((s, m) => s + m.amount, 0);

  return (
    <div className="space-y-5">
      {/* greeting and quick actions */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <p className="mt-1 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{typeLabel} price list</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canOrder && (
            <Link href="/partner/products" className="flex h-10 items-center gap-2 bg-[#10c469] px-4 text-sm font-semibold text-white hover:bg-[#0dab5b]">
              <Smartphone className="size-4" /> Order products
            </Link>
          )}
          <Link href="/partner/orders" className="flex h-10 items-center gap-2 bg-[#188ae2] px-4 text-sm font-semibold text-white hover:bg-[#1379c7]">
            <ClipboardList className="size-4" /> My orders
          </Link>
          <Link href="/partner/statement" className="flex h-10 items-center gap-2 bg-[#f9a825] px-4 text-sm font-semibold text-white hover:brightness-95">
            <BookOpenText className="size-4" /> Statement
          </Link>
        </div>
      </div>

      {!canOrder && (
        <p className="rounded-[4px] bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          Ordering is turned off for your account. You can still see your prices, invoices and statement. Please call the shop to order.
        </p>
      )}

      {/* tiles */}
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Wallet} tone="red" value={money(stats.due)} label="My Due (বাকি)" sub="Still to pay" href="/partner/statement" />
        <Kpi icon={TrendingUp} tone="emerald" value={money(stats.spent)} label="Total Purchased" sub={`${stats.invoices} invoices`} />
        <Kpi icon={CalendarRange} tone="cyan" value={money(stats.monthSpent)} label="This Month" sub={`${stats.monthInvoices} invoices`} />
        <Kpi
          icon={HandCoins}
          tone="amber"
          value={lastPayment ? money(lastPayment.amount) : "—"}
          label="Last Payment"
          sub={lastPayment ? fmtDate(lastPayment.date) : "No payment yet"}
        />
        <Kpi icon={ShoppingCart} tone="indigo" value={stats.openOrders} label="Orders in Progress" sub={`${stats.pendingOrders} new · ${stats.confirmedOrders} confirmed`} href="/partner/orders" />
        <Kpi icon={ReceiptText} tone="violet" value={stats.invoices} label="Invoices" href="/partner/orders?tab=invoices" />
        <Kpi icon={Package} tone="orange" value={stats.units.toLocaleString()} label="Items Bought" sub="All time" />
        <Kpi icon={BookOpenText} tone="rose" value="Open" label="Account Statement" sub="Invoices, payments and balance" href="/partner/statement" />
      </div>

      {/* purchases chart + top products */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="My Purchases (last 12 months)"
          action={
            <span className="text-sm text-[#495057]">
              Total: <b className="tabular-nums">{money(yearTotal)}</b>
            </span>
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="partnerFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#188ae2" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#188ae2" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#eef0f3" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#98a6ad", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={compact} tick={{ fill: "#98a6ad", fontSize: 12 }} axisLine={false} tickLine={false} width={44} />
                <Tooltip formatter={(v) => [money(v), "Purchased"]} />
                <Area type="monotone" dataKey="amount" stroke="#188ae2" strokeWidth={2} fill="url(#partnerFill)" dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Most Bought Products">
          {topProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nothing bought yet.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={th}>Product</th>
                  <th className={`${th} text-right`}>Qty</th>
                  <th className={`${th} text-right`}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={i}>
                    <td className={td}>
                      <span className="line-clamp-1 font-medium">{p.name}</span>
                      {p.variant && <span className="text-xs text-muted-foreground">{p.variant}</span>}
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{p.qty}</td>
                    <td className={`${td} text-right tabular-nums`}>{money(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      {/* recent orders + invoices */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Recent Orders" action={<AllLink href="/partner/orders" />}>
          {recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse">
                <thead>
                  <tr>
                    <th className={th}>Order</th>
                    <th className={th}>Date</th>
                    <th className={`${th} text-right`}>Amount</th>
                    <th className={th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o._id}>
                      <td className={`${td} font-mono text-[12px]`}>{o.orderNumber}</td>
                      <td className={`${td} whitespace-nowrap`}>{fmtDate(o.createdAt)}</td>
                      <td className={`${td} text-right tabular-nums`}>{money(o.total)}</td>
                      <td className={td}>
                        <OrderStatus status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Recent Invoices" action={<AllLink href="/partner/orders?tab=invoices" />}>
          {recentInvoices.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse">
                <thead>
                  <tr>
                    <th className={th}>Invoice</th>
                    <th className={th}>Date</th>
                    <th className={`${th} text-right`}>Total</th>
                    <th className={`${th} text-right`}>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv) => (
                    <tr key={inv._id}>
                      <td className={td}>
                        <Link href={`/partner/invoice/${inv._id}`} className="font-mono text-[12px] text-[#188ae2] hover:underline">
                          {inv.orderNumber}
                        </Link>
                      </td>
                      <td className={`${td} whitespace-nowrap`}>{fmtDate(inv.saleDate || inv.createdAt)}</td>
                      <td className={`${td} text-right tabular-nums`}>{money(inv.total)}</td>
                      <td className={`${td} text-right tabular-nums ${inv.dueAmount > 0 ? "font-semibold text-[#d63939]" : "text-[#0b8a45]"}`}>
                        {inv.dueAmount > 0 ? money(inv.dueAmount) : "Paid"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <div className="pt-2">
        <PartnerProducts />
      </div>
    </div>
  );
}
