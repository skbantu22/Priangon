"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Plus, Upload } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { useOpeningStockTill } from "@/lib/posProducts";
import {
  ADMIN_SUPPLIER_EDIT,
  ADMIN_SUPPLIER_LEDGER,
  ADMIN_SUPPLIER_PAYMENT,
  ADMIN_SUPPLIER_PRODUCT_LEDGER,
} from "@/Route/Adminpannelroute";

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
import SupplierImportExport from "@/components/ui/Application/Admin/supplier/SupplierImportExport";
import SupplierFields, {
  emptySupplierForm,
  supplierFormError,
} from "@/components/ui/Application/Admin/supplier/SupplierFields";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SORTS = [
  ["created_asc", "Created ASC"],
  ["created_desc", "Created DESC"],
  ["name_asc", "Name A-Z"],
  ["name_desc", "Name Z-A"],
];

const PAGE_SIZES = ["10", "20", "50", "100", "250", "500", "all"];

const EMPTY_FILTERS = {
  sort: "created_desc",
  status: "all",
  branch: "",
  start: "",
  end: "",
  search: "",
};

const COLUMNS = [
  "SL",
  "Branch",
  "Name",
  "Business Name",
  "Mobile",
  "Area",
  "Purchase Total",
  "Purchase Paid",
  "Purchase Due",
  "Return Total",
  "Return Paid",
  "Return Due",
  "Advance",
  "Due Dismiss",
  "Total Due",
];

const exportRow = (row, index) => [
  index + 1,
  row.branchName || "Ware House",
  row.name,
  row.companyName || "",
  row.phone,
  row.area || "",
  row.balance.total,
  row.balance.paid,
  row.balance.tradeDue,
  row.balance.returned,
  row.balance.returnPaid,
  row.balance.returnDue,
  row.balance.advance,
  row.balance.dismiss,
  row.balance.due,
];

