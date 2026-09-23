"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  ReceiptText,
  ClipboardList,
  TrendingUp,
  Loader2,
  ArrowRight,
  Smartphone,
} from "lucide-react";
import { partnerMeQuery, money, fmtDate } from "@/lib/partnerQueries";
import { OrderStatus } from "@/components/ui/Application/Partner/OrderStatus";

function Tile({ icon: Icon, tone, value, label, sub }) {
  return (
    <div className={`flex items-center gap-4 rounded-2xl border border-black/5 p-5 ${tone}`}>
      <span className="kpi-icon flex size-12 shrink-0 items-center justify-center rounded-xl text-white">
        <Icon className="size-6" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-sm text-gray-600 dark:text-gray-300">{label}</p>
        {sub && <p className="text-xs text-gray-500">{sub}</p>}
      </div>
    </div>
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

  const { customer, typeLabel, stats, recentInvoices, recentOrders } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <p className="mt-1 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {typeLabel} price list
          </p>
        </div>
        <Link
          href="/partner/products"
          className="flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white shadow-md shadow-primary/30 hover:brightness-110"
        >
          <Smartphone className="size-4" /> Browse products &amp; order
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile icon={Wallet} tone="bg-red-50 dark:bg-red-500/10 [&_.kpi-icon]:bg-red-500" value={money(stats.due)} label="My Due (বাকি)" />
        <Tile icon={ClipboardList} tone="bg-amber-50 dark:bg-amber-500/10 [&_.kpi-icon]:bg-amber-500" value={stats.openOrders} label="Orders in progress" />
        <Tile icon={ReceiptText} tone="bg-indigo-50 dark:bg-indigo-500/10 [&_.kpi-icon]:bg-indigo-600" value={stats.invoices} label="Invoices" />
        <Tile icon={TrendingUp} tone="bg-emerald-50 dark:bg-emerald-500/10 [&_.kpi-icon]:bg-emerald-600" value={money(stats.spent)} label="Total purchased" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Recent orders</h2>
            <Link href="/partner/orders" className="flex items-center gap-1 text-sm font-semibold text-primary">
              All <ArrowRight className="size-4" />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <ul className="divide-y">
              {recentOrders.map((o) => (
                <li key={o._id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="font-semibold">{o.orderNumber}</span>
                  <span className="text-muted-foreground">{fmtDate(o.createdAt)}</span>
                  <span className="ml-auto tabular-nums">{money(o.total)}</span>
                  <OrderStatus status={o.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Recent invoices</h2>
            <Link href="/partner/orders?tab=invoices" className="flex items-center gap-1 text-sm font-semibold text-primary">
              All <ArrowRight className="size-4" />
            </Link>
          </div>
          {recentInvoices.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <ul className="divide-y">
              {recentInvoices.map((inv) => (
                <li key={inv._id} className="flex items-center gap-3 py-2.5 text-sm">
                  <Link href={`/partner/invoice/${inv._id}`} className="font-semibold text-primary hover:underline">
                    {inv.orderNumber}
                  </Link>
                  <span className="text-muted-foreground">{fmtDate(inv.saleDate || inv.createdAt)}</span>
                  <span className="ml-auto tabular-nums">{money(inv.total)}</span>
                  {inv.dueAmount > 0 ? (
                    <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                      Due {money(inv.dueAmount)}
                    </span>
                  ) : (
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Paid</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
