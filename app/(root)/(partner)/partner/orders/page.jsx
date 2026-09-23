"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Printer, ChevronDown } from "lucide-react";
import { OrderStatus } from "@/components/ui/Application/Partner/OrderStatus";
import { partnerOrdersQuery, money, fmtDate } from "@/lib/partnerQueries";
import { showToast } from "@/lib/showToast";

function OrderRow({ order, onCancel }) {
  const [open, setOpen] = useState(false);
  const pcs = order.items.reduce((s, i) => s + i.qty, 0);
  return (
    <li className="p-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-1 font-semibold">
          <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} />
          {order.orderNumber}
        </button>
        <span className="text-muted-foreground">{fmtDate(order.createdAt)}</span>
        <span className="text-muted-foreground">{pcs} pcs</span>
        <span className="ml-auto font-bold tabular-nums">{money(order.total)}</span>
        <OrderStatus status={order.status} />
        {order.status === "invoiced" && order.posOrderId && (
          <Link href={`/partner/invoice/${order.posOrderId}`} className="text-xs font-semibold text-primary hover:underline">
            Invoice {order.invoiceNumber}
          </Link>
        )}
        {order.status === "pending" && (
          <button type="button" onClick={() => onCancel(order)} className="text-xs font-medium text-red-600 hover:underline">
            Cancel
          </button>
        )}
      </div>
      {open && (
        <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm dark:bg-white/5">
          <table className="w-full">
            <tbody>
              {order.items.map((i) => (
                <tr key={String(i.variantId)}>
                  <td className="py-1">
                    {i.productName}{" "}
                    <span className="text-muted-foreground">{[i.size, i.color].filter(Boolean).join(" · ")}</span>
                  </td>
                  <td className="py-1 text-right tabular-nums">
                    {i.qty} × {money(i.price)}
                  </td>
                  <td className="w-28 py-1 text-right font-semibold tabular-nums">{money(i.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {order.note && <p className="mt-2 text-xs text-muted-foreground">Your note: {order.note}</p>}
          {order.staffNote && <p className="mt-1 text-xs text-primary">Shop: {order.staffNote}</p>}
        </div>
      )}
    </li>
  );
}

function Orders() {
  const params = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") === "invoices" ? "invoices" : "orders");
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery(partnerOrdersQuery);

  const cancel = async (order) => {
    if (!confirm(`Cancel order ${order.orderNumber}?`)) return;
    try {
      const { data: res } = await axios.patch(`/api/partner/orders/${order._id}`, { action: "cancel" });
      if (!res.success) throw new Error(res.message);
      showToast("success", "Order cancelled");
      queryClient.invalidateQueries({ queryKey: ["partner-orders"] });
      queryClient.invalidateQueries({ queryKey: ["partner-me"] });
    } catch (err) {
      showToast("error", err.response?.data?.message || err.message);
    }
  };

  const tabClass = (t) =>
    `h-9 rounded-lg px-4 text-sm font-semibold ${tab === t ? "bg-primary text-white" : "bg-card border text-gray-600 dark:text-gray-300"}`;

  if (isLoading) {
    return (
      <div className="flex h-60 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Loading...
      </div>
    );
  }
  if (isError || !data?.success) return <p className="py-20 text-center text-muted-foreground">Could not load your orders.</p>;

  const due = data.invoices.reduce((s, i) => s + (i.dueAmount || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Orders &amp; Invoices</h1>
        <div className="flex gap-2">
          <button type="button" className={tabClass("orders")} onClick={() => setTab("orders")}>
            My Orders ({data.orders.length})
          </button>
          <button type="button" className={tabClass("invoices")} onClick={() => setTab("invoices")}>
            Invoices ({data.invoices.length})
          </button>
        </div>
      </div>

      {tab === "orders" ? (
        <section className="rounded-2xl border bg-card">
          {data.orders.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">
              No orders yet. <Link href="/partner/products" className="font-semibold text-primary">Browse products</Link>
            </p>
          ) : (
            <ul className="divide-y">
              {data.orders.map((o) => (
                <OrderRow key={o._id} order={o} onCancel={cancel} />
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className="overflow-x-auto rounded-2xl border bg-card">
          <div className="flex justify-between border-b px-4 py-3 text-sm">
            <span className="text-muted-foreground">All invoices</span>
            <span>
              Total due: <b className="text-red-600">{money(due)}</b>
            </span>
          </div>
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-gray-50 text-left text-xs text-muted-foreground dark:bg-white/5">
              <tr>
                <th className="px-4 py-2">Invoice</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2 text-right">Items</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2 text-right">Paid</th>
                <th className="px-4 py-2 text-right">Due</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {data.invoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">No invoices yet.</td>
                </tr>
              )}
              {data.invoices.map((inv) => (
                <tr key={inv._id} className="border-t">
                  <td className="px-4 py-2.5 font-semibold">{inv.orderNumber}</td>
                  <td className="px-4 py-2.5">{fmtDate(inv.saleDate || inv.createdAt)}</td>
                  <td className="px-4 py-2.5 text-right">{inv.items.reduce((s, i) => s + i.qty, 0)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{money(inv.total)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{money(inv.paidAmount ?? inv.total)}</td>
                  <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${inv.dueAmount > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {money(inv.dueAmount || 0)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link href={`/partner/invoice/${inv._id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                      <Printer className="size-3.5" /> View / Print
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

export default function PartnerOrdersPage() {
  return (
    <Suspense>
      <Orders />
    </Suspense>
  );
}
