"use client";

import { useState } from "react";

import { fmtDate, money } from "@/lib/partnerQueries";

const th = "border border-[#0a7a1f] bg-[#00801a] px-2.5 py-2 text-left text-[13px] font-semibold text-white";
const td = "border border-[#edf0f3] px-2.5 py-2 text-[13px] dark:border-white/10";

/**
 * What was bought, item by item, with how much of it is paid and how much is
 * still due. A payment belongs to the invoice, so the paid and due here are
 * each item's share of the invoice.
 */
export default function ProductDueTable({ rows = [] }) {
  const [dueOnly, setDueOnly] = useState(false);

  const shown = dueOnly ? rows.filter((row) => row.due > 0.009) : rows;
  const sum = (key) => shown.reduce((total, row) => total + row[key], 0);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Product-wise paid and due</h2>
          <p className="text-xs text-muted-foreground">
            Paid and due are worked out from each item&apos;s share of its invoice, so they are approximate per item.
          </p>
        </div>
        <label className="flex items-center gap-1.5 whitespace-nowrap text-[13px]">
          <input type="checkbox" checked={dueOnly} onChange={(event) => setDueOnly(event.target.checked)} />
          Due only
        </label>
      </div>

      <div className="overflow-x-auto border border-[#eef0f3] bg-card dark:border-white/10">
        <table className="w-full min-w-[820px] border-collapse">
          <thead>
            <tr>
              {["Sl", "Date", "Invoice", "Product", "Qty", "Price", "Amount", "Paid", "Due"].map((head) => (
                <th key={head} className={th}>
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={9} className={`${td} py-8 text-center text-muted-foreground`}>
                  {dueOnly ? "Nothing is due." : "No products in this period."}
                </td>
              </tr>
            )}
            {shown.map((row, index) => (
              <tr key={`${row.invoiceNo}-${index}`}>
                <td className={td}>{index + 1}</td>
                <td className={`${td} whitespace-nowrap`}>{fmtDate(row.date)}</td>
                <td className={`${td} font-mono text-[12px]`}>{row.invoiceNo}</td>
                <td className={td}>{row.product}</td>
                <td className={`${td} text-right tabular-nums`}>{row.qty}</td>
                <td className={`${td} text-right tabular-nums`}>{money(row.price)}</td>
                <td className={`${td} text-right tabular-nums`}>{money(row.amount)}</td>
                <td className={`${td} text-right tabular-nums text-[#0b8a45]`}>{money(row.paid)}</td>
                <td className={`${td} text-right font-semibold tabular-nums ${row.due > 0.009 ? "text-[#d63939]" : ""}`}>{money(row.due)}</td>
              </tr>
            ))}
          </tbody>
          {shown.length > 0 && (
            <tfoot>
              <tr className="bg-[#cbd5e1] font-bold dark:bg-slate-700">
                <td colSpan={6} className={td}>
                  Total
                </td>
                <td className={`${td} text-right tabular-nums`}>{money(sum("amount"))}</td>
                <td className={`${td} text-right tabular-nums`}>{money(sum("paid"))}</td>
                <td className={`${td} text-right tabular-nums`}>{money(sum("due"))}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
