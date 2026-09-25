"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Plus } from "lucide-react";

import { showToast } from "@/lib/showToast";
import {
  ADMIN_PURCHASE_ADD,
  ADMIN_PURCHASE_ORDER_ADD,
  ADMIN_PURCHASE_ORDER_EDIT,
  ADMIN_PURCHASE_ORDER_VIEW,
} from "@/Route/Adminpannelroute";
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
import { ORDER_STATUS_STYLE, today } from "@/components/ui/Application/Admin/purchase/purchaseKit";

const EMPTY_FILTERS = { status: "", supplierId: "", start: "", end: "", search: "" };


const COLUMNS = ["SL", "Date", "Delivery Date", "P.O. Invoice No", "Supplier", "Amount", "Status", "Purchase No", "Created By"];

const exportRow = (o, index) => [
  index + 1,
  fmtDate(o.orderDate),
  fmtDate(o.deliveryDate),
  o.orderNumber,
  o.supplierName,
  o.total,
  o.status,
  o.purchaseNumber || "",
  o.createdBy || "",
];

/** "Manage Purchase Orders": status, delivery date and the receive → purchase flow */
export default function PurchaseOrderListPage() {
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
      ...(filters.status && { status: filters.status }),
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
      const { data } = await axios.get("/api/purchase-orders", { params: params({ page, limit }) });
      if (!data.success) return showToast("error", data.message || "Could not load purchase orders");
      setRows(data.data);
      setTotals(data.totals);
      setMeta({ total: data.total, pages: data.pages, from: data.from });
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not load purchase orders");
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
        const { data } = await axios.get("/api/purchase-orders", { params: params({ page: p, limit: 100 }) });
        if (!data.success) throw new Error(data.message);
        all.push(...data.data);
        t = data.totals;
        if (!data.hasMore) break;
      }
      await handle(all.map(exportRow), ["", "", "", "Total", "", t.total, "", "", ""]);
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message || "Could not export");
    } finally {
      setBusy(false);
    }
  };

  const act = async (request) => {
    setBusy(true);
    try {
      const { data } = await request();
      if (!data.success) return showToast("error", data.message || "Action failed");
      showToast("success", data.message);
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const cancel = (o) =>
    confirm(`Cancel ${o.orderNumber}? It stays in the list as cancelled.`) && act(() => axios.post(`/api/purchase-orders/${o._id}/cancel`));

  const remove = (o) => confirm(`Delete ${o.orderNumber}?`) && act(() => axios.delete(`/api/purchase-orders/${o._id}`));

  const rowActions = (o) => [
    ["View", () => router.push(ADMIN_PURCHASE_ORDER_VIEW(o._id))],
    o.status === "pending" && ["Receive", () => router.push(`${ADMIN_PURCHASE_ADD}?po=${o._id}`)],
    o.status === "pending" && ["Edit", () => router.push(ADMIN_PURCHASE_ORDER_EDIT(o._id))],
    o.status === "pending" && ["Cancel", () => cancel(o)],
    o.status !== "received" && ["Delete", () => remove(o), "danger"],
  ];

  const late = (o) => o.status === "pending" && o.deliveryDate && new Date(o.deliveryDate).toISOString().slice(0, 10) < today();

  const filtered = filters.search || filters.start || filters.end || filters.supplierId || filters.status;

  return (
    <ListCard
      title="Purchase Order List"
      actions={
        <Link href={ADMIN_PURCHASE_ORDER_ADD} className={btn.primary}>
          <Plus size={14} /> Add New
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
        <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className={`${inputClass} !w-36`} aria-label="Status">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
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
          placeholder="Search P.O. no, reference or supplier..."
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
          onPdf={() => withAllRows((body, foot) => exportPdf("Purchase Order List", COLUMNS, body, foot))}
          onExcel={() => withAllRows((body, foot) => exportExcel("PurchaseOrders.xlsx", COLUMNS, body, foot))}
          onPrint={() =>
            withAllRows((body, foot) => {
              if (!printTable("Purchase Order List", COLUMNS, body, foot)) showToast("error", "Allow pop-ups to print");
            })
          }
        />
        {totals && <span className="rounded-[4px] bg-[#eaf4fd] px-[10px] py-[5px] text-[13px] text-[#188ae2]">Total ৳ {money(totals.total)}</span>}
      </div>

      {/* Phones: one card per order */}
      <div className="mt-3 space-y-2.5 md:hidden">
        {loading && [1, 2].map((n) => <div key={n} className="h-[90px] animate-pulse rounded-[6px] bg-slate-100 dark:bg-muted" />)}
        {!loading && !rows.length && (
          <div className="rounded-[6px] border border-dashed border-[#d4dae0] px-4 py-8 text-center text-[15px] font-medium text-[#495057]">
            {filtered ? "No purchase orders match these filters" : "No purchase orders"}
          </div>
        )}
        {!loading &&
          rows.map((o) => (
            <article key={o._id} className="rounded-[6px] border border-[#ebeff2] bg-white p-3 dark:border-border dark:bg-card">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-[15px]">{o.supplierName}</b>
                  <span className="text-[12px] text-muted-foreground">
                    {o.orderNumber} · {fmtDate(o.orderDate)} → {fmtDate(o.deliveryDate)}
                  </span>
                </div>
                <ActionMenu items={rowActions(o)} />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className={`rounded-[4px] px-2 py-0.5 text-[12px] font-semibold capitalize ${ORDER_STATUS_STYLE[o.status]}`}>{o.status}</span>
                <b className="tabular-nums">৳ {money(o.total)}</b>
              </div>
            </article>
          ))}
      </div>

      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead>
            <tr className={theadRow}>
              {["SL", "Date", "Delivery Date", "P.O. Invoice No", "Supplier", "Amount", "Status", "Created By", "Action"].map((h) => (
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
                  <td colSpan={9} className={tdClass}>
                    <div className="h-4 animate-pulse rounded bg-slate-100 dark:bg-muted" />
                  </td>
                </tr>
              ))}
            {!loading && !rows.length && (
              <EmptyRow colSpan={9} title={filtered ? "No purchase orders match these filters" : "No purchase orders"} hint="Write an order when you ask a supplier for goods." />
            )}
            {!loading &&
              rows.map((o, i) => (
                <tr key={o._id} className="hover:bg-[#f5f7f9] dark:hover:bg-muted/50">
                  <td className={tdClass}>{meta.from + i}</td>
                  <td className={tdClass}>{fmtDate(o.orderDate)}</td>
                  <td className={`${tdClass} ${late(o) ? "font-semibold text-[#ff5b5b]" : ""}`} title={late(o) ? "Delivery is late" : undefined}>
                    {fmtDate(o.deliveryDate)}
                  </td>
                  <td className={tdClass}>
                    <Link href={ADMIN_PURCHASE_ORDER_VIEW(o._id)} className="text-[#188ae2] hover:underline">
                      {o.orderNumber}
                    </Link>
                    {o.purchaseNumber && <span className="block text-xs text-muted-foreground">→ {o.purchaseNumber}</span>}
                  </td>
                  <td className={tdClass}>{o.supplierName}</td>
                  <td className={`${tdClass} font-semibold`}>{money(o.total)}</td>
                  <td className={tdClass}>
                    <span className={`rounded-[4px] px-2 py-0.5 text-[12px] font-semibold capitalize ${ORDER_STATUS_STYLE[o.status]}`}>{o.status}</span>
                  </td>
                  <td className={tdClass}>{o.createdBy || ""}</td>
                  <td className={tdClass}>
                    <ActionMenu items={rowActions(o)} />
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
