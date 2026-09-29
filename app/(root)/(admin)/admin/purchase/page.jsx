"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useSelector } from "react-redux";
import { Plus } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { useOpeningStockTill } from "@/lib/posProducts";
import { ADMIN_PURCHASE_ADD, ADMIN_PURCHASE_RETURN_ADD, ADMIN_PURCHASE_VIEW } from "@/Route/Adminpannelroute";
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
import { PurchasePayDialog } from "@/components/ui/Application/Admin/purchase/purchaseKit";

const EMPTY_FILTERS = { status: "all", paymentStatus: "all", supplierId: "", start: "", end: "", search: "" };

const STOCK_STYLE = {
  pending: "bg-[#fff6dd] text-[#9a6a00]",
  received: "bg-[#e8f7f0] text-[#0b8a45]",
  cancelled: "bg-[#f1f3f5] text-[#6c757d]",
};
const PAY_STYLE = {
  unpaid: "bg-[#fff1f1] text-[#d63939]",
  partial: "bg-[#fff6dd] text-[#9a6a00]",
  paid: "bg-[#e8f7f0] text-[#0b8a45]",
};
const PAY_LABEL = { unpaid: "Due", partial: "Partial Due", paid: "Paid" };
const STOCK_LABEL = { pending: "Pending", received: "Received", cancelled: "Cancelled" };

const invoiceHref = (p) => ADMIN_PURCHASE_VIEW(String(p._id ?? ""));

const INVOICE_LINK_CLASS =
  "relative z-[1] font-semibold text-[#188ae2] underline decoration-[#188ae2]/40 underline-offset-2 hover:decoration-[#188ae2] dark:text-[#5eb8ff]";

const Pill = ({ value, kind }) => {
  const label = kind === "pay" ? PAY_LABEL[value] || value : STOCK_LABEL[value] || value;
  const tone = kind === "pay" ? PAY_STYLE[value] : STOCK_STYLE[value];
  return <span className={`inline-block whitespace-nowrap px-[8px] py-[2px] text-[12px] font-semibold ${tone || ""}`}>{label}</span>;
};

const COLUMNS = ["SL", "Date", "Invoice No", "Reference", "Supplier", "Location", "Items", "Qty", "Total", "Paid", "Due Dismiss", "Due", "Stock", "Payment", "Created By"];

// units that came in, free ones included
const qtyOf = (p) => p.items.reduce((sum, item) => sum + (item.quantity || 0) + (item.extraQty || 0), 0);

const exportRow = (p, index) => [
  index + 1,
  fmtDate(p.purchaseDate),
  p.purchaseNumber,
  p.referenceNo || "",
  p.supplierName,
  p.locationName || (p.showroomId ? "Sale Center" : "Warehouse"),
  p.items.length,
  qtyOf(p),
  p.grandTotal,
  p.paidAmount,
  p.dismissAmount || 0,
  p.dueAmount,
  p.status,
  p.paymentStatus,
  p.createdBy || "",
];

