"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import axios from "axios";
import { ArrowLeft, HandCoins, PackageCheck, Printer } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { ADMIN_PURCHASE_RETURN_VIEW, ADMIN_PURCHASE_SHOW } from "@/Route/Adminpannelroute";
import { ListCard, btn, tdClass, thClass, theadClass } from "@/components/ui/Application/Admin/listKit";
import { fmtDate, methodLabel, money } from "@/components/ui/Application/Admin/supplier/supplierKit";
import { PartyBlock, PrintHeader, PurchasePayDialog } from "@/components/ui/Application/Admin/purchase/purchaseKit";

const STATUS_STYLE = {
  pending: "bg-amber-100 text-amber-800",
  received: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function PurchaseViewPage() {
  return (
    <Suspense fallback={<div className="h-[420px] animate-pulse rounded-[8px] bg-white dark:bg-card" />}>
      <PurchaseView />
    </Suspense>
  );
}

/** Purchase invoice with items, totals, payments and returns; prints on A4 by itself */
function PurchaseView() {
  const { id } = useParams();
  const params = useSearchParams();
  const [p, setP] = useState(null);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`/api/purchase/${id}`);
      if (!data.success) return setError(data.message || "Purchase not found");
      setP(data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load the purchase");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // "Print Invoice" in the list opens this page with ?print=1
  useEffect(() => {
    if (p && params.get("print") === "1") {
      const timer = setTimeout(() => window.print(), 400);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [p, params]);

  const receive = async () => {
    if (!confirm(`Receive ${p.purchaseNumber}? Stock will increase.`)) return;
    setBusy(true);
    try {
      const { data } = await axios.post(`/api/purchase/receive/${p._id}`, {});
      if (!data.success) return showToast("error", data.message || "Could not receive");
      showToast("success", "Stock updated");
      load();
    } catch (err) {
      showToast("error", err.response?.data?.message || "Could not receive");
    } finally {
      setBusy(false);
    }
  };

  if (error && !p) {
    return <p className="rounded-[8px] bg-white p-6 text-center text-[#ff5b5b] dark:bg-card" role="alert">{error}</p>;
  }
  if (!p) return <div className="h-[420px] animate-pulse rounded-[8px] bg-white dark:bg-card" />;

  const supplier = p.supplierId && typeof p.supplierId === "object" ? p.supplierId : {};
  const itemCount = p.items.reduce((sum, item) => sum + (item.quantity || 0) + (item.extraQty || 0), 0);
  const returned = (p.returns || []).reduce((sum, r) => sum + (r.total || 0), 0);

  const totals = [
    ["Items", itemCount, false, true],
    ["Subtotal", p.subtotal],
    [`Discount${p.discountType === "percent" ? ` (${p.discountValue}%)` : ""}`, -(p.discount || 0)],
    ["Shipping / Labour", p.shippingCost],
    ["Grand Total", p.grandTotal, true],
    ["Paid", p.paidAmount],
    ["Due Dismiss", p.dismissAmount],
    ["Due", p.dueAmount, true],
  ].filter(([label, value]) => value || ["Items", "Subtotal", "Grand Total", "Paid", "Due"].includes(label));

  return (
    <>
      <ListCard
        title={`Purchase ${p.purchaseNumber}`}
        actions={
          <>
            <Link href={ADMIN_PURCHASE_SHOW} className={btn.secondary}>
              <ArrowLeft size={14} /> Back
            </Link>
            {p.status === "pending" && (
              <button type="button" className={btn.success} disabled={busy} onClick={receive}>
                <PackageCheck size={14} /> Receive (stock in)
              </button>
            )}
            {p.status !== "cancelled" && p.dueAmount > 0 && (
              <button type="button" className={btn.warning} onClick={() => setPaying(p)}>
                <HandCoins size={14} /> Pay Due
              </button>
            )}
            <button type="button" className={btn.primary} onClick={() => window.print()}>
              <Printer size={14} /> Print
            </button>
          </>
        }
      >
        <div id="invoice-print" className="text-[14px] text-[#212529] dark:text-foreground">
          <PrintHeader title="PURCHASE INVOICE">
            <p className="m-0 mt-1">
              Invoice No: <b>{p.purchaseNumber}</b>
            </p>
            <p className="m-0">
              Date: {fmtDate(p.purchaseDate)}
              {p.dueDate && <> · Due Date: {fmtDate(p.dueDate)}</>}
            </p>
            {p.referenceNo && <p className="m-0">Reference: {p.referenceNo}</p>}
          </PrintHeader>

          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <PartyBlock
              label="Supplier"
              name={supplier.name || p.supplierName}
              lines={[supplier.companyName, [supplier.phone, supplier.email].filter(Boolean).join(" · "), supplier.address]}
            />
            <div className="sm:text-right">
              <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#98a6ad]">Received by</p>
              <p className="m-0 mt-1">{p.createdBy || "—"}</p>
              <p className="m-0 text-[#6c757d]">Stock in: {p.locationName || "Warehouse"}</p>
              <span className="mt-2 inline-flex gap-1">
                <span className={`rounded-[4px] px-[10px] py-[3px] text-[12px] font-semibold uppercase ${STATUS_STYLE[p.status] || ""}`}>{p.status}</span>
                <span
                  className={`rounded-[4px] px-[10px] py-[3px] text-[12px] font-semibold ${
                    p.dueAmount > 0 ? "bg-[#fff1f1] text-[#ff5b5b]" : "bg-[#e8f7f0] text-[#0b8a45]"
                  }`}
                >
                  {p.dueAmount > 0 ? "DUE" : "PAID"}
                </span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead className={theadClass}>
                <tr>
                  {["SL", "Product", "Qty", "Extra", "Price", "Discount", "Subtotal", "Expire Date"].map((h) => (
                    <th key={h} className={thClass}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.items.map((item, index) => (
                  <tr key={index}>
                    <td className={tdClass}>{index + 1}</td>
                    <td className={tdClass}>
                      {item.productName}
                      {item.variantLabel && <span className="text-[#6c757d]"> ({item.variantLabel})</span>}
                      <span className="block text-[12px] text-[#98a6ad]">{item.sku}</span>
                      {item.imeis?.length > 0 && <span className="block font-mono text-[11px] text-[#6c757d]">IMEI: {item.imeis.join(", ")}</span>}
                      {item.returnedQty > 0 && <span className="block text-[11px] text-[#ff5b5b]">{item.returnedQty} returned</span>}
                    </td>
                    <td className={tdClass}>{item.quantity}</td>
                    <td className={tdClass}>{item.extraQty || "—"}</td>
                    <td className={tdClass}>{money(item.unitPrice)}</td>
                    <td className={tdClass}>{money(item.discount)}</td>
                    <td className={`${tdClass} font-semibold`}>{money(item.total)}</td>
                    <td className={tdClass}>{item.expireDate ? fmtDate(item.expireDate) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-[18px] sm:grid-cols-[1fr_320px]">
            <div>
              <p className="m-0 mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#98a6ad]">Payments</p>
              {!p.payments?.length && <p className="m-0 text-[#98a6ad]">No payment yet.</p>}
              {p.payments?.map((pay) => (
                <p key={pay._id} className="m-0 flex justify-between border-b border-dashed border-[#ebeff2] py-[5px] dark:border-border">
                  <span>
                    {fmtDate(pay.paidAt)} · {methodLabel(pay.method)}
                    {pay.reference && ` (${pay.reference})`}
                  </span>
                  <b className="tabular-nums">৳ {money(pay.amount)}</b>
                </p>
              ))}

              {p.returns?.length > 0 && (
                <>
                  <p className="m-0 mb-2 mt-4 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#98a6ad]">Returned to supplier</p>
                  {p.returns.map((r) => (
                    <p key={r._id} className="m-0 flex justify-between border-b border-dashed border-[#ebeff2] py-[5px] dark:border-border">
                      <span>
                        {fmtDate(r.returnDate)} ·{" "}
                        <Link href={ADMIN_PURCHASE_RETURN_VIEW(r._id)} className="text-[#188ae2] hover:underline">
                          {r.returnNumber}
                        </Link>
                      </span>
                      <b className="tabular-nums">৳ {money(r.total)}</b>
                    </p>
                  ))}
                  <p className="m-0 mt-1 text-[12px] text-[#6c757d]">Returns of ৳ {money(returned)} come off the supplier&apos;s balance, not this invoice.</p>
                </>
              )}

              {p.note && (
                <p className="m-0 mt-3 text-[#6c757d]">
                  <b>Note:</b> {p.note}
                </p>
              )}
              {p.attachment?.url && (
                <a href={p.attachment.url} target="_blank" rel="noreferrer" className="print-hide mt-2 inline-block text-[#188ae2]">
                  View attachment
                </a>
              )}
            </div>

            <dl className="m-0 space-y-[6px] rounded-[6px] border border-[#ebeff2] bg-[#fafbfc] p-[14px] dark:border-border dark:bg-muted">
              {totals.map(([label, value, strong, plain]) => (
                <div
                  key={label}
                  className={`flex justify-between ${strong ? "text-[16px] font-bold" : ""} ${label === "Grand Total" ? "border-t border-[#e3e8ee] pt-[6px] dark:border-border" : ""} ${
                    label === "Paid" ? "text-[#0b8a45]" : ""
                  } ${label === "Due" && value > 0 ? "text-[#ff5b5b]" : ""}`}
                >
                  <dt>{label}</dt>
                  <dd className="m-0 tabular-nums">{plain ? value : `${value < 0 ? "− " : ""}৳ ${money(Math.abs(value || 0))}`}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="print-signatures mt-[56px] hidden justify-between text-[13px]">
            <span className="w-[180px] border-t border-[#999] pt-1 text-center">Supplier</span>
            <span className="w-[180px] border-t border-[#999] pt-1 text-center">Authorised Signature</span>
          </div>
        </div>
      </ListCard>

      <PurchasePayDialog purchase={paying} onClose={() => setPaying(null)} onDone={load} />
    </>
  );
}
