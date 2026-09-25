"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import { ArrowLeft } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { ADMIN_REPORTS } from "@/Route/Adminpannelroute";
import {
  DateRange,
  EmptyRow,
  ExportButtons,
  ListCard,
  btn,
  exportExcel,
  exportPdf,
  fmtDate,
  inputClass,
  money,
  printTable,
  tdClass,
  thClass,
  theadRow,
  totalRow,
} from "@/components/ui/Application/Admin/supplier/supplierKit";
import { toInputDate } from "@/components/ui/Application/Admin/purchase/purchaseKit";

const firstOfMonth = () => {
  const d = new Date();
  return toInputDate(new Date(d.getFullYear(), d.getMonth(), 1));
};

const defaultQuery = () => ({ from: firstOfMonth(), to: toInputDate(new Date()), search: "", showroomId: "" });

const numeric = (type) => type === "money" || type === "rate" || type === "qty";

const show = (type, value) => {
  if (type === "money" || type === "rate") return money(value);
  if (type === "qty") return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (type === "date") return value ? fmtDate(value) : "";
  return value ?? "";
};

/**
 * Any report from the report engine (/api/reports/run/<key>), laid out
 * like 360's: date range and search, exports, and a table with totals.
 */
export default function ReportPage() {
  const { key } = useParams();
  const [draft, setDraft] = useState(defaultQuery);
  const [query, setQuery] = useState(defaultQuery);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showrooms, setShowrooms] = useState([]);

  useEffect(() => {
    axios
      .get("/api/showrooms")
      .then(({ data: res }) => res.success && setShowrooms(res.showrooms || []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await axios.get(`/api/reports/run/${key}`, { params: query });
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

  const columns = data?.columns || [];
  const rows = data?.rows || [];
  const title = data?.title || "Report";
  const hasTotals = rows.length > 0 && Object.keys(data?.totals || {}).length > 0;

  const exportData = () => {
    const head = ["SL", ...columns.map(([, label]) => label)];
    const body = rows.map((row, i) => [i + 1, ...columns.map(([k, , type]) => (numeric(type) ? Number(row[k]) || 0 : show(type, row[k])))]);
    const foot = hasTotals ? ["Total", ...columns.map(([k]) => (k in data.totals ? data.totals[k] : ""))] : undefined;
    const period = data?.dated && (query.from || query.to) ? ` (${query.from || "…"} to ${query.to || "…"})` : "";
    return [`${title}${period}`, head, body, foot];
  };

  return (
    <ListCard
      title={title}
      actions={
        <Link href={ADMIN_REPORTS} className={btn.secondary}>
          <ArrowLeft size={14} /> All Reports
        </Link>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQuery({ ...draft, search: draft.search.trim() });
        }}
        className="flex flex-wrap items-center gap-2"
      >
        {data?.dated !== false && (
          <DateRange
            className="w-full sm:w-[300px]"
            start={draft.from}
            end={draft.to}
            onStart={(value) => setDraft({ ...draft, from: value })}
            onEnd={(value) => setDraft({ ...draft, to: value })}
          />
        )}
        {showrooms.length > 0 && ["Sales", "Dealer / Sub Dealer / Wholesaler"].includes(data?.group) && (
          <select value={draft.showroomId} onChange={(e) => setDraft({ ...draft, showroomId: e.target.value })} className={`${inputClass} !w-44`} aria-label="Showroom">
            <option value="">All Showrooms</option>
            {showrooms.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        <input
          value={draft.search}
          onChange={(e) => setDraft({ ...draft, search: e.target.value })}
          placeholder="Search..."
          className={`${inputClass} min-w-[200px] flex-1`}
        />
        <button type="submit" className={btn.info}>
          Search
        </button>
        <button
          type="button"
          className={btn.warning}
          onClick={() => {
            const fresh = defaultQuery();
            setDraft(fresh);
            setQuery(fresh);
          }}
        >
          Clear
        </button>
      </form>

      <div className="mt-[14px] flex flex-wrap items-center gap-3">
        <ExportButtons
          disabled={!rows.length}
          onPdf={() => exportPdf(...exportData())}
          onExcel={() => {
            const [name, head, body, foot] = exportData();
            exportExcel(`${name}.xlsx`, head, body, foot);
          }}
          onPrint={() => {
            if (!printTable(...exportData())) showToast("error", "Allow pop-ups to print");
          }}
        />
        <span className="text-[12px] text-[#6c757d]">{rows.length} rows</span>
        {loading && data && <span className="ml-auto text-[12px] text-[#98a6ad]">Refreshing…</span>}
      </div>

      <div className="mt-[12px] overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className={theadRow}>
              <th className={thClass}>SL</th>
              {columns.map(([k, label, type]) => (
                <th key={k} className={`${thClass} ${numeric(type) ? "text-right" : ""}`}>
                  {label}
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
            {data && !rows.length && <EmptyRow colSpan={columns.length + 1} title={data.dated ? "No data in this period" : "No data found"} />}
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-[#f5f7f9] dark:hover:bg-muted/50">
                <td className={tdClass}>{i + 1}</td>
                {columns.map(([k, , type]) => (
                  <td
                    key={k}
                    className={`${tdClass} ${numeric(type) ? "text-right" : ""} ${type === "money" && Number(row[k]) < 0 ? "text-[#d63939]" : ""} ${
                      type === "date" ? "whitespace-nowrap" : ""
                    }`}
                  >
                    {show(type, row[k])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {hasTotals && (
            <tfoot>
              <tr className={totalRow}>
                <td className={tdClass}>Total</td>
                {columns.map(([k, , type]) => (
                  <td key={k} className={`${tdClass} text-right`}>
                    {k in data.totals ? show(type, data.totals[k]) : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </ListCard>
  );
}
