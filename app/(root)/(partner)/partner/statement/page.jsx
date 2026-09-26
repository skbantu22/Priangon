"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { ArrowLeftRight, Loader2, Printer } from "lucide-react";

import { fmtDate, money } from "@/lib/partnerQueries";

const input =
  "h-[38px] rounded-[4px] border border-[#e3e3e3] bg-white px-3 text-[13px] outline-none focus:border-[#188ae2] dark:border-white/10 dark:bg-card";
const th = "border border-[#0a7a1f] bg-[#00801a] px-2.5 py-2 text-left text-[13px] font-semibold text-white";
const td = "border border-[#edf0f3] px-2.5 py-2 text-[13px] dark:border-white/10";

/**
 * The partner's own account statement: every invoice, payment and return
 * with the balance after it, the same ledger the shop keeps.
 */
export default function PartnerStatement() {
  const [dates, setDates] = useState({ start: "", end: "" });
  const [applied, setApplied] = useState({ start: "", end: "" });
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    axios
      .get("/api/partner/statement", { params: applied })
      .then(({ data: res }) => {
        if (cancelled) return;
        if (res.success) setData(res);
        else setFailed(true);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [applied]);

  const s = data?.summary;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Account Statement</h1>
          <p className="text-sm text-muted-foreground">Your invoices, payments and returns, and what was due after each.</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setApplied(dates);
          }}
          className="flex flex-wrap items-center gap-2 print:hidden"
        >
          <div className="flex">
            <input type="date" value={dates.start} onChange={(e) => setDates({ ...dates, start: e.target.value })} className={`${input} rounded-r-none`} aria-label="From date" />
            <button
              type="button"
              onClick={() => setDates({ start: dates.end, end: dates.start })}
              className="flex h-[38px] w-[40px] items-center justify-center bg-[#188ae2] text-white"
              aria-label="Swap dates"
            >
              <ArrowLeftRight className="size-4" />
            </button>
            <input type="date" value={dates.end} onChange={(e) => setDates({ ...dates, end: e.target.value })} className={`${input} rounded-l-none`} aria-label="To date" />
          </div>
          <button type="submit" className="h-[38px] bg-[#10c469] px-4 text-[13px] font-semibold text-white">
            Search
          </button>
          <button type="button" onClick={() => window.print()} className="flex h-[38px] items-center gap-1.5 bg-[#868e96] px-3 text-[13px] text-white">
            <Printer className="size-4" /> Print
          </button>
        </form>
      </div>

      {s && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ["Opening", s.opening, ""],
            ["Purchased", s.totalSale, ""],
            ["Paid", s.totalPaid, "text-[#0b8a45]"],
            ["Returned", s.returned, ""],
            ["Due now", s.due, s.due > 0 ? "text-[#d63939]" : "text-[#0b8a45]"],
          ].map(([label, value, tone]) => (
            <div key={label} className="border border-[#eef0f3] bg-card px-4 py-3 dark:border-white/10">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-lg font-bold tabular-nums ${tone}`}>{money(value)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto border border-[#eef0f3] bg-card dark:border-white/10">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr>
              {["Sl", "Date", "Type", "Invoice / Receipt", "Note", "Debit", "Credit", "Balance"].map((h) => (
                <th key={h} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!data && !failed && (
              <tr>
                <td colSpan={8} className={`${td} py-10 text-center text-muted-foreground`}>
                  <Loader2 className="mr-2 inline size-4 animate-spin" /> Loading...
                </td>
              </tr>
            )}
            {failed && (
              <tr>
                <td colSpan={8} className={`${td} py-10 text-center text-red-600`}>
                  Could not load your statement.
                </td>
              </tr>
            )}
            {data?.rows.length === 0 && (
              <tr>
                <td colSpan={8} className={`${td} py-10 text-center text-muted-foreground`}>
                  Nothing in this period.
                </td>
              </tr>
            )}
            {data?.rows.map((r, i) => (
              <tr key={i}>
                <td className={td}>{i + 1}</td>
                <td className={`${td} whitespace-nowrap`}>{fmtDate(r.date)}</td>
                <td className={`${td} whitespace-nowrap`}>{r.type}</td>
                <td className={`${td} font-mono text-[12px]`}>{r.invoiceNo || "—"}</td>
                <td className={`${td} text-muted-foreground`}>{[r.note, r.method].filter(Boolean).join(" · ") || "—"}</td>
                <td className={`${td} text-right tabular-nums`}>{r.amount > 0 ? money(r.amount) : ""}</td>
                <td className={`${td} text-right tabular-nums text-[#0b8a45]`}>{r.amount < 0 ? money(-r.amount) : ""}</td>
                <td className={`${td} text-right font-semibold tabular-nums ${r.balance > 0 ? "text-[#d63939]" : ""}`}>{money(r.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">Debit is what you bought; credit is what you paid or returned. Balance is what you owed after that line.</p>
    </div>
  );
}
