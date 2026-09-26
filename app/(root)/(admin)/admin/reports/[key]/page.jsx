"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { DateRange, EmptyRow, btn, exportExcel, exportPdf, fmtDate, inputClass, money, printTable, tdClass, thClass, theadRow, totalRow } from "@/components/ui/Application/Admin/supplier/supplierKit";
import { toInputDate } from "@/components/ui/Application/Admin/purchase/purchaseKit";

const today = () => toInputDate(new Date());
const firstOfMonth = () => {
  const d = new Date();
  return toInputDate(new Date(d.getFullYear(), d.getMonth(), 1));
};

const BLANK = { paidBy: "", customerId: "", location: "", customerType: "", paymentStatus: "", orderStatus: "", soldBy: "", showroomId: "", supplierId: "", expenseTypeId: "", categoryId: "", brand: "", search: "", from: "", to: "", month: "", year: "" };

/** First query per report, like 360: daily = today, monthly = this month, yearly = this year */
const defaultQuery = (key) => {
  if (key === "daily-sales-report") return { ...BLANK, from: today(), to: today() };
  if (key === "monthly-sales-report") return { ...BLANK, month: today().slice(0, 7) };
  if (key === "yearly-sales-report") return { ...BLANK, year: String(new Date().getFullYear()) };
  return { ...BLANK, from: firstOfMonth(), to: today() };
};

const numeric = (type) => ["money", "rate", "qty"].includes(type);
const BADGE = { Paid: "bg-[#10b759]", Partial: "bg-[#f5a623]", Due: "bg-[#f1556c]" };

const text = (type, value) => {
  if (type === "money" || type === "rate") return money(value);
  if (type === "qty") return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (type === "date") return value ? fmtDate(value) : "";
  return value ?? "";
};

function Cell({ type, value, row }) {
  if (type === "status") {
    return value ? <span className={`px-[7px] py-[2px] text-[12px] font-semibold text-white ${BADGE[value] || "bg-[#6c757d]"}`}>{value}</span> : null;
  }
  if (type === "invoice" && row.link) {
    return (
      <Link href={row.link} target="_blank" className="text-[#188ae2] hover:underline">
        {value}
      </Link>
    );
  }
  return text(type, value);
}

const select = (value, onChange, first, list, label) => (
  <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label || first}>
    <option value="">{first}</option>
    {list.map(([v, l]) => (
      <option key={v} value={v}>
        {l}
      </option>
    ))}
  </select>
);

/** One filter control, chosen by the key the report sends back */
function Filter({ k, q, set, options }) {
  const pairs = (list = []) => list.map((o) => (typeof o === "string" ? [o, o] : [o._id, o.name]));
  switch (k) {
    case "customer_type":
      return select(q.customerType, (v) => set("customerType", v), "All Customer Type", [
        ["retail", "Buyer / Retail"],
        ["dealer", "Dealer"],
        ["subDealer", "Sub Dealer"],
        ["wholesaler", "Wholesaler"],
      ]);
    case "payment_status":
      return select(q.paymentStatus, (v) => set("paymentStatus", v), "All Payment", [
        ["paid", "Paid"],
        ["partial", "Partial"],
        ["due", "Due"],
      ]);
    case "order_status":
      return select(q.orderStatus, (v) => set("orderStatus", v), "All Status", [
        ["pending", "Pending"],
        ["confirmed", "Confirmed"],
        ["invoiced", "Invoiced"],
        ["received", "Received"],
        ["cancelled", "Cancelled"],
      ]);
    case "paid_by":
      return select(q.paidBy, (v) => set("paidBy", v), "Paid By", [
        ["Cash", "Cash"],
        ["Mobile Banking", "Mobile Banking"],
        ["Card", "Card"],
        ["Bank", "Bank"],
      ]);
    case "customer":
      return select(q.customerId, (v) => set("customerId", v), "Select Customer", pairs(options.customers));
    case "location":
      return select(q.location, (v) => set("location", v), "All Location", pairs(options.locations));
    case "user":
      return select(q.soldBy, (v) => set("soldBy", v), "All User", pairs(options.users));
    case "branch":
      return select(q.showroomId, (v) => set("showroomId", v), "All Branch", pairs(options.branches));
    case "supplier":
      return select(q.supplierId, (v) => set("supplierId", v), "All Supplier", pairs(options.suppliers));
    case "expense_type":
      return select(q.expenseTypeId, (v) => set("expenseTypeId", v), "All Type", pairs(options.expenseTypes));
    case "category":
      return select(q.categoryId, (v) => set("categoryId", v), "All Categories", pairs(options.categories));
    case "brand":
      return select(q.brand, (v) => set("brand", v), "All Brand", pairs(options.brands));
    case "month":
      return <input type="month" className={inputClass} value={q.month} onChange={(e) => set("month", e.target.value)} aria-label="Month" />;
    case "year":
      return select(
        q.year,
        (v) => set("year", v),
        "Select Year",
        Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - i)).map((y) => [y, y]),
      );
    case "search":
      return <input className={inputClass} value={q.search} onChange={(e) => set("search", e.target.value)} placeholder="Search Invoice / Name / Product…" aria-label="Search" />;
    case "dates":
      return <DateRange start={q.from} end={q.to} onStart={(v) => set("from", v)} onEnd={(v) => set("to", v)} />;
    default:
      return null;
  }
}

