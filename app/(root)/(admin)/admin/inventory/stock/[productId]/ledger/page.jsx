"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { ArrowLeftRight, FileSpreadsheet, FileText, Printer } from "lucide-react";

import { EmptyRow, Pagination, filterInput, tdClass, thClass, theadClass, totalRowClass } from "@/components/ui/Application/Admin/listKit";
import { showToast } from "@/lib/showToast";

const num = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
// 2026-02-22, in Bangladesh time
const ymd = (d) => new Date(new Date(d).getTime() + 6 * 3600 * 1000).toISOString().slice(0, 10);

const COLUMNS = ["Sl", "Date", "Details", "Invoice No", "Type", "In Qty", "Out Qty", "Stock", "Rate", "Total", "Profit/Loss"];
const cellValues = (r, i) => [
  i + 1,
  ymd(r.date),
  r.details || "",
  r.invoiceNo || "N/A",
  r.type,
  num(r.inQty),
  num(r.outQty),
  num(r.stock),
  num(r.rate),
  num(r.total),
  num(r.profit),
];

/** Inventory → Stock → Stock Ledger Reports of one product, laid out like the Amar Solution page */
export default function StockLedgerPage({ params }) {
  const { productId } = use(params);
  const [dates, setDates] = useState({ from: "", to: "" });
  const [applied, setApplied] = useState({ from: "", to: "" });
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    axios
      .get("/api/inventory/ledger", { params: { productId, ...applied } })
      .then(({ data: res }) => {
        if (cancelled) return;
        if (!res.success) return showToast("error", res.message || "Could not load the ledger");
        setData(res);
        setPage(1);
      })
      .catch((error) => !cancelled && showToast("error", error.response?.data?.message || "Could not load the ledger"));
    return () => {
      cancelled = true;
    };
  }, [productId, applied]);

  const needle = search.trim().toLowerCase();
  const rows = useMemo(
    () =>
      (data?.rows || []).filter(
        (r) => !needle || `${r.details} ${r.invoiceNo} ${r.type} ${ymd(r.date)}`.toLowerCase().includes(needle),
      ),
    [data, needle],
  );
  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  const shown = rows.slice((page - 1) * perPage, page * perPage);
  const totals = rows.reduce(
    (t, r) => ({ inQty: t.inQty + r.inQty, outQty: t.outQty + r.outQty, total: t.total + r.total, profit: t.profit + r.profit }),
    { inQty: 0, outQty: 0, total: 0, profit: 0 },
  );
  const lastStock = rows.length ? rows[rows.length - 1].stock : data?.summary?.onHand || 0;

  const exportExcel = () => {
    const quote = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [COLUMNS, ...rows.map((r, i) => cellValues(r, i).map((v) => String(v).replace(/,/g, "")))];
    const blob = new Blob(["﻿" + lines.map((l) => l.map(quote).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `stock-ledger-${(data?.product?.name || "product").replace(/\W+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const barBtn = "flex items-center gap-1.5 px-3 py-[7px] text-[13px] text-white hover:bg-white/15";

  return (
    <section className="rounded-[4px] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,.06)] dark:bg-card">
      {/* title and date range */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-[#212529] dark:text-foreground">Stock Ledger Reports</h1>
          <p className="text-[17px] font-semibold text-[#212529] dark:text-foreground">{data?.product?.name || "…"}</p>
          {data?.product?.category && <p className="mt-4 text-[17px] font-semibold text-[#212529] dark:text-foreground">{data.product.category}</p>}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setApplied(dates);
          }}
          className="flex flex-wrap items-center gap-2 print:hidden"
        >
          <div className="flex">
            <input
              type="date"
              value={dates.from}
              max={dates.to || undefined}
              onChange={(e) => setDates({ ...dates, from: e.target.value })}
              className={`${filterInput} !w-[190px] !rounded-r-none`}
              aria-label="From date"
            />
            <button
              type="button"
              onClick={() => setDates({ from: dates.to, to: dates.from })}
              className="flex h-[38px] w-[42px] items-center justify-center bg-[#188ae2] text-white hover:bg-[#1379c7]"
              title="Swap dates"
              aria-label="Swap dates"
            >
              <ArrowLeftRight size={16} />
            </button>
            <input
              type="date"
              value={dates.to}
              min={dates.from || undefined}
              onChange={(e) => setDates({ ...dates, to: e.target.value })}
              className={`${filterInput} !w-[190px] !rounded-l-none`}
              aria-label="To date"
            />
          </div>
          <div className="flex">
            <button type="submit" className="h-[38px] rounded-l-[4px] bg-[#10c469] px-4 text-[13px] font-medium text-white hover:bg-[#0dab5b]">
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setDates({ from: "", to: "" });
                setApplied({ from: "", to: "" });
              }}
              className="h-[38px] rounded-r-[4px] bg-[#f9c851] px-4 text-[13px] font-medium text-white hover:bg-[#f0b93a]"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* page size, export, search */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <select
          value={perPage}
          onChange={(e) => {
            setPerPage(Number(e.target.value));
            setPage(1);
          }}
          className={`${filterInput} !w-[80px]`}
          aria-label="Rows per page"
        >
          {[10, 25, 50, 100, 500].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
        <div className="flex self-center overflow-hidden rounded-[3px] bg-[#868e96]">
          <button type="button" className={barBtn} onClick={() => window.print()}>
            <FileText size={14} /> PDF
          </button>
          <button type="button" className={barBtn} onClick={exportExcel} disabled={!rows.length}>
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button type="button" className={barBtn} onClick={() => window.print()}>
            <Printer size={14} /> Print
          </button>
        </div>
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search..."
          className={`${filterInput} sm:!w-[190px]`}
          aria-label="Search the ledger"
        />
      </div>

      {data?.openingForRange !== null && data?.openingForRange !== undefined && (
        <p className="m-0 mt-3 text-[13px] text-muted-foreground">
          Stock before {applied.from}: <b className="text-foreground">{num(data.openingForRange)}</b>
        </p>
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-[13px]">
          <thead>
            <tr className={theadClass}>
              {COLUMNS.map((h) => (
                <th key={h} className={thClass}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!data && (
              <tr>
                <td colSpan={COLUMNS.length} className={tdClass}>
                  <div className="h-5 animate-pulse rounded bg-slate-100 dark:bg-muted" />
                </td>
              </tr>
            )}
            {data && !rows.length && <EmptyRow colSpan={COLUMNS.length} title="No stock movement in this period" />}
            {shown.map((r, i) => {
              const sl = (page - 1) * perPage + i;
              return (
                <tr key={sl} className={r.isBalance ? "bg-slate-50 dark:bg-muted/40" : ""}>
                  <td className={tdClass}>{sl + 1}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{ymd(r.date)}</td>
                  <td className={`${tdClass} max-w-[300px]`}>{r.details}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>
                    {r.link ? (
                      <Link href={r.link} className="text-[#188ae2] hover:underline">
                        {r.invoiceNo}
                      </Link>
                    ) : (
                      <span className="text-[#188ae2]">{r.invoiceNo || "N/A"}</span>
                    )}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap`}>{r.type}</td>
                  <td className={`${tdClass} tabular-nums`}>{num(r.inQty)}</td>
                  <td className={`${tdClass} tabular-nums`}>{num(r.outQty)}</td>
                  <td className={`${tdClass} tabular-nums`}>{num(r.stock)}</td>
                  <td className={`${tdClass} tabular-nums`}>{num(r.rate)}</td>
                  <td className={`${tdClass} tabular-nums`}>{num(r.total)}</td>
                  <td className={`${tdClass} tabular-nums ${r.profit < 0 ? "text-[#d63939]" : ""}`}>{num(r.profit)}</td>
                </tr>
              );
            })}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className={`${totalRowClass} text-[15px]`}>
                <td colSpan={5} className={tdClass}>
                  Total
                </td>
                <td className={`${tdClass} tabular-nums`}>{num(totals.inQty)}</td>
                <td className={`${tdClass} tabular-nums`}>{num(totals.outQty)}</td>
                <td className={`${tdClass} tabular-nums`}>{num(lastStock)}</td>
                <td className={tdClass} />
                <td className={`${tdClass} tabular-nums`}>{num(totals.total)}</td>
                <td className={`${tdClass} tabular-nums`}>{num(totals.profit)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {rows.length > perPage && (
        <div className="mt-3 print:hidden">
          <Pagination
            page={page}
            pages={pages}
            from={(page - 1) * perPage + 1}
            count={shown.length}
            total={rows.length}
            onPage={setPage}
          />
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-2 text-[12px] text-muted-foreground print:hidden">
        <span>Rate is the sale price on sales and the purchase price on everything else. Profit/Loss is counted on sales.</span>
        <Link href="/admin/inventory/stock" className="shrink-0 text-[#188ae2] hover:underline">
          ← Back to Stock
        </Link>
      </div>
    </section>
  );
}
