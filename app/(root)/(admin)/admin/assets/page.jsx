"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  ArrowUpDown,
  FileSpreadsheet,
  FileText,
  PlusSquare,
  Printer,
  SquarePen,
  Trash2,
} from "lucide-react";

import { showToast } from "@/lib/showToast";

import {
  EmptyRow,
  btn,
  filterInput,
  tdClass,
  thClass,
  theadClass,
  totalRowClass,
} from "@/components/ui/Application/Admin/listKit";
import {
  PAYMENT_METHODS,
  exportExcel,
  exportPdf,
  fmtDate,
  methodLabel,
  money,
  printTable,
} from "@/components/ui/Application/Admin/supplier/supplierKit";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const COLUMNS = [
  ["sl", "Sl"],
  ["date", "Date"],
  ["category", "Category"],
  ["paidBy", "Paid By"],
  ["note", "Note"],
  ["amount", "Amount"],
];

const EXPORT_HEAD = COLUMNS.map(([, label]) => label);

const today = () => new Date().toLocaleDateString("en-CA");

const emptyForm = () => ({
  assetDate: today(),
  typeId: "",
  amount: "",
  paymentMethod: "cash",
  reference: "",
  note: "",
});

const label = "mb-[8px] block text-[14px] font-medium text-[#212529] dark:text-foreground";