const exportFoot = (totals) => [
  "",
  "",
  "Total",
  "",
  "",
  "",
  totals.total,
  totals.paid,
  totals.tradeDue,
  totals.returned,
  totals.returnPaid,
  totals.returnDue,
  totals.advance,
  totals.dismiss,
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
  const [form, setForm] = useState(emptySupplierForm);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState(null);
  const [branches, setBranches] = useState([]);
  const [areas, setAreas] = useState([]);
  const [importOpen, setImportOpen] = useState(false);

  // Every shop keeps its own suppliers, so the list opens on the shop in
  // the top branch switch and follows it when the user switches
  const till = useOpeningStockTill();

  useEffect(() => {
    if (!till.id) return;

    setDraft((current) => ({ ...current, branch: till.id }));
    setFilters((current) => ({ ...current, branch: till.id }));
    setPage(1);
  }, [till.id]);

  // Branches for the filter and the form; blank means the warehouse
  useEffect(() => {
    let cancelled = false;

    axios
      .get("/api/showrooms")
      .then(({ data }) => {
        if (!cancelled && data.success) setBranches(data.showrooms || []);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  // Areas belong to the shop being worked in, like the suppliers do
  useEffect(() => {
    if (!till.id) return undefined;

    let cancelled = false;

    axios
      .get("/api/areas", { params: { branch: till.id } })
      .then(({ data }) => {
        if (!cancelled && data.success) setAreas(data.data || []);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [till.id]);

  const params = useCallback(
    (extra) => ({
      sort: filters.sort,
      status: filters.status,
      branch: filters.branch || "all",
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
    // Clearing drops the filters but stays in the shop being worked in
    const reset = { ...EMPTY_FILTERS, branch: till.id || "all" };

    setDraft(reset);
    setFilters(reset);
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
    // A supplier added while working in a shop belongs to that shop
    setForm({ ...emptySupplierForm, showroomId: till.id === "warehouse" ? "" : till.id });
    setFormOpen(true);
  };

  // Editing has its own page, so the whole form is in view instead of a popup
  const openEdit = (supplier) => {
    setDetails(null);
    router.push(ADMIN_SUPPLIER_EDIT(supplier._id));
  };

  const saveSupplier = async (event) => {
    event.preventDefault();

    const invalid = supplierFormError(form);

    if (invalid) {
      showToast("error", invalid);
      return;
    }

    setSaving(true);

    try {
      const { data } = await axios.post("/api/supplier/create", form);

      if (!data.success) {
        showToast("error", data.message || "Could not save supplier");
        return;
      }

      showToast("success", "Supplier created");
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

  const go = (supplier, type) => router.push(ADMIN_SUPPLIER_PAYMENT(supplier._id, type));

  return (
    <div className="space-y-4">
      <ListCard
        title="Supplier List"
        actions={
          <>
            <button type="button" onClick={() => setImportOpen(true)} className={btn.info}>
              <Upload size={14} /> Import/Export
            </button>

            <button type="button" onClick={openCreate} className={btn.primary}>
              <Plus size={14} /> Add New Supplier
            </button>
          </>
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
              {PAGE_SIZES.map((size) => (
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
            <table className="w-full min-w-[1280px] border-collapse text-sm">
              <thead>
                <tr className={theadRow}>
                  <th rowSpan={2} className={thClass}>SL</th>
                  <th rowSpan={2} className={thClass}>Branch</th>
                  <th rowSpan={2} className={thClass}>Name</th>
                  <th rowSpan={2} className={thClass}>Mobile</th>
                  <th rowSpan={2} className={thClass}>Area</th>
                  <th colSpan={3} className={`${thClass} text-center`}>Purchase</th>
                  <th colSpan={3} className={`${thClass} text-center`}>Purchase Return</th>
                  <th rowSpan={2} className={thClass}>Advance</th>
                  <th rowSpan={2} className={thClass}>Due Dismiss</th>
                  <th rowSpan={2} className={thClass}>Total Due</th>
                  <th rowSpan={2} className={thClass}>Action</th>
                </tr>
                <tr className={theadRow}>
                  {["Total", "Paid", "Due", "Total", "Paid", "Due"].map((head, index) => (
                    <th key={`${head}-${index}`} className={thClass}>
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading &&
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={15} className={tdClass}>
                        <div className="h-4 animate-pulse rounded bg-slate-100 dark:bg-muted" />
                      </td>
                    </tr>
                  ))}

                {!loading && rows.length === 0 && (
                  <EmptyRow
                    colSpan={15}
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
                      <td className={tdClass}>{row.branchName || "Ware House"}</td>
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
                      <td className={tdClass}>{row.area || ""}</td>
                      <td className={tdClass}>{money(row.balance.total)}</td>
                      <td className={tdClass}>{money(row.balance.paid)}</td>
                      <td className={tdClass}>{money(row.balance.tradeDue)}</td>
                      <td className={tdClass}>{money(row.balance.returned)}</td>
                      <td className={tdClass}>{money(row.balance.returnPaid)}</td>
                      <td className={tdClass}>{money(row.balance.returnDue)}</td>
                      <td className={tdClass}>{money(row.balance.advance)}</td>
                      <td className={tdClass}>{money(row.balance.dismiss)}</td>
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
                            [
                              "Product with Ledger",
                              () => router.push(ADMIN_SUPPLIER_PRODUCT_LEDGER(row._id)),
                            ],
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
                    <td colSpan={5} className={tdClass}>Total</td>
                    <td className={tdClass}>{money(totals.total)}</td>
                    <td className={tdClass}>{money(totals.paid)}</td>
                    <td className={tdClass}>{money(totals.tradeDue)}</td>
                    <td className={tdClass}>{money(totals.returned)}</td>
                    <td className={tdClass}>{money(totals.returnPaid)}</td>
                    <td className={tdClass}>{money(totals.returnDue)}</td>
                    <td className={tdClass}>{money(totals.advance)}</td>
                    <td className={tdClass}>{money(totals.dismiss)}</td>
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

      {importOpen && (
        <SupplierImportExport
          onClose={() => setImportOpen(false)}
          onImported={loadSuppliers}
          exportRows={() =>
            withAllRows((body, foot) => exportExcel("Suppliers.xlsx", COLUMNS, body, foot))
          }
        />
      )}

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
              <DialogTitle>Create New Supplier</DialogTitle>
            </DialogHeader>

            <div className="mt-4">
              <SupplierFields form={form} setForm={setForm} areas={areas} branches={branches} />
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Close
              </Button>
              <Button type="submit" disabled={saving} className="bg-green-600 text-white hover:bg-green-700">
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierPage;
