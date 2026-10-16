"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import { ArrowLeft, CalendarCheck, Pencil } from "lucide-react";

import { ADMIN_EMPLOYEES, ADMIN_EMPLOYEE_ATTENDANCE, ADMIN_EMPLOYEE_EDIT } from "@/Route/Adminpannelroute";
import { fmtDate, inputClass, money, tdClass, thClass, theadRow, totalRow } from "@/components/ui/Application/Admin/supplier/supplierKit";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const Stat = ({ label, value, tone = "" }) => (
  <div className="rounded-lg border bg-white px-3 py-2.5">
    <p className={`m-0 text-xl font-bold tabular-nums ${tone}`}>{value}</p>
    <p className="m-0 text-[12px] text-[#6b7785]">{label}</p>
  </div>
);

/** One employee: who they are, and their year month by month (attendance, salary, commission) */
export default function EmployeePage() {
  const { id } = useParams();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const years = Array.from({ length: 4 }, (_, i) => String(new Date().getFullYear() - i));

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`/api/employees/${id}/report`, { params: { year } })
      .then(({ data: res }) => {
        if (cancelled) return;
        if (res.success) {
          setData(res);
          setError("");
        } else setError(res.message || "Could not load");
      })
      .catch((err) => !cancelled && setError(err.response?.data?.message || "Could not load the report"));
    return () => {
      cancelled = true;
    };
  }, [id, year]);

  if (error && !data) {
    return (
      <p className="rounded-lg bg-white p-6 text-center text-[#d9453c]" role="alert">
        {error}
      </p>
    );
  }

  if (!data) return <div className="h-[420px] animate-pulse rounded-lg bg-white" />;

  const { employee: e, months, totals } = data;
  const used = months.some((m) => m.present || m.absent || m.half || m.leave || m.salaryPaid || m.commissionEarned || m.commissionPaid);

  return (
    <div className="space-y-4">
      <Link href={ADMIN_EMPLOYEES} className="inline-flex items-center gap-1.5 text-sm text-[#1b56d8]">
        <ArrowLeft size={15} /> Employee List
      </Link>

      <section className="flex flex-wrap items-center gap-4 rounded-lg border bg-white p-4 shadow-sm">
        {e.picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.picture} alt="" className="size-20 rounded-full border object-cover" />
        ) : (
          <span className="flex size-20 items-center justify-center rounded-full bg-[#1b56d8] text-3xl font-bold text-white">{String(e.name || "?").slice(0, 1)}</span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="m-0 text-[22px] font-bold">{e.name}</h1>
          <p className="m-0 text-[14px] text-[#6b7785]">
            {e.designation} · {e.branch}
          </p>
          <p className="m-0 mt-1 text-[13px] text-[#444]">
            {e.mobile}
            {e.email ? ` · ${e.email}` : ""}
          </p>
          <p className="m-0 text-[13px] text-[#444]">
            Joined {fmtDate(e.joiningDate)} · Monthly salary <b>{money(e.salary)}</b> ·{" "}
            <span className={e.isActive ? "font-semibold text-[#10b759]" : "font-semibold text-[#98a6ad]"}>{e.isActive ? "Active" : "Inactive"}</span>
          </p>
          {(e.address || e.nid) && (
            <p className="m-0 text-[12px] text-[#98a6ad]">
              {e.address}
              {e.address && e.nid ? " · " : ""}
              {e.nid ? `NID ${e.nid}` : ""}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={ADMIN_EMPLOYEE_ATTENDANCE} className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm">
            <CalendarCheck size={15} /> Attendance
          </Link>
          <Link href={ADMIN_EMPLOYEE_EDIT(e._id)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm">
            <Pencil size={15} /> Edit
          </Link>
        </div>
      </section>

      <div className="flex items-center gap-2">
        <h2 className="m-0 text-[17px] font-semibold">Monthly report · মাসওয়ারি রিপোর্ট</h2>
        <select value={year} onChange={(ev) => setYear(ev.target.value)} className={`${inputClass} !w-[100px]`} aria-label="Year">
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
        <Stat label="Present · উপস্থিত" value={totals.present} tone="text-[#2e9b4a]" />
        <Stat label="Leave · ছুটি" value={totals.leave} tone="text-[#1b56d8]" />
        <Stat label="Absent · অনুপস্থিত" value={totals.absent} tone="text-[#d9453c]" />
        <Stat label="Half day · অর্ধদিবস" value={totals.half} tone="text-[#c77700]" />
        <Stat label="Salary paid · বেতন" value={money(totals.salaryNet)} />
        <Stat label="Cut for absence" value={money(totals.attendanceCut)} tone="text-[#d9453c]" />
        <Stat label="Commission earned" value={money(totals.commissionEarned)} />
        <Stat label="Commission due (all time)" value={money(data.commissionDue)} tone={data.commissionDue > 0 ? "text-[#d9453c]" : ""} />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead>
            <tr className={theadRow}>
              {["Month", "Present", "Leave", "Absent", "Half", "Not marked", "Cut", "Salary paid", "Bonus", "Deducted", "Net paid", "Paid on", "Comm. earned", "Comm. paid"].map((h) => (
                <th key={h} className={thClass}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {months.map((m) => {
              const p = m.salaryPaid;
              return (
                <tr key={m.month} className="hover:bg-[#f5f7f9]">
                  <td className={`${tdClass} font-medium`}>{MONTHS[m.month - 1]}</td>
                  <td className={`${tdClass} text-center text-[#2e9b4a]`}>{m.present || "–"}</td>
                  <td className={`${tdClass} text-center text-[#1b56d8]`}>{m.leave || "–"}</td>
                  <td className={`${tdClass} text-center ${m.absent ? "font-bold text-[#d9453c]" : "text-[#98a6ad]"}`}>{m.absent || "–"}</td>
                  <td className={`${tdClass} text-center ${m.half ? "font-bold text-[#c77700]" : "text-[#98a6ad]"}`}>{m.half || "–"}</td>
                  <td className={`${tdClass} text-center ${m.unmarked ? "text-[#c77700]" : "text-[#98a6ad]"}`}>{m.unmarked || "–"}</td>
                  <td className={`${tdClass} text-right ${m.attendanceCut ? "text-[#d9453c]" : "text-[#98a6ad]"}`}>{m.attendanceCut ? money(m.attendanceCut) : "–"}</td>
                  <td className={`${tdClass} text-right`}>{p ? money(p.salary) : "–"}</td>
                  <td className={`${tdClass} text-right`}>{p?.bonus ? money(p.bonus) : "–"}</td>
                  <td className={`${tdClass} text-right`}>{p?.deduction ? money(p.deduction) : "–"}</td>
                  <td className={`${tdClass} text-right font-semibold`}>{p ? money(p.net) : <span className="font-normal text-[#98a6ad]">Not paid</span>}</td>
                  <td className={tdClass}>{p ? fmtDate(p.paidDate) : "–"}</td>
                  <td className={`${tdClass} text-right`}>{m.commissionEarned ? money(m.commissionEarned) : "–"}</td>
                  <td className={`${tdClass} text-right`}>{m.commissionPaid ? money(m.commissionPaid) : "–"}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className={totalRow}>
              <td className={tdClass}>Total {year}</td>
              <td className={`${tdClass} text-center`}>{totals.present}</td>
              <td className={`${tdClass} text-center`}>{totals.leave}</td>
              <td className={`${tdClass} text-center`}>{totals.absent}</td>
              <td className={`${tdClass} text-center`}>{totals.half}</td>
              <td className={tdClass} />
              <td className={`${tdClass} text-right`}>{money(totals.attendanceCut)}</td>
              <td className={tdClass} />
              <td className={`${tdClass} text-right`}>{money(totals.bonus)}</td>
              <td className={`${tdClass} text-right`}>{money(totals.deduction)}</td>
              <td className={`${tdClass} text-right`}>{money(totals.salaryNet)}</td>
              <td className={tdClass} />
              <td className={`${tdClass} text-right`}>{money(totals.commissionEarned)}</td>
              <td className={`${tdClass} text-right`}>{money(totals.commissionPaid)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {!used && <p className="m-0 text-center text-sm text-[#6b7785]">No attendance, salary or commission recorded in {year} yet.</p>}

      <p className="m-0 text-[12px] text-[#98a6ad]">
        Attendance counts only the days that were marked. &ldquo;Cut&rdquo; is what the month&apos;s absent and half days cost on the salary; &ldquo;Deducted&rdquo; is what was actually taken off when the salary was paid.
      </p>
    </div>
  );
}