/** "Manage Purchase", laid out like the 360 purchase list */
export default function PurchasePage() {
  const router = useRouter();
  // cancelling is admin only on the API side
  const auth = useSelector((state) => state.authStore.auth);
  const isAdmin = (auth?.data?.user || auth?.user)?.role === "admin";
  const till = useOpeningStockTill();
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

  const [paying, setPaying] = useState(null);

  const params = useCallback(
    (extra) => ({
      showroomId: till.id,
      status: filters.status,
      paymentStatus: filters.paymentStatus,
      ...(filters.supplierId && { supplierId: filters.supplierId }),
      ...(filters.search && { search: filters.search }),
      ...(filters.start && { from: filters.start }),
      ...(filters.end && { to: filters.end }),
      ...extra,
    }),
    [filters, till.id],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/purchase", { params: params({ page, limit }) });
      if (!data.success) return showToast("error", data.message || "Could not load purchases");
      setRows(data.data);
      setTotals(data.totals);
      setMeta({ total: data.total, pages: data.pages, from: data.from });
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not load purchases");
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
        const { data } = await axios.get("/api/purchase", { params: params({ page: p, limit: 100 }) });
        if (!data.success) throw new Error(data.message);
        all.push(...data.data);
        t = data.totals;
        if (!data.hasMore) break;
      }
      const qty = all.reduce((sum, p) => sum + qtyOf(p), 0);
      await handle(all.map(exportRow), ["", "", "Total", "", "", "", qty, t.grandTotal, t.paidAmount, t.dismissAmount, t.dueAmount, "", "", ""]);
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message || "Could not export");
    } finally {
      setBusy(false);
    }
  };

  const act = async (request, success) => {
    setBusy(true);
    try {
      const { data } = await request();
      if (!data.success) return showToast("error", data.message || "Action failed");
      showToast("success", success);
      load();
      return true;
    } catch (error) {
      showToast("error", error.response?.data?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const receive = (p) =>
    confirm(`Receive ${p.purchaseNumber}? Stock will increase.`) && act(() => axios.post(`/api/purchase/receive/${p._id}`, {}), "Stock updated");

  const cancel = (p) =>
    confirm(`Cancel ${p.purchaseNumber}? Received stock will be pulled back out.`) &&
    act(() => axios.delete(`/api/purchase/delete/${p._id}`), "Purchase cancelled");

  const rowActions = (p) => [
    ["View", () => window.open(ADMIN_PURCHASE_VIEW(p._id), "_blank")],
    ["Print Invoice", () => window.open(`${ADMIN_PURCHASE_VIEW(p._id)}?print=1`, "_blank")],
    p.status === "pending" && ["Receive (stock in)", () => receive(p)],
    p.status !== "cancelled" && p.dueAmount > 0 && ["Pay Due", () => setPaying(p)],
    p.status === "received" && ["Return Goods", () => router.push(`${ADMIN_PURCHASE_RETURN_ADD}?supplier=${p.supplierId}`)],
    isAdmin && p.status !== "cancelled" && p.paidAmount === 0 && ["Cancel", () => cancel(p), "danger"],
  ];

  const filtered = filters.search || filters.start || filters.end || filters.supplierId || filters.status !== "all" || filters.paymentStatus !== "all";

  return (
    <div className="space-y-4">
      <ListCard
        title="Purchase List"
        actions={
          <button type="button" onClick={() => router.push(ADMIN_PURCHASE_ADD)} className={btn.primary}>
            <Plus size={14} /> Add Purchase
          </button>
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
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
          <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className={`${inputClass} !w-32`} aria-label="Stock status">
            <option value="all">All Status</option>
            <option value="received">Received</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={draft.paymentStatus} onChange={(e) => setDraft({ ...draft, paymentStatus: e.target.value })} className={`${inputClass} !w-32`} aria-label="Payment">
            <option value="all">All Payment</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
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
            placeholder="Purchase no, invoice no, supplier..."
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
            onPdf={() => withAllRows((body, foot) => exportPdf("Purchase List", COLUMNS, body, foot))}
            onExcel={() => withAllRows((body, foot) => exportExcel("Purchases.xlsx", COLUMNS, body, foot))}
            onPrint={() =>
              withAllRows((body, foot) => {
                if (!printTable("Purchase List", COLUMNS, body, foot)) showToast("error", "Allow pop-ups to print");
              })
            }
          />
          {totals && (
            <span className="flex flex-wrap gap-2 text-[13px]">
              <span className="bg-[#eaf4fd] px-[10px] py-[5px] text-[#188ae2]">Total ৳ {money(totals.grandTotal)}</span>
              <span className="bg-[#e8f7f0] px-[10px] py-[5px] text-[#0b8a45]">Paid ৳ {money(totals.paidAmount)}</span>
              <span className="bg-[#fff1f1] px-[10px] py-[5px] text-[#ff5b5b]">Due ৳ {money(totals.dueAmount)}</span>
            </span>
          )}
        </div>

        {/* Phones: one card per purchase */}
        <div className="mt-3 space-y-2.5 md:hidden">
          {loading && [1, 2, 3].map((n) => <div key={n} className="h-[110px] animate-pulse rounded-[6px] bg-slate-100 dark:bg-muted" />)}
          {!loading && !rows.length && (
            <div className="rounded-[6px] border border-dashed border-[#d4dae0] px-4 py-8 text-center text-[15px] font-medium text-[#495057]">
              {filtered ? "No purchases match these filters" : "No purchases yet"}
            </div>
          )}
          {!loading &&
            rows.map((p) => (
              <article key={p._id} className="rounded-[6px] border border-[#ebeff2] bg-white p-3 dark:border-border dark:bg-card">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <a href={invoiceHref(p)} target="_blank" rel="noopener noreferrer" className={`text-[15px] ${INVOICE_LINK_CLASS}`}>
                      {p.purchaseNumber}
                    </a>
                    <p className="m-0 truncate text-[12px] text-muted-foreground">
                      {p.supplierName} · {fmtDate(p.purchaseDate)} · {p.locationName || "Warehouse"}
                    </p>
                    <span className="mt-1 flex gap-1">
                      <Pill kind="stock" value={p.status} />
                      <Pill kind="pay" value={p.paymentStatus} />
                    </span>
                  </div>
                  <ActionMenu items={rowActions(p)} />
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-1.5 text-[13px]">
                  {[
                    ["Total", p.grandTotal],
                    ["Paid", p.paidAmount],
                    ["Due", p.dueAmount, p.dueAmount > 0 ? "text-[#ff5b5b]" : ""],
                  ].map(([label, value, tone]) => (
                    <div key={label} className="rounded-[4px] bg-[#f7f9fb] px-2 py-1.5 dark:bg-muted">
                      <dt className="text-[11px] text-muted-foreground">{label}</dt>
                      <dd className={`m-0 font-semibold tabular-nums ${tone || ""}`}>{money(value)}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
        </div>

        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1250px] border-collapse text-left text-sm">
            <thead>
              <tr className={theadRow}>
                {["SL", "Date", "Invoice No", "Supplier", "Location", "Qty", "Total", "Paid", "Due Dismiss", "Due", "Stock", "Payment", "Created By", "Action"].map((h) => (
                  <th key={h} className={thClass}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={14} className={tdClass}>
                      <div className="h-4 animate-pulse rounded bg-slate-100 dark:bg-muted" />
                    </td>
                  </tr>
                ))}
              {!loading && !rows.length && (
                <EmptyRow colSpan={14} title={filtered ? "No purchases match these filters" : "No purchases yet"} hint="Record a purchase when goods come in from a supplier." />
              )}
              {!loading &&
                rows.map((p, i) => (
                  <tr key={p._id} className={p.status === "cancelled" ? "bg-[#fff7f7] text-[#98a6ad] dark:bg-red-950/30" : "hover:bg-[#f5f7f9] dark:hover:bg-muted/50"}>
                    <td className={tdClass}>{meta.from + i}</td>
                    <td className={tdClass}>{fmtDate(p.purchaseDate)}</td>
                    <td className={tdClass}>
                      <a href={invoiceHref(p)} target="_blank" rel="noopener noreferrer" className={INVOICE_LINK_CLASS}>
                        {p.purchaseNumber}
                      </a>
                      {p.referenceNo && <span className="block text-xs text-muted-foreground">Ref {p.referenceNo}</span>}
                    </td>
                    <td className={tdClass}>{p.supplierName}</td>
                    <td className={tdClass}>{p.locationName || (p.showroomId ? "Sale Center" : "Warehouse")}</td>
                    <td className={tdClass}>
                      {qtyOf(p)}
                      <span className="block text-xs text-muted-foreground">{p.items.length} product(s)</span>
                    </td>
                    <td className={`${tdClass} font-semibold`}>{money(p.grandTotal)}</td>
                    <td className={tdClass}>{money(p.paidAmount)}</td>
                    <td className={tdClass}>{money(p.dismissAmount)}</td>
                    <td className={`${tdClass} font-semibold ${p.dueAmount > 0 && p.status !== "cancelled" ? "text-[#ff5b5b]" : ""}`}>{money(p.dueAmount)}</td>
                    <td className={tdClass}>
                      <Pill kind="stock" value={p.status} />
                    </td>
                    <td className={tdClass}>
                      <Pill kind="pay" value={p.paymentStatus} />
                    </td>
                    <td className={tdClass}>{p.createdBy || ""}</td>
                    <td className={tdClass}>
                      <ActionMenu items={rowActions(p)} />
                    </td>
                  </tr>
                ))}
            </tbody>
            {!loading && totals && rows.length > 0 && (
              <tfoot>
                <tr className={totalRow}>
                  <td colSpan={6} className={tdClass}>
                    Total {filters.status === "all" && <span className="text-[12px] font-normal">(without cancelled)</span>}
                  </td>
                  <td className={tdClass}>{money(totals.grandTotal)}</td>
                  <td className={tdClass}>{money(totals.paidAmount)}</td>
                  <td className={tdClass}>{money(totals.dismissAmount)}</td>
                  <td className={tdClass}>{money(totals.dueAmount)}</td>
                  <td colSpan={4} className={tdClass} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <Pagination page={page} pages={meta.pages} from={meta.from} count={rows.length} total={meta.total} onPage={setPage} />
      </ListCard>

      <PurchasePayDialog purchase={paying} onClose={() => setPaying(null)} onDone={load} />
    </div>
  );
}
