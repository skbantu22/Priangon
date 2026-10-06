"use client";

import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import Link from "next/link";
import { BarChart3, Loader2, Plus, Search, Trash2, Wrench } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { useOpeningStockTill } from "@/lib/posProducts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STATUS = {
  received: ["Received · জমা", "bg-blue-50 text-blue-700"],
  in_progress: ["In progress · চলছে", "bg-amber-50 text-amber-700"],
  waiting_parts: ["Waiting parts · যন্ত্রাংশের অপেক্ষা", "bg-orange-50 text-orange-700"],
  repaired: ["Repaired · ঠিক হয়েছে", "bg-emerald-50 text-emerald-700"],
  delivered: ["Delivered · ডেলিভারি", "bg-gray-100 text-gray-700"],
  cancelled: ["Cancelled · বাতিল", "bg-red-50 text-red-700"],
};

const COMMON_ISSUES = [
  "Display / touch",
  "Battery",
  "Charging port",
  "Speaker / mic",
  "Camera",
  "Software / hang",
  "Not powering on",
  "Water damage",
];

const money = (n) => `৳${Number(n || 0).toLocaleString("en-US")}`;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const dayInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

const EMPTY = {
  customerName: "",
  phone: "",
  device: "",
  imei: "",
  issue: "",
  accessories: "",
  note: "",
  status: "received",
  technicianId: "",
  technicianName: "",
  estimate: "",
  serviceCharge: "",
  parts: [],
  paid: "",
  receivedAt: dayInput(new Date()),
  expectedAt: "",
};

const inputClass =
  "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-primary dark:border-white/10 dark:bg-transparent";

const Field = ({ label, children, className = "" }) => (
  <label className={`block text-sm font-medium ${className}`}>
    <span className="mb-1 block">{label}</span>
    {children}
  </label>
);

function Stat({ label, value, tone }) {
  return (
    <div className={`rounded-xl p-4 ${tone}`}>
      <p className="text-2xl font-extrabold tabular-nums">{value}</p>
      <p className="text-sm font-medium opacity-80">{label}</p>
    </div>
  );
}

