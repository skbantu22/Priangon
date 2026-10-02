"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Briefcase, Mail, MapPin, X } from "lucide-react";

import { btn, filterInput } from "@/components/ui/Application/Admin/listKit";
import { showToast } from "@/lib/showToast";

const EMPTY = {
  name: "",
  companyName: "",
  email: "",
  phone: "",
  address: "",
  area: "",
  showroomId: "",
  initialAdvance: "",
  openingBalance: "",
  openingDate: "",
  srName: "",
  srMobile: "",
  dsrName: "",
  dsrMobile: "",
  note: "",
};

const input = `${filterInput} placeholder:text-[#9aa1a9]`;

function Field({ label, required, error, className = "", htmlFor, children }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-2 block text-[14px] font-medium text-[#212529] dark:text-foreground">
        {label}
        {required && <span className="ml-1 text-[#ff5b5b]">*</span>}
      </label>
      {children}
      {error && <span className="mt-1 block text-[12px] text-[#ff5b5b]">{error}</span>}
    </div>
  );
}

/** Input with a grey icon box on the left */
function Addon({ icon, children }) {
  return (
    <div className="flex">
      <span className="flex h-[38px] w-[44px] shrink-0 items-center justify-center rounded-l-[4px] border border-r-0 border-[#e3e3e3] bg-[#e9ecef] text-[#495057] dark:border-border dark:bg-muted">
        {icon}
      </span>
      <div className="min-w-0 flex-1 [&_input]:rounded-l-none">{children}</div>
    </div>
  );
}

/**
 * "Create New Supplier", laid out like the 360 contact dialog: name,
 * business, email, mobile, address, opening advance / due with a date, SR
 * and DSR, and a note. Header and buttons stay put; the fields scroll.
 */
