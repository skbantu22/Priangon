"use client";

import { useState } from "react";
import axios from "axios";

import { showToast } from "@/lib/showToast";
import { PAYMENT_METHODS, inputClass, money } from "@/components/ui/Application/Admin/supplier/supplierKit";
import { Field, today } from "@/components/ui/Application/Admin/purchase/purchaseKit";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Give an employee commission ("earned") or pay what is due ("paid").
 * Render inside a <Dialog>; keyed by employee so each opens fresh.
 */
export default function CommissionDialog({ employee, type, onClose, onDone }) {
  const paying = type === "paid";
  const [form, setForm] = useState({ amount: paying ? String(employee.due || "") : "", date: today(), method: "cash", reference: "", note: "" });
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    const amount = Number(form.amount);
    if (!(amount > 0)) return showToast("error", "Enter an amount greater than 0");
    if (paying && amount - employee.due > 0.009) return showToast("error", `Only ৳${money(employee.due)} is due`);

    setSaving(true);
    try {
      const { data } = await axios.post("/api/commissions", { ...form, amount, type, employeeId: employee._id });
      if (!data.success) return showToast("error", data.message);
      showToast("success", data.message);
      onDone();
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {paying ? "Pay Commission" : "Add Commission"} — {employee.name}
        </DialogTitle>
        <DialogDescription>
          Earned ৳{money(employee.earned)} · Paid ৳{money(employee.paid)} · Due ৳{money(employee.due)}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Amount" required htmlFor="cm-amount">
          <input id="cm-amount" type="number" min="0" step="0.01" value={form.amount} onChange={set("amount")} className={inputClass} autoFocus />
        </Field>
        <Field label="Date" required htmlFor="cm-date">
          <input id="cm-date" type="date" max={today()} value={form.date} onChange={set("date")} className={inputClass} />
        </Field>
        {paying ? (
          <Field label="Paid By" htmlFor="cm-method">
            <select id="cm-method" value={form.method} onChange={set("method")} className={inputClass}>
              {PAYMENT_METHODS.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="For (invoice / target)" htmlFor="cm-ref">
            <input id="cm-ref" value={form.reference} onChange={set("reference")} placeholder="e.g. INV-000012" maxLength={120} className={inputClass} />
          </Field>
        )}
        <Field label="Note" htmlFor="cm-note">
          <input id="cm-note" value={form.note} onChange={set("note")} placeholder="Optional" maxLength={2000} className={inputClass} />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={saving} onClick={save}>
          {saving ? "Saving…" : paying ? "Pay" : "Add"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
