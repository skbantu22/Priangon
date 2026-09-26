"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { ArrowLeft, Printer } from "lucide-react";

import { DateRange, EmptyRow, ListCard, btn, filterInput, tdClass, thClass, theadClass, totalRowClass } from "@/components/ui/Application/Admin/listKit";
import { showToast } from "@/lib/showToast";

const money = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const TYPE_TONE = {
  Sale: "text-[#d63939]",
  "Exchange Out": "text-[#d63939]",
  "Stock Out": "text-[#d63939]",
  Damage: "text-[#d63939]",
  "Opening Stock": "text-[#188ae2]",
  "Stock before records": "text-[#6b7785]",
};

/** Inventory → Stock → Stock Ledger of one product, like 360's */
export default function StockLedgerPage({ params }) {
  const { productId } = use(params);
  const [filters, setFilters] = useState({ from: "", to: "", search: "" });
  const [applied, setApplied] = useState(filters);
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    axios
      .get("/api/inventory/ledger", { params: { productId, ...applied } })
      .then(({ data: res }) => {
        if (cancelled) return;
        if (!res.success) return showToast("error", res.message || "Could not load the ledger");
        setData(res);
      })
      .catch((error) => !cancelled && showToast("error", error.response?.data?.message || "Could not load the ledger"));
    return () => {
      cancelled = true;
    };
  }, [productId, applied]);

  const unit = data?.product?.unit || "";
  const qty = (n) => `${money(n)} ${unit}`.trim();

  return (
    <ListCard
      title={data ? `Stock Ledger — ${data.product.name}` : "Stock Ledger"}
      actions={
        <div className="flex gap-2 print:hidden">
          <Link href="/admin/inventory/stock" className={btn.secondary}>
            <ArrowLeft size={14} /> Back to Stock
          </Link>
          <button type="button" className={btn.primary} onClick={() => window.print()}>
            <Printer size={14} /> Print
          </button>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(filters);
        }}
        className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-[320px_1fr_auto] print:hidden"
      >
        <DateRange
          start={filters.from}
          end={filters.to}
          onStart={(from) => setFilters({ ...filters, from })}
          onEnd={(to) => setFilters({ ...filters, to })}
        />
        <input
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          placeholder="Search invoice, barcode, type or note"
          className={filterInput}
        />
        <button type="submit" className={btn.info}>
          Search
        </button>
      </form>

      {data?.openingForRange !== null && data?.openingForRange !== undefined && (
        <p className="m-0 mb-2 text-[13px] text-muted-foreground">
          Stock before {fmtDate(applied.from)}: <b className="text-foreground">{qty(data.openingForRange)}</b>
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1150px] border-collapse text-left text-sm">
          <thead>
            <tr className={theadClass}>
              {["SL", "Date", "Branch", "Details", "Invoice No", "Type", "In Qty", "Out Qty", "Stock", "Rate", "Total", "Profit / Loss"].map((h) => (
                <th key={h} className={thClass}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!data && (
              <tr>
                <td colSpan={12} className={tdClass}>
                  <div className="h-5 animate-pulse rounded bg-slate-100 dark:bg-muted" />
                </td>
              </tr>
            )}
            {data && !data.rows.length && <EmptyRow colSpan={12} title="No stock movement in this period" />}
            {data?.rows.map((r, i) => (
              <tr key={i} className={r.isBalance ? "bg-slate-50 dark:bg-muted/40" : ""}>
                <td className={tdClass}>{i + 1}</td>
                <td className={`${tdClass} whitespace-nowrap`}>{fmtDate(r.date)}</td>
                <td className={tdClass}>{r.branch}</td>
                <td className={`${tdClass} max-w-[280px] text-[12.5px]`}>{r.details || "—"}</td>
                <td className={`${tdClass} whitespace-nowrap font-mono text-[12.5px]`}>{r.invoiceNo || "—"}</td>
                <td className={`${tdClass} whitespace-nowrap font-medium ${TYPE_TONE[r.type] || "text-[#0b7a3b]"}`}>{r.type}</td>
                <td className={`${tdClass} tabular-nums text-[#0b7a3b]`}>{r.inQty ? qty(r.inQty) : "—"}</td>
                <td className={`${tdClass} tabular-nums text-[#d63939]`}>{r.outQty ? qty(r.outQty) : "—"}</td>
                <td className={`${tdClass} font-semibold tabular-nums ${r.stock <= 0 ? "text-[#d63939]" : ""}`}>{qty(r.stock)}</td>
                <td className={`${tdClass} tabular-nums`}>{money(r.rate)}</td>
                <td className={`${tdClass} tabular-nums`}>{money(r.total)}</td>
                <td className={`${tdClass} tabular-nums ${r.profit < 0 ? "text-[#d63939]" : r.profit > 0 ? "text-[#0b7a3b]" : ""}`}>
                  {r.profit ? money(r.profit) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
          {data?.rows.length > 0 && (
            <tfoot>
              <tr className={totalRowClass}>
                <td colSpan={6} className={tdClass}>
                  Total ({data.rows.length} entries) · Stock on hand now {qty(data.summary.onHand)}
                </td>
                <td className={`${tdClass} tabular-nums`}>{qty(data.summary.inQty)}</td>
                <td className={`${tdClass} tabular-nums`}>{qty(data.summary.outQty)}</td>
                <td className={`${tdClass} tabular-nums`}>{qty(data.summary.stock)}</td>
                <td className={tdClass} />
                <td className={`${tdClass} tabular-nums`}>{money(data.summary.total)}</td>
                <td className={`${tdClass} tabular-nums`}>{money(data.summary.profit)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="m-0 mt-2 text-[12px] text-muted-foreground print:hidden">
        Rate is the sale price on sales and exchanges, and the purchase price on everything else. Profit / Loss is counted on sales.
      </p>
    </ListCard>
  );
}