export default function SupplierFormModal({ onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState([]);
  const first = useRef(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  // Branches to keep the supplier under; blank is the warehouse
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

  useEffect(() => {
    first.current?.focus();
    const onKey = (e) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const set = (name) => (e) => {
    setErrors((x) => ({ ...x, [name]: undefined }));
    setForm((f) => ({ ...f, [name]: e.target.value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const missing = {};
    if (!form.name.trim()) missing.name = "The name field is required.";
    if (!form.phone.trim()) missing.phone = "The mobile field is required.";
    else if (!/^01\d{9}$/.test(form.phone.trim())) missing.phone = "Enter a Bangladeshi mobile number (01XXXXXXXXX).";
    if (Object.keys(missing).length) return setErrors(missing);

    setSaving(true);
    try {
      const { data } = await axios.post("/api/supplier/create", form);
      if (!data.success) throw new Error(data.message);
      showToast("success", `Supplier "${form.name.trim()}" added`);
      onSaved(data.data);
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message || "Could not add supplier");
    } finally {
      setSaving(false);
    }
  };

  const text = (name, placeholder, props = {}) => (
    <input
      id={`s-${name}`}
      ref={name === "name" ? first : undefined}
      value={form[name]}
      onChange={set(name)}
      placeholder={placeholder}
      className={input}
      {...props}
    />
  );
  const taka = <span className="text-[16px] font-semibold">৳</span>;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/50 sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-form-title"
        className="flex max-h-[100dvh] w-full max-w-[800px] flex-col overflow-hidden bg-white shadow-[0_10px_40px_rgba(0,0,0,0.25)] sm:max-h-[calc(100dvh-48px)] sm:rounded-[6px] dark:bg-card"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#dee2e6] bg-[#f7f7f7] px-5 py-[18px] dark:border-border dark:bg-muted">
          <h3 id="supplier-form-title" className="text-[17px] font-medium">
            Create New Supplier
          </h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-[#6c757d] hover:bg-black/5" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 content-start gap-x-5 gap-y-4 overflow-y-auto overscroll-contain px-4 py-[18px] sm:grid-cols-6 sm:px-5 sm:py-[22px]">
          <Field label="Name" required error={errors.name} className="sm:col-span-3" htmlFor="s-name">
            {text("name", "Name", { maxLength: 255 })}
          </Field>
          <Field label="Business Name" className="sm:col-span-3" htmlFor="s-companyName">
            <Addon icon={<Briefcase size={15} />}>{text("companyName", "Business Name", { maxLength: 255 })}</Addon>
          </Field>

          <Field label="Email" className="sm:col-span-3" htmlFor="s-email">
            <Addon icon={<Mail size={15} />}>{text("email", "Email", { type: "email", maxLength: 255 })}</Addon>
          </Field>
          <Field label="Mobile" required error={errors.phone} className="sm:col-span-3" htmlFor="s-phone">
            <div className="flex">
              <span className="flex h-[38px] shrink-0 items-center rounded-l-[4px] border border-r-0 border-[#e3e3e3] bg-[#f8f9fa] px-2.5 text-[13px] text-[#495057] dark:border-border dark:bg-muted">
                BD +88
              </span>
              {text("phone", "01XXXXXXXXX", { inputMode: "tel", maxLength: 11, className: `${input} rounded-l-none` })}
            </div>
          </Field>

          <Field label="Address" className="sm:col-span-6" htmlFor="s-address">
            <Addon icon={<MapPin size={15} />}>{text("address", "Address", { maxLength: 500 })}</Addon>
          </Field>

          <Field label="Branch" className="sm:col-span-3" htmlFor="s-showroomId">
            <select
              id="s-showroomId"
              value={form.showroomId}
              onChange={set("showroomId")}
              className={input}
            >
              <option value="">Ware House</option>

              {branches.map((branch) => (
                <option key={branch._id} value={branch._id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Area" className="sm:col-span-3" htmlFor="s-area">
            {text("area", "Area", { maxLength: 255 })}
          </Field>

          <Field label="Initial Advance" className="sm:col-span-2" htmlFor="s-initialAdvance">
            <Addon icon={taka}>{text("initialAdvance", "Amount", { type: "number", step: "0.01", min: 0, inputMode: "decimal" })}</Addon>
          </Field>
          <Field label="Due" className="sm:col-span-2" htmlFor="s-openingBalance">
            <Addon icon={taka}>{text("openingBalance", "Amount", { type: "number", step: "0.01", min: 0, inputMode: "decimal" })}</Addon>
          </Field>
          <Field label="Date" className="sm:col-span-2" htmlFor="s-openingDate">
            {text("openingDate", "", { type: "date" })}
          </Field>

          <Field label="SR Name" className="sm:col-span-3" htmlFor="s-srName">
            {text("srName", "Name", { maxLength: 255 })}
          </Field>
          <Field label="SR Mobile" className="sm:col-span-3" htmlFor="s-srMobile">
            {text("srMobile", "Mobile", { inputMode: "tel", maxLength: 30 })}
          </Field>
          <Field label="DSR Name" className="sm:col-span-3" htmlFor="s-dsrName">
            {text("dsrName", "Name", { maxLength: 255 })}
          </Field>
          <Field label="DSR Mobile" className="sm:col-span-3" htmlFor="s-dsrMobile">
            {text("dsrMobile", "Mobile", { inputMode: "tel", maxLength: 30 })}
          </Field>

          <Field label="Note" className="sm:col-span-6" htmlFor="s-note">
            <textarea
              id="s-note"
              value={form.note}
              onChange={set("note")}
              placeholder="Note"
              maxLength={5000}
              className={`${input} !h-[90px] py-2`}
            />
          </Field>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-[#eef1f4] bg-white px-4 py-3 sm:px-5 dark:border-border dark:bg-card">
          <button type="submit" className={btn.success} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button type="button" className={btn.secondary} onClick={onClose}>
            Close
          </button>
        </div>
      </form>
    </div>
  );
}
