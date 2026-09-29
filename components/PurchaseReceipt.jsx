"use client";

import { useEffect, useState } from "react";
import { showToast } from "@/lib/showToast";
import { methodLabel } from "@/components/ui/Application/Admin/supplier/supplierKit";
import InvoiceSheet, { amountInWords, downloadInvoicePdf, money } from "@/components/InvoiceSheet";

/**
 * Purchase bill on the shared AmarSolution paper, not the 80mm sales slip.
 */
export default function PurchaseReceipt({ purchase, company = {}, autoPrint = false, toolbarStart = null }) {
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!autoPrint) return undefined;
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, [autoPrint]);

  if (!purchase) return <div className="p-4 text-center">Loading...</div>;

  const supplier = purchase.supplierId && typeof purchase.supplierId === "object" ? purchase.supplierId : {};
  const supplierName = supplier.name || purchase.supplierName || "Supplier";
  const supplierPhone = supplier.phone || "—";
  const shopName = company.name || "SB Telecom";
  const shopAddress = company.address || "Dhaka, Bangladesh";
  const shopPhone = company.phone || "01700000001";
  const shopEmail = company.email || "support@sbtelecom.com.bd";
  const vatLine = company.showMushakLine && company.bin ? `BIN ${company.bin}${company.mushakFormNo ? ` · Mushak ${company.mushakFormNo}` : ""}` : "";

  const subtotal = Number(purchase.subtotal || purchase.grandTotal || 0);
  const discount = Number(purchase.discount || 0);
  const shipping = Number(purchase.shippingCost || 0);
  const totalAmount = Number(purchase.grandTotal || 0);
  const totalPaid = Number(purchase.paidAmount || 0);
  const dueAmount = Number(purchase.dueAmount || 0);
  const dismiss = Number(purchase.dismissAmount || 0);
  const branch = purchase.locationName || "Warehouse";
  const orderDate = (purchase.purchaseDate ? new Date(purchase.purchaseDate) : new Date()).toLocaleDateString("en-GB");
  const items = purchase.items || [];
  const payments = purchase.payments || [];

  const itemNotes = (item) => {
    const lines = [];
    if (item.variantLabel) lines.push(item.variantLabel);
    if (item.sku) lines.push(`SKU: ${item.sku}`);
    if (item.imeis?.length) lines.push(`IMEI/SN: ${item.imeis.join(", ")}`);
    if (item.extraQty) lines.push(`Extra qty: ${item.extraQty}`);
    if (item.expireDate) lines.push(`Expire: ${new Date(item.expireDate).toLocaleDateString("en-GB")}`);
    if (item.returnedQty > 0) lines.push(`${item.returnedQty} returned`);
    return lines;
  };

  const lineTotal = (item) => Number(item.total ?? Number(item.unitPrice || 0) * (parseInt(item.quantity, 10) || 1));

  const meta = [
    [
      { label: "Invoice No", value: purchase.purchaseNumber },
      { label: "Date", value: orderDate },
    ],
    [
      { label: "Supplier", value: supplierName },
      { label: "Phone", value: supplierPhone },
    ],
    purchase.referenceNo
      ? [
          { label: "Branch", value: branch },
          { label: "Reference", value: purchase.referenceNo },
        ]
      : [{ label: "Branch", value: branch }],
  ];

  const columns = [
    { key: "sl", label: "SL", align: "center", width: "7%" },
    { key: "product", label: "Product", align: "left" },
    { key: "qty", label: "Qty", align: "center", width: "10%" },
    { key: "rate", label: "Rate", align: "right", width: "16%" },
    { key: "discount", label: "Discount", align: "right", width: "14%" },
    { key: "amount", label: "Amount", align: "right", width: "18%" },
  ];

  const lines = items.map((item, index) => ({
    key: index,
    notes: itemNotes(item),
    cells: {
      sl: index + 1,
      product: item.productName || "Item",
      qty: item.quantity,
      rate: money(item.unitPrice),
      discount: money(item.discount),
      amount: money(lineTotal(item)),
    },
  }));

  const totals = [
    { label: "Subtotal", value: subtotal },
    ...(discount > 0 ? [{ label: "Discount", value: discount }] : []),
    ...(shipping > 0 ? [{ label: "Shipping", value: shipping }] : []),
    { label: "Grand Total", value: totalAmount, strong: true },
    { label: "Paid", value: totalPaid },
    ...(dismiss > 0 ? [{ label: "Due dismiss", value: dismiss }] : []),
    { label: "Due", value: dueAmount, strong: true },
  ];

  const words = amountInWords(totalAmount);

  const sheet = {
    fileName: `Purchase-${purchase.purchaseNumber || purchase._id}.pdf`,
    shopName,
    shopAddress,
    shopPhone,
    shopEmail,
    vatLine,
    title: "PURCHASE INVOICE",
    meta,
    head: ["SL", "Product", "Qty", "Rate", "Discount", "Amount"],
    body: items.map((item, index) => [
      String(index + 1),
      [item.productName || "Item", ...itemNotes(item)].join("\n"),
      String(item.quantity || 1),
      money(item.unitPrice),
      money(item.discount),
      money(lineTotal(item)),
    ]),
    widths: [12, 74, 16, 28, 28, 28],
    totals,
    words,
    note: purchase.note || "",
    extraHead: payments.length ? ["Payment", "Reference", "Amount"] : undefined,
    extraBody: payments.map((pay) => [methodLabel(pay.method), pay.reference || "—", money(pay.amount)]),
  };

  const handleWhatsApp = async () => {
    const digits = String(supplierPhone).replace(/\D/g, "").replace(/^88/, "");
    const text = `Purchase invoice ${purchase.purchaseNumber} from ${shopName}`;
    setSending(true);
    try {
      const { toBlob } = await import("html-to-image");
      const node = document.getElementById("invoice-print");
      const blob = await toBlob(node, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        imagePlaceholder: "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
      });
      const file = new File([blob], `Purchase-${purchase.purchaseNumber || purchase._id}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(file);
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast("success", "Invoice picture downloaded: attach it in the WhatsApp chat");
      const to = /^01\d{9}$/.test(digits) ? `88${digits}` : "";
      window.open(`https://wa.me/${to}?text=${encodeURIComponent(text)}`, "_blank");
    } catch (err) {
      if (err?.name !== "AbortError") showToast("error", "Could not make the invoice picture");
    } finally {
      setSending(false);
    }
  };

  const paymentsTable =
    payments.length > 0 ? (
      <table className="mt-4 w-full max-w-[480px] border-collapse text-[13px]">
        <thead>
          <tr className="bg-[#f4f4f5]">
            <th className="border border-black px-2 py-1.5 text-left font-bold">Payment</th>
            <th className="border border-black px-2 py-1.5 text-left font-bold">Reference</th>
            <th className="border border-black px-2 py-1.5 text-right font-bold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((pay, index) => (
            <tr key={pay._id || index}>
              <td className="border border-black px-2 py-1.5">{methodLabel(pay.method)}</td>
              <td className="border border-black px-2 py-1.5">{pay.reference || "—"}</td>
              <td className="border border-black px-2 py-1.5 text-right font-semibold tabular-nums">{money(pay.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : null;

  return (
    <InvoiceSheet
      shopName={shopName}
      shopAddress={shopAddress}
      shopPhone={shopPhone}
      shopEmail={shopEmail}
      vatLine={vatLine}
      title="PURCHASE INVOICE"
      meta={meta}
      columns={columns}
      lines={lines}
      totals={totals}
      words={words}
      note={purchase.note}
      below={paymentsTable}
      signatures={["Supplier", "Authorised Signature"]}
      toolbar={
        <div className="print-hide print:hidden mb-4 flex flex-wrap justify-center gap-2 rounded bg-gray-100 p-2 shadow-sm">
          {toolbarStart}
          <button type="button" onClick={() => window.print()} className="rounded bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-blue-700">
            Print
          </button>
          <button type="button" onClick={() => downloadInvoicePdf(sheet)} className="rounded bg-red-600 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-red-700">
            Download PDF
          </button>
          <button type="button" onClick={handleWhatsApp} disabled={sending} className="rounded bg-green-600 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-green-700 disabled:opacity-60">
            {sending ? "Preparing..." : "Send WhatsApp"}
          </button>
        </div>
      }
    />
  );
}
