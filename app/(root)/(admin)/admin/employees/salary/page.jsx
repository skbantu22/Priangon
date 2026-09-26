"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Eye, Trash2, Wallet } from "lucide-react";

import { showToast } from "@/lib/showToast";
import {
  ListCard,
  PAYMENT_METHODS,
  btn,
  fmtDate,
  inputClass,
  methodLabel,
  money,
  tdClass,
  thClass,
  theadRow,
  totalRow,
} from "@/components/ui/Application/Admin/supplier/supplierKit";
import { today } from "@/components/ui/Application/Admin/purchase/purchaseKit";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const cell = `${inputClass} !h-[34px] !w-[110px] text-right`;

/** Employees → All Paid Salary ("Salary Month"): one sheet per month and branch, like 360 */
export default function SalaryPage() {
  const [sheets, setSheets] = useState(null);
  const [paying, setPaying] = useState(false);
  const [viewing, setViewing] = useState(null);

  const [version, setVersion] = useState(0);
  const load = () => setVersion((v) => v + 1);

  useEffect(() => {
    let cancelled = false;
    axios
      .get("/api/salary-sheets")
      .then(({ data }) => !cancelled && setSheets(data.success ? data.data : []))
      .catch(() => !cancelled && setSheets([]));
    return () => {
      cancelled = true;
    };
  }, [version]);

  const remove = async (s) => {
    if (!confirm(`Delete ${MONTHS[s.month - 1]} ${s.year} salary for ${s.branchName}? Use this only to correct a mistake.`)) return;
    try {
      const { data } = await axios.delete(`/api/salary-sheets/${s._id}`);
      showToast(data.success ? "success" : "error", data.message);
      if (data.success) load();
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not delete");
    }
  };

  const total = (sheets || []).reduce((sum, s) => sum + (s.total || 0), 0);

  return (
    <ListCard
      title="Salary Month"
      actions={
        <button type="button" className={btn.primary} onClick={() => setPaying(true)}>
          <Wallet size={14} /> Pay Salary
        </button>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className={theadRow}>
              {["Month", "Year", "Branch", "Employees", "Total Paid", "Paid By", "Paid On", "Action"].map((h) => (
                <th key={h} className={thClass}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!sheets &&
              [1, 2].map((n) => (
                <tr key={n}>
                  <td colSpan={8} className={tdClass}>
                    <div className="h-5 animate-pulse bg-slate-100 dark:bg-muted" />
                  </td>
                </tr>
              ))}
            {sheets && !sheets.length && (
              <tr>
                <td colSpan={8} className={`${tdClass} py-[28px] text-center text-[#6b7785]`}>
                  No salary paid yet. Use Pay Salary to pay the first month.
                </td>
              </tr>
            )}
            {sheets?.map((s) => (
              <tr key={s._id} className="hover:bg-[#f5f7f9] dark:hover:bg-muted/50">
                <td className={tdClass}>{MONTHS[s.month - 1]}</td>
                <td className={tdClass}>{s.year}</td>
                <td className={tdClass}>{s.branchName}</td>
                <td className={tdClass}>{s.count}</td>
                <td className={`${tdClass} text-right font-semibold`}>{money(s.total)}</td>
                <td className={tdClass}>{methodLabel(s.method)}</td>
                <td className={tdClass}>{fmtDate(s.paidDate)}</td>
                <td className={tdClass}>
                  <span className="inline-flex gap-1">
                    <button type="button" onClick={() => setViewing(s)} className={`${btn.info} !px-[10px] !py-[4px] text-[12px]`}>
                      <Eye size={13} /> Details
                    </button>
                    <button type="button" onClick={() => remove(s)} className={`${btn.danger} !px-[10px] !py-[4px] text-[12px]`} aria-label="Delete">
                      <Trash2 size={13} />
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          {sheets?.length > 0 && (
            <tfoot>
              <tr className={totalRow}>
                <td colSpan={4} className={`${tdClass} text-right`}>
                  Total
                </td>
                <td className={`${tdClass} text-right`}>{money(total)}</td>
                <td colSpan={3} className={tdClass} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Dialog open={paying} onOpenChange={setPaying}>
        {paying && (
          <PaySalary
            existing={sheets || []}
            onClose={() => setPaying(false)}
            onDone={() => {
              setPaying(false);
              load();
            }}
          />
        )}
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        {viewing && <SheetDetails key={viewing._id} sheet={viewing} />}
      </Dialog>
    </ListCard>
  );
}

function PaySalary({ onClose, onDone }) {
  const now = new Date();
  const [branches, setBranches] = useState([]);
  const [head, setHead] = useState({ year: String(now.getFullYear()), month: String(now.getMonth() + 1), showroomId: "", method: "cash", paidDate: today(), note: "" });
  const [rows, setRows] = useState(null);
  const [existingId, setExistingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios
      .get("/api/showrooms")
      .then(({ data }) => data.success && setBranches(data.showrooms || []))
      .catch(() => {});
  }, []);

  // everyone active in the branch, with their monthly salary
  useEffect(() => {
    let cancelled = false;
    axios
      .get("/api/salary-sheets", { params: { draft: 1, year: head.year, month: head.month, showroomId: head.showroomId } })
      .then(({ data }) => {
        if (cancelled || !data.success) return;
        setExistingId(data.existingId);
        setRows(data.employees.map((e) => ({ ...e, pay: true, salary: String(e.salary || 0), bonus: "", deduction: "" })));
      })
      .catch(() => !cancelled && setRows([]));
    return () => {
      cancelled = true;
    };
  }, [head.year, head.month, head.showroomId]);

  const net = (r) => Math.max(0, (Number(r.salary) || 0) + (Number(r.bonus) || 0) - (Number(r.deduction) || 0));
  const chosen = useMemo(() => (rows || []).filter((r) => r.pay), [rows]);
  const total = chosen.reduce((sum, r) => sum + net(r), 0);
  const setRow = (id, key, value) => setRows((list) => list.map((r) => (r._id === id ? { ...r, [key]: value } : r)));
  const years = Array.from({ length: 4 }, (_, i) => String(now.getFullYear() - i));

  const save = async () => {
    if (!chosen.length) return showToast("error", "Tick at least one employee to pay");
    setSaving(true);
    try {
      const { data } = await axios.post("/api/salary-sheets", {
        ...head,
        items: chosen.map((r) => ({ employeeId: r._id, salary: Number(r.salary) || 0, bonus: Number(r.bonus) || 0, deduction: Number(r.deduction) || 0 })),
      });
      if (!data.success) return showToast("error", data.message);
      showToast("success", data.message);
      onDone();
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not pay salary");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>Pay Salary</DialogTitle>
        <DialogDescription>Everyone active in the branch is listed with their monthly salary. Add bonus or deduction, untick anyone not paid.</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
        <select value={head.month} onChange={(e) => setHead({ ...head, month: e.target.value })} className={inputClass} aria-label="Month">
          {MONTHS.map((m, i) => (
            <option key={m} value={String(i + 1)}>
              {m}
            </option>
          ))}
        </select>
        <select value={head.year} onChange={(e) => setHead({ ...head, year: e.target.value })} className={inputClass} aria-label="Year">
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select value={head.showroomId} onChange={(e) => setHead({ ...head, showroomId: e.target.value })} className={inputClass} aria-label="Branch">
          <option value="">Head Office</option>
          {branches.map((b) => (
            <option key={b._id} value={b._id}>
              {b.name}
            </option>
          ))}
        </select>
        <select value={head.method} onChange={(e) => setHead({ ...head, method: e.target.value })} className={inputClass} aria-label="Paid by">
          {PAYMENT_METHODS.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <input type="date" max={today()} value={head.paidDate} onChange={(e) => setHead({ ...head, paidDate: e.target.value })} className={`${inputClass} col-span-2`} aria-label="Paid on" />
      </div>

      {existingId && (
        <p className="m-0 border-l-4 border-[#f5c451] bg-[#fff8e6] px-3 py-2 text-[14px] text-[#8a6100]" role="alert">
          {MONTHS[head.month - 1]} {head.year} salary is already paid for this branch. Open it from the list with Details.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-[#f3f6f9] text-left dark:bg-muted [&>th]:border [&>th]:px-[8px] [&>th]:py-[8px]">
              <th className="w-[40px]">
                <input
                  type="checkbox"
                  aria-label="Pay everyone"
                  checked={Boolean(rows?.length) && rows.every((r) => r.pay)}
                  onChange={(e) => setRows((list) => list.map((r) => ({ ...r, pay: e.target.checked })))}
                />
              </th>
              <th>Employee</th>
              <th className="text-right">Salary</th>
              <th className="text-right">Bonus</th>
              <th className="text-right">Deduction</th>
              <th className="text-right">Net Pay</th>
            </tr>
          </thead>
          <tbody>
            {!rows && (
              <tr>
                <td colSpan={6} className="border px-3 py-4">
                  <div className="h-5 animate-pulse bg-slate-100 dark:bg-muted" />
                </td>
              </tr>
            )}
            {rows && !rows.length && (
              <tr>
                <td colSpan={6} className="border py-[22px] text-center text-[14px] text-[#6b7785]">
                  No active employees in this branch. Add them in Employee List.
                </td>
              </tr>
            )}
            {rows?.map((r) => (
              <tr key={r._id} className="[&>td]:border [&>td]:px-[8px] [&>td]:py-[6px]">
                <td>
                  <input type="checkbox" aria-label={`Pay ${r.name}`} checked={r.pay} onChange={(e) => setRow(r._id, "pay", e.target.checked)} />
                </td>
                <td>
                  <b className="block font-medium">{r.name}</b>
                  <span className="text-[12px] text-[#98a6ad]">{r.designation}</span>
                </td>
                {["salary", "bonus", "deduction"].map((k) => (
                  <td key={k} className="text-right">
                    <input type="number" min="0" placeholder="0" disabled={!r.pay} value={r[k]} onChange={(e) => setRow(r._id, k, e.target.value)} className={cell} aria-label={`${r.name} ${k}`} />
                  </td>
                ))}
                <td className="text-right font-semibold">{money(r.pay ? net(r) : 0)}</td>
              </tr>
            ))}
          </tbody>
          {rows?.length > 0 && (
            <tfoot>
              <tr className="bg-[#cbd5e1] font-bold dark:bg-slate-700 [&>td]:border [&>td]:px-[8px] [&>td]:py-[8px]">
                <td colSpan={5} className="text-right">
                  Total ({chosen.length} employee{chosen.length === 1 ? "" : "s"})
                </td>
                <td className="text-right">{money(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <input value={head.note} onChange={(e) => setHead({ ...head, note: e.target.value })} placeholder="Note (optional)" className={inputClass} />

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={saving || Boolean(existingId) || !chosen.length} onClick={save}>
          {saving ? "Paying…" : `Pay ৳${money(total)}`}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function SheetDetails({ sheet }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios
      .get(`/api/salary-sheets/${sheet._id}`)
      .then(({ data: res }) => setData(res.success ? res.data : null))
      .catch(() => setData(null));
  }, [sheet._id]);

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>
          {MONTHS[sheet.month - 1]} {sheet.year} Salary · {sheet.branchName}
        </DialogTitle>
        <DialogDescription>
          Paid {fmtDate(sheet.paidDate)} by {methodLabel(sheet.method)}
          {sheet.createdBy ? ` · ${sheet.createdBy}` : ""}
        </DialogDescription>
      </DialogHeader>
      {!data ? (
        <div className="h-24 animate-pulse bg-slate-100 dark:bg-muted" />
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#f3f6f9] text-left dark:bg-muted [&>th]:border [&>th]:px-[8px] [&>th]:py-[8px]">
              <th>Employee</th>
              <th>Designation</th>
              <th className="text-right">Salary</th>
              <th className="text-right">Bonus</th>
              <th className="text-right">Deduction</th>
              <th className="text-right">Net Pay</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((i) => (
              <tr key={String(i.employeeId)} className="[&>td]:border [&>td]:px-[8px] [&>td]:py-[6px]">
                <td>{i.name}</td>
                <td>{i.designation}</td>
                <td className="text-right">{money(i.salary)}</td>
                <td className="text-right">{money(i.bonus)}</td>
                <td className="text-right">{money(i.deduction)}</td>
                <td className="text-right font-semibold">{money(i.net)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#cbd5e1] font-bold dark:bg-slate-700 [&>td]:border [&>td]:px-[8px] [&>td]:py-[8px]">
              <td colSpan={5} className="text-right">
                Total
              </td>
              <td className="text-right">{money(data.total)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </DialogContent>
  );
}
