"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { CalendarDays, PlusSquare, Receipt, Search, SquarePen, Trash2, TrendingUp, X } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { ADMIN_EXPENSE_ADD, ADMIN_EXPENSE_EDIT } from "@/Route/Adminpannelroute";
import {
  EmptyRow,
  ExportButtons,
  Pagination,
  btn,
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
import { toInputDate } from "@/components/ui/Application/Admin/purchase/purchaseKit";

const EMPTY = { start: "", end: "", showroomId: "", categoryId: "", search: "" };

const COLUMNS = ["SI", "Date", "User", "Business Name", "Type", "Amount", "Payment Type", "Note"];

const branchOf = (e) => e.showroomId?.name || "Head Office";
const noteOf = (e) => [e.title, e.note].filter(Boolean).join(" · ");

const exportRow = (e, index) => [
  index + 1,
  fmtDate(e.expenseDate),
  e.createdBy || "",
  branchOf(e),
  e.categoryName,
  e.amount,
  methodLabel(e.paymentMethod),
  noteOf(e),
];

// quick ranges for the date filter, in the browser's own calendar
const iso = (d) => toInputDate(d);
const quickRanges = () => {
  const now = new Date();
  return [
    ["Today", iso(now), iso(now)],
    ["This month", iso(new Date(now.getFullYear(), now.getMonth(), 1)), iso(now)],
    ["Last month", iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), iso(new Date(now.getFullYear(), now.getMonth(), 0))],
    ["This year", iso(new Date(now.getFullYear(), 0, 1)), iso(now)],
  ];
};

