"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Plus } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { bdOperator, isValidBdMobile } from "@/lib/bdFormat";
import { CUSTOMER_TYPES } from "@/lib/priceTiers";
import { ADMIN_CUSTOMER_LEDGER, ADMIN_CUSTOMER_PAYMENT } from "@/Route/Adminpannelroute";

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
  fmtDate,
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
  ["sale_desc", "Most bought"],
  ["recent", "Last sale"],
];

const EMPTY_FILTERS = { sort: "created_desc", status: "all", due: false, start: "", end: "", search: "" };

const TYPE_STYLE = {
  retail: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200",
  dealer: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200",
  subDealer: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200",
  wholesaler: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
};

const TypeBadge = ({ type }) => (
  <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${TYPE_STYLE[type] || TYPE_STYLE.retail}`}>
    {CUSTOMER_TYPES[type]?.short || "Buyer"}
  </span>
);

const emptyForm = {
  name: "",
  businessName: "",
  phone: "",
  email: "",
  address: "",
  type: "retail",
  initialAdvance: "",
  openingDue: "",
  openingDate: "",
  note: "",
  isActive: true,
};

const COLUMNS = [
  "SL",
  "Name",
  "Business Name",
  "Mobile",
  "Type",
  "Sale Total",
  "Sale Paid",
  "Sale Due",
  "Advance",
  "Due Dismiss",
  "Paid To Customer",
  "Total Due",
];

const exportRow = (row, index) => [
  index + 1,
  row.name,
  row.businessName || "",
  row.phone,
  CUSTOMER_TYPES[row.type]?.short || "",
  row.balance.total,
  row.balance.paid,
  row.balance.tradeDue,
  row.balance.advance,
  row.balance.dismiss,
  row.balance.paidOut,
  row.balance.due,
];

const exportFoot = (totals) => [
  "",
  "Total",
  "",
  "",
  "",
  totals.total,
  totals.paid,
  totals.tradeDue,
  totals.advance,
  totals.dismiss,
  totals.paidOut,
  totals.due,
];

const dueTone = (due) => (due > 0 ? "text-red-600" : due < 0 ? "text-green-600" : "");

/** Customer list, laid out like the 360 contacts screen, with the price-list type as the category */
export default function CustomersPage() {
  const router = useRouter();

  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(null);
  const [counts, setCounts] = useState({});
  const [meta, setMeta] = useState({ total: 0, pages: 1, from: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [type, setType] = useState("");
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [limit, setLimit] = useState("20");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState(null);

  const params = useCallback(
    (extra) => ({
      sort: filters.sort,
      status: filters.status,
      ...(type && { type }),
      ...(filters.due && { due: 1 }),
      ...(filters.search && { search: filters.search }),
      ...(filters.start && { start_date: filters.start }),
      ...(filters.end && { end_date: filters.end }),
      ...extra,
    }),
    [filters, type],
  );

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await axios.get("/api/customer/list", { params: params({ page, limit }) });

      if (!data.success) {
        showToast("error", data.message || "Could not load customers");
        return;
      }

      setRows(data.data);
      setTotals(data.totals);
      setCounts(data.counts || {});
      setMeta({ total: data.total, pages: data.pages, from: data.from });
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not load customers");
    } finally {
      setLoading(false);
    }
  }, [params, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setSelected([]);
  }, [page, limit, filters, type]);

  const search = (event) => {
    event?.preventDefault();
    setPage(1);
    setFilters({ ...draft, search: draft.search.trim() });
  };

  const clear = () => {
    setDraft(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setType("");
    setPage(1);
  };

  const pickType = (value) => {
    setType(value);
    setPage(1);
  };

  const withAllRows = async (handle) => {
    setExporting(true);

    try {
      const { data } = await axios.get("/api/customer/list", { params: params({ limit: "all" }) });

      if (!data.success) throw new Error(data.message);

      await handle(data.data.map(exportRow), exportFoot(data.totals));
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message || "Could not export");
    } finally {
      setExporting(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, type: type || "retail" });
    setFormOpen(true);
  };

  const openEdit = (customer) => {
    setEditing(customer);
    setForm({
      ...Object.fromEntries(Object.keys(emptyForm).map((key) => [key, customer[key] ?? emptyForm[key]])),
      openingDue: customer.openingDue || "",
      initialAdvance: customer.initialAdvance || "",
      openingDate: customer.openingDate ? customer.openingDate.slice(0, 10) : "",
      isActive: customer.isActive !== false,
    });
    setDetails(null);
    setFormOpen(true);
  };

  const saveCustomer = async (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.phone.trim()) {
      showToast("error", "Customer name and mobile are required");
      return;
    }

    if (!isValidBdMobile(form.phone)) {
      showToast("error", "Enter a Bangladeshi mobile number (01XXXXXXXXX)");
      return;
    }

    setSaving(true);

    try {
      const { data } = editing
        ? await axios.put(`/api/customer/${editing._id}`, form)
        : await axios.post("/api/customer", form);

      if (!data.success) {
        showToast("error", data.message || "Could not save customer");
        return;
      }

      showToast("success", data.message);
      setFormOpen(false);
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not save customer");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (customer) => {
    try {
      const { data } = await axios.post(`/api/customer/${customer._id}/toggle`);

      showToast(data.success ? "success" : "error", data.message);
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not update customer");
    }
  };

  const remove = async (customer) => {
    if (!confirm(`Delete "${customer.name}"? This cannot be undone.`)) return;

    try {
      const { data } = await axios.delete(`/api/customer/${customer._id}`);

      showToast(data.success ? "success" : "error", data.message);
      if (data.success) load();
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not delete customer");
    }
  };

  const changeType = async (nextType) => {
    if (!selected.length) {
      showToast("error", "Select customers first");
      return;
    }

    const label = CUSTOMER_TYPES[nextType].short;

    if (!confirm(`Move ${selected.length} customer(s) to ${label}? They will pay the ${label} price at the POS.`)) return;

    try {
      const { data } = await axios.post("/api/customer/type", { ids: selected, type: nextType });

      showToast(data.success ? "success" : "error", data.message);

      if (data.success) {
        setSelected([]);
        load();
      }
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not change type");
    }
  };

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const go = (customer, paymentType) => router.push(ADMIN_CUSTOMER_PAYMENT(customer._id, paymentType));

  const rowActions = (row) => [
    ["Show", () => setDetails(row)],
    ["Edit", () => openEdit(row)],
    ["Receive", () => go(row, "receive")],
    ["Pay", () => go(row, "pay")],
    ["Due Dismiss", () => go(row, "dismiss")],
    ["Advance", () => go(row, "advance")],
    [row.isActive ? "Deactivated" : "Active", () => toggle(row)],
    ["Ledger", () => router.push(ADMIN_CUSTOMER_LEDGER(row._id))],
    ["Delete", () => remove(row), "danger"],
  ];

  const allCount = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const tabs = [["", "All", allCount], ...Object.entries(CUSTOMER_TYPES).map(([key, t]) => [key, t.short, counts[key] || 0])];
  const allChecked = rows.length > 0 && rows.every((row) => selected.includes(row._id));
  const check = (id, on) => setSelected(on ? [...selected, id] : selected.filter((item) => item !== id));
  const filtered = filters.search || filters.start || filters.end || filters.status !== "all" || filters.due || type;

  return (
    <div className="space-y-4">
      <ListCard
        title="Customer List"
        actions={
          <button type="button" onClick={openCreate} className={btn.primary}>
            <Plus size={14} /> Add New Customer
          </button>
        }
      >
        {/* Customer type = category and the POS price list */}
        <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {tabs.map(([key, label, n]) => (
            <button
              key={key || "all"}
              type="button"
              onClick={() => pickType(key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                type === key
                  ? "bg-[#188ae2] text-white shadow"
                  : "bg-[#f1f5f9] text-[#495057] hover:bg-[#e2e8f0] dark:bg-muted dark:text-muted-foreground"
              }`}
            >
              {label}
              <span className={`rounded-full px-1.5 text-[11px] ${type === key ? "bg-white/25" : "bg-white dark:bg-background"}`}>{n}</span>
            </button>
          ))}
        </div>

        <form onSubmit={search} className="flex flex-wrap items-center gap-2">
          <select
            value={limit}
            onChange={(event) => {
              setLimit(event.target.value);
              setPage(1);
            }}
            className={`${inputClass} !w-20`}
            aria-label="Rows per page"
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
            aria-label="Sort"
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
            aria-label="Status"
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
            placeholder="Search Name, Business Name, Phone, Email..."
            className={`${inputClass} min-w-[220px] flex-1`}
          />

          <label className="flex items-center gap-1.5 whitespace-nowrap text-[13px]">
            <input
              type="checkbox"
              checked={draft.due}
              onChange={(event) => setDraft({ ...draft, due: event.target.checked })}
            />
            Due only
          </label>

          <button type="submit" className={btn.info}>
            Search
          </button>
          <button type="button" onClick={clear} className={btn.warning}>
            Clear
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ExportButtons
            disabled={exporting}
            onPdf={() => withAllRows((body, foot) => exportPdf("Customer List", COLUMNS, body, foot))}
            onExcel={() => withAllRows((body, foot) => exportExcel("Customers.xlsx", COLUMNS, body, foot))}
            onPrint={() =>
              withAllRows((body, foot) => {
                if (!printTable("Customer List", COLUMNS, body, foot)) showToast("error", "Allow pop-ups to print");
              })
            }
          />

          <ActionMenu
            label={selected.length ? `Actions (${selected.length})` : "Actions"}
            items={Object.entries(CUSTOMER_TYPES).map(([key, t]) => [`Make ${t.short}`, () => changeType(key)])}
          />
        </div>

        {/* Phones: one card per customer instead of the wide table */}
        <div className="mt-3 space-y-2.5 md:hidden">
          {loading && [1, 2, 3].map((n) => <div key={n} className="h-[118px] animate-pulse rounded-[6px] bg-slate-100 dark:bg-muted" />)}

          {!loading && rows.length === 0 && (
            <div className="rounded-[6px] border border-dashed border-[#d4dae0] px-4 py-8 text-center text-[15px] font-medium text-[#495057]">
              {filtered ? "No customers match these filters" : "No customers yet"}
            </div>
          )}

          {!loading &&
            rows.map((row) => (
              <article
                key={row._id}
                className={`rounded-[6px] border border-[#ebeff2] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-border ${
                  row.isActive ? "bg-white dark:bg-card" : "bg-[#fff7f7] dark:bg-red-950/30"
                }`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-[5px]"
                    checked={selected.includes(row._id)}
                    onChange={(event) => check(row._id, event.target.checked)}
                    aria-label={`Select ${row.name}`}
                  />
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => setDetails(row)} className="block max-w-full truncate text-left text-[15px] font-semibold">
                      {row.name}
                      {!row.isActive && <span className="ml-1 text-[11px] font-normal text-red-500">(Inactive)</span>}
                    </button>
                    <p className="m-0 flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
                      <TypeBadge type={row.type} />
                      {[row.phone, row.businessName].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <ActionMenu items={rowActions(row)} />
                </div>
                <dl className="mt-2.5 grid grid-cols-3 gap-1.5 text-[13px]">
                  {[
                    ["Sale Total", row.balance.total],
                    ["Paid", row.balance.paid],
                    ["Advance", row.balance.advance],
                    ["Due Dismiss", row.balance.dismiss],
                    ["Paid Out", row.balance.paidOut],
                    ["Total Due", row.balance.due, dueTone(row.balance.due)],
                  ].map(([label, value, tone]) => (
                    <div key={label} className="rounded-[4px] bg-[#f7f9fb] px-2 py-1.5 dark:bg-muted">
                      <dt className="text-[11px] text-muted-foreground">{label}</dt>
                      <dd className={`m-0 font-semibold tabular-nums ${tone || ""}`}>{money(value)}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}

          {!loading && totals && rows.length > 0 && (
            <div className="flex justify-between rounded-[6px] bg-[#cbd5e1] px-3 py-2 text-[14px] font-bold dark:bg-slate-700">
              <span>Total Due</span>
              <span className="tabular-nums">{money(totals.due)}</span>
            </div>
          )}
        </div>

        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead>
              <tr className={theadRow}>
                <th rowSpan={2} className={thClass}>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={(event) => setSelected(event.target.checked ? rows.map((row) => row._id) : [])}
                    aria-label="Select all"
                  />
                </th>
                <th rowSpan={2} className={thClass}>SL</th>
                <th rowSpan={2} className={thClass}>Name</th>
                <th rowSpan={2} className={thClass}>Mobile</th>
                <th rowSpan={2} className={thClass}>Type</th>
                <th colSpan={3} className={`${thClass} text-center`}>Sale</th>
                <th rowSpan={2} className={thClass}>Advance</th>
                <th rowSpan={2} className={thClass}>Due Dismiss</th>
                <th rowSpan={2} className={thClass}>Paid Out</th>
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
                    <td colSpan={13} className={tdClass}>
                      <div className="h-4 animate-pulse rounded bg-slate-100 dark:bg-muted" />
                    </td>
                  </tr>
                ))}

              {!loading && rows.length === 0 && (
                <EmptyRow
                  colSpan={13}
                  title={filtered ? "No customers match these filters" : "No customers yet"}
                  hint="Customers are added here or automatically when you sell at the POS with a phone number."
                />
              )}

              {!loading &&
                rows.map((row, index) => (
                  <tr
                    key={row._id}
                    className={row.isActive ? "hover:bg-[#f5f7f9] dark:hover:bg-muted/50" : "bg-[#fff7f7] text-[#98a6ad] dark:bg-red-950/30"}
                  >
                    <td className={tdClass}>
                      <input
                        type="checkbox"
                        checked={selected.includes(row._id)}
                        onChange={(event) => check(row._id, event.target.checked)}
                        aria-label={`Select ${row.name}`}
                      />
                    </td>
                    <td className={tdClass}>{meta.from + index}</td>
                    <td className={tdClass}>
                      <button type="button" onClick={() => setDetails(row)} className="text-left font-medium hover:text-blue-600">
                        {row.name}
                      </button>
                      {!row.isActive && <span className="ml-1 text-xs text-red-500">(Inactive)</span>}
                      {row.businessName && <span className="block text-xs text-muted-foreground">{row.businessName}</span>}
                    </td>
                    <td className={tdClass}>{row.phone}</td>
                    <td className={tdClass}>
                      <TypeBadge type={row.type} />
                    </td>
                    <td className={tdClass}>{money(row.balance.total)}</td>
                    <td className={tdClass}>{money(row.balance.paid)}</td>
                    <td className={tdClass}>{money(row.balance.tradeDue)}</td>
                    <td className={tdClass}>{money(row.balance.advance)}</td>
                    <td className={tdClass}>{money(row.balance.dismiss)}</td>
                    <td className={tdClass}>{money(row.balance.paidOut)}</td>
                    <td className={`${tdClass} font-semibold ${dueTone(row.balance.due)}`}>{money(row.balance.due)}</td>
                    <td className={tdClass}>
                      <ActionMenu items={rowActions(row)} />
                    </td>
                  </tr>
                ))}
            </tbody>

            {!loading && totals && rows.length > 0 && (
              <tfoot>
                <tr className={totalRow}>
                  <td colSpan={5} className={tdClass}>Total</td>
                  <td className={tdClass}>{money(totals.total)}</td>
                  <td className={tdClass}>{money(totals.paid)}</td>
                  <td className={tdClass}>{money(totals.tradeDue)}</td>
                  <td className={tdClass}>{money(totals.advance)}</td>
                  <td className={tdClass}>{money(totals.dismiss)}</td>
                  <td className={tdClass}>{money(totals.paidOut)}</td>
                  <td className={tdClass}>{money(totals.due)}</td>
                  <td className={tdClass} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <Pagination page={page} pages={meta.pages} from={meta.from} count={rows.length} total={meta.total} onPage={setPage} />
      </ListCard>

      <Dialog open={!!details} onOpenChange={(open) => !open && setDetails(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {details?.name} {details && <TypeBadge type={details.type} />}
            </DialogTitle>
            <DialogDescription>{details?.businessName}</DialogDescription>
          </DialogHeader>

          {details && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              {[
                ["Mobile", details.phone],
                ["Email", details.email],
                ["Address", details.address],
                ["Price list", CUSTOMER_TYPES[details.type]?.label],
                ["Opening due", details.openingDue ? money(details.openingDue) : ""],
                ["Sales", `${details.balance.saleCount} · ${money(details.balance.saleTotal)}`],
                ["Last sale", fmtDate(details.balance.lastSale)],
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
          <form onSubmit={saveCustomer} noValidate>
            <DialogHeader>
              <DialogTitle>{editing ? "Update Customer" : "Create New Customer"}</DialogTitle>
            </DialogHeader>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-6">
              <Field label="Name" required className="sm:col-span-3">
                <Input value={form.name} onChange={set("name")} placeholder="Name" maxLength={120} />
              </Field>
              <Field label="Customer Business Name" className="sm:col-span-3">
                <Input value={form.businessName} onChange={set("businessName")} placeholder="Business Name" maxLength={160} />
              </Field>

              <Field label="Email" className="sm:col-span-3">
                <Input type="email" value={form.email} onChange={set("email")} placeholder="Email" />
              </Field>
              <Field label="Mobile" required className="sm:col-span-3">
                <Input value={form.phone} onChange={set("phone")} placeholder="01XXXXXXXXX" inputMode="tel" />
                {form.phone && bdOperator(form.phone) && (
                  <p className="mt-1 text-xs text-muted-foreground">{bdOperator(form.phone)}</p>
                )}
              </Field>

              <Field label="Address" className="sm:col-span-6">
                <Input value={form.address} onChange={set("address")} placeholder="Address" maxLength={300} />
              </Field>

              <div className="space-y-2 sm:col-span-6">
                <Label>Customer Type (price list at the POS)</Label>
                {editing?.hasLogin && (
                  <p className="text-xs text-muted-foreground">
                    This customer has a dealer login; change their type from Dealers &amp; Wholesalers.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Object.entries(CUSTOMER_TYPES).map(([key, t]) => (
                    <button
                      key={key}
                      type="button"
                      disabled={editing?.hasLogin}
                      onClick={() => setForm({ ...form, type: key })}
                      className={`rounded-lg border px-3 py-2 text-left text-sm disabled:opacity-60 ${
                        form.type === key
                          ? "border-primary bg-primary/10 font-semibold text-primary ring-1 ring-primary"
                          : "border-gray-200 hover:border-primary/50 dark:border-white/15"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <Field label="Initial Advance (৳)" className="sm:col-span-2">
                <Input type="number" min="0" step="0.01" value={form.initialAdvance} onChange={set("initialAdvance")} placeholder="Amount" />
              </Field>
              <Field label="Initial Due (৳)" className="sm:col-span-2">
                <Input type="number" min="0" step="0.01" value={form.openingDue} onChange={set("openingDue")} placeholder="Amount" />
              </Field>
              <Field label="Date" className="sm:col-span-2">
                <Input type="date" value={form.openingDate} onChange={set("openingDate")} />
              </Field>

              <Field label="Note" className="sm:col-span-6">
                <Textarea rows={3} value={form.note} onChange={set("note")} placeholder="Note" maxLength={2000} />
              </Field>

              <label className="flex items-center gap-2 text-sm sm:col-span-6">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                  className="size-4"
                />
                Active
              </label>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Close
              </Button>
              <Button type="submit" disabled={saving} className="bg-green-600 text-white hover:bg-green-700">
                {saving ? "Saving..." : editing ? "Update" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
