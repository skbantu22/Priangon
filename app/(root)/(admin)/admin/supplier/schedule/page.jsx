"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { FiCheck, FiEdit2, FiPlusSquare, FiRotateCcw, FiTrash2 } from "react-icons/fi";

import { showToast } from "@/lib/showToast";

import {
  EmptyRow,
  ListCard,
  btn,
  inputClass,
  tdClass,
  thClass,
  theadRow,
  useSupplierOptions,
} from "@/components/ui/Application/Admin/supplier/supplierKit";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const TABS = [
  ["pending", "Pending"],
  ["done", "Done"],
  ["all", "All"],
];

// datetime-local wants local time, not UTC
const toLocalInput = (value) => {
  const date = value ? new Date(value) : new Date();

  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());

  return date.toISOString().slice(0, 16);
};

const scheduleLabel = (value) =>
  new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

/** Overdue / Today / Upcoming / Done */
function scheduleState(row) {
  if (row.status === "done") return ["Done", "bg-green-100 text-green-700"];

  const day = new Date(row.scheduledAt).toLocaleDateString("en-CA");
  const today = new Date().toLocaleDateString("en-CA");

  if (day < today) return ["Overdue", "bg-red-100 text-red-600"];
  if (day === today) return ["Today", "bg-amber-100 text-amber-700"];

  return ["Upcoming", "bg-blue-100 text-blue-600"];
}

const emptyForm = () => ({ supplierId: "", scheduledAt: toLocalInput(), purpose: "" });