/** Any report from the report engine, laid out like 360's report pages */
export default function ReportPage() {
  const { key } = useParams();
  const [draft, setDraft] = useState(() => defaultQuery(key));
  const [query, setQuery] = useState(() => defaultQuery(key));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [perPage, setPerPage] = useState(25);
  const [page, setPage] = useState(1);
  const [find, setFind] = useState("");
  const [sort, setSort] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(query).filter(([, v]) => v));
      const { data: res } = await axios.get(`/api/reports/run/${key}`, { params });
      if (!res.success) return showToast("error", res.message || "Could not load the report");
      setData(res);
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not load the report");
    } finally {
      setLoading(false);
    }
  }, [key, query]);

  useEffect(() => {
    load();
  }, [load]);

  const cols = useMemo(() => data?.columns || [], [data]);
  const filters = data?.filters || [];
  const title = data?.title || "Report";
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  // the blue Search box and the column sort work on the loaded rows, like 360
  const rows = useMemo(() => {
    let list = data?.rows || [];
    const t = find.trim().toLowerCase();
    if (t) list = list.filter((r) => cols.some(([k, , type]) => String(text(type, r[k]) ?? "").toLowerCase().includes(t)));
    if (sort) {
      const [k, dir, type] = sort;
      list = [...list].sort((a, b) => {
        const c = numeric(type)
          ? Number(a[k] || 0) - Number(b[k] || 0)
          : type === "date"
            ? new Date(a[k] || 0) - new Date(b[k] || 0)
            : String(a[k] ?? "").localeCompare(String(b[k] ?? ""), undefined, { numeric: true });
        return dir * c;
      });
    }
    return list;
  }, [data, find, sort, cols]);

  const size = perPage === "all" ? rows.length || 1 : perPage;
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, pages);
  const shown = rows.slice((current - 1) * size, current * size);

  const exportData = () => {
    const head = ["Sl", ...cols.map(([, label]) => label)];
    const body = rows.map((r, i) => [i + 1, ...cols.map(([k, , type]) => (numeric(type) ? Number(r[k]) || 0 : text(type, r[k])))]);
    const hasTotals = Object.keys(data?.totals || {}).length > 0;
    const foot = hasTotals ? ["Total", ...cols.map(([k]) => (k in data.totals ? data.totals[k] : ""))] : undefined;
    return [title, head, body, foot];
  };

  const firstTotal = cols.findIndex(([c]) => c in (data?.totals || {}));
  const grp = "flex h-[34px] items-center gap-[5px] bg-[#6c757d] px-[12px] text-[13px] text-white transition hover:bg-[#5a6268] disabled:opacity-60";
  const onFilter = filters.filter((f) => f !== "dates");

  return (
    <section className="border border-[#eef0f3] bg-white p-[16px] shadow-[0_1px_3px_rgba(15,23,42,.06)] sm:p-[22px] dark:border-border dark:bg-card">
      <h1 className="m-0 mb-[14px] text-left text-[20px] font-semibold text-[#343a40] dark:text-foreground">{title}</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(draft);
        }}
      >
        <div className="grid gap-[10px] sm:grid-cols-2 lg:grid-cols-3">
          {onFilter.map((k) => (
            <Filter key={k} k={k} q={draft} set={set} options={data?.options || {}} />
          ))}
          {filters.includes("dates") && <Filter k="dates" q={draft} set={set} options={{}} />}
        </div>
        <div className="mt-[14px] flex justify-center gap-[10px]">
          <button type="submit" className={`${btn.info} min-w-[80px]`}>
            Search
          </button>
          <button
            type="button"
            className={`${btn.warning} min-w-[80px]`}
            onClick={() => {
              const fresh = defaultQuery(key);
              setDraft(fresh);
              setQuery(fresh);
              setPage(1);
              setFind("");
              setSort(null);
            }}
          >
            Clear
          </button>
        </div>
      </form>

      <div className="mt-[22px] flex flex-wrap items-center justify-between gap-[10px]">
        <div className="flex flex-wrap items-center gap-[10px]">
          <label className="flex items-center gap-[6px] text-[14px] text-[#343a40] dark:text-foreground">
            Show
            <select
              className="h-[34px] border border-[#ced4da] bg-white px-[8px] text-[14px] dark:bg-transparent"
              value={perPage}
              onChange={(e) => {
                setPerPage(e.target.value === "all" ? "all" : Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
              <option value="all">All</option>
            </select>
            entries
          </label>
          <div className="flex">
            <button type="button" disabled={!rows.length} className={grp} onClick={() => exportPdf(...exportData())}>
              <FileText size={13} /> PDF
            </button>
            <button
              type="button"
              disabled={!rows.length}
              className={grp}
              onClick={() => {
                const [name, head, body, foot] = exportData();
                exportExcel(`${name}.xlsx`, head, body, foot);
              }}
            >
              <FileSpreadsheet size={13} /> Excel
            </button>
            <button
              type="button"
              disabled={!rows.length}
              className={grp}
              onClick={() => {
                if (!printTable(...exportData())) showToast("error", "Allow pop-ups to print");
              }}
            >
              <Printer size={13} /> Print
            </button>
          </div>
          {loading && data && <span className="text-[12px] text-[#98a6ad]">Refreshing…</span>}
        </div>
        <label className="flex items-center gap-[6px] bg-[#188ae2] px-[6px] py-[4px] text-[14px] text-white">
          Search:
          <input
            className="h-[30px] w-[160px] border-0 bg-white px-[8px] text-[14px] text-[#212529] outline-none"
            value={find}
            onChange={(e) => {
              setFind(e.target.value);
              setPage(1);
            }}
            aria-label="Search table"
          />
        </label>
      </div>

      <div className="mt-[12px] overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm" style={{ minWidth: Math.max(720, (cols.length + 1) * 105) }}>
          <thead>
            <tr className={theadRow}>
              <th className={thClass}>Sl</th>
              {cols.map(([k, label, type]) => (
                <th
                  key={k}
                  className={`${thClass} cursor-pointer select-none ${numeric(type) ? "text-right" : ""}`}
                  onClick={() => setSort((s) => (s?.[0] === k ? [k, -s[1], type] : [k, 1, type]))}
                >
                  {label}
                  <span className="ml-[4px] text-[10px] opacity-70">{sort?.[0] === k ? (sort[1] > 0 ? "▲" : "▼") : "⇅"}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!data &&
              [1, 2, 3].map((i) => (
                <tr key={i}>
                  <td colSpan={9} className={tdClass}>
                    <div className="h-4 animate-pulse bg-slate-100 dark:bg-muted" />
                  </td>
                </tr>
              ))}
            {data && !rows.length && <EmptyRow colSpan={cols.length + 1} title="No data available in table" />}
            {shown.map((r, i) => (
              <tr key={i} className="hover:bg-[#f8fafc] dark:hover:bg-muted/50">
                <td className={tdClass}>{(current - 1) * size + i + 1}</td>
                {cols.map(([k, , type]) => (
                  <td
                    key={k}
                    className={`${tdClass} ${numeric(type) || ["date", "invoice", "status"].includes(type) ? "whitespace-nowrap" : ""} ${numeric(type) ? "text-right" : ""} ${
                      type === "money" && Number(r[k]) < 0 ? "text-[#d63939]" : ""
                    }`}
                  >
                    <Cell type={type} value={r[k]} row={r} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && firstTotal >= 0 && (
            <tfoot>
              <tr className={totalRow}>
                <td className={tdClass}>{firstTotal === 0 ? "Total" : ""}</td>
                {cols.map(([k, , type], i) => (
                  <td key={k} className={`${tdClass} ${numeric(type) ? "text-right" : ""}`}>
                    {k in data.totals ? text(type, data.totals[k]) : i === firstTotal - 1 ? "Total" : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="mt-[14px] flex flex-wrap items-center justify-between gap-[10px] text-[14px] text-[#495057] dark:text-muted-foreground">
        <span>
          Showing {rows.length ? (current - 1) * size + 1 : 0} to {Math.min(current * size, rows.length)} of {rows.length} entries
        </span>
        {pages > 1 && (
          <div className="flex">
            {[
              ["Previous", current - 1],
              ...Array.from({ length: pages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === pages || Math.abs(n - current) <= 2)
                .map((n) => [n, n]),
              ["Next", current + 1],
            ].map(([label, to], i, arr) => (
              <span key={i} className="flex">
                {typeof label === "number" && typeof arr[i - 1]?.[0] === "number" && label - arr[i - 1][0] > 1 && (
                  <span className="flex h-[36px] items-center border border-[#dee2e6] px-[10px]">…</span>
                )}
                <button
                  type="button"
                  disabled={to < 1 || to > pages}
                  onClick={() => setPage(to)}
                  className={`h-[36px] border border-[#dee2e6] px-[12px] ${
                    label === current ? "border-[#007bff] bg-[#007bff] text-white" : "bg-white text-[#6c757d] hover:bg-[#f1f5f9] dark:bg-transparent"
                  } disabled:opacity-50`}
                >
                  {label}
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
