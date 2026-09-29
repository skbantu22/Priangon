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
import { ListCard, btn } from "@/components/ui/Application/Admin/listKit";
import { fmtDate, money } from "@/components/ui/Application/Admin/supplier/supplierKit";
import { RATES } from "@/components/ui/Application/Admin/purchase/purchaseKit";
import InvoiceSheet, { amountInWords, downloadInvoicePdf, money as sheetMoney } from "@/components/InvoiceSheet";

/** A purchase order as the supplier receives it: lines, new rates and total; prints on A4 */
export default function PurchaseOrderViewPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [shop, setShop] = useState({});

  useEffect(() => {
    axios
      .get(`/api/purchase-orders/${id}`)
      .then(({ data }) => (data.success ? setOrder(data.data) : setError(data.message || "Purchase order not found")))
      .catch((err) => setError(err.response?.data?.message || "Could not load the purchase order"));
  }, [id]);

  useEffect(() => {
    axios
      .get("/api/settings")
      .then(({ data }) => {
        if (!data.success || !data.data) return;
        const s = data.data;
        setShop({
          name: s.companyName || "",
          address: s.address || "",
          phone: s.phone || "",
          email: s.email || "",
          vatLine: s.showMushakLine && s.bin ? `BIN ${s.bin}${s.mushakFormNo ? ` · Mushak ${s.mushakFormNo}` : ""}` : "",
        });
      })
      .catch(() => {});
  }, []);

  if (error && !order) {
    return <p className="rounded-[8px] bg-white p-6 text-center text-[#ff5b5b] dark:bg-card" role="alert">{error}</p>;
  }
  if (!order) return <div className="h-[420px] animate-pulse rounded-[8px] bg-white dark:bg-card" />;

  const supplier = order.supplierId && typeof order.supplierId === "object" ? order.supplierId : {};
  const newRates = (item) =>
    RATES.filter(([f]) => item[f] > 0).map(([f, label]) => `${label} ${money(item[f])}`).join(" · ");

  const meta = [
    [
      { label: "P.O. No", value: order.orderNumber },
      { label: "Date", value: fmtDate(order.orderDate) },
    ],
    [
      { label: "Supplier", value: supplier.name || order.supplierName },
      { label: "Phone", value: supplier.phone || "—" },
    ],
    [
      { label: "Delivery", value: fmtDate(order.deliveryDate) || "—" },
      { label: "Ordered by", value: order.createdBy || "—" },
    ],
  ];
  if (order.reference) meta.push([{ label: "Reference", value: order.reference }]);

  const lines = order.items.map((item, index) => ({
    key: index,
    notes: [item.variantLabel, item.barcode && `Barcode: ${item.barcode}`, item.extraQty ? `Extra qty: ${item.extraQty}` : "", item.discount ? `Discount: ${sheetMoney(item.discount)}` : ""].filter(Boolean),
    cells: {
      sl: index + 1,
      product: item.productName,
      qty: item.quantity,
      rate: sheetMoney(item.purchasePrice),
      amount: sheetMoney(item.total),
    },
  }));

  const pdf = () =>
    downloadInvoicePdf({
      fileName: `Purchase-Order-${order.orderNumber}.pdf`,
      shopName: shop.name || "SB Telecom",
      shopAddress: shop.address,
      shopPhone: shop.phone,
      shopEmail: shop.email,
      vatLine: shop.vatLine,
      title: "PURCHASE ORDER",
      meta,
      head: ["SL", "Product", "Qty", "Rate", "Amount"],
      body: order.items.map((item, index) => [
        String(index + 1),
        [item.productName, item.variantLabel, item.barcode].filter(Boolean).join("\n"),
        String(item.quantity),
        sheetMoney(item.purchasePrice),
        sheetMoney(item.total),
      ]),
      widths: [14, 88, 18, 32, 34],
      totals: [{ label: "Total", value: order.total, strong: true }],
      words: amountInWords(order.total),
      note: order.note || "",
    });

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
          <button type="button" className={btn.secondary} onClick={pdf}>
            PDF
          </button>
        </>
      }
    >
      <InvoiceSheet
        shopName={shop.name || "SB Telecom"}
        shopAddress={shop.address}
        shopPhone={shop.phone}
        shopEmail={shop.email}
        vatLine={shop.vatLine}
        title="PURCHASE ORDER"
        meta={meta}
        columns={[
          { key: "sl", label: "SL", align: "center", width: "7%" },
          { key: "product", label: "Product", align: "left" },
          { key: "qty", label: "Qty", align: "center", width: "10%" },
          { key: "rate", label: "Rate", align: "right", width: "16%" },
          { key: "amount", label: "Amount", align: "right", width: "18%" },
        ]}
        lines={lines}
        totals={[{ label: "Total", value: order.total, strong: true }]}
        words={amountInWords(order.total)}
        note={order.note}
        signatures={["Supplier", "Authorised Signature"]}
        below={
          <div className="print-hide mt-3 space-y-1 text-[13px]">
            <p className="m-0 capitalize text-[#495057]">Status: {order.status}</p>
            {order.items.some((item) => newRates(item)) && (
              <p className="m-0 text-[#188ae2]">
                {order.items.filter((item) => newRates(item)).map((item) => `${item.productName}: ${newRates(item)}`).join(" · ")}
              </p>
            )}
            {order.attachment?.url && (
              <a href={order.attachment.url} target="_blank" rel="noreferrer" className="text-[#188ae2]">
                View attachment
              </a>
            )}
            {order.purchaseId && (
              <p className="m-0 text-[#0b8a45]">
                Received as purchase{" "}
                <Link href={ADMIN_PURCHASE_VIEW(order.purchaseId)} className="font-semibold underline">
                  {order.purchaseNumber}
                </Link>
              </p>
            )}
          </div>
        }
      />
    </ListCard>
  );
}
