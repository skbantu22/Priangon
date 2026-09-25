"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Plus } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { bdOperator, isValidBdMobile } from "@/lib/bdFormat";
import { ADMIN_SUPPLIER_LEDGER, ADMIN_SUPPLIER_PAYMENT } from "@/Route/Adminpannelroute";

import {
  ActionMenu,
  DateRange,
  EmptyRow,
  ExportButtons,
  ListCard,
  Pagination,
  btn,
  exportExcel,
  exportPdf,
  inputClass,
  money,
  printTable,
  tdClass,
  thClass,
  theadRow,
  totalRow,
} from "@/components/ui/Application/Admin/supplier/supplierKit";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const SORTS = [
  ["created_desc", "Created DESC"],
  ["created_asc", "Created ASC"],
  ["name_asc", "Name A-Z"],
  ["name_desc", "Name Z-A"],
  ["due_desc", "Due DESC"],
  ["due_asc", "Due ASC"],
];

const EMPTY_FILTERS = { sort: "created_desc", status: "all", start: "", end: "", search: "" };

const emptyForm = {
  name: "",
  companyName: "",
  phone: "",
  email: "",
  address: "",
  openingBalance: "",
  initialAdvance: "",
  openingDate: "",
  srName: "",
  srMobile: "",
  dsrName: "",
  dsrMobile: "",
  note: "",
  isActive: true,
};

const COLUMNS = [
  "SL",
  "Name",
  "Business Name",
  "Mobile",
  "Purchase Total",
  "Purchase Paid",
  "Purchase Due",
  "Advance",
  "Due Dismiss",
  "Received",
  "Total Due",
];

const exportRow = (row, index) => [
  index + 1,
  row.name,
  row.companyName || "",
  row.phone,
  row.balance.total,
  row.balance.paid,
  row.balance.tradeDue,
  row.balance.advance,
  row.balance.dismiss,
  row.balance.received,
  row.balance.due,
];

const exportFoot = (totals) => [
  "",
  "Total",
  "",
  "",
  totals.total,
  totals.paid,
  totals.tradeDue,
  totals.advance,
  totals.dismiss,
  totals.received,
  totals.due,
];

