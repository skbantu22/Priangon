"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { HandCoins, Plus } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { ExportButtons, ListCard, btn, exportExcel, exportPdf, money, printTable, tdClass, thClass, theadRow, totalRow } from "@/components/ui/Application/Admin/supplier/supplierKit";
import { Dialog } from "@/components/ui/dialog";
import CommissionDialog from "@/components/ui/Application/Admin/employee/CommissionDialog";

const COLUMNS = ["SI", "Employee Name", "Mobile", "Email", "Designation", "Total Commission", "Paid", "Due"];

/** Employees → Sales Commissions: earned / paid / due per employee, like 360 */
export default function SalesCommissionsPage() {
  const [rows, setRows] = useState(null);
  const [term, setTerm] = useState("");
  const [dialog, setDialog] = useState(null); // { employee, type }

  const [version, setVersion] = useState(0);
  const load = () => setVersion((v) => v + 1);

  useEffect(() => {
    let cancelled = false;
    axios
      .get("/api/commissions")
      .then(({ data }) => !cancelled && setRows(data.success ? data.data : []))
      .catch(() => !cancelled && setRows([]));
    return () => {
      cancelled = true;
    };
  }, [version]);

  const shown = useMemo(() => {
    const t = term.trim().toLowerCase();
    return (rows || []).filter((r) => !t || [r.name, r.mobile, r.email, r.designation].join(" ").toLowerCase().includes(t));
  }, [rows, term]);

  const sum = (key) => shown.reduce((total, r) => total + (r[key] || 0), 0);
  const exportRows = () => shown.map((r, i) => [i + 1, r.name, r.mobile, r.email || "", r.designation, r.earned, r.paid, r.due]);

  return (
    <ListCard title="Employee Sale Commission List">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ExportButtons
          disabled={!shown.length}
          onPdf={() => exportPdf("Employee Sale Commission List", COLUMNS, exportRows())}
          onExcel={() => exportExcel("Commissions.xlsx", COLUMNS, exportRows())}
          onPrint={() => {
            if (!printTable("Employee Sale Commission List", COLUMNS, exportRows())) showToast("error", "Allow pop-ups to print");
          }}
        />
        <label className="flex items-center gap-[8px] bg-[#188ae2] py-[3px] pl-[8px] pr-[3px] text-[14px] text-white sm:w-[300px]">
          Search:
          <input value={term} onChange={(e) => setTerm(e.target.value)} aria-label="Search commissions" className="h-[32px] min-w-0 flex-1 border-0 bg-white px-[10px] text-[14px] text-[#1f2933] outline-none" />
        </label>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-sm">
          <thead>
            <tr className={theadRow}>
              {["SI", "Employee Name", "Mobile", "Email", "Designation", "Total Commission", "Paid", "Due", "Action"].map((h) => (
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
                  {term ? "No matching employee" : "No employees yet — add them in Employee List."}
                </td>
              </tr>
            )}
            {shown.map((r, i) => (
              <tr key={r._id} className="hover:bg-[#f5f7f9] dark:hover:bg-muted/50">
                <td className={tdClass}>{i + 1}</td>
                <td className={tdClass}>{r.name}</td>
                <td className={tdClass}>{r.mobile}</td>
                <td className={tdClass}>{r.email}</td>
                <td className={tdClass}>{r.designation}</td>
                <td className={`${tdClass} text-right`}>{money(r.earned)}</td>
                <td className={`${tdClass} text-right text-[#0b8a45]`}>{money(r.paid)}</td>
                <td className={`${tdClass} text-right font-semibold ${r.due > 0 ? "text-[#d63939]" : ""}`}>{money(r.due)}</td>
                <td className={tdClass}>
                  <span className="inline-flex gap-1">
                    <button type="button" onClick={() => setDialog({ employee: r, type: "earned" })} className={`${btn.info} !px-[10px] !py-[4px] text-[12px]`}>
                      <Plus size={13} /> Add
                    </button>
                    <button
                      type="button"
                      disabled={r.due <= 0}
                      title={r.due <= 0 ? "Nothing due" : "Pay commission"}
                      onClick={() => setDialog({ employee: r, type: "paid" })}
                      className={`${btn.success} !px-[10px] !py-[4px] text-[12px]`}
                    >
                      <HandCoins size={13} /> Pay
                    </button>
                  </span>
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
                <td className={`${tdClass} text-right`}>{money(sum("earned"))}</td>
                <td className={`${tdClass} text-right`}>{money(sum("paid"))}</td>
                <td className={`${tdClass} text-right`}>{money(sum("due"))}</td>
                <td className={tdClass} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        {dialog && (
          <CommissionDialog
            key={`${dialog.employee._id}:${dialog.type}`}
            employee={dialog.employee}
            type={dialog.type}
            onClose={() => setDialog(null)}
            onDone={() => {
              setDialog(null);
              load();
            }}
          />
        )}
      </Dialog>
    </ListCard>
  );
}