/** Expenses → Expense List: summary cards, filters, totals and exports, like 360's */
export default function ExpenseListPage() {
  const router = useRouter();

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [meta, setMeta] = useState({ total: 0, pages: 1, from: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [types, setTypes] = useState([]);
  const [showrooms, setShowrooms] = useState([]);

  const [filters, setFilters] = useState(EMPTY);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState("10");
  const [page, setPage] = useState(1);

  useEffect(() => {
    axios
      .get("/api/expense-category")
      .then(({ data }) => data.success && setTypes(data.data))
      .catch(() => {});
    axios
      .get("/api/showrooms")
      .then(({ data }) => data.success && setShowrooms(data.showrooms || []))
      .catch(() => {});
  }, []);

  // typing in the search box filters after a short pause
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim() !== filters.search) {
        setPage(1);
        setFilters((f) => ({ ...f, search: search.trim() }));
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [search, filters.search]);

  const params = useCallback(
    (extra) => ({
      ...(filters.start && { from: filters.start }),
      ...(filters.end && { to: filters.end }),
      ...(filters.showroomId && { showroomId: filters.showroomId }),
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.search && { search: filters.search }),
      ...extra,
    }),
    [filters],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/expense", { params: params({ page, limit }) });
      if (!data.success) return showToast("error", data.message || "Could not load expenses");
      setRows(data.data);
      setSummary(data.summary);
      setMeta({ total: data.total, pages: data.pages, from: data.from });
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not load expenses");
    } finally {
      setLoading(false);
    }
  }, [params, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (key) => (value) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const clear = () => {
    setSearch("");
    setFilters(EMPTY);
    setPage(1);
  };

  const filtered = Object.values(filters).some(Boolean);

  const withAllRows = async (handle) => {
    setBusy(true);
    try {
      const all = [];
      let total = 0;
      for (let p = 1; p <= 40; p++) {
        const { data } = await axios.get("/api/expense", { params: params({ page: p, limit: 500 }) });
        if (!data.success) throw new Error(data.message);
        all.push(...data.data);
        total = data.summary.total;
        if (!data.hasMore) break;
      }
      await handle(all.map(exportRow), ["", "", "", "", "Total", total, "", ""]);
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message || "Could not export");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (e) => {
    if (!confirm(`Delete this ${e.categoryName} expense of ৳${money(e.amount)}?`)) return;
    try {
      const { data } = await axios.delete(`/api/expense/delete/${e._id}`);
      showToast(data.success ? "success" : "error", data.message || (data.success ? "Expense deleted" : "Could not delete"));
      if (data.success) load();
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not delete");
    }
  };

  const cards = [
    [Receipt, filtered ? "Total (filtered)" : "Total spent", summary ? `৳${money(summary.total)}` : "—", summary ? `${summary.count} expense${summary.count === 1 ? "" : "s"}` : "", "text-[#d63939] bg-[#fff1f1]"],
    [CalendarDays, "This month", summary ? `৳${money(summary.thisMonth)}` : "—", new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" }), "text-[#1672c2] bg-[#eaf4fd]"],
    [TrendingUp, "Biggest expense type", summary?.topType?.name || "—", summary?.topType ? `৳${money(summary.topType.total)}` : "No expenses yet", "text-[#b26b00] bg-[#fff6e5]"],
  ];

  const actions = (e) => (
    <div className="inline-flex">
      <button
        type="button"
        onClick={() => router.push(ADMIN_EXPENSE_EDIT(e._id))}
        className="inline-flex items-center gap-[5px] bg-[#188ae2] px-[10px] py-[5px] text-[13px] text-white hover:bg-[#1379c7]"
      >
        <SquarePen size={13} /> Edit
      </button>
      <button type="button" onClick={() => remove(e)} className="inline-flex items-center gap-[5px] bg-[#ff5b5b] px-[10px] py-[5px] text-[13px] text-white hover:bg-[#f24242]">
        <Trash2 size={13} /> Delete
      </button>
    </div>
  );

  return (
    <div className="space-y-[16px]">
      <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-3">
        {cards.map(([Icon, title, value, hint, tone]) => (
          <div key={title} className="flex items-center gap-[14px] border border-[#e3e8ee] bg-white px-[16px] py-[14px] dark:border-border dark:bg-card">
            <span className={`flex size-[46px] shrink-0 items-center justify-center ${tone}`}>
              <Icon size={22} />
            </span>
            <div className="min-w-0">
              <p className="m-0 text-[13px] text-[#6b7785]">{title}</p>
              <p className="m-0 truncate text-[20px] font-bold tabular-nums text-[#1f2933] dark:text-foreground">{value}</p>
              <p className="m-0 truncate text-[12.5px] text-[#8a939c]">{hint}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="border border-[#e3e8ee] border-t-[3px] border-t-[#00801a] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)] dark:border-border dark:bg-card">
        <header className="flex flex-col gap-[12px] px-[16px] pt-[18px] sm:flex-row sm:items-center sm:justify-between sm:px-[24px]">
          <h1 className="m-0 text-[21px] font-semibold text-[#1f2933] sm:text-[23px] dark:text-foreground">Expenses</h1>
          <Link href={ADMIN_EXPENSE_ADD} className={btn.primary}>
            <PlusSquare size={14} /> Add New Expense
          </Link>
        </header>

        <div className="px-[16px] pb-[20px] pt-[16px] sm:px-[24px]">
          <div className="grid grid-cols-2 gap-[10px] lg:grid-cols-[88px_minmax(300px,1.6fr)_1fr_1fr_1.2fr_auto]">
            <select
              value={limit}
              onChange={(e) => {
                setLimit(e.target.value);
                setPage(1);
              }}
              className={inputClass}
              aria-label="Rows per page"
            >
              {["10", "25", "50", "100"].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <div className="col-span-2 flex lg:col-span-1">
              <input type="date" aria-label="From date" value={filters.start} max={filters.end || undefined} onChange={(e) => setFilter("start")(e.target.value)} className={`${inputClass} min-w-0 rounded-r-none`} />
              <span className="flex h-[38px] shrink-0 items-center bg-[#188ae2] px-[12px] text-[14px] text-white">To</span>
              <input type="date" aria-label="To date" value={filters.end} min={filters.start || undefined} onChange={(e) => setFilter("end")(e.target.value)} className={`${inputClass} min-w-0 rounded-l-none`} />
            </div>
            <select value={filters.showroomId} onChange={(e) => setFilter("showroomId")(e.target.value)} className={inputClass} aria-label="Branch">
              <option value="">All Branches</option>
              <option value="head">Head Office</option>
              {showrooms.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select value={filters.categoryId} onChange={(e) => setFilter("categoryId")(e.target.value)} className={inputClass} aria-label="Expense type">
              <option value="">All Expense Type</option>
              {types.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
            <label className="relative col-span-2 block lg:col-span-1">
              <Search size={15} className="pointer-events-none absolute left-[12px] top-1/2 -translate-y-1/2 text-[#8a939c]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search (User, Payment Type, Note)" aria-label="Search expenses" className={`${inputClass} !pl-[34px]`} />
            </label>
            <button type="button" onClick={clear} disabled={!filtered && !search} className={`${btn.warning} col-span-2 lg:col-span-1`}>
              <X size={14} /> Clear
            </button>
          </div>

          <div className="mt-[10px] flex flex-wrap items-center gap-[6px]">
            <span className="text-[13px] text-[#6b7785]">Quick range:</span>
            {quickRanges().map(([text, s, e]) => {
              const on = filters.start === s && filters.end === e;
              return (
                <button
                  key={text}
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setFilters((f) => (on ? { ...f, start: "", end: "" } : { ...f, start: s, end: e }));
                  }}
                  className={`border px-[10px] py-[4px] text-[13px] transition-colors ${
                    on ? "border-[#188ae2] bg-[#188ae2] text-white" : "border-[#dfe3e8] bg-white text-[#3b4652] hover:border-[#188ae2] hover:text-[#188ae2] dark:bg-transparent dark:text-foreground"
                  }`}
                >
                  {text}
                </button>
              );
            })}
            <div className="ml-auto">
              <ExportButtons
                disabled={busy || !rows.length}
                onPdf={() => withAllRows((body, foot) => exportPdf("Expenses", COLUMNS, body, foot))}
                onExcel={() => withAllRows((body, foot) => exportExcel("Expenses.xlsx", COLUMNS, body, foot))}
                onPrint={() =>
                  withAllRows((body, foot) => {
                    if (!printTable("Expenses", COLUMNS, body, foot)) showToast("error", "Allow pop-ups to print");
                  })
                }
              />
            </div>
          </div>

          {/* Phones */}
          <div className="mt-[14px] space-y-[10px] lg:hidden">
            {loading && [1, 2, 3].map((n) => <div key={n} className="h-[84px] animate-pulse bg-slate-100 dark:bg-muted" />)}
            {!loading && !rows.length && (
              <p className="m-0 border border-dashed border-[#d4dae0] px-4 py-8 text-center text-[15px] text-[#495057]">{filtered ? "No expense matches these filters" : "No expenses yet"}</p>
            )}
            {!loading &&
              rows.map((e) => (
                <article key={e._id} className="border border-[#e3e8ee] bg-white p-[12px] dark:border-border dark:bg-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="m-0 text-[15px] font-semibold">{e.categoryName}</p>
                      <p className="m-0 text-[12.5px] text-[#6b7785]">
                        {fmtDate(e.expenseDate)} · {methodLabel(e.paymentMethod)} · {e.createdBy}
                      </p>
                      {noteOf(e) && <p className="m-0 mt-[3px] text-[13px] text-[#3b4652] dark:text-muted-foreground">{noteOf(e)}</p>}
                    </div>
                    <b className="shrink-0 text-[16px] tabular-nums text-[#d63939]">৳{money(e.amount)}</b>
                  </div>
                  <div className="mt-[10px] flex justify-end">{actions(e)}</div>
                </article>
              ))}
            {!loading && rows.length > 0 && (
              <div className="flex justify-between bg-[#cbd5e1] px-[12px] py-[10px] text-[16px] font-bold dark:bg-slate-700">
                <span>Total</span>
                <span className="tabular-nums">৳{money(summary?.total)}</span>
              </div>
            )}
          </div>

          {/* Desktop */}
          <div className="mt-[14px] hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1080px] border-collapse">
              <thead>
                <tr className={theadRow}>
                  {["SI", "Date", "User", "Business Name", "Type", "Amount", "Payment Type", "Note", "Action"].map((h) => (
                    <th key={h} className={thClass}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading &&
                  [1, 2, 3, 4].map((n) => (
                    <tr key={n}>
                      <td colSpan={9} className={tdClass}>
                        <div className="h-5 animate-pulse bg-slate-100 dark:bg-muted" />
                      </td>
                    </tr>
                  ))}
                {!loading && !rows.length && (
                  <EmptyRow colSpan={9} title={filtered ? "No expense matches these filters" : "No expenses yet"} hint={filtered ? "Clear the filters to see everything." : "Add your first expense."} />
                )}
                {!loading &&
                  rows.map((e, i) => (
                    <tr key={e._id} className={`${i % 2 ? "bg-white dark:bg-card" : "bg-[#f8fafb] dark:bg-muted/40"} hover:bg-[#eef6fd] dark:hover:bg-muted`}>
                      <td className={tdClass}>{meta.from + i}</td>
                      <td className={`${tdClass} whitespace-nowrap`}>{fmtDate(e.expenseDate)}</td>
                      <td className={tdClass}>{e.createdBy}</td>
                      <td className={tdClass}>{branchOf(e)}</td>
                      <td className={tdClass}>{e.categoryName}</td>
                      <td className={`${tdClass} text-right font-semibold`}>{money(e.amount)}</td>
                      <td className={tdClass}>
                        {methodLabel(e.paymentMethod)}
                        {e.reference && <span className="block text-[12px] text-[#8a939c]">{e.reference}</span>}
                      </td>
                      <td className={`${tdClass} max-w-[260px]`}>{noteOf(e)}</td>
                      <td className={`${tdClass} whitespace-nowrap`}>{actions(e)}</td>
                    </tr>
                  ))}
              </tbody>
              {!loading && rows.length > 0 && (
                <tfoot>
                  <tr className={totalRow}>
                    <td className={`${tdClass} text-right`} colSpan={5}>
                      Total
                    </td>
                    <td className={`${tdClass} text-right`}>{money(summary?.total)}</td>
                    <td className={tdClass} colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <Pagination page={page} pages={meta.pages} from={meta.from} count={rows.length} total={meta.total} onPage={setPage} />
        </div>
      </section>
    </div>
  );
}
