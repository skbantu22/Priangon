"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Printer } from "lucide-react";

import { ADMIN_PURCHASE_RETURN_SHOW } from "@/Route/Adminpannelroute";
import { ListCard, btn } from "@/components/ui/Application/Admin/listKit";
import { fmtDate, methodLabel } from "@/components/ui/Application/Admin/supplier/supplierKit";
import InvoiceSheet, { amountInWords, downloadInvoicePdf, money } from "@/components/InvoiceSheet";

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
  const [shop, setShop] = useState({});

  useEffect(() => {
    axios
      .get(`/api/purchase-returns/${id}`)
      .then(({ data }) => (data.success ? setR(data.data) : setError(data.message || "Purchase return not found")))
      .catch((err) => setError(err.response?.data?.message || "Could not load the return"));
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
  const refunded = Number(r.refund?.amount || r.refundAmount || 0);
  const meta = [
    [
      { label: "Return No", value: r.returnNumber },
      { label: "Date", value: fmtDate(r.returnDate) },
    ],
    [
      { label: "Supplier", value: supplier.name || r.supplierName },
      { label: "Phone", value: supplier.phone || "—" },
    ],
    [{ label: "Returned by", value: r.createdBy || "—" }],
  ];
  const lines = r.items.map((item, index) => ({
    key: index,
    notes: [item.variantLabel, item.barcode && `Barcode: ${item.barcode}`, item.purchaseNumber && `Purchase: ${item.purchaseNumber}`, item.reason].filter(Boolean),
    cells: {
      sl: index + 1,
      product: item.productName,
      qty: item.quantity,
      rate: money(item.unitPrice),
      amount: money(item.total),
    },
  }));
  const totals = [
    { label: "Return Total", value: r.total, strong: true },
    { label: "Refund", value: refunded },
    { label: "Adjusted with Due", value: Number(r.total || 0) - refunded, strong: true },
  ];

  const pdf = () =>
    downloadInvoicePdf({
      fileName: `Purchase-Return-${r.returnNumber}.pdf`,
      shopName: shop.name || "SB Telecom",
      shopAddress: shop.address,
      shopPhone: shop.phone,
      shopEmail: shop.email,
      vatLine: shop.vatLine,
      title: "PURCHASE RETURN",
      meta,
      head: ["SL", "Product", "Qty", "Rate", "Amount"],
      body: r.items.map((item, index) => [
        String(index + 1),
        [item.productName, item.purchaseNumber, item.reason].filter(Boolean).join("\n"),
        String(item.quantity),
        money(item.unitPrice),
        money(item.total),
      ]),
      widths: [14, 88, 18, 32, 34],
      totals,
      words: amountInWords(r.total),
      note: r.note || "",
    });

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
        title="PURCHASE RETURN"
        meta={meta}
        columns={[
          { key: "sl", label: "SL", align: "center", width: "7%" },
          { key: "product", label: "Product", align: "left" },
          { key: "qty", label: "Qty", align: "center", width: "10%" },
          { key: "rate", label: "Rate", align: "right", width: "16%" },
          { key: "amount", label: "Amount", align: "right", width: "18%" },
        ]}
        lines={lines}
        totals={totals}
        words={amountInWords(r.total)}
        note={r.note}
        signatures={["Supplier", "Authorised Signature"]}
        below={
          r.refund ? (
            <p className="mt-3 text-[13px]">
              Refund {r.refund.invoiceNo || ""} · {methodLabel(r.refund.method)} · {money(refunded)}
            </p>
          ) : null
        }
      />
    </ListCard>
  );
}
