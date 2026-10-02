"use client";

import { bdOperator, isValidBdMobile } from "@/lib/bdFormat";
import { inputClass } from "@/components/ui/Application/Admin/supplier/supplierKit";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * The supplier form fields, shared by the "Create New" popup on the list
 * and the full Edit page, so the two can never drift apart.
 */

export const emptySupplierForm = {
  name: "",
  companyName: "",
  phone: "",
  email: "",
  address: "",
  area: "",
  showroomId: "",
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

/** A saved supplier as the form wants it */
export const supplierToForm = (supplier) => ({
  ...emptySupplierForm,
  ...Object.fromEntries(
    Object.keys(emptySupplierForm).map((key) => [key, supplier?.[key] ?? emptySupplierForm[key]]),
  ),
  openingBalance: supplier?.openingBalance || "",
  initialAdvance: supplier?.initialAdvance || "",
  openingDate: supplier?.openingDate ? String(supplier.openingDate).slice(0, 10) : "",
});

/** The message to show, or "" when the form is good to send */
export const supplierFormError = (form) => {
  if (!form.name.trim() || !form.phone.trim()) return "Supplier name and mobile are required";
  if (!isValidBdMobile(form.phone)) return "Enter a Bangladeshi mobile number (01XXXXXXXXX)";

  return "";
};

export function Field({ label, required, className = "", children }) {
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

export default function SupplierFields({ form, setForm, areas = [], branches = [] }) {
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
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

      <Field label="Area" className="sm:col-span-3">
        <select value={form.area || ""} onChange={set("area")} className={inputClass}>
          <option value="">Select Area</option>

          {areas.map((area) => (
            <option key={area._id} value={area.name}>
              {area.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Branch" className="sm:col-span-3">
        <Input
          value={
            branches.find((branch) => String(branch._id) === String(form.showroomId))?.name ||
            "Ware House"
          }
          readOnly
          className="bg-muted"
        />
      </Field>

      <Field label="Initial Advance (৳)" className="sm:col-span-2">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={form.initialAdvance}
          onChange={set("initialAdvance")}
          placeholder="Amount"
        />
      </Field>
      <Field label="Due (৳)" className="sm:col-span-2">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={form.openingBalance}
          onChange={set("openingBalance")}
          placeholder="Amount"
        />
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
  );
}
