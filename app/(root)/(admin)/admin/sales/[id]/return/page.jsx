"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { List, RotateCcw } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { ADMIN_SALE_RETURNS } from "@/Route/Adminpannelroute";
import { ListCard, PAYMENT_METHODS, btn, fmtDate, inputClass, money, tdClass, thClass, theadRow } from "@/components/ui/Application/Admin/supplier/supplierKit";
import { Field, today } from "@/components/ui/Application/Admin/purchase/purchaseKit";

const TYPE_LABEL = { retail: "Buyer", dealer: "Dealer", subDealer: "Sub Dealer", wholesaler: "Wholesaler" };

/** Sale Return, like 360's: what came back from one invoice, back into stock */
export default function SaleReturnPage() {
  const { id } = useParams();
  const router = useRouter();
  const [sale, setSale] = useState(null);
  const [error, setError] = useState("");
  const [qty, setQty] = useState({});
  const [imeis, setImeis] = useState({});
  const [form, setForm] = useState({ returnDate: today(), refundAmount: "", refundMethod: "cash", note: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios
      .get(`/api/sales/${id}`)
      .then(({ data }) => (data.success ? setSale(data.data) : setError(data.message || "Sale not found")))
      .catch((err) => setError(err.response?.data?.message || "Could not load the sale"));
  }, [id]);

  // the invoice discount is shared across rows, so the value is scaled by what was charged
  const charged = sale?.subTotal ? Math.min(1, sale.total / sale.subTotal) : 1;
  const lines = useMemo(() => (sale?.items || []).filter((i) => Number(qty[i.line]) > 0), [sale, qty]);
  const total = Math.round(lines.reduce((sum, i) => sum + Number(qty[i.line]) * i.price, 0) * charged * 100) / 100;

  // a handset comes back by its IMEI: ticking them sets the quantity
  const toggleImei = (line, imei, max) => {
    const list = imeis[line] || [];
    const next = list.includes(imei) ? list.filter((x) => x !== imei) : [...list, imei];
    if (next.length > max) return;
    setImeis({ ...imeis, [line]: next });
    setQty({ ...qty, [line]: String(next.length) });
  };

  const save = async () => {
    if (!lines.length) return showToast("error", "Enter the quantity coming back");
    const bad = lines.find((i) => Number(qty[i.line]) > i.returnable);
    if (bad) return showToast("error", `${bad.productName}: only ${bad.returnable} can be returned`);
    const noImei = lines.find((i) => i.imeis?.length && (imeis[i.line] || []).length !== Number(qty[i.line]));
    if (noImei) return showToast("error", `${noImei.productName}: tick the IMEI coming back`);
    if (Number(form.refundAmount) - total > 0.009) return showToast("error", "Refund cannot be more than the return total");

    setSaving(true);
    try {
      const { data } = await axios.post("/api/sale-returns", {
        saleId: sale._id,
        ...form,
        refundAmount: Number(form.refundAmount) || 0,
        items: lines.map((i) => ({ line: i.line, qty: Number(qty[i.line]), imeis: imeis[i.line] || [] })),
      });
      if (!data.success) return showToast("error", data.message);
      showToast("success", data.message);
      router.push(ADMIN_SALE_RETURNS);
    } catch (err) {
      showToast("error", err.response?.data?.message || "Could not save the return");
    } finally {
      setSaving(false);
    }
  };

  if (error) return <p className="rounded-[8px] bg-white p-6 text-center text-[#ff5b5b] dark:bg-card">{error}</p>;
  if (!sale) return <div className="h-[420px] animate-pulse rounded-[8px] bg-white dark:bg-card" />;

  return (
    <div className="space-y-4">
      <ListCard
        title={`Sale Return — ${sale.orderNumber}`}
        actions={
          <Link href={ADMIN_SALE_RETURNS} className={btn.info}>
            <List size={14} /> Return List
          </Link>
        }
      >
        <p className="m-0 text-[14px]">
          <b>{sale.customerName}</b> {sale.phone && `· ${sale.phone}`} · {TYPE_LABEL[sale.customerType] || "Buyer"} · sold {fmtDate(sale.createdAt)} · total ৳{money(sale.total)}
          {sale.dueAmount > 0 && <span className="text-[#ff5b5b]"> · due ৳{money(sale.dueAmount)}</span>}
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead>
              <tr className={theadRow}>
                {["Product", "Sold", "Returned", "Returnable", "Price", "Return Qty", "Subtotal"].map((h) => (
                  <th key={h} className={thClass}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sale.items.map((i) => (
                <tr key={i.line} className={Number(qty[i.line]) > 0 ? "bg-[#f2f8fe] dark:bg-muted/60" : ""}>
                  <td className={tdClass}>
                    <b className="block font-medium">{i.productName}</b>
                    <span className="text-[12px] text-[#98a6ad]">{[i.size, i.color].filter(Boolean).join(" · ")}</span>
                    {i.imeis?.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {i.openImeis.map((imei) => (
                          <label key={imei} className="flex cursor-pointer items-center gap-1 border px-[6px] py-[2px] font-mono text-[11px]">
                            <input type="checkbox" checked={(imeis[i.line] || []).includes(imei)} onChange={() => toggleImei(i.line, imei, i.returnable)} />
                            {imei}
                          </label>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className={tdClass}>{i.qty}</td>
                  <td className={tdClass}>{i.returnedQty || ""}</td>
                  <td className={`${tdClass} font-semibold`}>{i.returnable}</td>
                  <td className={tdClass}>{money(i.price)}</td>
                  <td className={tdClass}>
                    <input
                      type="number"
                      min="0"
                      max={i.returnable}
                      value={qty[i.line] || ""}
                      placeholder="0"
                      disabled={!i.returnable || i.imeis?.length > 0}
                      title={i.imeis?.length ? "Tick the IMEI coming back" : undefined}
                      onChange={(e) => setQty({ ...qty, [i.line]: e.target.value })}
                      className={`${inputClass} !h-[34px] !w-[90px]`}
                      aria-label={`Return quantity for ${i.productName}`}
                    />
                  </td>
                  <td className={`${tdClass} font-semibold`}>{Number(qty[i.line]) > 0 ? money(Number(qty[i.line]) * i.price) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ListCard>

      {lines.length > 0 && (
        <ListCard title="Return Summary">
          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Return Date" htmlFor="sr-date">
                <input id="sr-date" type="date" max={today()} value={form.returnDate} onChange={(e) => setForm({ ...form, returnDate: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Refund Method" htmlFor="sr-method">
                <select id="sr-method" value={form.refundMethod} onChange={(e) => setForm({ ...form, refundMethod: e.target.value })} className={inputClass}>
                  {PAYMENT_METHODS.map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Cash Refunded" htmlFor="sr-refund">
                <input
                  id="sr-refund"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.refundAmount}
                  placeholder={sale.customerId ? "0 (adjust with due)" : "0"}
                  onChange={(e) => setForm({ ...form, refundAmount: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Note" htmlFor="sr-note">
                <input id="sr-note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Why is it coming back?" className={inputClass} />
              </Field>
            </div>
            <div className="border border-[#ebeff2] bg-[#f7f9fb] p-4 text-[14px] dark:border-border dark:bg-muted">
              <div className="flex justify-between py-1">
                <span>Items</span>
                <b>{lines.reduce((sum, i) => sum + Number(qty[i.line]), 0)}</b>
              </div>
              <div className="flex justify-between border-t pt-2 text-[16px]">
                <span>Return Total</span>
                <b>৳ {money(total)}</b>
              </div>
              <div className="flex justify-between py-1 text-[#0b8a45]">
                <span>Cash Refunded</span>
                <b>৳ {money(Number(form.refundAmount) || 0)}</b>
              </div>
              {sale.customerId && (
                <div className="flex justify-between py-1 text-[#188ae2]">
                  <span>Off the customer&apos;s due</span>
                  <b>৳ {money(Math.max(0, total - (Number(form.refundAmount) || 0)))}</b>
                </div>
              )}
              <button type="button" disabled={saving} onClick={save} className={`${btn.success} mt-3 w-full`}>
                <RotateCcw size={14} /> {saving ? "Saving…" : "Save Return"}
              </button>
            </div>
          </div>
        </ListCard>
      )}
    </div>
  );
}
