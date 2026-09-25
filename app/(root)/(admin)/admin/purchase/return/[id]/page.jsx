"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Printer } from "lucide-react";

import { ADMIN_PURCHASE_RETURN_SHOW, ADMIN_PURCHASE_VIEW } from "@/Route/Adminpannelroute";
import { ListCard, btn, tdClass, thClass, theadClass, totalRowClass } from "@/components/ui/Application/Admin/listKit";
import { fmtDate, methodLabel, money } from "@/components/ui/Application/Admin/supplier/supplierKit";
import { PartyBlock, PrintHeader } from "@/components/ui/Application/Admin/purchase/purchaseKit";

export default function PurchaseReturnViewPage() {
  return (
    <Suspense fallback={<div className="h-[420px] animate-pulse rounded-[8px] bg-white dark:bg-card" />}>
      <PurchaseReturnView />
    </Suspense>
  );
}

/** Purchase return note: returned lines, return types and the refund received; prints on A4 */
function PurchaseReturnView() {
  const { id } = useParams();
  const params = useSearchParams();
  const [r, setR] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get(`/api/purchase-returns/${id}`)
      .then(({ data }) => (data.success ? setR(data.data) : setError(data.message || "Purchase return not found")))
      .catch((err) => setError(err.response?.data?.message || "Could not load the return"));
  }, [id]);

  useEffect(() => {
    if (r && params.get("print") === "1") {
      const timer = setTimeout(() => window.print(), 400);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [r, params]);

  if (error && !r) {
    return <p className="rounded-[8px] bg-white p-6 text-center text-[#ff5b5b] dark:bg-card" role="alert">{error}</p>;
  }
  if (!r) return <div className="h-[420px] animate-pulse rounded-[8px] bg-white dark:bg-card" />;

  const supplier = r.supplierId && typeof r.supplierId === "object" ? r.supplierId : {};
  const refunded = r.refund?.amount || 0;

  return (
    <ListCard
      title={`Purchase Return ${r.returnNumber}`}
      actions={
        <>
          <Link href={ADMIN_PURCHASE_RETURN_SHOW} className={btn.secondary}>
            <ArrowLeft size={14} /> Back
          </Link>
          <button type="button" className={btn.primary} onClick={() => window.print()}>
            <Printer size={14} /> Print
          </button>
        </>
      }
    >
      <div id="invoice-print" className="text-[14px] text-[#212529] dark:text-foreground">
        <PrintHeader title="PURCHASE RETURN">
          <p className="m-0 mt-1">
            Return No: <b>{r.returnNumber}</b>
          </p>
          <p className="m-0">Date: {fmtDate(r.returnDate)}</p>
        </PrintHeader>

        <div className="grid gap-4 py-4 sm:grid-cols-2">
          <PartyBlock
            label="Returned to"
            name={supplier.name || r.supplierName}
            lines={[supplier.companyName, supplier.phone, supplier.address]}
          />
          <div className="sm:text-right">
            <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#98a6ad]">Returned by</p>
            <p className="m-0 mt-1">{r.createdBy || "—"}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead className={theadClass}>
              <tr>
                {["SL", "Product", "Purchase", "Return Type", "Qty", "Unit Price", "Subtotal"].map((h) => (
                  <th key={h} className={thClass}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {r.items.map((item, i) => (
                <tr key={i}>
                  <td className={tdClass}>{i + 1}</td>
                  <td className={tdClass}>
                    {item.productName}
                    {item.variantLabel && <span className="text-[#6c757d]"> ({item.variantLabel})</span>}
                    <span className="block text-[12px] text-[#98a6ad]">{item.barcode}</span>
                  </td>
                  <td className={tdClass}>
                    <Link href={ADMIN_PURCHASE_VIEW(item.purchaseId)} className="text-[#188ae2] hover:underline">
                      {item.purchaseNumber}
                    </Link>
                  </td>
                  <td className={tdClass}>{item.reason || "—"}</td>
                  <td className={tdClass}>{item.quantity}</td>
                  <td className={tdClass}>{money(item.unitPrice)}</td>
                  <td className={`${tdClass} font-semibold`}>{money(item.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={totalRowClass}>
                <td colSpan={4} className={tdClass}>
                  Total
                </td>
                <td className={tdClass}>{r.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                <td className={tdClass} />
                <td className={tdClass}>{money(r.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap justify-between gap-4">
          <div className="max-w-[420px] text-[13px] text-[#6c757d]">
            {r.note && (
              <p className="m-0">
                <b className="text-[#212529] dark:text-foreground">Note:</b> {r.note}
              </p>
            )}
            {r.refund && (
              <p className="m-0 mt-1">
                Refund {r.refund.invoiceNo} · {methodLabel(r.refund.method)} · ৳ {money(r.refund.amount)}
              </p>
            )}
          </div>
          <div className="w-full max-w-[300px] text-[14px]">
            <div className="flex justify-between border-b border-[#ebeff2] py-[5px] dark:border-border">
              <span>Return Total</span>
              <b className="tabular-nums">৳ {money(r.total)}</b>
            </div>
            <div className="flex justify-between border-b border-[#ebeff2] py-[5px] text-[#0b8a45] dark:border-border">
              <span>Refund Received</span>
              <b className="tabular-nums">৳ {money(refunded)}</b>
            </div>
            <div className="flex justify-between py-[5px] text-[#188ae2]">
              <span>Adjusted with Due</span>
              <b className="tabular-nums">৳ {money(r.total - refunded)}</b>
            </div>
          </div>
        </div>

        <div className="print-signatures mt-[56px] hidden justify-between text-[13px]">
          <span className="w-[180px] border-t border-[#999] pt-1 text-center">Supplier</span>
          <span className="w-[180px] border-t border-[#999] pt-1 text-center">Authorised Signature</span>
        </div>
      </div>
    </ListCard>
  );
}
