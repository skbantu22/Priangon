"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft, List, Plus, Receipt, Save } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { ADMIN_EXPENSE_SHOW, ADMIN_EXPENSE_TYPE } from "@/Route/Adminpannelroute";
import { btn } from "@/components/ui/Application/Admin/listKit";
import { PAYMENT_METHODS, fmtDate, methodLabel, money } from "@/components/ui/Application/Admin/supplier/supplierKit";
import { today, toInputDate } from "@/components/ui/Application/Admin/purchase/purchaseKit";

const blank = (keep = {}) => ({
  expenseDate: today(),
  categoryId: "",
  amount: "",
  paymentMethod: "cash",
  reference: "",
  showroomId: "",
  note: "",
  ...keep,
});

const label = "mb-[8px] block text-[15px] font-medium text-[#1f2933] dark:text-foreground";
const req = <span className="text-[#f05252]"> *</span>;

/**
 * Expenses → New Expense (and Edit), laid out like 360's. "Save & Add
 * Another" keeps the date, payment type and branch, for entering a pile
 * of bills quickly.
 */
export default function ExpenseForm({ id }) {
  const editing = Boolean(id);
  const router = useRouter();

  const [form, setForm] = useState(() => blank());
  const [types, setTypes] = useState(null);
  const [showrooms, setShowrooms] = useState([]);
  const [recent, setRecent] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState("");
  const [loaded, setLoaded] = useState(!editing);
  const refs = useRef({});

  const loadRecent = () =>
    axios
      .get("/api/expense", { params: { limit: 5 } })
      .then(({ data }) => setRecent(data.success ? data.data : []))
      .catch(() => setRecent([]));

  useEffect(() => {
    axios
      .get("/api/expense-category?active=true")
      .then(({ data }) => setTypes(data.success ? data.data : []))
      .catch(() => setTypes([]));
    axios
      .get("/api/showrooms")
      .then(({ data }) => data.success && setShowrooms(data.showrooms || []))
      .catch(() => {});
    loadRecent();

    if (!editing) {
      const timer = setTimeout(() => refs.current.categoryId?.focus(), 60);
      return () => clearTimeout(timer);
    }

    axios
      .get(`/api/expense/${id}`)
      .then(({ data }) => {
        if (!data.success) return showToast("error", data.message || "Expense not found");
        const e = data.data;
        setForm({
          expenseDate: toInputDate(e.expenseDate),
          categoryId: String(e.categoryId),
          amount: String(e.amount),
          paymentMethod: e.paymentMethod || "cash",
          reference: e.reference || "",
          showroomId: e.showroomId ? String(e.showroomId) : "",
          note: e.note || e.title || "",
        });
        setLoaded(true);
      })
      .catch((err) => showToast("error", err.response?.data?.message || "Could not load the expense"));
    return undefined;
  }, [editing, id]);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const save = async (another) => {
    const local = {};
    if (!form.expenseDate) local.expenseDate = "Pick a date.";
    else if (form.expenseDate > today()) local.expenseDate = "The date cannot be in the future.";
    if (!form.categoryId) local.categoryId = "Select an expense type.";
    if (!(Number(form.amount) > 0)) local.amount = "Enter an amount greater than 0.";

    if (Object.keys(local).length) {
      setErrors(local);
      refs.current[["expenseDate", "categoryId", "amount"].find((k) => local[k])]?.focus();
      return;
    }

    setSaving(another ? "another" : "save");
    try {
      const body = { ...form, amount: Number(form.amount) };
      const { data } = editing ? await axios.put(`/api/expense/update/${id}`, body) : await axios.post("/api/expense/create", body);

      if (!data.success) return showToast("error", data.message || "Could not save the expense");
      showToast("success", data.message || "Expense saved");

      if (another) {
        setForm(blank({ expenseDate: form.expenseDate, paymentMethod: form.paymentMethod, showroomId: form.showroomId }));
        loadRecent();
        setTimeout(() => refs.current.categoryId?.focus(), 60);
      } else {
        router.push(ADMIN_EXPENSE_SHOW);
      }
    } catch (err) {
      showToast("error", err.response?.data?.message || "Could not save the expense");
    } finally {
      setSaving("");
    }
  };

  const control = (key) =>
    `h-[46px] w-full border bg-white px-[14px] text-[15px] outline-none transition focus:border-[#188ae2] focus:shadow-[0_0_0_3px_rgba(24,138,226,0.15)] dark:bg-transparent dark:text-foreground ${
      errors[key] ? "border-[#ff5b5b]" : "border-[#dfe3e8] hover:border-[#c5ccd3] dark:border-input"
    }`;
  const err = (key) =>
    errors[key] && (
      <p role="alert" className="m-0 mt-[5px] text-[13px] text-[#e5484d]">
        {errors[key]}
      </p>
    );

  return (
    <div className="grid grid-cols-1 items-start gap-[16px] xl:grid-cols-[1fr_340px] xl:gap-[24px]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
        noValidate
        className="border border-[#e3e8ee] border-t-[3px] border-t-[#00801a] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)] dark:border-border dark:bg-card"
      >
        <header className="flex flex-col gap-[12px] border-b border-[#eef1f4] px-[16px] py-[16px] sm:flex-row sm:items-center sm:justify-between sm:px-[24px] dark:border-border">
          <div>
            <h1 className="m-0 text-[21px] font-semibold text-[#1f2933] sm:text-[23px] dark:text-foreground">{editing ? "Edit Expense" : "New Expense"}</h1>
            <p className="m-0 mt-[3px] text-[13.5px] text-[#6b7785]">It comes off the profit in the Profit &amp; Loss report.</p>
          </div>
          <Link href={ADMIN_EXPENSE_SHOW} className={btn.secondary}>
            <List size={14} /> Expense List
          </Link>
        </header>

        {!loaded ? (
          <div className="m-[24px] h-[260px] animate-pulse bg-slate-100 dark:bg-muted" />
        ) : (
          <div className="grid grid-cols-1 gap-x-[22px] gap-y-[18px] px-[16px] py-[20px] sm:px-[24px] md:grid-cols-2">
            <div>
              <label htmlFor="ex-type" className={label}>
                Expense Type{req}
              </label>
              <select
                id="ex-type"
                ref={(el) => {
                  refs.current.categoryId = el;
                }}
                value={form.categoryId}
                onChange={(e) => set("categoryId", e.target.value)}
                className={control("categoryId")}
              >
                <option value="">{types ? "Select" : "Loading…"}</option>
                {(types || []).map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {err("categoryId") || (
                <Link href={ADMIN_EXPENSE_TYPE} className="mt-[6px] inline-block text-[13px] text-[#188ae2] hover:underline">
                  + Add an expense type
                </Link>
              )}
            </div>

            <div>
              <label htmlFor="ex-amount" className={label}>
                Amount{req}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2 text-[15px] text-[#6b7785]">৳</span>
                <input
                  id="ex-amount"
                  ref={(el) => {
                    refs.current.amount = el;
                  }}
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  className={`${control("amount")} pl-[32px] text-[17px] font-semibold tabular-nums`}
                />
              </div>
              {err("amount")}
            </div>

            <div>
              <label htmlFor="ex-date" className={label}>
                Date{req}
              </label>
              <input
                id="ex-date"
                ref={(el) => {
                  refs.current.expenseDate = el;
                }}
                type="date"
                max={today()}
                value={form.expenseDate}
                onChange={(e) => set("expenseDate", e.target.value)}
                className={control("expenseDate")}
              />
              {err("expenseDate")}
            </div>

            <div>
              <label htmlFor="ex-method" className={label}>
                Paid From (Payment Type){req}
              </label>
              <select id="ex-method" value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)} className={control("paymentMethod")}>
                {PAYMENT_METHODS.map(([key, text]) => (
                  <option key={key} value={key}>
                    {text}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ex-branch" className={label}>
                Business Name / Branch
              </label>
              <select id="ex-branch" value={form.showroomId} onChange={(e) => set("showroomId", e.target.value)} className={control("showroomId")}>
                <option value="">Head Office</option>
                {showrooms.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {form.paymentMethod !== "cash" ? (
              <div>
                <label htmlFor="ex-ref" className={label}>
                  Trx ID / Cheque No
                </label>
                <input id="ex-ref" value={form.reference} maxLength={100} onChange={(e) => set("reference", e.target.value)} className={control("reference")} />
              </div>
            ) : (
              <div className="hidden md:block" />
            )}

            <div className="md:col-span-2">
              <label htmlFor="ex-note" className={label}>
                Note
              </label>
              <textarea
                id="ex-note"
                rows={3}
                maxLength={2000}
                placeholder="e.g. Electricity bill for September"
                value={form.note}
                onChange={(e) => set("note", e.target.value)}
                className={`${control("note")} !h-auto py-[10px]`}
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-[8px] border-t border-[#e3e8ee] bg-[#fafbfc] px-[16px] py-[14px] sm:px-[24px] dark:border-border dark:bg-muted">
          <button type="button" onClick={() => router.push(ADMIN_EXPENSE_SHOW)} className={btn.secondary}>
            <ArrowLeft size={14} /> Cancel
          </button>
          {!editing && (
            <button type="button" disabled={Boolean(saving)} onClick={() => save(true)} className={btn.info}>
              <Plus size={14} /> {saving === "another" ? "Saving…" : "Save & Add Another"}
            </button>
          )}
          <button type="submit" disabled={Boolean(saving) || !loaded} className={btn.success}>
            <Save size={14} /> {saving === "save" ? "Saving…" : editing ? "Update" : "Save"}
          </button>
        </div>
      </form>

      {/* Recent expenses: a quick check that the last entry went in */}
      <aside className="border border-[#e3e8ee] bg-white dark:border-border dark:bg-card">
        <h2 className="m-0 flex items-center gap-[8px] border-b border-[#eef1f4] px-[16px] py-[13px] text-[15px] font-semibold text-[#1f2933] dark:border-border dark:text-foreground">
          <Receipt size={16} className="text-[#00801a]" /> Recent expenses
        </h2>
        {!recent && [1, 2, 3].map((n) => <div key={n} className="mx-[16px] my-[10px] h-[36px] animate-pulse bg-slate-100 dark:bg-muted" />)}
        {recent && !recent.length && <p className="m-0 px-[16px] py-[20px] text-[14px] text-[#6b7785]">Nothing yet — your first expense will show here.</p>}
        {recent?.map((e) => (
          <div key={e._id} className="flex items-center justify-between gap-3 border-b border-[#f2f4f6] px-[16px] py-[10px] last:border-0 dark:border-border">
            <div className="min-w-0">
              <p className="m-0 truncate text-[14px] font-medium text-[#1f2933] dark:text-foreground">{e.categoryName}</p>
              <p className="m-0 truncate text-[12.5px] text-[#6b7785]">
                {fmtDate(e.expenseDate)} · {methodLabel(e.paymentMethod)}
                {e.note || e.title ? ` · ${e.note || e.title}` : ""}
              </p>
            </div>
            <b className="shrink-0 text-[14px] tabular-nums">৳{money(e.amount)}</b>
          </div>
        ))}
        {recent?.length > 0 && (
          <Link href={ADMIN_EXPENSE_SHOW} className="block border-t border-[#eef1f4] px-[16px] py-[10px] text-center text-[13.5px] text-[#188ae2] hover:bg-[#f6f9fc] dark:border-border">
            See all expenses →
          </Link>
        )}
      </aside>
    </div>
  );
}
