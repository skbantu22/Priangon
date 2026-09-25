"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Eye, FileSpreadsheet, FileText, Printer, Trash2 } from "lucide-react";

import { showToast } from "@/lib/showToast";

import {
  EmptyRow,
  Pagination,
  exportExcel,
  exportPdf,
  fmtDate,
  inputClass,
  methodLabel,
  money,
  printTable,
  tdClass,
  thClass,
  theadRow,
  totalRow,
} from "@/components/ui/Application/Admin/supplier/supplierKit";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const EMPTY_DATES = { start: "", end: "" };

/** Customer Due Received / Due Paid / Due Dismiss / Advance lists */
export default function CustomerPaymentList({ type, title }) {
  const byLabel = type === "receive" || type === "advance" ? "Received By" : "Paid By";
  // the advance list also holds refunds, which take the advance back
  const signedAmount = (row) => (row.type === "advance_refund" ? -row.amount : row.amount);
  const head = ["SL", "Date", "Invoice No", "Customer", "Amount", "Method", byLabel, "Note"];

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(0);
  const [meta, setMeta] = useState({ total: 0, pages: 1, from: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [draft, setDraft] = useState(EMPTY_DATES);
  const [dates, setDates] = useState(EMPTY_DATES);
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState("10");
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState(null);

  // The search box filters as you type
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(term.trim());
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [term]);

  const params = useCallback(
    (extra) => ({
      type,
      ...(dates.start && { start_date: dates.start }),
      ...(dates.end && { end_date: dates.end }),
      ...(search && { search }),
      ...extra,
    }),
    [type, dates, search],
  );

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await axios.get("/api/customer-payments", { params: params({ page, limit }) });

      if (!data.success) {
        showToast("error", data.message || "Could not load payments");
        return;
      }

      setRows(data.data);
      setSummary(data.summary.amount);
      setMeta({ total: data.total, pages: data.pages, from: data.from });
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not load payments");
    } finally {
      setLoading(false);
    }
  }, [params, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const apply = (event) => {
    event.preventDefault();
    setPage(1);
    setDates({ ...draft });
  };

  const clear = () => {
    setDraft(EMPTY_DATES);
    setDates(EMPTY_DATES);
    setTerm("");
    setSearch("");
    setPage(1);
  };

  const remove = async (row) => {
    if (!confirm(`Delete ${row.invoiceNo}? The customer's due will change accordingly.`)) return;

    try {
      const { data } = await axios.delete(`/api/customer-payments/${row._id}`);

      showToast(data.success ? "success" : "error", data.message);
      if (data.success) load();
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not delete payment");
    }
  };

  const withAllRows = async (handle) => {
    setExporting(true);

    try {
      const { data } = await axios.get("/api/customer-payments", { params: params({ limit: "all" }) });

      if (!data.success) throw new Error(data.message);

      const body = data.data.map((row, index) => [
        index + 1,
        fmtDate(row.date),
        row.invoiceNo,
        row.customerId?.name || "",
        signedAmount(row),
        type === "dismiss" ? "" : methodLabel(row.method),
        row.createdBy,
        row.note,
      ]);

      await handle(body, ["", "", "", "Total", data.summary.amount, "", "", ""]);
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message || "Could not export");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <section className="rounded-[8px] border border-[#e6ebf1] bg-white px-[16px] py-[20px] shadow-[0_1px_2px_rgba(16,24,40,0.04),0_2px_8px_rgba(16,24,40,0.04)] sm:px-[24px] dark:border-border dark:bg-card">
          <form onSubmit={apply} className="flex flex-wrap items-center gap-[12px]">
            <h1 className="m-0 w-full text-[22px] font-semibold tracking-[-0.01em] text-[#212529] lg:mr-[16px] lg:w-auto dark:text-foreground">
              {title}
            </h1>

            <div className="flex w-full items-stretch sm:w-auto">
              <input
                type="date"
                aria-label="Start date"
                value={draft.start}
                onChange={(event) => setDraft({ ...draft, start: event.target.value })}
                className={`${inputClass} !h-[46px] min-w-0 flex-1 !rounded-r-none !text-[15px] sm:w-[168px]`}
              />
              <span className="flex items-center bg-[#188ae2] px-[16px] text-[16px] text-white">to</span>
              <input
                type="date"
                aria-label="End date"
                value={draft.end}
                onChange={(event) => setDraft({ ...draft, end: event.target.value })}
                className={`${inputClass} !h-[46px] min-w-0 flex-1 !rounded-l-none !text-[15px] sm:w-[168px]`}
              />
            </div>

            <button
              type="submit"
              className="h-[46px] min-w-[104px] rounded-[4px] bg-[#35b8e0] px-[20px] text-[15px] font-medium text-white transition hover:bg-[#22a6cf] active:translate-y-px"
            >
              Search
            </button>
            <button
              type="button"
              onClick={clear}
              className="h-[46px] min-w-[104px] rounded-[4px] bg-[#f9c851] px-[20px] text-[15px] font-medium text-white transition hover:bg-[#f0b93a] active:translate-y-px"
            >
              Clear
            </button>
          </form>

          <div className="mt-[26px] flex justify-center">
            <div className="inline-flex overflow-hidden rounded-[4px] bg-[#868e96] text-[15px] text-white">
              {[
                ["PDF", FileText, (body, foot) => exportPdf(title, head, body, foot)],
                ["Excel", FileSpreadsheet, (body, foot) => exportExcel(`${title}.xlsx`, head, body, foot)],
                [
                  "Print",
                  Printer,
                  (body, foot) => {
                    if (!printTable(title, head, body, foot)) showToast("error", "Allow pop-ups to print");
                  },
                ],
              ].map(([label, Icon, handle]) => (
                <button
                  key={label}
                  type="button"
                  disabled={exporting}
                  onClick={() => withAllRows(handle)}
                  className="flex items-center gap-[5px] px-[16px] py-[9px] transition hover:bg-[#727b84] disabled:opacity-60"
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-[18px] flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-[15px]">
              Show
              <select
                value={limit}
                onChange={(event) => {
                  setLimit(event.target.value);
                  setPage(1);
                }}
                className={`${inputClass} !w-[92px] !text-[14px]`}
              >
                {["10", "25", "50", "100", "all"].map((size) => (
                  <option key={size} value={size}>
                    {size === "all" ? "All" : size}
                  </option>
                ))}
              </select>
              entries
            </label>

            <label className="flex w-full items-center gap-2 rounded-[6px] bg-[#188ae2] py-[4px] pl-[12px] pr-[4px] text-[15px] font-medium text-white sm:w-auto">
              Search:
              <input
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Invoice, name or mobile"
                className="h-[38px] min-w-0 flex-1 rounded-[4px] border-0 bg-white px-[10px] text-[14px] text-[#495057] outline-none focus:ring-2 focus:ring-white/60 sm:w-[236px]"
              />
            </label>
          </div>

          <div className="mt-[14px] overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className={theadRow}>
                  {["SL", "Date", "Invoice No", "Customer", "Amount", byLabel, "Action"].map((column) => (
                    <th key={column} className={thClass}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading &&
                  Array.from({ length: 4 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={7} className={`${tdClass} h-[44px]`}>
                        <div className="h-4 animate-pulse rounded bg-slate-100 dark:bg-muted" />
                      </td>
                    </tr>
                  ))}

                {!loading && rows.length === 0 && <EmptyRow colSpan={7} title="No data available in table" />}

                {!loading &&
                  rows.map((row, index) => (
                    <tr key={row._id}>
                      <td className={tdClass}>{meta.from + index}</td>
                      <td className={tdClass}>{fmtDate(row.date)}</td>
                      <td className={tdClass}>
                        <button type="button" onClick={() => setViewing(row)} className="text-[#188ae2] hover:underline">
                          {row.invoiceNo}
                        </button>
                        {row.allocations?.length > 1 && (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            ({row.allocations.length} invoices)
                          </span>
                        )}
                      </td>
                      <td className={tdClass}>
                        {row.customerId?.name}
                        {row.customerId?.phone && (
                          <span className="block text-xs text-muted-foreground">{row.customerId.phone}</span>
                        )}
                      </td>
                      <td className={`${tdClass} ${row.type === "advance_refund" ? "text-red-600" : ""}`}>
                        {money(signedAmount(row))}
                        {row.type === "advance_refund" && <span className="block text-xs">Refund</span>}
                      </td>
                      <td className={tdClass}>{row.createdBy}</td>
                      <td className={`${tdClass} !py-[4px]`}>
                        <div className="inline-flex overflow-hidden rounded-[4px] shadow-sm">
                          <button
                            type="button"
                            title="View"
                            onClick={() => setViewing(row)}
                            className="inline-flex h-[32px] w-[40px] items-center justify-center bg-[#35b8e0] text-white hover:bg-[#22a6cf]"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => remove(row)}
                            className="inline-flex h-[32px] w-[40px] items-center justify-center bg-[#ff5b5b] text-white hover:bg-[#f24242]"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>

              {!loading && rows.length > 0 && (
                <tfoot>
                  <tr className={totalRow}>
                    <td colSpan={4} className={`${tdClass} text-right`}>
                      Total:
                    </td>
                    <td className={tdClass}>BDT {money(summary)}</td>
                    <td colSpan={2} className={tdClass} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <Pagination
            page={page}
            pages={meta.pages}
            from={meta.from}
            count={rows.length}
            total={meta.total}
            onPage={setPage}
          />
      </section>

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewing?.invoiceNo}</DialogTitle>
            <DialogDescription>{title}</DialogDescription>
          </DialogHeader>

          {viewing && (
            <div className="space-y-4 text-sm">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                {[
                  ["Customer", viewing.customerId?.name],
                  ["Mobile", viewing.customerId?.phone],
                  ["Date", fmtDate(viewing.date)],
                  ["Amount", `৳ ${money(viewing.amount)}`],
                  ["Method", type === "dismiss" ? "" : methodLabel(viewing.method)],
                  ["Reference", viewing.reference],
                  [byLabel, viewing.createdBy],
                  ["Note", viewing.note],
                ]
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div key={label} className="contents">
                      <dt className="font-semibold">{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
              </dl>

              {viewing.allocations?.length > 0 && (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted text-left">
                      <th className={tdClass}>Invoice</th>
                      <th className={tdClass}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewing.allocations.map((share) => (
                      <tr key={share.orderId}>
                        <td className={tdClass}>{share.orderNumber}</td>
                        <td className={tdClass}>{money(share.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