const SupplierPage = () => {
  const router = useRouter();

  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(null);
  const [meta, setMeta] = useState({ total: 0, pages: 1, from: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [limit, setLimit] = useState("20");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState(null);

  const params = useCallback(
    (extra) => ({
      sort: filters.sort,
      status: filters.status,
      ...(filters.search && { search: filters.search }),
      ...(filters.start && { start_date: filters.start }),
      ...(filters.end && { end_date: filters.end }),
      ...extra,
    }),
    [filters],
  );

  const loadSuppliers = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await axios.get("/api/supplier/list", {
        params: params({ page, limit }),
      });

      if (!data.success) {
        showToast("error", data.message || "Could not load suppliers");
        return;
      }

      setRows(data.data);
      setTotals(data.totals);
      setMeta({ total: data.total, pages: data.pages, from: data.from });
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not load suppliers");
    } finally {
      setLoading(false);
    }
  }, [params, page, limit]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

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
    setExporting(true);

    try {
      const { data } = await axios.get("/api/supplier/list", { params: params({ limit: "all" }) });

      if (!data.success) throw new Error(data.message);

      await handle(data.data.map(exportRow), exportFoot(data.totals));
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message || "Could not export");
    } finally {
      setExporting(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (supplier) => {
    setEditingId(supplier._id);
    setForm({
      ...emptyForm,
      ...Object.fromEntries(
        Object.keys(emptyForm).map((key) => [key, supplier[key] ?? emptyForm[key]]),
      ),
      openingBalance: supplier.openingBalance || "",
      initialAdvance: supplier.initialAdvance || "",
      openingDate: supplier.openingDate ? supplier.openingDate.slice(0, 10) : "",
    });
    setDetails(null);
    setFormOpen(true);
  };

  const saveSupplier = async (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.phone.trim()) {
      showToast("error", "Supplier name and mobile are required");
      return;
    }

    if (!isValidBdMobile(form.phone)) {
      showToast("error", "Enter a Bangladeshi mobile number (01XXXXXXXXX)");
      return;
    }

    setSaving(true);

    try {
      const { data } = editingId
        ? await axios.put(`/api/supplier/update/${editingId}`, form)
        : await axios.post("/api/supplier/create", form);

      if (!data.success) {
        showToast("error", data.message || "Could not save supplier");
        return;
      }

      showToast("success", editingId ? "Supplier updated" : "Supplier created");
      setFormOpen(false);
      loadSuppliers();
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not save supplier");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (supplier) => {
    try {
      const { data } = await axios.post(`/api/supplier/${supplier._id}/toggle`);

      showToast(data.success ? "success" : "error", data.message);
      loadSuppliers();
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not update supplier");
    }
  };

  const remove = async (supplier) => {
    if (!confirm(`Move "${supplier.name}" to trash?`)) return;

    try {
      const { data } = await axios.delete(`/api/supplier/delete/${supplier._id}`);

      showToast(data.success ? "success" : "error", data.message);
      if (data.success) loadSuppliers();
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not delete supplier");
    }
  };

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const go = (supplier, type) => router.push(ADMIN_SUPPLIER_PAYMENT(supplier._id, type));

  return (
    <div className="space-y-4">
      <ListCard
        title="Supplier List"
        actions={
          <button type="button" onClick={openCreate} className={btn.primary}>
            <Plus size={14} /> Add New Supplier
          </button>
        }
      >
          <form onSubmit={search} className="flex flex-wrap items-center gap-2">
            <select
              value={limit}
              onChange={(event) => {
                setLimit(event.target.value);
                setPage(1);
              }}
              className={`${inputClass} !w-20`}
            >
              {["10", "20", "50", "100", "all"].map((size) => (
                <option key={size} value={size}>
                  {size === "all" ? "All" : size}
                </option>
              ))}
            </select>

            <select
              value={draft.sort}
              onChange={(event) => setDraft({ ...draft, sort: event.target.value })}
              className={`${inputClass} !w-36`}
            >
              {SORTS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={draft.status}
              onChange={(event) => setDraft({ ...draft, status: event.target.value })}
              className={`${inputClass} !w-32`}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <DateRange
              className="w-full sm:w-[300px]"
              start={draft.start}
              end={draft.end}
              onStart={(value) => setDraft({ ...draft, start: value })}
              onEnd={(value) => setDraft({ ...draft, end: value })}
            />

            <input
              value={draft.search}
              onChange={(event) => setDraft({ ...draft, search: event.target.value })}
              placeholder="Search name, email and phone number..."
              className={`${inputClass} min-w-[220px] flex-1`}
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
              disabled={exporting}
              onPdf={() => withAllRows((body, foot) => exportPdf("Supplier List", COLUMNS, body, foot))}
              onExcel={() =>
                withAllRows((body, foot) => exportExcel("Suppliers.xlsx", COLUMNS, body, foot))
              }
              onPrint={() =>
                withAllRows((body, foot) => {
                  if (!printTable("Supplier List", COLUMNS, body, foot)) {
                    showToast("error", "Allow pop-ups to print");
                  }
                })
              }
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-sm">
              <thead>
                <tr className={theadRow}>
                  <th rowSpan={2} className={thClass}>SL</th>
                  <th rowSpan={2} className={thClass}>Name</th>
                  <th rowSpan={2} className={thClass}>Mobile</th>
                  <th colSpan={3} className={`${thClass} text-center`}>Purchase</th>
                  <th rowSpan={2} className={thClass}>Advance</th>
                  <th rowSpan={2} className={thClass}>Due Dismiss</th>
                  <th rowSpan={2} className={thClass}>Received</th>
                  <th rowSpan={2} className={thClass}>Total Due</th>
                  <th rowSpan={2} className={thClass}>Action</th>
                </tr>
                <tr className={theadRow}>
                  {["Total", "Paid", "Due"].map((head) => (
                    <th key={head} className={thClass}>
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading &&
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={11} className={tdClass}>
                        <div className="h-4 animate-pulse rounded bg-slate-100 dark:bg-muted" />
                      </td>
                    </tr>
                  ))}

                {!loading && rows.length === 0 && (
                  <EmptyRow
                    colSpan={11}
                    title={
                      filters.search || filters.start || filters.end || filters.status !== "all"
                        ? "No suppliers match these filters"
                        : "No suppliers yet"
                    }
                    hint="Add the importers and distributors you buy from."
                  />
                )}

                {!loading &&
                  rows.map((row, index) => (
                    <tr
                      key={row._id}
                      className={row.isActive ? "hover:bg-[#f5f7f9] dark:hover:bg-muted/50" : "bg-[#fff7f7] text-[#98a6ad] dark:bg-red-950/30"}
                    >
                      <td className={tdClass}>{meta.from + index}</td>
                      <td className={tdClass}>
                        <button
                          type="button"
                          onClick={() => setDetails(row)}
                          className="text-left font-medium hover:text-blue-600"
                        >
                          {row.name}
                        </button>
                        {!row.isActive && <span className="ml-1 text-xs text-red-500">(Inactive)</span>}
                        {row.companyName && (
                          <span className="block text-xs text-muted-foreground">{row.companyName}</span>
                        )}
                      </td>
                      <td className={tdClass}>{row.phone}</td>
                      <td className={tdClass}>{money(row.balance.total)}</td>
                      <td className={tdClass}>{money(row.balance.paid)}</td>
                      <td className={tdClass}>{money(row.balance.tradeDue)}</td>
                      <td className={tdClass}>{money(row.balance.advance)}</td>
                      <td className={tdClass}>{money(row.balance.dismiss)}</td>
                      <td className={tdClass}>{money(row.balance.received)}</td>
                      <td
                        className={`${tdClass} font-semibold ${
                          row.balance.due > 0 ? "text-red-600" : row.balance.due < 0 ? "text-green-600" : ""
                        }`}
                      >
                        {money(row.balance.due)}
                      </td>
                      <td className={tdClass}>
                        <ActionMenu
                          items={[
                            ["Show", () => setDetails(row)],
                            ["Edit", () => openEdit(row)],
                            ["Receive", () => go(row, "receive")],
                            ["Pay", () => go(row, "pay")],
                            ["Due Dismiss", () => go(row, "dismiss")],
                            ["Advance", () => go(row, "advance")],
                            [row.isActive ? "Deactivated" : "Active", () => toggle(row)],
                            ["Ledger", () => router.push(ADMIN_SUPPLIER_LEDGER(row._id))],
                            ["Delete", () => remove(row), "danger"],
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
              </tbody>

              {!loading && totals && rows.length > 0 && (
                <tfoot>
                  <tr className={totalRow}>
                    <td colSpan={3} className={tdClass}>Total</td>
                    <td className={tdClass}>{money(totals.total)}</td>
                    <td className={tdClass}>{money(totals.paid)}</td>
                    <td className={tdClass}>{money(totals.tradeDue)}</td>
                    <td className={tdClass}>{money(totals.advance)}</td>
                    <td className={tdClass}>{money(totals.dismiss)}</td>
                    <td className={tdClass}>{money(totals.received)}</td>
                    <td className={tdClass}>{money(totals.due)}</td>
                    <td className={tdClass} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <Pagination
            page={page}
            pages={meta.pages}
            from={meta.from}
            count={rows.length}
            total={meta.total}
            onPage={setPage}
          />
      </ListCard>

      <Dialog open={!!details} onOpenChange={(open) => !open && setDetails(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{details?.name}</DialogTitle>
            <DialogDescription>{details?.companyName}</DialogDescription>
          </DialogHeader>

          {details && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              {[
                ["Mobile", details.phone],
                ["Email", details.email],
                ["Address", details.address],
                ["SR", [details.srName, details.srMobile].filter(Boolean).join(" · ")],
                ["DSR", [details.dsrName, details.dsrMobile].filter(Boolean).join(" · ")],
                ["Opening due", money(details.openingBalance)],
                ["Purchases", `${details.balance.purchaseCount} · ${money(details.balance.purchaseTotal)}`],
                ["Paid", money(details.balance.paid)],
                ["Advance", money(details.balance.advance)],
                ["Total due", money(details.balance.due)],
                ["Note", details.note],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="font-semibold">{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            </dl>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetails(null)}>
              Close
            </Button>
            <Button onClick={() => openEdit(details)}>Edit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <form onSubmit={saveSupplier} noValidate>
            <DialogHeader>
              <DialogTitle>{editingId ? "Update Supplier" : "Create New Supplier"}</DialogTitle>
            </DialogHeader>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-6">
              <Field label="Name" required className="sm:col-span-3">
                <Input value={form.name} onChange={set("name")} placeholder="Name" />
              </Field>
              <Field label="Business Name" className="sm:col-span-3">
                <Input value={form.companyName} onChange={set("companyName")} placeholder="Business Name" />
              </Field>

              <Field label="Email" className="sm:col-span-3">
                <Input type="email" value={form.email} onChange={set("email")} placeholder="Email" />
              </Field>
              <Field label="Mobile" required className="sm:col-span-3">
                <Input value={form.phone} onChange={set("phone")} placeholder="01XXXXXXXXX" />
                {form.phone && bdOperator(form.phone) && (
                  <p className="mt-1 text-xs text-muted-foreground">{bdOperator(form.phone)}</p>
                )}
              </Field>

              <Field label="Address" className="sm:col-span-6">
                <Input value={form.address} onChange={set("address")} placeholder="Address" />
              </Field>

              <Field label="Initial Advance (৳)" className="sm:col-span-2">
                <Input type="number" min="0" step="0.01" value={form.initialAdvance} onChange={set("initialAdvance")} placeholder="Amount" />
              </Field>
              <Field label="Due (৳)" className="sm:col-span-2">
                <Input type="number" min="0" step="0.01" value={form.openingBalance} onChange={set("openingBalance")} placeholder="Amount" />
              </Field>
              <Field label="Date" className="sm:col-span-2">
                <Input type="date" value={form.openingDate} onChange={set("openingDate")} />
              </Field>

              <Field label="SR Name" className="sm:col-span-3">
                <Input value={form.srName} onChange={set("srName")} placeholder="Name" />
              </Field>
              <Field label="SR Mobile" className="sm:col-span-3">
                <Input value={form.srMobile} onChange={set("srMobile")} placeholder="Mobile" />
              </Field>
              <Field label="DSR Name" className="sm:col-span-3">
                <Input value={form.dsrName} onChange={set("dsrName")} placeholder="Name" />
              </Field>
              <Field label="DSR Mobile" className="sm:col-span-3">
                <Input value={form.dsrMobile} onChange={set("dsrMobile")} placeholder="Mobile" />
              </Field>

              <Field label="Note" className="sm:col-span-6">
                <Textarea rows={3} value={form.note} onChange={set("note")} placeholder="Note" />
              </Field>

              <label className="flex items-center gap-2 text-sm sm:col-span-6">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                  className="size-4"
                />
                Active (show while creating a purchase)
              </label>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Close
              </Button>
              <Button type="submit" disabled={saving} className="bg-green-600 text-white hover:bg-green-700">
                {saving ? "Saving..." : editingId ? "Update" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function Field({ label, required, className = "", children }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label>
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
    </div>
  );
}

export default SupplierPage;
