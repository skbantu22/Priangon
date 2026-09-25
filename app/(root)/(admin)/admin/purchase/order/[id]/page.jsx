"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import { ArrowLeft, PackageCheck, Pencil, Printer } from "lucide-react";

import {
  ADMIN_PURCHASE_ADD,
  ADMIN_PURCHASE_ORDER_EDIT,
  ADMIN_PURCHASE_ORDER_SHOW,
  ADMIN_PURCHASE_VIEW,
} from "@/Route/Adminpannelroute";
import { ListCard, btn, tdClass, thClass, theadClass, totalRowClass } from "@/components/ui/Application/Admin/listKit";
import { fmtDate, money } from "@/components/ui/Application/Admin/supplier/supplierKit";
import { ORDER_STATUS_STYLE, PartyBlock, PrintHeader, RATES } from "@/components/ui/Application/Admin/purchase/purchaseKit";

/** A purchase order as the supplier receives it: lines, new rates and total; prints on A4 */
export default function PurchaseOrderViewPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get(`/api/purchase-orders/${id}`)
      .then(({ data }) => (data.success ? setOrder(data.data) : setError(data.message || "Purchase order not found")))
      .catch((err) => setError(err.response?.data?.message || "Could not load the purchase order"));
  }, [id]);

  if (error && !order) {
    return <p className="rounded-[8px] bg-white p-6 text-center text-[#ff5b5b] dark:bg-card" role="alert">{error}</p>;
  }
  if (!order) return <div className="h-[420px] animate-pulse rounded-[8px] bg-white dark:bg-card" />;

  const supplier = order.supplierId && typeof order.supplierId === "object" ? order.supplierId : {};
  // sale rate changes only; a supplier copy does not need them, so they stay off paper
  const newRates = (item) =>
    RATES.filter(([f]) => item[f] > 0).map(([f, label]) => `${label} ${money(item[f])}`).join(" · ");

  return (
    <ListCard
      title={`Purchase Order ${order.orderNumber}`}
      actions={
        <>
          <Link href={ADMIN_PURCHASE_ORDER_SHOW} className={btn.secondary}>
            <ArrowLeft size={14} /> Back
          </Link>
          {order.status === "pending" && (
            <>
              <Link href={ADMIN_PURCHASE_ORDER_EDIT(order._id)} className={btn.info}>
                <Pencil size={14} /> Edit
              </Link>
              <Link href={`${ADMIN_PURCHASE_ADD}?po=${order._id}`} className={btn.success}>
                <PackageCheck size={14} /> Receive
              </Link>
            </>
          )}
          <button type="button" className={btn.primary} onClick={() => window.print()}>
            <Printer size={14} /> Print
          </button>
        </>
      }
    >
      <div id="invoice-print" className="text-[14px] text-[#212529] dark:text-foreground">
        <PrintHeader title="PURCHASE ORDER">
          <p className="m-0 mt-1">
            P.O. No: <b>{order.orderNumber}</b>
          </p>
          <p className="m-0">
            Date: {fmtDate(order.orderDate)} · Delivery: {fmtDate(order.deliveryDate)}
          </p>
          {order.reference && <p className="m-0">Reference: {order.reference}</p>}
          <span className={`mt-1 inline-block rounded-[4px] px-2 py-0.5 text-[12px] font-semibold capitalize ${ORDER_STATUS_STYLE[order.status]}`}>{order.status}</span>
        </PrintHeader>

        <div className="grid gap-4 py-4 sm:grid-cols-2">
          <PartyBlock
            label="Supplier"
            name={supplier.name || order.supplierName}
            lines={[supplier.companyName, [supplier.phone, supplier.email].filter(Boolean).join(" · "), supplier.address]}
          />
          <div className="sm:text-right">
            <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#98a6ad]">Ordered by</p>
            <p className="m-0 mt-1">{order.createdBy || "—"}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead className={theadClass}>
              <tr>
                {["SL", "Product", "PPP", "Qty", "Extra", "Discount", "Total"].map((h) => (
                  <th key={h} className={thClass}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i}>
                  <td className={tdClass}>{i + 1}</td>
                  <td className={tdClass}>
                    {item.productName}
                    {item.variantLabel && <span className="text-[#6c757d]"> ({item.variantLabel})</span>}
                    <span className="block text-[12px] text-[#98a6ad]">{item.barcode}</span>
                    {newRates(item) && <span className="print-hide block text-[12px] text-[#188ae2]">New rate: {newRates(item)}</span>}
                  </td>
                  <td className={tdClass}>{money(item.purchasePrice)}</td>
                  <td className={tdClass}>{item.quantity}</td>
                  <td className={tdClass}>{item.extraQty || "—"}</td>
                  <td className={tdClass}>{money(item.discount)}</td>
                  <td className={`${tdClass} font-semibold`}>{money(item.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={totalRowClass}>
                <td colSpan={6} className={tdClass}>
                  Total
                </td>
                <td className={tdClass}>৳ {money(order.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {order.note && (
          <p className="m-0 mt-3 whitespace-pre-line text-[#495057] dark:text-muted-foreground">
            <b>Note:</b> {order.note}
          </p>
        )}
        {order.attachment?.url && (
          <a href={order.attachment.url} target="_blank" rel="noreferrer" className="print-hide mt-2 inline-block text-[#188ae2]">
            View attachment
          </a>
        )}
        {order.purchaseId && (
          <p className="print-hide m-0 mt-2 text-[#0b8a45]">
            Received as purchase{" "}
            <Link href={ADMIN_PURCHASE_VIEW(order.purchaseId)} className="font-semibold underline">
              {order.purchaseNumber}
            </Link>
          </p>
        )}

        <div className="print-signatures mt-[56px] hidden justify-between text-[13px]">
          <span className="w-[180px] border-t border-[#999] pt-1 text-center">Supplier</span>
          <span className="w-[180px] border-t border-[#999] pt-1 text-center">Authorised Signature</span>
        </div>
      </div>
    </ListCard>
  );
}
