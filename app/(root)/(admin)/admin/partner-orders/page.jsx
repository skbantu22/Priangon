"use client";

import { useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ChevronDown, CheckCircle2, XCircle, Receipt, Search } from "lucide-react";
import { OrderStatus, ORDER_STATUS_LABELS } from "@/components/ui/Application/Partner/OrderStatus";
import { CUSTOMER_TYPES } from "@/lib/priceTiers";
import { showToast } from "@/lib/showToast";

const money = (n) => `৳${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
// each kind of partner is kept apart, the way their price lists are
const TYPE_TABS = [
  ["", "All"],
  ["dealer", "Dealer"],
  ["subDealer", "Sub Dealer"],
  ["wholesaler", "Wholesaler"],
];

const fmt = (d) =>
  new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function Row({ order, onStatus }) {
  const [open, setOpen] = useState(order.status === "pending");
  const pcs = order.items.reduce((s, i) => s + i.qty, 0);
  const openable = ["pending", "confirmed"].includes(order.status);

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-1 font-semibold">
          <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} /> {order.orderNumber}
        </button>
        <span className="font-medium">{order.customerName}</span>
        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          {CUSTOMER_TYPES[order.customerType]?.short}
        </span>
        <span className="text-muted-foreground">{order.phone}</span>
        <span className="text-muted-foreground">{fmt(order.createdAt)}</span>
        <span className="ml-auto text-muted-foreground">{pcs} pcs</span>
        <span className="w-28 text-right font-bold tabular-nums">{money(order.total)}</span>
        <OrderStatus status={order.status} />
      </div>

      {open && (
        <div className="mt-3 space-y-3 rounded-xl bg-gray-50 p-3 dark:bg-white/5">
          <table className="w-full text-sm">
            <tbody>
              {order.items.map((i) => (
                <tr key={String(i.variantId)}>
                  <td className="py-1">
                    {i.productName} <span className="text-muted-foreground">{[i.size, i.color].filter(Boolean).join(" · ")}</span>
                  </td>
                  <td className="py-1 text-right tabular-nums">{i.qty} × {money(i.price)}</td>
                  <td className="w-28 py-1 text-right font-semibold tabular-nums">{money(i.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {order.note && <p className="text-sm">📝 {order.note}</p>}
          {order.invoiceNumber && (
            <Link href={`/admin/print/${order.posOrderId}`} target="_blank" className="text-sm font-semibold text-primary hover:underline">
              Invoice {order.invoiceNumber}
            </Link>
          )}
          {openable && (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/admin/pos?partnerOrder=${order._id}`}
                className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:brightness-110"
              >
                <Receipt className="size-4" /> Make invoice in POS
              </Link>
              {order.status === "pending" && (
                <button type="button" onClick={() => onStatus(order, "confirmed")} className="flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">
                  <CheckCircle2 className="size-4" /> Confirm
                </button>
              )}
              <button type="button" onClick={() => onStatus(order, "cancelled")} className="flex h-9 items-center gap-2 rounded-lg bg-red-50 px-4 text-sm font-semibold text-red-600 hover:bg-red-100">
                <XCircle className="size-4" /> Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function PartnerOrdersAdmin() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("pending");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["partner-orders-admin", status, type, term],
    queryFn: async () =>
      (
        await axios.get("/api/partner-orders", {
          params: { ...(status && { status }), ...(type && { type }), ...(term && { search: term }) },
        })
      ).data,
    refetchInterval: 30_000,
  });
  const counts = data?.counts || {};
  const typeCounts = data?.typeCounts || {};
  const typeTotal = Object.values(typeCounts).reduce((sum, n) => sum + n, 0);

  const setOrderStatus = async (order, next) => {
    if (next === "cancelled" && !confirm(`Cancel ${order.orderNumber}?`)) return;
    try {
      const { data: res } = await axios.patch(`/api/partner-orders/${order._id}`, { status: next });
      if (!res.success) throw new Error(res.message);
      showToast("success", `${order.orderNumber}: ${ORDER_STATUS_LABELS[next]}`);
      queryClient.invalidateQueries({ queryKey: ["partner-orders-admin"] });
    } catch (err) {
      showToast("error", err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Dealer / Sub Dealer / Wholesaler Orders</h1>
        <p className="text-sm text-muted-foreground">
          Orders placed by dealers, sub dealers and wholesalers from the partner portal. &quot;Make invoice in POS&quot; loads the order at their price so you can scan IMEIs and complete the sale.
        </p>
      </div>

      <div className="rounded-2xl border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b p-4">
          {TYPE_TABS.map(([k, l]) => (
            <button
              key={k || "all"}
              type="button"
              onClick={() => setType(k)}
              className={`h-9 rounded-lg px-3 text-sm font-semibold ${
                type === k ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              }`}
            >
              {l} ({k ? typeCounts[k] || 0 : typeTotal})
            </button>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setTerm(search.trim());
            }}
            className="relative w-full sm:ml-auto sm:w-64"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onBlur={() => setTerm(search.trim())}
              placeholder="Order no, name, phone, invoice"
              aria-label="Search orders"
              className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </form>
        </div>
        <div className="flex flex-wrap gap-2 border-b p-4">
          {[["", "All"], ...Object.entries(ORDER_STATUS_LABELS)].map(([k, l]) => (
            <button key={k || "all"} type="button" onClick={() => setStatus(k)} className={`h-9 rounded-lg px-3 text-sm font-medium ${status === k ? "bg-primary text-white" : "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300"}`}>
              {l}
              {k && counts[k] ? ` (${counts[k]})` : ""}
            </button>
          ))}
        </div>
        {isLoading ? (
          <p className="py-12 text-center text-muted-foreground"><Loader2 className="mr-2 inline size-4 animate-spin" />Loading...</p>
        ) : isError ? (
          <p className="py-12 text-center text-red-500">Could not load orders.</p>
        ) : data.orders.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">No orders here.</p>
        ) : (
          <ul className="divide-y">
            {data.orders.map((o) => (
              <Row key={o._id} order={o} onStatus={setOrderStatus} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
