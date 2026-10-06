"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Wrench } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { useOpeningStockTill } from "@/lib/posProducts";

const money = (n) => `৳${Number(n || 0).toLocaleString("en-US")}`;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const dayInput = (d) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const STATUS_LABEL = {
  received: "Received · জমা",
  in_progress: "In progress · চলছে",
  waiting_parts: "Waiting parts · যন্ত্রাংশের অপেক্ষা",
  repaired: "Repaired · ঠিক হয়েছে",
  delivered: "Delivered · ডেলিভারি",
  cancelled: "Cancelled · বাতিল",
};

const inputClass =
  "h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-primary dark:border-white/10 dark:bg-transparent";

const Stat = ({ label, value, tone }) => (
  <div className={`rounded-xl p-4 ${tone}`}>
    <p className="text-2xl font-extrabold tabular-nums">{value}</p>
    <p className="text-sm font-medium opacity-80">{label}</p>
  </div>
);

export default function RepairReportPage() {
  const till = useOpeningStockTill();
  const [start, setStart] = useState(() => {
    const now = new Date();
    return dayInput(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [end, setEnd] = useState(() => dayInput(new Date()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!till.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ showroomId: till.id });
      if (start) params.set("start", start);
      if (end) params.set("end", end);
      const res = await fetch(`/api/reports/repair?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setData(json);
    } catch (err) {
      showToast("error", err.message || "Could not load the repair report");
    } finally {
      setLoading(false);
    }
  }, [till.id, start, end]);

  useEffect(() => {
    load();
  }, [load]);

  const inc = data?.income;
  const received = data?.received || {};
  const takenIn = Object.values(received).reduce((s, r) => s + r.n, 0);
  const owed = Object.values(received).reduce((s, r) => s + r.due, 0);

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold">
            <Wrench className="size-6" /> Repair Report · রিপেয়ার রিপোর্ট
          </h1>
          <p className="text-sm text-muted-foreground">Income from repairs handed back, and what is still owed</p>
        </div>
        <Link href="/admin/repair" className="inline-flex h-10 items-center rounded-lg border border-gray-200 px-4 text-sm font-semibold">
          ← Back to Repair
        </Link>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium">
          <span className="mb-1 block">From</span>
          <input type="date" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="text-sm font-medium">
          <span className="mb-1 block">To</span>
          <input type="date" className={inputClass} value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        {loading && <Loader2 className="mb-2 size-5 animate-spin text-muted-foreground" />}
      </div>

      {inc && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Repair income · মোট আয়" value={money(inc.total)} tone="bg-emerald-50 text-emerald-800" />
            <Stat label="Service charge · সার্ভিস চার্জ" value={money(inc.serviceCharge)} tone="bg-blue-50 text-blue-800" />
            <Stat label="Parts charged · যন্ত্রাংশ" value={money(inc.parts)} tone="bg-amber-50 text-amber-800" />
            <Stat label="Jobs delivered · ডেলিভারি" value={inc.jobs} tone="bg-gray-100 text-gray-800" />
            <Stat label="Collected · আদায়" value={money(inc.paid)} tone="bg-emerald-50 text-emerald-800" />
            <Stat label="Due on delivered · বাকি" value={money(inc.due)} tone="bg-red-50 text-red-800" />
            <Stat label="Taken in · জমা নেওয়া" value={takenIn} tone="bg-blue-50 text-blue-800" />
            <Stat label="Owed on taken-in jobs" value={money(owed)} tone="bg-red-50 text-red-800" />
          </div>

          <section className="rounded-xl border border-gray-200 p-4 dark:border-white/10">
            <h2 className="mb-2 font-semibold">Jobs taken in, by status</h2>
            <div className="flex flex-wrap gap-2 text-sm">
              {Object.entries(STATUS_LABEL).map(([key, label]) => (
                <span key={key} className="rounded-full bg-gray-100 px-3 py-1 dark:bg-white/10">
                  {label}: <b>{received[key]?.n || 0}</b>
                </span>
              ))}
            </div>
          </section>

          <section className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
            <h2 className="p-4 pb-2 font-semibold">By technician · টেকনিশিয়ান অনুযায়ী</h2>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left dark:bg-white/5">
                <tr>
                  <th className="px-4 py-2">Technician</th>
                  <th className="px-4 py-2 text-right">Jobs</th>
                  <th className="px-4 py-2 text-right">Income</th>
                </tr>
              </thead>
              <tbody>
                {data.technicians.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-center text-muted-foreground">Nothing delivered in this range</td>
                  </tr>
                )}
                {data.technicians.map((t) => (
                  <tr key={t.name} className="border-t border-gray-100 dark:border-white/10">
                    <td className="px-4 py-2">{t.name}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{t.jobs}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(t.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
            <h2 className="p-4 pb-2 font-semibold">Delivered jobs · ডেলিভারি হওয়া কাজ</h2>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left dark:bg-white/5">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Job</th>
                  <th className="px-4 py-2">Customer</th>
                  <th className="px-4 py-2">Phone model</th>
                  <th className="px-4 py-2 text-right">Total</th>
                  <th className="px-4 py-2 text-right">Paid</th>
                  <th className="px-4 py-2 text-right">Due</th>
                </tr>
              </thead>
              <tbody>
                {data.jobs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-4 text-center text-muted-foreground">Nothing delivered in this range</td>
                  </tr>
                )}
                {data.jobs.map((j) => (
                  <tr key={j._id} className="border-t border-gray-100 dark:border-white/10">
                    <td className="whitespace-nowrap px-4 py-2">{fmtDate(j.deliveredAt)}</td>
                    <td className="px-4 py-2">{j.jobNumber}</td>
                    <td className="px-4 py-2">{j.customerName}</td>
                    <td className="px-4 py-2">{j.device}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(j.total)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(j.paid)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(j.due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
