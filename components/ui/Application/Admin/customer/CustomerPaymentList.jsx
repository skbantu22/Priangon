"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Eye, FileSpreadsheet, FileText, Pencil, Printer, Trash2 } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { ADMIN_CUSTOMER_DUE_RECEIVED_EDIT } from "@/Route/Adminpannelroute";

import {
  EmptyRow,
  exportExcel,
  exportPdf,
  fmtDate,
  methodLabel,
  PAYMENT_METHODS,
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

const isoDay = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

// Like the demo, the list opens on the last 30 days
const lastMonth = () => ({ start: isoDay(new Date(Date.now() - 29 * 86400000)), end: isoDay(new Date()) });
const EMPTY_FILTERS = { method: "", customer: "", by: "" };
const selectClass =
  "h-[38px] rounded-[4px] border border-[#ced4da] bg-white px-2 text-[14px] text-[#495057] dark:border-border dark:bg-background";

/** Customer Due Received / Due Paid / Due Dismiss / Advance lists */
export default function CustomerPaymentList({ type, title }) {
  const byLabel = type === "pay" ? "Paid By" : "Received By";
  // the advance list also holds refunds, which take the advance back
  const signedAmount = (row) => (row.type === "advance_refund" ? -row.amount : row.amount);
  const head = ["SL", "Date", "Invoice No", "Customer", "Amount", "Method", byLabel, "Note"];

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(0);
  const [meta, setMeta] = useState({ total: 0, pages: 1, from: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [draft, setDraft] = useState(() => ({ ...EMPTY_FILTERS, ...lastMonth() }));
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS, ...lastMonth() }));
  const [people, setPeople] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState("10");
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState(null);
  const router = useRouter();

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
      ...(filters.start && { start_date: filters.start }),
      ...(filters.end && { end_date: filters.end }),
      ...(filters.method && { method: filters.method }),
      ...(filters.customer && { customer: filters.customer }),
      ...(filters.by && { by: filters.by }),
      ...(search && { search }),
      ...extra,
    }),
    [type, filters, search],
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
      setPeople(data.people || []);
      setCustomers(data.customers || []);
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
    setFilters({ ...draft });
  };

  const clear = () => {
    const reset = { ...EMPTY_FILTERS, ...lastMonth() };

    setDraft(reset);
    setFilters(reset);
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
      <section className="rounded-[2px] border border-[#e6ebf1] border-t-[3px] border-t-[#1bab70] bg-white px-3 py-4 shadow-sm sm:px-5 dark:border-border dark:bg-card">
          <h1 className="m-0 text-[18px] font-semibold text-[#212529] dark:text-foreground">{title}</h1>

          <form onSubmit={apply} className="mt-4 flex flex-wrap items-center gap-2">
            <select
              value={limit}
              onChange={(event) => {
                setLimit(event.target.value);
                setPage(1);
              }}
              aria-label="Entries"
              className={`${selectClass} w-[72px]`}
            >
              {["10", "25", "50", "100"].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>

            <select
              value={draft.method}
              onChange={(event) => setDraft({ ...draft, method: event.target.value })}
              aria-label="Paid By"
              className={`${selectClass} w-[170px]`}
            >
              <option value="">Paid By</option>
              {PAYMENT_METHODS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={draft.customer}
              onChange={(event) => setDraft({ ...draft, customer: event.target.value })}
              aria-label="Select Customer"
              className={`${selectClass} w-[170px]`}
            >
              <option value="">Select Customer</option>
              {customers.map((row) => (
                <option key={row._id} value={row._id}>
                  {row.name}
                </option>
              ))}
            </select>

            <select
              value={draft.by}
              onChange={(event) => setDraft({ ...draft, by: event.target.value })}
              aria-label={byLabel}
              className={`${selectClass} w-[170px]`}
            >
              <option value="">{type === "pay" ? "Paid by" : "Received by"}</option>
              {people.map((person) => (
                <option key={person} value={person}>
                  {person}
                </option>
              ))}
            </select>

            <div className="flex items-stretch">
              <input
                type="date"
                aria-label="Start date"
                value={draft.start}
                onChange={(event) => setDraft({ ...draft, start: event.target.value })}
                className={`${selectClass} w-[150px] rounded-r-none`}
              />
              <span className="flex items-center bg-[#188ae2] px-3 text-white">To</span>
              <input
                type="date"
                aria-label="End date"
                value={draft.end}
                onChange={(event) => setDraft({ ...draft, end: event.target.value })}
                className={`${selectClass} w-[150px] rounded-l-none`}
              />
            </div>

            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search..."
              aria-label="Search"
              className={`${selectClass} min-w-[160px] flex-1 sm:max-w-[220px]`}
            />

            <div className="flex w-full gap-2">
              <button type="submit" className="h-[34px] rounded-[4px] bg-[#1bc46f] px-4 text-[14px] text-white hover:bg-[#17a85f]">
                Search
              </button>
              <button type="button" onClick={clear} className="h-[34px] rounded-[4px] bg-[#f9c851] px-4 text-[14px] text-white hover:bg-[#f0b93a]">
                Clear
              </button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
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
                className="inline-flex items-center gap-1.5 rounded-[3px] bg-[#6c757d] px-3 py-1.5 text-[13px] text-white hover:bg-[#5a6268] disabled:opacity-60"
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          <div className="mt-[14px] overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className={theadRow}>
                  {["SL", "Date", "Invoice No.", "Customer", "Amount", "Paid By", byLabel, "Action"].map((column) => (
                    <th key={column} className={`${thClass} text-center`}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading &&
                  Array.from({ length: 4 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={8} className={`${tdClass} h-[44px]`}>
                        <div className="h-4 animate-pulse rounded bg-slate-100 dark:bg-muted" />
                      </td>
                    </tr>
                  ))}

                {!loading && rows.length === 0 && <EmptyRow colSpan={8} title="No data available in table" />}

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
                      <td className={tdClass}>{row.customerId?.name}</td>
                      <td className={`${tdClass} ${row.type === "advance_refund" ? "text-red-600" : ""}`}>
                        {money(signedAmount(row))}
                        {row.type === "advance_refund" && <span className="block text-xs">Refund</span>}
                      </td>
                      <td className={`${tdClass} text-center`}>
                        {type === "dismiss" ? "" : `${methodLabel(row.method)}: ${money(row.amount)}`}
                      </td>
                      <td className={`${tdClass} text-center`}>{row.createdBy}</td>
                      <td className={`${tdClass} !py-[6px] text-center`}>
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            title="Edit"
                            // a due receipt has its own edit page, like the demo
                            onClick={() => (type === "receive" ? router.push(ADMIN_CUSTOMER_DUE_RECEIVED_EDIT(row._id)) : setViewing(row))}
                            className="inline-flex size-[28px] items-center justify-center rounded-[3px] bg-[#f0ad4e] text-white hover:bg-[#ec971f]"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            title="View"
                            onClick={() => setViewing(row)}
                            className="inline-flex size-[28px] items-center justify-center rounded-[3px] bg-[#5bc0de] text-white hover:bg-[#31b0d5]"
                          >
                            <Eye size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>

              {!loading && (
                <tfoot>
                  <tr className={totalRow}>
                    <td colSpan={3} className={tdClass} />
                    <td className={`${tdClass} text-center font-bold`}>Total</td>
                    <td className={`${tdClass} font-bold`}>{Number(summary || 0).toFixed(2)}</td>
                    <td colSpan={3} className={tdClass} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[13px] text-[#333]">
            <span>
              Showing {meta.total ? meta.from : 0} to {meta.total ? meta.from + rows.length - 1 : 0} of {meta.total} entries
            </span>
            <div className="flex">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="h-[32px] rounded-l border border-[#dee2e6] bg-white px-3 text-[#188ae2] disabled:text-[#adb5bd]">
                Previous
              </button>
              <span className="flex h-[32px] min-w-[32px] items-center justify-center border-y border-[#188ae2] bg-[#188ae2] px-2 text-white">{page}</span>
              <button type="button" disabled={page >= meta.pages} onClick={() => setPage(page + 1)} className="h-[32px] rounded-r border border-[#dee2e6] bg-white px-3 text-[#188ae2] disabled:text-[#adb5bd]">
                Next
              </button>
            </div>
          </div>
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
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const row = viewing;
                    setViewing(null);
                    remove(row);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-[4px] bg-[#ff5b5b] px-3 py-1.5 text-[13px] text-white hover:bg-[#f24242]"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
