"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Trash2 } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { ExportButtons, ListCard, btn, exportExcel, exportPdf, fmtDate, methodLabel, money, printTable, tdClass, thClass, theadRow, totalRow } from "@/components/ui/Application/Admin/supplier/supplierKit";

const TABS = [
  ["paid", "Commission Paid"],
  ["earned", "Commission Given"],
];

/** Employees → Commission Payments: every commission paid (or given), with delete, like 360 */
export default function CommissionPaymentsPage() {
  const [tab, setTab] = useState("paid");
  const [rows, setRows] = useState(null);
  const [term, setTerm] = useState("");

  const [version, setVersion] = useState(0);
  const load = () => setVersion((v) => v + 1);

  useEffect(() => {
    let cancelled = false;
    axios
      .get("/api/commissions", { params: { list: tab } })
      .then(({ data }) => !cancelled && setRows(data.success ? data.data : []))
      .catch(() => !cancelled && setRows([]));
    return () => {
      cancelled = true;
    };
  }, [tab, version]);

  const shown = useMemo(() => {
    const t = term.trim().toLowerCase();
    return (rows || []).filter((r) => !t || [r.employeeId?.name, r.reference, r.note, r.createdBy].join(" ").toLowerCase().includes(t));
  }, [rows, term]);

  const total = shown.reduce((sum, r) => sum + (r.amount || 0), 0);
  const paid = tab === "paid";
  const COLUMNS = ["SI", "Date", "Employee", "Designation", paid ? "Paid By" : "For", "Amount", "Note", "Entered By"];
  const exportRows = () =>
    shown.map((r, i) => [i + 1, fmtDate(r.date), r.employeeId?.name || "", r.employeeId?.designation || "", paid ? methodLabel(r.method) : r.reference, r.amount, r.note, r.createdBy]);

  const remove = async (r) => {
    if (!confirm(`Delete this ৳${money(r.amount)} ${paid ? "payment" : "commission"} of ${r.employeeId?.name}?`)) return;
    try {
      const { data } = await axios.delete(`/api/commissions/${r._id}`);
      showToast(data.success ? "success" : "error", data.message);
      if (data.success) load();
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not delete");
    }
  };

  return (
    <ListCard title="Commission Payments">
      <div className="mb-3 flex flex-wrap gap-2">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" onClick={() => {
              setRows(null);
              setTab(key);
            }} className={tab === key ? btn.primary : `${btn.secondary} opacity-80`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ExportButtons
          disabled={!shown.length}
          onPdf={() => exportPdf("Commission Payments", COLUMNS, exportRows())}
          onExcel={() => exportExcel("CommissionPayments.xlsx", COLUMNS, exportRows())}
          onPrint={() => {
            if (!printTable("Commission Payments", COLUMNS, exportRows())) showToast("error", "Allow pop-ups to print");
          }}
        />
        <label className="flex items-center gap-[8px] bg-[#188ae2] py-[3px] pl-[8px] pr-[3px] text-[14px] text-white sm:w-[300px]">
          Search:
          <input value={term} onChange={(e) => setTerm(e.target.value)} aria-label="Search payments" className="h-[32px] min-w-0 flex-1 border-0 bg-white px-[10px] text-[14px] text-[#1f2933] outline-none" />
        </label>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
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
                  <td colSpan={9} className={tdClass}>
                    <div className="h-5 animate-pulse bg-slate-100 dark:bg-muted" />
                  </td>
                </tr>
              ))}
            {rows && !shown.length && (
              <tr>
                <td colSpan={9} className={`${tdClass} py-[26px] text-center text-[#6b7785]`}>
                  {term ? "No matching entry" : paid ? "No commission paid yet — pay from Sales Commissions." : "No commission given yet — add from Sales Commissions."}
                </td>
              </tr>
            )}
            {shown.map((r, i) => (
              <tr key={r._id} className="hover:bg-[#f5f7f9] dark:hover:bg-muted/50">
                <td className={tdClass}>{i + 1}</td>
                <td className={tdClass}>{fmtDate(r.date)}</td>
                <td className={tdClass}>{r.employeeId?.name}</td>
                <td className={tdClass}>{r.employeeId?.designation}</td>
                <td className={tdClass}>{paid ? methodLabel(r.method) : r.reference}</td>
                <td className={`${tdClass} text-right font-semibold`}>{money(r.amount)}</td>
                <td className={tdClass}>{r.note}</td>
                <td className={tdClass}>{r.createdBy}</td>
                <td className={tdClass}>
                  <button type="button" onClick={() => remove(r)} className={`${btn.danger} !px-[10px] !py-[4px] text-[12px]`}>
                    <Trash2 size={13} /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {shown.length > 0 && (
            <tfoot>
              <tr className={totalRow}>
                <td colSpan={5} className={`${tdClass} text-right`}>
                  Total
                </td>
                <td className={`${tdClass} text-right`}>{money(total)}</td>
                <td colSpan={3} className={tdClass} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </ListCard>
  );
}