export default function AssetListPage() {
  const [rows, setRows] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [meta, setMeta] = useState({ total: 0, pages: 1, from: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [limit, setLimit] = useState("25");
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(["sl", "asc"]);

  const [types, setTypes] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // The search box filters as you type
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(term.trim());
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [term]);

  const params = useCallback(
    (extra) => ({ sort: sort[0], dir: sort[1], ...(search && { search }), ...extra }),
    [sort, search],
  );

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await axios.get("/api/assets", { params: params({ page, limit }) });

      if (!data.success) {
        showToast("error", data.message || "Could not load assets");
        return;
      }

      setRows(data.data);
      setTotalAmount(data.totalAmount);
      setMeta({ total: data.total, pages: data.pages, from: data.from });
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not load assets");
    } finally {
      setLoading(false);
    }
  }, [params, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const loadTypes = async () => {
    try {
      const { data } = await axios.get("/api/asset-types");

      if (data.success) setTypes(data.data);
    } catch {
      showToast("error", "Could not load asset types");
    }
  };

  const sortBy = (key) => {
    setSort(([current, dir]) => [key, current === key && dir === "asc" ? "desc" : "asc"]);
    setPage(1);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
    loadTypes();
  };

  const openEdit = (row) => {
    setEditingId(row._id);
    setForm({
      assetDate: row.assetDate ? new Date(row.assetDate).toLocaleDateString("en-CA") : today(),
      typeId: String(row.typeId),
      amount: String(row.amount),
      paymentMethod: row.paymentMethod || "cash",
      reference: row.reference || "",
      note: row.note || "",
    });
    setFormOpen(true);
    loadTypes();
  };

  const save = async (event) => {
    event.preventDefault();

    if (!form.typeId) {
      showToast("error", "Select a category");
      return;
    }

    if (!(Number(form.amount) > 0)) {
      showToast("error", "Enter an amount greater than 0");
      return;
    }

    setSaving(true);

    try {
      const { data } = editingId
        ? await axios.put(`/api/assets/${editingId}`, form)
        : await axios.post("/api/assets", form);

      showToast(data.success ? "success" : "error", data.message);

      if (data.success) {
        setFormOpen(false);
        load();
      }
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not save asset");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!confirm(`Delete this ${row.typeName} asset of ${money(row.amount)}?`)) return;

    try {
      const { data } = await axios.delete(`/api/assets/${row._id}`);

      showToast(data.success ? "success" : "error", data.message);
      if (data.success) load();
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not delete asset");
    }
  };

  /** Every row the search matches, not only this page */
  const withAllRows = async (handle) => {
    setExporting(true);

    try {
      const { data } = await axios.get("/api/assets", { params: params({ limit: "all" }) });

      if (!data.success) throw new Error(data.message);

      const body = data.data.map((row, index) => [
        index + 1,
        fmtDate(row.assetDate),
        row.typeName,
        methodLabel(row.paymentMethod),
        row.note,
        row.amount,
      ]);

      await handle(body, ["", "", "", "", "Total", data.totalAmount]);
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message || "Could not export");
    } finally {
      setExporting(false);
    }
  };

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const numbers = [];

  for (let p = Math.max(1, page - 2); p <= Math.min(meta.pages, page + 2); p++) numbers.push(p);

  const pageButton =
    "-ml-px border border-[#dee2e6] px-[14px] py-[8px] text-[15px] first:ml-0 first:rounded-l-[4px] last:rounded-r-[4px] dark:border-border";

  return (
    <div>
      <section className="rounded-[4px] border border-t-[3px] border-[#e6ebf1] border-t-[#00801a] bg-white px-[16px] py-[20px] shadow-[0_1px_2px_rgba(16,24,40,0.05)] sm:px-[25px] dark:border-border dark:border-t-[#00801a] dark:bg-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="m-0 text-[22px] font-semibold text-[#1f2933] dark:text-foreground">Assets</h1>

          <button type="button" onClick={openCreate} className={`${btn.primary} !px-[18px] !py-[9px] !text-[15px]`}>
            <PlusSquare size={16} /> Add New Asset
          </button>
        </div>

        <div className="mt-[34px] grid items-center gap-[12px] md:grid-cols-[1fr_auto_1fr]">
          <label className="flex items-center gap-[8px] text-[15px]">
            Show
            <select
              value={limit}
              onChange={(event) => {
                setLimit(event.target.value);
                setPage(1);
              }}
              className={`${filterInput} !w-[92px] !text-[14px]`}
            >
              {["10", "25", "50", "100", "all"].map((size) => (
                <option key={size} value={size}>
                  {size === "all" ? "All" : size}
                </option>
              ))}
            </select>
            entries
          </label>

          <div className="inline-flex justify-self-center overflow-hidden rounded-[2px] bg-[#868e96] text-[15px] text-white">
            {[
              ["PDF", FileText, (body, foot) => exportPdf("Assets", EXPORT_HEAD, body, foot)],
              ["Excel", FileSpreadsheet, (body, foot) => exportExcel("Assets.xlsx", EXPORT_HEAD, body, foot)],
              [
                "Print",
                Printer,
                (body, foot) => {
                  if (!printTable("Assets", EXPORT_HEAD, body, foot)) showToast("error", "Allow pop-ups to print");
                },
              ],
            ].map(([text, Icon, handle]) => (
              <button
                key={text}
                type="button"
                disabled={exporting}
                onClick={() => withAllRows(handle)}
                className="flex items-center gap-[5px] px-[16px] py-[9px] transition hover:bg-[#727b84] disabled:opacity-60"
              >
                <Icon size={15} /> {text}
              </button>
            ))}
          </div>

          <label className="flex w-full items-center gap-[8px] justify-self-end rounded-[4px] bg-[#188ae2] py-[4px] pl-[6px] pr-[4px] text-[16px] text-white sm:w-auto">
            Search:
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              aria-label="Search assets"
              className="h-[40px] min-w-0 flex-1 rounded-[4px] border-0 bg-white px-[10px] text-[14px] text-[#495057] outline-none focus:ring-2 focus:ring-white/60 sm:w-[236px]"
            />
          </label>
        </div>

        <div className="mt-[18px] overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr className={theadClass}>
                {COLUMNS.map(([key, text]) => (
                  <th key={key} className={`${thClass} !py-[9px] !text-[16px]`}>
                    <button
                      type="button"
                      onClick={() => sortBy(key)}
                      aria-label={`Sort by ${text}`}
                      className="flex w-full items-center justify-between gap-2"
                    >
                      {text}
                      <ArrowUpDown size={14} className={sort[0] === key ? "opacity-100" : "opacity-50"} />
                    </button>
                  </th>
                ))}
                <th className={`${thClass} !py-[9px] !text-[16px]`}>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading &&
                [1, 2, 3].map((n) => (
                  <tr key={n}>
                    <td colSpan={7} className={`${tdClass} h-[44px]`}>
                      <div className="h-4 animate-pulse rounded bg-slate-100 dark:bg-muted" />
                    </td>
                  </tr>
                ))}

              {!loading && rows.length === 0 && (
                <EmptyRow colSpan={7} title={search ? "No matching records found" : "No data available in table"} />
              )}

              {!loading &&
                rows.map((row, index) => (
                  <tr key={row._id} className="hover:bg-[#f6f9fc] dark:hover:bg-muted/50">
                    <td className={tdClass}>{meta.from + index}</td>
                    <td className={`${tdClass} whitespace-nowrap`}>{fmtDate(row.assetDate)}</td>
                    <td className={tdClass}>{row.typeName}</td>
                    <td className={tdClass}>
                      {methodLabel(row.paymentMethod)}
                      {row.reference && (
                        <span className="block text-[12px] text-[#98a6ad]">{row.reference}</span>
                      )}
                    </td>
                    <td className={`${tdClass} max-w-[260px]`}>{row.note}</td>
                    <td className={tdClass}>{money(row.amount)}</td>
                    <td className={`${tdClass} !py-[4px]`}>
                      <div className="inline-flex overflow-hidden rounded-[4px] shadow-sm">
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => openEdit(row)}
                          className="inline-flex h-[32px] w-[40px] items-center justify-center bg-[#10c469] text-white hover:bg-[#0dab5b]"
                        >
                          <SquarePen size={14} />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => remove(row)}
                          className="inline-flex h-[32px] w-[40px] items-center justify-center bg-[#ff5b5b] text-white hover:bg-[#f24242]"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>

            {!loading && (
              <tfoot>
                <tr className={`${totalRowClass} !text-[18px]`}>
                  <td colSpan={4} className={tdClass} />
                  <td className={tdClass}>Total</td>
                  <td className={tdClass}>{money(totalAmount)}</td>
                  <td className={tdClass} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="mt-[40px] flex flex-col gap-[12px] sm:flex-row sm:items-end sm:justify-between">
          <p className="m-0 text-[16px]">
            Showing {meta.total ? meta.from : 0} to {meta.total ? meta.from + rows.length - 1 : 0} of {meta.total}{" "}
            entries
          </p>

          <nav className="flex self-end" aria-label="Pagination">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className={`${pageButton} text-[#6c757d] hover:bg-[#f1f3f5] disabled:opacity-60 disabled:hover:bg-transparent`}
            >
              Previous
            </button>
            {numbers.length > 1 &&
              numbers.map((number) => (
                <button
                  key={number}
                  type="button"
                  onClick={() => setPage(number)}
                  aria-current={number === page ? "page" : undefined}
                  className={`${pageButton} ${
                    number === page ? "!border-[#188ae2] bg-[#188ae2] text-white" : "text-[#188ae2] hover:bg-[#f1f3f5]"
                  }`}
                >
                  {number}
                </button>
              ))}
            <button
              type="button"
              disabled={page >= meta.pages}
              onClick={() => setPage(page + 1)}
              className={`${pageButton} text-[#6c757d] hover:bg-[#f1f3f5] disabled:opacity-60 disabled:hover:bg-transparent`}
            >
              Next
            </button>
          </nav>
        </div>
      </section>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={save} noValidate>
            <DialogHeader>
              <DialogTitle>{editingId ? "Update Asset" : "Add New Asset"}</DialogTitle>
            </DialogHeader>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="as-date" className={label}>
                  Date<span className="text-[#ff5b5b]">*</span>
                </label>
                <input id="as-date" type="date" value={form.assetDate} onChange={set("assetDate")} className={filterInput} />
              </div>

              <div>
                <label htmlFor="as-type" className={label}>
                  Category<span className="text-[#ff5b5b]">*</span>
                </label>
                <select id="as-type" value={form.typeId} onChange={set("typeId")} className={filterInput}>
                  <option value="">Select Category</option>
                  {types.map((type) => (
                    <option key={type._id} value={type._id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                {formOpen && types.length === 0 && (
                  <p className="mt-1 text-[12px] text-[#98a6ad]">Add a category under Assets → Asset Type first.</p>
                )}
              </div>

              <div>
                <label htmlFor="as-amount" className={label}>
                  Amount (৳)<span className="text-[#ff5b5b]">*</span>
                </label>
                <input
                  id="as-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount"
                  value={form.amount}
                  onChange={set("amount")}
                  className={filterInput}
                />
              </div>

              <div>
                <label htmlFor="as-method" className={label}>
                  Paid By
                </label>
                <select id="as-method" value={form.paymentMethod} onChange={set("paymentMethod")} className={filterInput}>
                  {PAYMENT_METHODS.map(([value, text]) => (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  ))}
                </select>
              </div>

              {form.paymentMethod !== "cash" && (
                <div className="sm:col-span-2">
                  <label htmlFor="as-ref" className={label}>
                    {form.paymentMethod === "cheque" ? "Cheque No." : "Reference"}
                  </label>
                  <input
                    id="as-ref"
                    placeholder={form.paymentMethod === "cheque" ? "Cheque number" : "Trx ID / reference"}
                    value={form.reference}
                    onChange={set("reference")}
                    className={filterInput}
                  />
                </div>
              )}

              <div className="sm:col-span-2">
                <label htmlFor="as-note" className={label}>
                  Note
                </label>
                <textarea
                  id="as-note"
                  rows={3}
                  placeholder="Note"
                  value={form.note}
                  onChange={set("note")}
                  className={`${filterInput} !h-auto py-[8px]`}
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <button type="button" className={btn.secondary} onClick={() => setFormOpen(false)}>
                Close
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
