"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Trash2 } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { DateRange, ExportButtons, ListCard, btn, exportExcel, exportPdf, fmtDate, inputClass, methodLabel, money, printTable, tdClass, thClass, theadRow, totalRow } from "@/components/ui/Application/Admin/supplier/supplierKit";

const TYPE_LABEL = { retail: "Buyer", dealer: "Dealer", subDealer: "Sub Dealer", wholesaler: "Wholesaler" };
const COLUMNS = ["Sl", "Date", "Return No", "Invoice", "Customer", "Type", "Qty", "Total", "Refund", "Refund By", "Note", "By"];

/** Sales Return List, like 360's */
export default function SaleReturnListPage() {
  const [rows, setRows] = useState(null);
  const [draft, setDraft] = useState({ from: "", to: "", search: "" });
  const [filters, setFilters] = useState(draft);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    axios
      .get("/api/sale-returns", { params: Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) })
      .then(({ data }) => !cancelled && setRows(data.success ? data.data : []))
      .catch(() => !cancelled && setRows([]));
    return () => {
      cancelled = true;
    };
  }, [filters, version]);

  const remove = async (r) => {
    if (!confirm(`Delete ${r.returnNumber}? The goods leave stock again and its refund is removed.`)) return;
    try {
      const { data } = await axios.delete(`/api/sale-returns/${r._id}`);
      showToast(data.success ? "success" : "error", data.message);
      if (data.success) setVersion((v) => v + 1);
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not delete");
    }
  };

  const list = rows || [];
  const sum = (key) => list.reduce((total, r) => total + (r[key] || 0), 0);
  const exportRows = () =>
    list.map((r, i) => [i + 1, fmtDate(r.returnDate), r.returnNumber, r.orderNumber, r.customerName, TYPE_LABEL[r.customerType] || "Buyer", r.qty, r.total, r.refundAmount, methodLabel(r.refundMethod), r.note, r.createdBy]);

  return (
    <ListCard title="Sales Return List">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setFilters({ ...draft, search: draft.search.trim() });
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <DateRange className="w-full sm:w-[300px]" start={draft.from} end={draft.to} onStart={(v) => setDraft({ ...draft, from: v })} onEnd={(v) => setDraft({ ...draft, to: v })} />
        <input value={draft.search} onChange={(e) => setDraft({ ...draft, search: e.target.value })} placeholder="Return no, invoice, customer, IMEI..." className={`${inputClass} min-w-[200px] flex-1`} />
        <button type="submit" className={btn.info}>
          Search
        </button>
      </form>

      <div className="mt-4">
        <ExportButtons
          disabled={!list.length}
          onPdf={() => exportPdf("Sales Return List", COLUMNS, exportRows())}
          onExcel={() => exportExcel("SalesReturns.xlsx", COLUMNS, exportRows())}
          onPrint={() => {
            if (!printTable("Sales Return List", COLUMNS, exportRows())) showToast("error", "Allow pop-ups to print");
          }}
        />
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
          <thead>
            <tr className={theadRow}>
              {[...COLUMNS, "Action"].map((h) => (
                <th key={h} className={thClass}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!rows &&
              [1, 2].map((n) => (
                <tr key={n}>
                  <td colSpan={13} className={tdClass}>
                    <div className="h-4 animate-pulse bg-slate-100 dark:bg-muted" />
                  </td>
                </tr>
              ))}
            {rows && !list.length && (
              <tr>
                <td colSpan={13} className={`${tdClass} py-[26px] text-center text-[#6b7785]`}>
                  No sales returns yet. Open a sale in the Sale List and choose Sale Return.
                </td>
              </tr>
            )}
            {list.map((r, i) => (
              <tr key={r._id} className="hover:bg-[#f5f7f9] dark:hover:bg-muted/50">
                <td className={tdClass}>{i + 1}</td>
                <td className={tdClass}>{fmtDate(r.returnDate)}</td>
                <td className={tdClass}>{r.returnNumber}</td>
                <td className={tdClass}>
                  <a href={`/admin/print/${r.saleId}`} target="_blank" rel="noreferrer" className="text-[#188ae2] hover:underline">
                    {r.orderNumber}
                  </a>
                </td>
                <td className={tdClass}>{r.customerName}</td>
                <td className={tdClass}>{TYPE_LABEL[r.customerType] || "Buyer"}</td>
                <td className={tdClass}>{r.qty}</td>
                <td className={`${tdClass} font-semibold`}>{money(r.total)}</td>
                <td className={`${tdClass} text-[#0b8a45]`}>{money(r.refundAmount)}</td>
                <td className={tdClass}>{r.refundAmount ? methodLabel(r.refundMethod) : ""}</td>
                <td className={`${tdClass} max-w-[180px] truncate`} title={r.note}>
                  {r.note}
                </td>
                <td className={tdClass}>{r.createdBy}</td>
                <td className={tdClass}>
                  <button type="button" onClick={() => remove(r)} className={`${btn.danger} !px-[10px] !py-[4px] text-[12px]`}>
                    <Trash2 size={13} /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {list.length > 0 && (
            <tfoot>
              <tr className={totalRow}>
                <td colSpan={6} className={`${tdClass} text-right`}>
                  Total
                </td>
                <td className={tdClass}>{sum("qty")}</td>
                <td className={tdClass}>{money(sum("total"))}</td>
                <td className={tdClass}>{money(sum("refundAmount"))}</td>
                <td colSpan={4} className={tdClass} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </ListCard>
  );
}