export default function SupplierSchedulePage() {
  const suppliers = useSupplierOptions();

  const [rows, setRows] = useState(null);
  const [counts, setCounts] = useState({});
  const [draft, setDraft] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [status, setStatus] = useState("pending");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/supplier-schedules", {
        params: { status, ...(supplierId && { supplierId }) },
      });

      if (!data.success) {
        showToast("error", data.message || "Could not load schedules");
        return;
      }

      setRows(data.data);
      setCounts(data.counts);
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not load schedules");
    }
  }, [status, supplierId]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id);
    setForm({
      supplierId: row.supplierId?._id || "",
      scheduledAt: toLocalInput(row.scheduledAt),
      purpose: row.purpose || "",
    });
    setFormOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();

    if (!form.supplierId) {
      showToast("error", "Select a supplier");
      return;
    }

    if (!form.scheduledAt) {
      showToast("error", "Schedule date is required");
      return;
    }

    setSaving(true);

    try {
      const body = { ...form, scheduledAt: new Date(form.scheduledAt).toISOString() };

      const { data } = editingId
        ? await axios.put(`/api/supplier-schedules/${editingId}`, body)
        : await axios.post("/api/supplier-schedules", body);

      showToast(data.success ? "success" : "error", data.message);

      if (data.success) {
        setFormOpen(false);
        load();
      }
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not save schedule");
    } finally {
      setSaving(false);
    }
  };

  const mark = async (row, next) => {
    try {
      const { data } = await axios.patch(`/api/supplier-schedules/${row._id}`, { status: next });

      showToast(data.success ? "success" : "error", data.message);
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not update schedule");
    }
  };

  const remove = async (row) => {
    if (!confirm(`Delete this schedule for ${row.supplierId?.name || "the supplier"}?`)) return;

    try {
      const { data } = await axios.delete(`/api/supplier-schedules/${row._id}`);

      showToast(data.success ? "success" : "error", data.message);
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not delete schedule");
    }
  };

  const iconButton =
    "mr-[6px] inline-flex h-[30px] w-[32px] items-center justify-center rounded-[4px] text-white transition active:translate-y-px";

  return (
    <div>
      <ListCard
        title="Supplier Schedule"
        actions={
          <button type="button" onClick={openCreate} className={btn.primary}>
            <FiPlusSquare /> Add Schedule
          </button>
        }
      >
          {/* Searching one supplier shows all of their schedules */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSupplierId(draft);
              if (draft) setStatus("all");
            }}
            className="max-w-xl"
          >
            <label htmlFor="ss-supplier" className="mb-[8px] block text-[14px] font-medium">
              Supplier
            </label>
            <select
              id="ss-supplier"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className={inputClass}
            >
              <option value="">Select Supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier._id} value={supplier._id}>
                  {supplier.name}
                  {supplier.phone ? ` (${supplier.phone})` : ""}
                </option>
              ))}
            </select>

            <div className="mt-[8px] grid grid-cols-2 overflow-hidden rounded-[6px]">
              <button type="submit" className="bg-[#10c469] py-[9px] text-[14px] font-medium text-white hover:bg-[#0dab5b]">
                Search
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft("");
                  setSupplierId("");
                  setStatus("pending");
                }}
                className="bg-[#f9c851] py-[9px] text-[14px] font-medium text-white hover:bg-[#f0b93a]"
              >
                Clear
              </button>
            </div>
          </form>

          <div className="mt-[18px] flex gap-[4px] border-b border-[#e3e8ed] dark:border-border" role="tablist" aria-label="Schedule status">
            {TABS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={status === key}
                onClick={() => setStatus(key)}
                className={`-mb-px flex items-center gap-1.5 border-b-2 px-3.5 py-2 text-sm font-medium ${
                  status === key
                    ? "border-[#188ae2] text-[#188ae2]"
                    : "border-transparent text-[#6c757d] hover:text-foreground"
                }`}
              >
                {label}
                <span
                  className={`min-w-[22px] rounded-full px-[7px] py-px text-center text-[12px] tabular-nums ${
                    status === key ? "bg-[#188ae2] text-white" : "bg-[#eef1f4] text-[#6c757d] dark:bg-muted"
                  }`}
                >
                  {counts[key] ?? "–"}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className={theadRow}>
                  {["Sl", "Supplier", "Schedule Date", "Purpose", "Status", "Action"].map((column) => (
                    <th key={column} className={thClass}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {!rows &&
                  [1, 2, 3].map((n) => (
                    <tr key={n}>
                      <td colSpan={6} className={`${tdClass} h-[46px]`}>
                        <div className="h-4 animate-pulse rounded bg-slate-100 dark:bg-muted" />
                      </td>
                    </tr>
                  ))}

                {rows?.length === 0 && (
                  <EmptyRow
                    colSpan={6}
                    title={
                      status === "done"
                        ? "No finished schedules yet"
                        : supplierId
                          ? "No schedule for this supplier"
                          : "No pending schedules"
                    }
                    hint="Plan a visit or payment date for a supplier."
                  />
                )}

                {rows?.map((row, index) => {
                  const [label, tone] = scheduleState(row);

                  return (
                    <tr key={row._id}>
                      <td className={tdClass}>{index + 1}</td>
                      <td className={tdClass}>
                        {row.supplierId?.name}
                        <span className="block text-xs text-muted-foreground">{row.supplierId?.phone}</span>
                      </td>
                      <td className={`${tdClass} whitespace-nowrap`}>{scheduleLabel(row.scheduledAt)}</td>
                      <td className={tdClass}>{row.purpose}</td>
                      <td className={tdClass}>
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${tone}`}
                          title={row.doneAt ? `Done ${scheduleLabel(row.doneAt)}` : undefined}
                        >
                          {label}
                        </span>
                      </td>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        {row.status === "done" ? (
                          <button
                            type="button"
                            title="Move back to pending"
                            onClick={() => mark(row, "pending")}
                            className={`${iconButton} bg-[#868e96] hover:bg-[#727b84]`}
                          >
                            <FiRotateCcw />
                          </button>
                        ) : (
                          <button
                            type="button"
                            title="Mark as done"
                            onClick={() => mark(row, "done")}
                            className={`${iconButton} bg-[#188ae2] hover:bg-[#1379c7]`}
                          >
                            <FiCheck />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => openEdit(row)}
                          className={`${iconButton} bg-[#10c469] hover:bg-[#0dab5b]`}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => remove(row)}
                          className={`${iconButton} bg-[#ff5b5b] hover:bg-[#f24242]`}
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      </ListCard>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <form onSubmit={save} noValidate>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Supplier Schedule" : "Add Supplier Schedule"}</DialogTitle>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sf-supplier">
                  Supplier<span className="text-red-500">*</span>
                </Label>
                <select
                  id="sf-supplier"
                  value={form.supplierId}
                  onChange={(event) => setForm({ ...form, supplierId: event.target.value })}
                  className={inputClass}
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier._id} value={supplier._id}>
                      {supplier.name}
                      {supplier.phone ? ` (${supplier.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sf-date">
                  Schedule Date<span className="text-red-500">*</span>
                </Label>
                <input
                  id="sf-date"
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sf-purpose">Purpose</Label>
                <input
                  id="sf-purpose"
                  maxLength={255}
                  placeholder="Purpose"
                  value={form.purpose}
                  onChange={(event) => setForm({ ...form, purpose: event.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <button type="button" className={btn.secondary} onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className={btn.success}>
                {saving ? "Saving…" : editingId ? "Update" : "Save"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
