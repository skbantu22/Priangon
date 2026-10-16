"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { CalendarCheck, Check } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { useOpeningStockTill } from "@/lib/posProducts";
import { ListCard, inputClass, money, tdClass, thClass, theadRow, totalRow } from "@/components/ui/Application/Admin/supplier/supplierKit";
import { today } from "@/components/ui/Application/Admin/purchase/purchaseKit";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const STATUS = [
  ["present", "উপস্থিত", "Present", "border-[#2e9b4a] bg-[#2e9b4a] text-white", "text-[#2e9b4a]"],
  ["absent", "অনুপস্থিত", "Absent", "border-[#d9453c] bg-[#d9453c] text-white", "text-[#d9453c]"],
  ["half", "অর্ধদিবস", "Half day", "border-[#e08a00] bg-[#e08a00] text-white", "text-[#c77700]"],
  ["leave", "ছুটি", "Leave", "border-[#1b56d8] bg-[#1b56d8] text-white", "text-[#1b56d8]"],
];

/** Employees → Attendance: mark each day, and see what a month's attendance does to the salary */
export default function AttendancePage() {
  const till = useOpeningStockTill();
  const [tab, setTab] = useState("daily");
  const [everyone, setEveryone] = useState(false);

  // the top shop switch decides whose attendance this is (head office = no shop)
  const scope = everyone ? "" : till.id === "warehouse" ? "head" : till.id;

  return (
    <ListCard
      title="Attendance · হাজিরা"
      actions={
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={everyone} onChange={(e) => setEveryone(e.target.checked)} />
          All branches
        </label>
      }
    >
      <div className="mb-3 flex gap-2">
        {[
          ["daily", "Daily · প্রতিদিন"],
          ["monthly", "Monthly · মাসিক ও বেতন"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`h-10 rounded-lg border px-4 text-sm font-medium ${tab === key ? "border-primary bg-primary text-white" : "bg-white text-gray-700"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "daily" ? <Daily scope={scope} ready={Boolean(till.id) || everyone} /> : <Monthly scope={scope} ready={Boolean(till.id) || everyone} />}
    </ListCard>
  );
}

function Daily({ scope, ready }) {
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState(null);
  const [counts, setCounts] = useState(null);
  const [saving, setSaving] = useState("");

  const load = useCallback(async () => {
    if (!ready) return;
    try {
      const { data } = await axios.get("/api/attendance", { params: { date, showroomId: scope } });
      if (!data.success) throw new Error(data.message);
      setRows(data.data);
      setCounts(data.counts);
    } catch (error) {
      setRows([]);
      showToast("error", error.response?.data?.message || error.message || "Could not load attendance");
    }
  }, [date, scope, ready]);

  useEffect(() => {
    load();
  }, [load]);

  const tally = (list) => {
    const c = { present: 0, absent: 0, half: 0, leave: 0, unmarked: 0 };
    for (const row of list) c[row.status || "unmarked"] += 1;
    return c;
  };

  // marks are saved the moment they are tapped
  const mark = async (employee, status) => {
    const next = employee.status === status ? "clear" : status; // tapping the same mark again takes it off
    setSaving(employee._id);
    try {
      const { data } = await axios.post("/api/attendance", { date, entries: [{ employeeId: employee._id, status: next }] });
      if (!data.success) throw new Error(data.message);
      const updated = rows.map((r) => (r._id === employee._id ? { ...r, status: next === "clear" ? "" : next } : r));
      setRows(updated);
      setCounts(tally(updated));
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message || "Could not save");
    } finally {
      setSaving("");
    }
  };

  const markAllPresent = async () => {
    const pending = (rows || []).filter((r) => !r.status);
    if (!pending.length) return showToast("success", "Everyone is already marked");
    setSaving("all");
    try {
      const { data } = await axios.post("/api/attendance", {
        date,
        entries: pending.map((r) => ({ employeeId: r._id, status: "present" })),
      });
      if (!data.success) throw new Error(data.message);
      showToast("success", `${pending.length} marked present`);
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message || "Could not save");
    } finally {
      setSaving("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" max={today()} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className={`${inputClass} !w-[170px]`} aria-label="Date" />
        <button type="button" onClick={() => setDate(today())} className="h-9 rounded-lg border px-3 text-sm">
          Today
        </button>
        <button
          type="button"
          onClick={markAllPresent}
          disabled={saving === "all" || !rows?.some((r) => !r.status)}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#2e9b4a] px-3 text-sm font-medium text-white disabled:opacity-50"
        >
          <CalendarCheck size={15} /> Mark all present
        </button>
      </div>

      {counts && (
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
          {STATUS.map(([key, bn, en, , tone]) => (
            <div key={key} className="rounded-lg border bg-white px-3 py-2">
              <p className={`m-0 text-xl font-bold tabular-nums ${tone}`}>{counts[key]}</p>
              <p className="m-0 text-[12px] text-[#6b7785]">
                {bn} · {en}
              </p>
            </div>
          ))}
          <div className="rounded-lg border bg-white px-3 py-2">
            <p className="m-0 text-xl font-bold tabular-nums text-[#6b7785]">{counts.unmarked}</p>
            <p className="m-0 text-[12px] text-[#6b7785]">বাকি · Not marked</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {!rows && [1, 2, 3].map((n) => <div key={n} className="h-[76px] animate-pulse rounded-lg bg-slate-100" />)}
        {rows && rows.length === 0 && (
          <p className="rounded-lg border border-dashed py-10 text-center text-sm text-[#6b7785]">
            No active employees here. Add them in Employee List, or tick &ldquo;All branches&rdquo;.
          </p>
        )}
        {rows?.map((employee) => (
          <div key={employee._id} className="flex flex-wrap items-center gap-3 rounded-lg border bg-white p-3 shadow-sm">
            <div className="min-w-0 flex-1 basis-40">
              <p className="m-0 truncate font-medium">{employee.name}</p>
              <p className="m-0 truncate text-[12px] text-[#98a6ad]">{employee.designation}</p>
            </div>
            <div className="grid w-full grid-cols-4 gap-1.5 sm:w-auto">
              {STATUS.map(([key, bn, , active]) => {
                const on = employee.status === key;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={saving === employee._id || saving === "all"}
                    onClick={() => mark(employee, key)}
                    className={`flex h-10 items-center justify-center gap-1 rounded-lg border px-2 text-[13px] font-medium transition disabled:opacity-60 ${on ? active : "bg-white text-gray-700 hover:bg-gray-50"}`}
                  >
                    {on && <Check size={13} />}
                    {bn}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Monthly({ scope, ready }) {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null); // the employee whose year is open
  const years = Array.from({ length: 4 }, (_, i) => String(now.getFullYear() - i));

  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    axios
      .get("/api/attendance/summary", { params: { year, month, showroomId: scope } })
      .then(({ data: res }) => !cancelled && setData(res.success ? res : { data: [], totals: {} }))
      .catch(() => !cancelled && setData({ data: [], totals: {} }));
    return () => {
      cancelled = true;
    };
  }, [year, month, scope, ready]);

  const rows = data?.data;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select value={month} onChange={(e) => setMonth(e.target.value)} className={`${inputClass} !w-[150px]`} aria-label="Month">
          {MONTHS.map((m, i) => (
            <option key={m} value={String(i + 1)}>
              {m}
            </option>
          ))}
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)} className={`${inputClass} !w-[110px]`} aria-label="Year">
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <p className="m-0 border-l-4 border-[#1b56d8] bg-[#eef3ff] px-3 py-2 text-[13px] text-[#2a4aa0]">
        দিনের বেতন = মাসিক বেতন ÷ মাসের দিন। কাটা = দিনের বেতন × (অনুপস্থিত + অর্ধদিবসের অর্ধেক)। উপস্থিত ও ছুটির দিনে কাটা হয় না। যে দিন হাজিরা দেওয়া হয়নি, সেদিন বেতন কাটা হয় না।
        <br />
        Per day = monthly salary ÷ days in the month. Cut = per day × (absent days + ½ for each half day). Present and leave days cost nothing; days not marked are not deducted.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className={theadRow}>
              {["Employee", "Salary", "Present", "Absent", "Half", "Leave", "Not marked", "Per day", "Cut", "Payable"].map((h) => (
                <th key={h} className={thClass}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!rows && (
              <tr>
                <td colSpan={10} className={tdClass}>
                  <div className="h-5 animate-pulse bg-slate-100" />
                </td>
              </tr>
            )}
            {rows?.length === 0 && (
              <tr>
                <td colSpan={10} className={`${tdClass} py-[22px] text-center text-[#6b7785]`}>
                  No active employees here.
                </td>
              </tr>
            )}
            {rows?.map((r) => (
              <tr key={r._id}>
                <td className={tdClass}>
                  <button type="button" onClick={() => setOpen(r)} className="text-left" title="See the year, with the leave dates">
                    <b className="block font-medium text-[#1b56d8] underline-offset-2 hover:underline">{r.name}</b>
                    <span className="text-[12px] text-[#98a6ad]">{r.designation}</span>
                  </button>
                </td>
                <td className={`${tdClass} text-right`}>{money(r.salary)}</td>
                <td className={`${tdClass} text-center text-[#2e9b4a]`}>{r.present}</td>
                <td className={`${tdClass} text-center ${r.absent ? "font-bold text-[#d9453c]" : ""}`}>{r.absent}</td>
                <td className={`${tdClass} text-center ${r.half ? "font-bold text-[#c77700]" : ""}`}>{r.half}</td>
                <td className={`${tdClass} text-center text-[#1b56d8]`}>{r.leave}</td>
                <td className={`${tdClass} text-center ${r.unmarked ? "text-[#c77700]" : "text-[#98a6ad]"}`}>{r.unmarked}</td>
                <td className={`${tdClass} text-right`}>{money(r.perDay)}</td>
                <td className={`${tdClass} text-right ${r.deduction ? "font-bold text-[#d9453c]" : ""}`}>{money(r.deduction)}</td>
                <td className={`${tdClass} text-right font-semibold`}>{money(r.payable)}</td>
              </tr>
            ))}
          </tbody>
          {rows?.length > 0 && (
            <tfoot>
              <tr className={totalRow}>
                <td className={tdClass}>Total</td>
                <td className={`${tdClass} text-right`}>{money(data.totals.salary)}</td>
                <td colSpan={6} />
                <td className={`${tdClass} text-right`}>{money(data.totals.deduction)}</td>
                <td className={`${tdClass} text-right`}>{money(data.totals.payable)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Dialog open={Boolean(open)} onOpenChange={(value) => !value && setOpen(null)}>
        {open && <EmployeeYear key={open._id} employee={open} startYear={year} />}
      </Dialog>
    </div>
  );
}

const fmtDay = (key) => new Date(`${key}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

/** One employee's year: each month's marks, and the dates of leave, absent and half days */
function EmployeeYear({ employee, startYear }) {
  const [year, setYear] = useState(startYear);
  const [data, setData] = useState(null);
  const years = Array.from({ length: 4 }, (_, i) => String(new Date().getFullYear() - i));

  useEffect(() => {
    let cancelled = false;
    axios
      .get("/api/attendance/employee", { params: { employeeId: employee._id, year } })
      .then(({ data: res }) => !cancelled && setData(res.success ? res : { months: [], totals: {} }))
      .catch(() => !cancelled && setData({ months: [], totals: {} }));
    return () => {
      cancelled = true;
    };
  }, [employee._id, year]);

  const used = data?.months?.filter((m) => m.leave || m.absent || m.half || m.present) || [];

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>
          {employee.name} <span className="text-[13px] font-normal text-[#98a6ad]">{employee.designation}</span>
        </DialogTitle>
        <DialogDescription>Attendance for the year, with the dates of leave, absent and half days.</DialogDescription>
      </DialogHeader>

      <select value={year} onChange={(e) => setYear(e.target.value)} className={`${inputClass} !w-[110px]`} aria-label="Year">
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      {data?.totals && (
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            ["Present", data.totals.present, "text-[#2e9b4a]"],
            ["Absent", data.totals.absent, "text-[#d9453c]"],
            ["Half", data.totals.half, "text-[#c77700]"],
            ["Leave", data.totals.leave, "text-[#1b56d8]"],
          ].map(([label, value, tone]) => (
            <div key={label} className="rounded-lg border bg-white px-2 py-2">
              <p className={`m-0 text-xl font-bold tabular-nums ${tone}`}>{value || 0}</p>
              <p className="m-0 text-[12px] text-[#6b7785]">{label}</p>
            </div>
          ))}
        </div>
      )}

      {!data && <div className="h-20 animate-pulse rounded-lg bg-slate-100" />}
      {data && used.length === 0 && <p className="py-6 text-center text-sm text-[#6b7785]">No attendance has been marked in {year}.</p>}

      <div className="space-y-2">
        {used.map((m) => (
          <div key={m.month} className="rounded-lg border bg-white p-3 text-sm">
            <div className="flex items-center justify-between">
              <b>{MONTHS[m.month - 1]}</b>
              <span className="text-[12px] text-[#6b7785]">
                Present {m.present} · Absent {m.absent} · Half {m.half} · Leave {m.leave}
              </span>
            </div>
            {[
              ["Leave", m.leaveDates, "text-[#1b56d8]"],
              ["Absent", m.absentDates, "text-[#d9453c]"],
              ["Half day", m.halfDates, "text-[#c77700]"],
            ]
              .filter(([, dates]) => dates.length)
              .map(([label, dates, tone]) => (
                <p key={label} className="m-0 mt-1 text-[13px]">
                  <span className={`font-medium ${tone}`}>{label}:</span> {dates.map(fmtDay).join(", ")}
                </p>
              ))}
          </div>
        ))}
      </div>
    </DialogContent>
  );
}
