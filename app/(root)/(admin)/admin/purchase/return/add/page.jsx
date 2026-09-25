"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { List, RotateCcw, Search } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { ADMIN_PURCHASE_RETURN_SHOW, ADMIN_PURCHASE_RETURN_VIEW, ADMIN_PURCHASE_VIEW } from "@/Route/Adminpannelroute";
import { ListCard, btn, filterInput as inputClass, tdClass, thClass, theadClass } from "@/components/ui/Application/Admin/listKit";
import { PAYMENT_METHODS, fmtDate, money, useSupplierOptions } from "@/components/ui/Application/Admin/supplier/supplierKit";
import { Field, cell, num, today } from "@/components/ui/Application/Admin/purchase/purchaseKit";

export default function PurchaseReturnPage() {
  return (
    <Suspense fallback={<div className="h-[420px] animate-pulse rounded-[8px] bg-white dark:bg-card" />}>
      <PurchaseReturnCreate />
    </Suspense>
  );
}

/**
 * "Purchase Return" (supplier-wise): pick a supplier, tick the purchased
 * rows to send back, set the quantity and return type, and record any cash
 * the supplier refunds. What is not refunded comes off the supplier's due.
 */
function PurchaseReturnCreate() {
  const router = useRouter();
  const params = useSearchParams();
  const suppliers = useSupplierOptions();

  const [supplierId, setSupplierId] = useState(params.get("supplier") || "");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState(null); // null: no supplier; undefined: loading
  const [picked, setPicked] = useState({});
  const [types, setTypes] = useState([]);
  const [head, setHead] = useState({ returnNumber: "", returnDate: today(), note: "" });
  const [refund, setRefund] = useState({ method: "cash", amount: "", reference: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios
      .get("/api/purchase/next-number?kind=return")
      .then(({ data }) => data.success && setHead((h) => ({ ...h, returnNumber: data.number })))
      .catch(() => {});
    axios
      .get("/api/purchase-return-types")
      .then(({ data }) => data.success && setTypes(data.data))
      .catch(() => {});
  }, []);

  // what can still go back to this supplier; debounced while typing a search
  useEffect(() => {
    if (!supplierId) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setItems(undefined);
      try {
        const { data } = await axios.get("/api/purchase-returns/returnable", { params: { supplierId, search, limit: 500 } });
        if (!cancelled) setItems(data.success ? data.data : []);
        if (!data.success) showToast("error", data.message || "Could not load purchases");
      } catch (error) {
        if (!cancelled) setItems([]);
        showToast("error", error.response?.data?.message || "Could not load purchases");
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [supplierId, search]);

  const chooseSupplier = (value) => {
    setSupplierId(value);
    setPicked({});
    setItems(value ? undefined : null);
  };

  const toggle = (item) =>
    setPicked((current) => {
      const next = { ...current };
      if (next[item.key]) delete next[item.key];
      else next[item.key] = { quantity: String(Math.min(1, item.returnable)), unitPrice: String(item.unitPrice), returnTypeId: "" };
      return next;
    });

  const update = (key, patch) => setPicked((current) => ({ ...current, [key]: { ...current[key], ...patch } }));

  const lines = useMemo(
    () =>
      (items || [])
        .filter((item) => picked[item.key])
        .map((item) => ({ item, ...picked[item.key], subtotal: num(picked[item.key].quantity) * num(picked[item.key].unitPrice) })),
    [items, picked],
  );
  const total = Math.round(lines.reduce((sum, line) => sum + line.subtotal, 0) * 100) / 100;
  const returnableItems = (items || []).filter((item) => item.returnable > 0);
  const allPicked = returnableItems.length > 0 && returnableItems.every((item) => picked[item.key]);

  const pickAll = () =>
    setPicked(
      allPicked
        ? {}
        : Object.fromEntries(
            returnableItems.map((item) => [
              item.key,
              picked[item.key] || { quantity: String(item.returnable), unitPrice: String(item.unitPrice), returnTypeId: "" },
            ]),
          ),
    );

  const save = async (event) => {
    event.preventDefault();

    if (!lines.length) return showToast("error", "Select at least one product to return");
    const bad = lines.find((l) => num(l.quantity) <= 0 || num(l.quantity) > l.item.returnable);
    if (bad) return showToast("error", `${bad.item.productName}: quantity must be between 1 and ${bad.item.returnable}`);
    if (num(refund.amount) - total > 0.009) return showToast("error", "Refund cannot be more than the return total");

    setSaving(true);
    try {
      const { data } = await axios.post("/api/purchase-returns", {
        supplierId,
        returnDate: head.returnDate,
        note: head.note,
        items: lines.map((l) => ({
          purchaseId: l.item.purchaseId,
          line: l.item.line,
          quantity: num(l.quantity),
          unitPrice: num(l.unitPrice),
          returnTypeId: l.returnTypeId || null,
        })),
        refundMethod: refund.method,
        refundAmount: num(refund.amount),
        refundReference: refund.reference,
      });

      if (!data.success) return showToast("error", data.message || "Could not save the return");
      showToast("success", data.message);
      router.push(ADMIN_PURCHASE_RETURN_VIEW(data.data._id));
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not save the return");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <ListCard
        title="Purchase Return"
        actions={
          <Link href={ADMIN_PURCHASE_RETURN_SHOW} className={btn.info}>
            <List size={14} /> Return List
          </Link>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Supplier" required htmlFor="pr-supplier">
            <select id="pr-supplier" value={supplierId} onChange={(e) => chooseSupplier(e.target.value)} className={inputClass}>
              <option value="">Select Supplier</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Return No" htmlFor="pr-number">
            <input id="pr-number" value={head.returnNumber} readOnly className={`${inputClass} bg-[#f7f9fb] dark:bg-muted`} />
          </Field>
          <Field label="Return Date" required htmlFor="pr-date">
            <input id="pr-date" type="date" value={head.returnDate} onChange={(e) => setHead({ ...head, returnDate: e.target.value })} className={inputClass} required />
          </Field>
          <Field label="Search Product" htmlFor="pr-search">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-[10px] top-1/2 -translate-y-1/2 text-[#98a6ad]" />
              <input
                id="pr-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, SKU or invoice…"
                disabled={!supplierId}
                className={`${inputClass} !pl-[30px]`}
              />
            </div>
          </Field>
        </div>
      </ListCard>

      <ListCard title="Returnable Products" bodyClass="p-0">
        {!supplierId && (
          <p className="m-0 px-4 py-[40px] text-center text-[15px] text-[#6c757d]">
            <RotateCcw size={28} className="mx-auto mb-2 text-[#c3ccd4]" />
            Select a supplier to see the products you bought from them.
          </p>
        )}
        {supplierId && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
              <thead className={theadClass}>
                <tr>
                  <th className={`${thClass} w-[40px] text-center`}>
                    <input type="checkbox" aria-label="Select all" checked={allPicked} onChange={pickAll} disabled={!returnableItems.length} />
                  </th>
                  {["Purchase", "Product", "Bought", "Returned", "Returnable", "Return Qty", "Unit Price", "Return Type", "Subtotal"].map((h) => (
                    <th key={h} className={thClass}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items === undefined &&
                  Array.from({ length: 3 }, (_, i) => (
                    <tr key={i}>
                      <td colSpan={10} className={tdClass}>
                        <div className="h-4 animate-pulse rounded bg-slate-100 dark:bg-muted" />
                      </td>
                    </tr>
                  ))}
                {items?.length === 0 && (
                  <tr>
                    <td colSpan={10} className={`${tdClass} py-[30px] text-center text-[#6c757d]`}>
                      Nothing left to return for this supplier.
                    </td>
                  </tr>
                )}
                {items?.map((item) => {
                  const line = picked[item.key];
                  const over = line && (num(line.quantity) > item.returnable || num(line.quantity) <= 0);
                  const limited = item.returnable < item.bought - item.returned;
                  return (
                    <tr key={item.key} className={line ? "bg-[#f2f8fe] dark:bg-muted/60" : ""}>
                      <td className={`${tdClass} text-center`}>
                        <input
                          type="checkbox"
                          aria-label={`Return ${item.productName}`}
                          checked={!!line}
                          onChange={() => toggle(item)}
                          disabled={item.returnable <= 0}
                        />
                      </td>
                      <td className={tdClass}>
                        <Link href={ADMIN_PURCHASE_VIEW(item.purchaseId)} className="text-[#188ae2] hover:underline">
                          {item.purchaseNumber}
                        </Link>
                        <span className="block text-[12px] text-[#98a6ad]">{fmtDate(item.purchaseDate)}</span>
                      </td>
                      <td className={tdClass}>
                        {item.productName}
                        {item.variantLabel && <span className="text-[#6c757d]"> ({item.variantLabel})</span>}
                        <span className="block text-[12px] text-[#98a6ad]">{item.barcode || item.sku}</span>
                      </td>
                      <td className={tdClass}>{item.bought}</td>
                      <td className={tdClass}>{item.returned}</td>
                      <td className={`${tdClass} font-semibold`}>
                        {item.returnable}
                        {limited && <span className="block text-[11px] font-normal text-[#f9a825]">limited by stock ({item.inStock} left)</span>}
                      </td>
                      <td className={tdClass}>
                        {line ? (
                          <input
                            type="number"
                            min="1"
                            max={item.returnable}
                            value={line.quantity}
                            onChange={(e) => update(item.key, { quantity: e.target.value })}
                            className={`${cell} w-[80px] ${over ? "!border-[#ff5b5b]" : ""}`}
                            aria-label="Return quantity"
                          />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className={tdClass}>
                        {line ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(e) => update(item.key, { unitPrice: e.target.value })}
                            className={`${cell} w-[100px]`}
                            aria-label="Unit price"
                          />
                        ) : (
                          money(item.unitPrice)
                        )}
                      </td>
                      <td className={tdClass}>
                        {line ? (
                          <select value={line.returnTypeId} onChange={(e) => update(item.key, { returnTypeId: e.target.value })} className={`${cell} min-w-[140px]`} aria-label="Return type">
                            <option value="">Select type</option>
                            {types.map((t) => (
                              <option key={t._id} value={t._id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className={`${tdClass} font-semibold`}>{line ? money(line.subtotal ?? num(line.quantity) * num(line.unitPrice)) : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ListCard>

      {lines.length > 0 && (
        <ListCard title="Return Summary">
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="space-y-[14px]">
              <Field label="Note" htmlFor="pr-note">
                <textarea
                  id="pr-note"
                  rows={3}
                  value={head.note}
                  onChange={(e) => setHead({ ...head, note: e.target.value })}
                  placeholder="Why are these goods going back?"
                  className={`${inputClass} !h-auto py-2`}
                />
              </Field>
              <div className="grid gap-[14px] sm:grid-cols-3">
                <Field label="Refund Method" htmlFor="pr-method">
                  <select id="pr-method" value={refund.method} onChange={(e) => setRefund({ ...refund, method: e.target.value })} className={inputClass}>
                    {PAYMENT_METHODS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Refund Received" htmlFor="pr-refund">
                  <input
                    id="pr-refund"
                    type="number"
                    min="0"
                    step="0.01"
                    value={refund.amount}
                    onChange={(e) => setRefund({ ...refund, amount: e.target.value })}
                    placeholder="0 (adjust with due)"
                    className={inputClass}
                  />
                </Field>
                {refund.method !== "cash" && (
                  <Field label="Trx ID / Cheque No" htmlFor="pr-refund-ref">
                    <input id="pr-refund-ref" value={refund.reference} onChange={(e) => setRefund({ ...refund, reference: e.target.value })} className={inputClass} />
                  </Field>
                )}
              </div>
            </div>
            <div className="rounded-[6px] border border-[#ebeff2] bg-[#f7f9fb] p-4 text-[14px] dark:border-border dark:bg-muted">
              <div className="flex justify-between py-1">
                <span>Products</span>
                <b>{lines.length}</b>
              </div>
              <div className="flex justify-between py-1">
                <span>Total Qty</span>
                <b className="tabular-nums">{lines.reduce((sum, l) => sum + num(l.quantity), 0)}</b>
              </div>
              <div className="flex justify-between border-t border-[#dfe5ea] pt-2 text-[16px] dark:border-border">
                <span>Return Total</span>
                <b className="tabular-nums">৳ {money(total)}</b>
              </div>
              <div className="flex justify-between py-1 text-[#0b8a45]">
                <span>Refund</span>
                <b className="tabular-nums">৳ {money(num(refund.amount))}</b>
              </div>
              <div className="flex justify-between py-1 text-[#188ae2]">
                <span>Adjusted with due</span>
                <b className="tabular-nums">৳ {money(Math.max(0, total - num(refund.amount)))}</b>
              </div>
              <button type="submit" disabled={saving} className={`${btn.success} mt-3 w-full`}>
                {saving ? "Saving…" : "Save Return"}
              </button>
            </div>
          </div>
        </ListCard>
      )}
    </form>
  );
}
