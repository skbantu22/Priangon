"use client";

import { useEffect, useState } from "react";
import { warrantyLabel } from "@/lib/warranty";
import { showToast } from "@/lib/showToast";
import InvoiceSheet, { amountInWords, downloadInvoicePdf, money } from "@/components/InvoiceSheet";

const WARRANTY_NOTES = [
  "Warranty covers manufacturing defects only.",
  "Physical, liquid or burn damage and broken seals are not covered.",
  "Keep this invoice: it is required for any warranty claim.",
  "Exchange within 3 days only if the box and accessories are intact.",
];

// sharePath: signed public link of this invoice (admin print page)
// publicView: the customer's own copy, no auto print and no send buttons
export default function PrintReceipt({ order, autoPrint = true, sharePath = "", publicView = false }) {
  const [sending, setSending] = useState("");

  useEffect(() => {
    if (!autoPrint || publicView) return undefined;
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, [autoPrint, publicView]);

  if (!order) return <div className="p-4 text-center">Loading...</div>;

  const company = order.company || {};
  const showroomName = company.name || order.showroom?.name || "SB Telecom";
  const showroomAddress = order.showroom?.address || company.address || "Dhaka, Bangladesh";
  const showroomPhone = order.showroom?.phone || company.phone || "01700000001";
  const showroomEmail = order.showroom?.email || company.email || "support@sbtelecom.com.bd";
  const vatLine = company.showMushakLine && company.bin ? `BIN ${company.bin}${company.mushakFormNo ? ` · Mushak ${company.mushakFormNo}` : ""}` : "";
  const branch = order.showroom?.name || "—";

  const warrantyNotes = company.warrantyTerms
    ? company.warrantyTerms.split("\n").map((line) => line.trim()).filter(Boolean)
    : WARRANTY_NOTES;

  const totalAmount = Number(order.total || 0);
  const totalPaid = Number(order.paidAmount ?? totalAmount);
  const dueAmount = Number(order.dueAmount || 0);
  const discount = Number(order.discount || 0);
  const vat = Number(order.vat || 0);
  const subtotal = Number(order.subTotal || totalAmount);
  const cashReceive = Number(order.cashReceive || 0);
  const changeAmount = cashReceive > totalPaid ? cashReceive - totalPaid : 0;

  const saleDate = order.saleDate ? new Date(order.saleDate) : new Date();
  const createdTime = order.createdAt ? new Date(order.createdAt) : saleDate;
  const orderDate = saleDate.toLocaleDateString("en-GB");
  const orderTime = createdTime.toLocaleTimeString("en-US", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hour12: true });

  const itemNotes = (item) => {
    const lines = [];
    const variant = [item.size, item.color].filter((x) => x && !/^(default|standard)$/i.test(x)).join(" / ");
    if (item.barcode) lines.push(`Barcode: ${item.barcode}`);
    if (variant) lines.push(variant);
    if (item.imeis?.length) lines.push(`IMEI/SN: ${item.imeis.join(", ")}`);
    const warranty = warrantyLabel(item);
    if (warranty) {
      const till = item.warrantyExpiry
        ? new Date(item.warrantyExpiry).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        : "";
      lines.push(till ? `${warranty} (till ${till})` : warranty);
    }
    return lines;
  };

  const lineAmount = (item) => Number(item.price || 0) * (parseInt(item.qty, 10) || 1);
  const items = order.items || [];

  const meta = [
    [
      { label: "Invoice No", value: order.orderNumber || order._id },
      { label: "Date", value: `${orderDate} · ${orderTime}` },
    ],
    [
      { label: "Customer", value: order.customerName || "Walk-in" },
      { label: "Phone", value: order.customerPhone || "—" },
    ],
    [
      { label: "Branch", value: branch },
      { label: "Sold By", value: order.soldBy || "—" },
    ],
  ];

  const columns = [
    { key: "sl", label: "SL", align: "center", width: "7%" },
    { key: "product", label: "Product", align: "left" },
    { key: "qty", label: "Qty", align: "center", width: "10%" },
    { key: "rate", label: "Rate", align: "right", width: "16%" },
    { key: "amount", label: "Amount", align: "right", width: "18%" },
  ];

  const lines = items.map((item, index) => ({
    key: index,
    notes: itemNotes(item),
    cells: {
      sl: index + 1,
      product: item.name || item.title || item.productName || "Item",
      qty: item.qty || 1,
      rate: money(item.price),
      amount: money(lineAmount(item)),
    },
  }));

  const totals = [
    { label: "Subtotal", value: subtotal },
    ...(discount > 0 ? [{ label: "Discount", value: discount }] : []),
    ...(vat > 0 ? [{ label: "VAT", value: vat }] : []),
    { label: "Total", value: totalAmount, strong: true },
    { label: "Paid", value: totalPaid },
    { label: "Due", value: dueAmount, strong: true },
    ...(changeAmount > 0 ? [{ label: "Change", value: changeAmount }] : []),
  ];

  const words = company.showAmountInWords === false ? "" : amountInWords(totalAmount);
  const payment = order.payments?.[0];
  const paymentMethod = order.paymentMethod || [payment?.type, payment?.option].filter(Boolean).join(" - ") || "Cash";

  const sheet = {
    fileName: `Invoice-${order.orderNumber || order._id}.pdf`,
    shopName: showroomName,
    shopAddress: showroomAddress,
    shopPhone: showroomPhone,
    shopEmail: showroomEmail,
    vatLine,
    title: "SALES INVOICE",
    meta,
    head: ["SL", "Product", "Qty", "Rate", "Amount"],
    body: items.map((item, index) => [
      String(index + 1),
      [item.name || item.title || item.productName || "Item", ...itemNotes(item)].join("\n"),
      String(item.qty || 1),
      money(item.price),
      money(lineAmount(item)),
    ]),
    widths: [14, 88, 18, 32, 34],
    totals,
    words,
    note: order.note || "",
    extraHead: ["Payment", "Amount"],
    extraBody: [[paymentMethod, money(totalPaid)]],
  };

  const customerPhone = () => {
    const digits = String(order.customerPhone || "").replace(/\D/g, "").replace(/^88/, "");
    return /^01\d{9}$/.test(digits) ? digits : null;
  };

  const handleWhatsApp = async () => {
    const phone = customerPhone();
    const link = sharePath ? `${window.location.origin}${sharePath}` : "";
    const text = `Thank you for shopping with SB Telecom!\nInvoice ${order.orderNumber}${link ? `\n${link}` : ""}`;
    setSending("whatsapp");
    try {
      const { toBlob } = await import("html-to-image");
      const node = document.getElementById("invoice-print");
      const blob = await toBlob(node, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        imagePlaceholder: "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
      });
      const file = new File([blob], `Invoice-${order.orderNumber || order._id}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(file);
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(a.href);
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": file })]);
        showToast("success", "Invoice picture copied: press Ctrl+V in the WhatsApp chat");
      } catch {
        showToast("success", "Invoice picture downloaded: attach it in the WhatsApp chat");
      }
      window.open(`https://wa.me/${phone ? `88${phone}` : ""}?text=${encodeURIComponent(text)}`, "_blank");
    } catch (err) {
      if (err?.name !== "AbortError") showToast("error", "Could not make the invoice picture");
    } finally {
      setSending("");
    }
  };

  const handleSms = async () => {
    let phone = customerPhone();
    if (!phone) {
      phone = (window.prompt("Customer mobile number (01XXXXXXXXX):") || "").trim();
      if (!/^01\d{9}$/.test(phone)) {
        if (phone) showToast("error", "Number must be 01XXXXXXXXX");
        return;
      }
    }
    setSending("sms");
    try {
      const res = await fetch("/api/sms/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order._id, phone }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      if (data.configured) showToast("success", data.message);
      else window.location.href = `sms:+${data.number}?body=${encodeURIComponent(data.message)}`;
    } catch (err) {
      showToast("error", err.message || "Could not send SMS");
    } finally {
      setSending("");
    }
  };

  const btn = "rounded px-3 py-1.5 text-[12px] font-medium text-white transition disabled:opacity-60";

  const warranty = (
    <div className="mt-4 text-center text-[11px] leading-4">
      <p className="font-bold">Warranty</p>
      {warrantyNotes.map((line) => (
        <p key={line}>{line}</p>
      ))}
      {company.invoiceFooter && <p className="mt-2">{company.invoiceFooter}</p>}
      <p className="mt-2 font-semibold">This is a computer generated copy. No signature is required from the company.</p>
    </div>
  );

  return (
    <InvoiceSheet
      shopName={showroomName}
      shopAddress={showroomAddress}
      shopPhone={showroomPhone}
      shopEmail={showroomEmail}
      vatLine={vatLine}
      title="SALES INVOICE"
      meta={meta}
      columns={columns}
      lines={lines}
      totals={totals}
      words={words}
      note={order.note}
      below={warranty}
      signatures={["Customer", "Authorised Signature"]}
      toolbar={
        <div className="print-hide print:hidden mb-4 flex flex-wrap justify-center gap-2 rounded bg-gray-100 p-2 shadow-sm">
          <button type="button" onClick={() => window.print()} className={`${btn} bg-blue-600 hover:bg-blue-700`}>
            Print
          </button>
          <button type="button" onClick={() => downloadInvoicePdf(sheet)} className={`${btn} bg-red-600 hover:bg-red-700`}>
            Download PDF
          </button>
          {!publicView && (
            <>
              <button type="button" onClick={handleWhatsApp} disabled={!!sending} className={`${btn} bg-green-600 hover:bg-green-700`}>
                {sending === "whatsapp" ? "Preparing..." : "Send WhatsApp"}
              </button>
              <button type="button" onClick={handleSms} disabled={!!sending} className={`${btn} bg-violet-600 hover:bg-violet-700`}>
                {sending === "sms" ? "Sending..." : "Send SMS"}
              </button>
            </>
          )}
        </div>
      }
    />
  );
}
