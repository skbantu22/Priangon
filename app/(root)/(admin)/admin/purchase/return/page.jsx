"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Plus } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { ADMIN_PURCHASE_RETURN_ADD, ADMIN_PURCHASE_RETURN_VIEW, ADMIN_SUPPLIER_LEDGER } from "@/Route/Adminpannelroute";
import {
  ActionMenu,
  DateRange,
  EmptyRow,
  ExportButtons,
  ListCard,
  Pagination,
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
  useSupplierOptions,
} from "@/components/ui/Application/Admin/supplier/supplierKit";

const EMPTY_FILTERS = { supplierId: "", start: "", end: "", search: "" };

const COLUMNS = ["SL", "Date", "Return No", "Supplier", "Qty", "Total", "Refund", "Note", "Created By"];

const exportRow = (r, index) => [
  index + 1,
  fmtDate(r.returnDate),
  r.returnNumber,
  r.supplierName,
  r.quantity,
  r.total,
  r.refundAmount || 0,
  r.note || "",
  r.createdBy || "",
];

/** "Purchases Return List": every return sent back to suppliers, with refunds */
export default function PurchaseReturnListPage() {
  const router = useRouter();
  const suppliers = useSupplierOptions();

  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(null);
  const [meta, setMeta] = useState({ total: 0, pages: 1, from: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [limit, setLimit] = useState("20");
  const [page, setPage] = useState(1);

  const params = useCallback(
    (extra) => ({
      ...(filters.supplierId && { supplierId: filters.supplierId }),
      ...(filters.search && { search: filters.search }),
      ...(filters.start && { from: filters.start }),
      ...(filters.end && { to: filters.end }),
      ...extra,
    }),
    [filters],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/purchase-returns", { params: params({ page, limit }) });
      if (!data.success) return showToast("error", data.message || "Could not load returns");
      setRows(data.data);
      setTotals(data.totals);
      setMeta({ total: data.total, pages: data.pages, from: data.from });
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not load returns");
    } finally {
      setLoading(false);
    }
  }, [params, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const search = (event) => {
    event?.preventDefault();
    setPage(1);
    setFilters({ ...draft, search: draft.search.trim() });
  };

  const clear = () => {
    setDraft(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const withAllRows = async (handle) => {
    setBusy(true);
    try {
      const all = [];
      let t = null;
      for (let p = 1; p <= 50; p++) {
        const { data } = await axios.get("/api/purchase-returns", { params: params({ page: p, limit: 100 }) });
        if (!data.success) throw new Error(data.message);
        all.push(...data.data);
        t = data.totals;
        if (!data.hasMore) break;
      }
      const qty = all.reduce((sum, r) => sum + r.quantity, 0);
      await handle(all.map(exportRow), ["", "", "Total", "", qty, t.total, t.refund, "", ""]);
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message || "Could not export");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (r) => {
    if (!confirm(`Delete ${r.returnNumber}? The goods go back into stock and any refund recorded with it is removed.`)) return;
    setBusy(true);
    try {
      const { data } = await axios.delete(`/api/purchase-returns/${r._id}`);
      if (!data.success) return showToast("error", data.message || "Could not delete");
      showToast("success", data.message);
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not delete");
    } finally {
      setBusy(false);
    }
  };

  const rowActions = (r) => [
    ["View", () => router.push(ADMIN_PURCHASE_RETURN_VIEW(r._id))],
    ["Print", () => router.push(`${ADMIN_PURCHASE_RETURN_VIEW(r._id)}?print=1`)],
    ["Supplier Ledger", () => router.push(ADMIN_SUPPLIER_LEDGER(r.supplierId))],
    ["Delete", () => remove(r), "danger"],
  ];

  const filtered = filters.search || filters.start || filters.end || filters.supplierId;

  return (
    <ListCard
      title="Purchases Return List"
      actions={
        <Link href={ADMIN_PURCHASE_RETURN_ADD} className={btn.primary}>
          <Plus size={14} /> Purchase Return
        </Link>
      }
    >
      <form onSubmit={search} className="flex flex-wrap items-center gap-2">
        <select
          value={limit}
          onChange={(e) => {
            setLimit(e.target.value);
            setPage(1);
          }}
          className={`${inputClass} !w-20`}
          aria-label="Rows per page"
        >
          {["10", "20", "50", "100"].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <select value={draft.supplierId} onChange={(e) => setDraft({ ...draft, supplierId: e.target.value })} className={`${inputClass} !w-44`} aria-label="Supplier">
          <option value="">All Supplier</option>
          {suppliers.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
        <DateRange
          className="w-full sm:w-[300px]"
          start={draft.start}
          end={draft.end}
          onStart={(value) => setDraft({ ...draft, start: value })}
          onEnd={(value) => setDraft({ ...draft, end: value })}
        />
        <input
          value={draft.search}
          onChange={(e) => setDraft({ ...draft, search: e.target.value })}
          placeholder="Search return no, purchase no or supplier..."
          className={`${inputClass} min-w-[200px] flex-1`}
        />
        <button type="submit" className={btn.info}>
          Search
        </button>
        <button type="button" onClick={clear} className={btn.warning}>
          Clear
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <ExportButtons
          disabled={busy}
          onPdf={() => withAllRows((body, foot) => exportPdf("Purchase Return List", COLUMNS, body, foot))}
          onExcel={() => withAllRows((body, foot) => exportExcel("PurchaseReturns.xlsx", COLUMNS, body, foot))}
          onPrint={() =>
            withAllRows((body, foot) => {
              if (!printTable("Purchase Return List", COLUMNS, body, foot)) showToast("error", "Allow pop-ups to print");
            })
          }
        />
        {totals && (
          <span className="flex flex-wrap gap-2 text-[13px]">
            <span className="rounded-[4px] bg-[#eaf4fd] px-[10px] py-[5px] text-[#188ae2]">Total Return ৳ {money(totals.total)}</span>
            <span className="rounded-[4px] bg-[#e8f7f0] px-[10px] py-[5px] text-[#0b8a45]">Refund ৳ {money(totals.refund)}</span>
          </span>
        )}
      </div>

      {/* Phones: one card per return */}
      <div className="mt-3 space-y-2.5 md:hidden">
        {loading && [1, 2].map((n) => <div key={n} className="h-[90px] animate-pulse rounded-[6px] bg-slate-100 dark:bg-muted" />)}
        {!loading && !rows.length && (
          <div className="rounded-[6px] border border-dashed border-[#d4dae0] px-4 py-8 text-center text-[15px] font-medium text-[#495057]">
            {filtered ? "No returns match these filters" : "No purchase returns found"}
          </div>
        )}
        {!loading &&
          rows.map((r) => (
            <article key={r._id} className="rounded-[6px] border border-[#ebeff2] bg-white p-3 dark:border-border dark:bg-card">
              <div className="flex items-start gap-2">
                <Link href={ADMIN_PURCHASE_RETURN_VIEW(r._id)} className="min-w-0 flex-1">
                  <b className="block truncate text-[15px]">{r.supplierName}</b>
                  <span className="text-[12px] text-muted-foreground">
                    {r.returnNumber} · {fmtDate(r.returnDate)}
                  </span>
                </Link>
                <ActionMenu items={rowActions(r)} />
              </div>
              <dl className="mt-2 grid grid-cols-3 gap-1.5 text-[13px]">
                {[
                  ["Qty", r.quantity, false],
                  ["Total", money(r.total), false],
                  ["Refund", money(r.refundAmount), true],
                ].map(([label, value, green]) => (
                  <div key={label} className="rounded-[4px] bg-[#f7f9fb] px-2 py-1.5 dark:bg-muted">
                    <dt className="text-[11px] text-muted-foreground">{label}</dt>
                    <dd className={`m-0 font-semibold tabular-nums ${green ? "text-[#0b8a45]" : ""}`}>{value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
      </div>

      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead>
            <tr className={theadRow}>
              {["SL", "Date", "Return No", "Supplier", "Qty", "Total", "Refund", "Note", "Created By", "Action"].map((h) => (
                <th key={h} className={thClass}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={10} className={tdClass}>
                    <div className="h-4 animate-pulse rounded bg-slate-100 dark:bg-muted" />
                  </td>
                </tr>
              ))}
            {!loading && !rows.length && (
              <EmptyRow colSpan={10} title={filtered ? "No returns match these filters" : "No purchase returns found"} hint="Goods sent back to a supplier show here." />
            )}
            {!loading &&
              rows.map((r, i) => (
                <tr key={r._id} className="hover:bg-[#f5f7f9] dark:hover:bg-muted/50">
                  <td className={tdClass}>{meta.from + i}</td>
                  <td className={tdClass}>{fmtDate(r.returnDate)}</td>
                  <td className={tdClass}>
                    <Link href={ADMIN_PURCHASE_RETURN_VIEW(r._id)} className="text-[#188ae2] hover:underline">
                      {r.returnNumber}
                    </Link>
                  </td>
                  <td className={tdClass}>{r.supplierName}</td>
                  <td className={tdClass}>{r.quantity}</td>
                  <td className={`${tdClass} font-semibold`}>{money(r.total)}</td>
                  <td className={`${tdClass} text-[#0b8a45]`}>{money(r.refundAmount)}</td>
                  <td className={`${tdClass} max-w-[220px] truncate`} title={r.note || ""}>
                    {r.note}
                  </td>
                  <td className={tdClass}>{r.createdBy || ""}</td>
                  <td className={tdClass}>
                    <ActionMenu items={rowActions(r)} />
                  </td>
                </tr>
              ))}
          </tbody>
          {!loading && totals && rows.length > 0 && (
            <tfoot>
              <tr className={totalRow}>
                <td colSpan={5} className={tdClass}>
                  Total
                </td>
                <td className={tdClass}>{money(totals.total)}</td>
                <td className={tdClass}>{money(totals.refund)}</td>
                <td colSpan={3} className={tdClass} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Pagination page={page} pages={meta.pages} from={meta.from} count={rows.length} total={meta.total} onPage={setPage} />
    </ListCard>
  );
}