export default function RepairPage() {
  const till = useOpeningStockTill();
  const auth = useSelector((s) => s.authStore.auth);
  const userName = auth?.data?.user?.name || auth?.user?.name || "";

  const [jobs, setJobs] = useState([]);
  const [counts, setCounts] = useState({});
  const [summary, setSummary] = useState({ due: 0, todayIn: 0, todayEarned: 0 });
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [technicians, setTechnicians] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!till.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ showroomId: till.id });
      if (status) params.set("status", status);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/repair?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setJobs(data.jobs);
      setCounts(data.counts);
      setSummary(data.summary);
    } catch (err) {
      showToast("error", err.message || "Could not load repair jobs");
    } finally {
      setLoading(false);
    }
  }, [till.id, status, search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  // technicians come from the employee list; if it can't be read the name is typed instead
  useEffect(() => {
    fetch("/api/employees?status=active")
      .then((r) => r.json())
      .then((d) => d.success && setTechnicians(d.data || []))
      .catch(() => {});
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY, receivedAt: dayInput(new Date()) });
    setOpen(true);
  };

  const openEdit = (job) => {
    setEditing(job);
    setForm({
      ...EMPTY,
      ...job,
      technicianId: job.technicianId || "",
      estimate: job.estimate || "",
      serviceCharge: job.serviceCharge || "",
      paid: job.paid || "",
      parts: job.parts || [],
      receivedAt: dayInput(job.receivedAt),
      expectedAt: dayInput(job.expectedAt),
    });
    setOpen(true);
  };

  const pickTechnician = (e) => {
    const id = e.target.value;
    const emp = technicians.find((t) => t._id === id);
    setForm((f) => ({ ...f, technicianId: id, technicianName: emp?.name || "" }));
  };

  const setPart = (i, key, value) =>
    setForm((f) => ({ ...f, parts: f.parts.map((p, n) => (n === i ? { ...p, [key]: value } : p)) }));

  const partsTotal = form.parts.reduce((s, p) => s + (Number(p.price) || 0), 0);
  const total = (Number(form.serviceCharge) || 0) + partsTotal;
  const due = Math.max(0, total - (Number(form.paid) || 0));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form, showroomId: till.id, receivedBy: userName };
      const res = await fetch(editing ? `/api/repair/${editing._id}` : "/api/repair", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast("success", data.message);
      setOpen(false);
      load();
    } catch (err) {
      showToast("error", err.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (job, next) => {
    try {
      const res = await fetch(`/api/repair/${job._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      load();
    } catch (err) {
      showToast("error", err.message || "Could not change the status");
    }
  };

  const remove = async (job) => {
    if (!window.confirm(`Remove job ${job.jobNumber}?`)) return;
    const res = await fetch(`/api/repair/${job._id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.success) return showToast("error", data.message);
    showToast("success", data.message);
    load();
  };

  const running = (counts.received || 0) + (counts.in_progress || 0) + (counts.waiting_parts || 0);

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold">
            <Wrench className="size-6" /> Repair · রিপেয়ার
          </h1>
          <p className="text-sm text-muted-foreground">Phones brought in for repair, who is fixing them and what is owed</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/reports/repair"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-4 text-sm font-semibold"
          >
            <BarChart3 className="size-4" /> Report
          </Link>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white"
          >
            <Plus className="size-4" /> New Job
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Taken in today · আজ জমা" value={summary.todayIn} tone="bg-blue-50 text-blue-800" />
        <Stat label="Running · চলমান" value={running} tone="bg-amber-50 text-amber-800" />
        <Stat label="Ready to deliver · ডেলিভারির অপেক্ষায়" value={counts.repaired || 0} tone="bg-emerald-50 text-emerald-800" />
        <Stat label="Repair due · বাকি" value={money(summary.due)} tone="bg-red-50 text-red-800" />
      </div>
      <p className="text-sm text-muted-foreground">Delivered today: {money(summary.todayEarned)}</p>

      <div className="flex flex-wrap items-center gap-2">
        {[["", "All"], ...Object.entries(STATUS).map(([k, v]) => [k, v[0].split(" · ")[0]])].map(([key, label]) => (
          <button
            key={key || "all"}
            type="button"
            onClick={() => setStatus(key)}
            className={`rounded-full border px-3 py-1 text-sm font-medium ${
              status === key ? "border-primary bg-primary text-white" : "border-gray-200 bg-white text-gray-700"
            }`}
          >
            {label}
            {key && counts[key] ? ` ${counts[key]}` : ""}
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, phone, model, IMEI, job no..."
            className={`${inputClass} pl-9`}
          />
        </div>
      </div>

      {loading ? (
        <p className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> Loading...
        </p>
      ) : jobs.length === 0 ? (
        <p className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">
          No repair jobs yet. Press “New Job” when a phone comes in.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => {
            const [label, tone] = STATUS[job.status] || STATUS.received;
            return (
              <div key={job._id} className="space-y-2 rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{job.device}</p>
                    <p className="truncate text-sm">
                      {job.customerName}
                      {job.phone ? ` · ${job.phone}` : ""}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span>
                </div>
                <p className="text-sm text-gray-700">{job.issue}</p>
                <div className="grid grid-cols-2 gap-x-3 text-xs text-gray-600">
                  <span>Job: {job.jobNumber}</span>
                  <span>In: {fmtDate(job.receivedAt)}</span>
                  <span>Technician: {job.technicianName || "—"}</span>
                  <span>Due date: {fmtDate(job.expectedAt)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <span>Total {money(job.total || job.estimate)}</span>
                  <span>Paid {money(job.paid)}</span>
                  <span className={job.due > 0 ? "font-bold text-red-600" : "text-emerald-700"}>
                    Due {money(job.due)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={job.status}
                    onChange={(e) => changeStatus(job, e.target.value)}
                    className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm"
                  >
                    {Object.entries(STATUS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v[0]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => openEdit(job)}
                    className="h-9 rounded-lg border border-primary px-3 text-sm font-semibold text-primary"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(job)}
                    aria-label="Remove"
                    className="ml-auto flex size-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit job ${editing.jobNumber}` : "New repair job"}</DialogTitle>
            <DialogDescription>The parts you list only add to the bill; they are not taken out of stock.</DialogDescription>
          </DialogHeader>

          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <Field label="Customer name *">
              <input className={inputClass} value={form.customerName} onChange={set("customerName")} required />
            </Field>
            <Field label="Mobile">
              <input className={inputClass} value={form.phone} onChange={set("phone")} placeholder="01XXXXXXXXX" />
            </Field>
            <Field label="Phone brand / model *">
              <input className={inputClass} value={form.device} onChange={set("device")} required placeholder="e.g. Samsung A15" />
            </Field>
            <Field label="IMEI (optional)">
              <input className={inputClass} value={form.imei} onChange={set("imei")} placeholder="Leave empty if unknown" />
            </Field>

            <div className="sm:col-span-2">
              <span className="mb-1 block text-sm font-medium">Problem *</span>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {COMMON_ISSUES.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, issue: i }))}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      form.issue === i ? "border-primary bg-primary text-white" : "border-gray-200 bg-white text-gray-600"
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
              <input className={inputClass} value={form.issue} onChange={set("issue")} required />
            </div>

            <Field label="Came with the phone (SIM, cover...)">
              <input className={inputClass} value={form.accessories} onChange={set("accessories")} />
            </Field>
            <Field label="Technician · টেকনিশিয়ান">
              {technicians.length ? (
                <select className={inputClass} value={form.technicianId} onChange={pickTechnician}>
                  <option value="">Not assigned</option>
                  {technicians.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input className={inputClass} value={form.technicianName} onChange={set("technicianName")} />
              )}
            </Field>

            <Field label="Date received">
              <input type="date" className={inputClass} value={form.receivedAt} onChange={set("receivedAt")} />
            </Field>
            <Field label="Promised date">
              <input type="date" className={inputClass} value={form.expectedAt} onChange={set("expectedAt")} />
            </Field>

            <Field label="Estimate (৳)">
              <input type="number" min="0" className={inputClass} value={form.estimate} onChange={set("estimate")} />
            </Field>
            <Field label="Status">
              <select className={inputClass} value={form.status} onChange={set("status")}>
                {Object.entries(STATUS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v[0]}
                  </option>
                ))}
              </select>
            </Field>

            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Parts used · যন্ত্রাংশ</span>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, parts: [...f.parts, { name: "", price: "" }] }))}
                  className="text-sm font-semibold text-primary"
                >
                  + Add part
                </button>
              </div>
              {form.parts.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className={inputClass}
                    placeholder="Part (screen, battery...)"
                    value={p.name}
                    onChange={(e) => setPart(i, "name", e.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    className={`${inputClass} max-w-32`}
                    placeholder="Price"
                    value={p.price}
                    onChange={(e) => setPart(i, "price", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, parts: f.parts.filter((_, n) => n !== i) }))}
                    className="px-2 text-red-600"
                    aria-label="Remove part"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <Field label="Service charge (৳)">
              <input type="number" min="0" className={inputClass} value={form.serviceCharge} onChange={set("serviceCharge")} />
            </Field>
            <Field label="Paid so far / advance (৳)">
              <input type="number" min="0" className={inputClass} value={form.paid} onChange={set("paid")} />
            </Field>

            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm sm:col-span-2">
              <span>Total {money(total)}</span>
              <span className={due > 0 ? "font-bold text-red-600" : "text-emerald-700"}>Due {money(due)}</span>
            </div>

            <Field label="Note" className="sm:col-span-2">
              <textarea rows={2} className={`${inputClass} h-auto py-2`} value={form.note} onChange={set("note")} />
            </Field>

            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-lg border px-4 text-sm">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving && <Loader2 className="size-4 animate-spin" />} Save
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
