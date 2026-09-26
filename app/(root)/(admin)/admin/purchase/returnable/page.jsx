"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";

import { showToast } from "@/lib/showToast";
import { ADMIN_PURCHASE_RETURN_ADD, ADMIN_PURCHASE_VIEW } from "@/Route/Adminpannelroute";
import {
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
  useSupplierOptions,
} from "@/components/ui/Application/Admin/supplier/supplierKit";

const EMPTY_FILTERS = { supplierId: "", search: "" };

const COLUMNS = ["SL", "Purchase Date", "Invoice No", "Supplier", "Product", "Barcode", "Bought", "Returned", "Returnable", "Price"];

const exportRow = (r, index) => [
  index + 1,
  fmtDate(r.purchaseDate),
  r.purchaseNumber,
  r.supplierName,
  [r.productName, r.variantLabel].filter(Boolean).join(" "),
  r.barcode || r.sku,
  r.bought,
  r.returned,
  r.returnable,
  r.unitPrice,
];

/** "Returnable": purchased rows that can still go back — not yet returned and still in stock */
export default function ReturnablePage() {
  const router = useRouter();
  const suppliers = useSupplierOptions();

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pages: 1, from: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [limit, setLimit] = useState("50");
  const [page, setPage] = useState(1);

  const params = useCallback(
    (extra) => ({
      ...(filters.supplierId && { supplierId: filters.supplierId }),
      ...(filters.search && { search: filters.search }),
      ...extra,
    }),
    [filters],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/purchase-returns/returnable", { params: params({ page, limit }) });
      if (!data.success) return showToast("error", data.message || "Could not load");
      setRows(data.data);
      setMeta({ total: data.total, pages: data.pages, from: data.from });
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not load");
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
      for (let p = 1; p <= 20; p++) {
        const { data } = await axios.get("/api/purchase-returns/returnable", { params: params({ page: p, limit: 500 }) });
        if (!data.success) throw new Error(data.message);
        all.push(...data.data);
        if (!data.hasMore) break;
      }
      await handle(all.map(exportRow));
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message || "Could not export");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ListCard title="Returnable">
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
          {["20", "50", "100", "200"].map((size) => (
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
        <input
          value={draft.search}
          onChange={(e) => setDraft({ ...draft, search: e.target.value })}
          placeholder="Search product, SKU or invoice..."
          className={`${inputClass} min-w-[200px] flex-1`}
        />
        <button type="submit" className={btn.info}>
          Search
        </button>
        <button type="button" onClick={clear} className={btn.warning}>
          Clear
        </button>
      </form>

      <div className="mt-4">
        <ExportButtons
          disabled={busy}
          onPdf={() => withAllRows((body) => exportPdf("Returnable Products", COLUMNS, body))}
          onExcel={() => withAllRows((body) => exportExcel("Returnable.xlsx", COLUMNS, body))}
          onPrint={() =>
            withAllRows((body) => {
              if (!printTable("Returnable Products", COLUMNS, body)) showToast("error", "Allow pop-ups to print");
            })
          }
        />
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead>
            <tr className={theadRow}>
              {["SL", "Purchase Date", "Invoice No", "Supplier", "Product", "Bought", "Returned", "Returnable", "Price", "Action"].map((h) => (
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
            {!loading && !rows.length && <EmptyRow colSpan={10} title="No returnable products" hint="Everything bought has already been returned or sold." />}
            {!loading &&
              rows.map((r, i) => (
                <tr key={r.key} className="hover:bg-[#f5f7f9] dark:hover:bg-muted/50">
                  <td className={tdClass}>{meta.from + i}</td>
                  <td className={tdClass}>{fmtDate(r.purchaseDate)}</td>
                  <td className={tdClass}>
                    <Link href={ADMIN_PURCHASE_VIEW(r.purchaseId)} className="text-[#188ae2] hover:underline">
                      {r.purchaseNumber}
                    </Link>
                  </td>
                  <td className={tdClass}>
                    {r.supplierName}
                    <span className="block text-[12px] text-[#98a6ad]">Stock at {r.location}</span>
                  </td>
                  <td className={tdClass}>
                    {r.productName}
                    {r.variantLabel && <span className="text-[#6c757d]"> ({r.variantLabel})</span>}
                    <span className="block text-[12px] text-[#98a6ad]">{r.barcode || r.sku}</span>
                  </td>
                  <td className={tdClass}>{r.bought}</td>
                  <td className={tdClass}>{r.returned}</td>
                  <td className={`${tdClass} font-semibold`}>
                    {r.returnable}
                    {r.returnable < r.bought - r.returned && <span className="block text-[11px] font-normal text-[#f9a825]">limited by stock</span>}
                  </td>
                  <td className={tdClass}>{money(r.unitPrice)}</td>
                  <td className={tdClass}>
                    <button
                      type="button"
                      className={`${btn.danger} !px-[10px] !py-[4px] text-[12px]`}
                      disabled={r.returnable <= 0}
                      onClick={() => router.push(`${ADMIN_PURCHASE_RETURN_ADD}?supplier=${r.supplierId}`)}
                    >
                      Return
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pages={meta.pages} from={meta.from} count={rows.length} total={meta.total} onPage={setPage} />
    </ListCard>
  );
}
