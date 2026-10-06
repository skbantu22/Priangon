"use client";

import { useEffect, useState } from "react";
import { showToast } from "@/lib/showToast";
import InvoiceSheet, { amountInWords, downloadInvoicePdf, money } from "@/components/InvoiceSheet";

const STATUS = {
  received: "Received",
  in_progress: "In progress",
  waiting_parts: "Waiting for parts",
  repaired: "Repaired - ready to deliver",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const REPAIR_NOTES = [
  "Please bring this invoice when you collect your phone.",
  "Phones not collected within 30 days of the repair being done are not our responsibility.",
];

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

// the customer's repair invoice, in the same paper layout as the sales invoice
export default function RepairReceipt({ job, company = {}, autoPrint = false }) {
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!autoPrint) return undefined;
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, [autoPrint]);

  if (!job) return <div className="p-4 text-center">Loading...</div>;

  const shopName = company.name || "SB Telecom";
  const shopAddress = company.address || "";
  const shopPhone = company.phone || "";
  const shopEmail = company.email || "";

  const parts = job.parts || [];
  const charge = Number(job.serviceCharge) || 0;
  const total = Number(job.total) || 0;
  const paid = Number(job.paid) || 0;
  const due = Number(job.due) || 0;
  const billed = charge > 0 || parts.length > 0;

  const rows = [
    ...(charge > 0 ? [["Service charge", charge]] : []),
    ...parts.map((p) => [p.name, Number(p.price) || 0]),
    ...(!billed ? [["Estimated cost (not final)", Number(job.estimate) || 0]] : []),
  ];

  const meta = [
    [
      { label: "Job No", value: job.jobNumber },
      { label: "Received", value: fmtDate(job.receivedAt) },
    ],
    [
      { label: "Customer", value: job.customerName },
      { label: "Phone", value: job.phone || "—" },
    ],
    [
      { label: "Device", value: job.device },
      { label: "IMEI", value: job.imei || "—" },
    ],
    [
      { label: "Problem", value: job.issue },
      { label: "Technician", value: job.technicianName || "—" },
    ],
    [
      { label: "Promised", value: fmtDate(job.expectedAt) },
      { label: "Status", value: STATUS[job.status] || job.status },
    ],
    ...(job.accessories ? [[{ label: "Came with it", value: job.accessories }]] : []),
  ];

  const columns = [
    { key: "sl", label: "SL", align: "center", width: "8%" },
    { key: "product", label: "Description", align: "left" },
    { key: "amount", label: "Amount", align: "right", width: "24%" },
  ];

  const lines = rows.map(([name, amount], index) => ({
    key: index,
    cells: { sl: index + 1, product: name, amount: money(amount) },
  }));

  const totals = [
    { label: "Total", value: total, strong: true },
    { label: "Paid", value: paid },
    { label: "Due", value: due, strong: true },
  ];

  const words = amountInWords(total);

  const sheet = {
    fileName: `Repair-${job.jobNumber}.pdf`,
    shopName,
    shopAddress,
    shopPhone,
    shopEmail,
    title: "REPAIR INVOICE",
    meta,
    head: ["SL", "Description", "Amount"],
    body: rows.map(([name, amount], index) => [String(index + 1), name, money(amount)]),
    widths: [14, 130, 42],
    totals,
    words,
    note: job.note || "",
  };

  const shareWhatsApp = async () => {
    const digits = String(job.phone || "").replace(/\D/g, "").replace(/^88/, "");
    const text = `${shopName}\nRepair invoice ${job.jobNumber}\n${job.device}\nTotal ${money(total)}, Paid ${money(paid)}, Due ${money(due)}`;
    setSending(true);
    try {
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(document.getElementById("invoice-print"), { pixelRatio: 2, backgroundColor: "#ffffff" });
      const file = new File([blob], `Repair-${job.jobNumber}.png`, { type: "image/png" });
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
      window.open(`https://wa.me/${/^01\d{9}$/.test(digits) ? `88${digits}` : ""}?text=${encodeURIComponent(text)}`, "_blank");
    } catch (err) {
      if (err?.name !== "AbortError") showToast("error", "Could not make the invoice picture");
    } finally {
      setSending(false);
    }
  };

  const btn = "rounded px-3 py-1.5 text-[12px] font-medium text-white transition disabled:opacity-60";

  return (
    <InvoiceSheet
      shopName={shopName}
      shopAddress={shopAddress}
      shopPhone={shopPhone}
      shopEmail={shopEmail}
      title="REPAIR INVOICE"
      meta={meta}
      columns={columns}
      lines={lines}
      totals={totals}
      words={words}
      note={job.note}
      below={
        <div className="mt-4 text-center text-[11px] leading-4">
          {REPAIR_NOTES.map((line) => (
            <p key={line}>{line}</p>
          ))}
          {company.invoiceFooter && <p className="mt-2">{company.invoiceFooter}</p>}
        </div>
      }
      signatures={["Customer", "Authorised Signature"]}
      toolbar={
        <div className="print-hide print:hidden mb-4 flex flex-wrap justify-center gap-2 rounded bg-gray-100 p-2 shadow-sm">
          <button type="button" onClick={() => window.print()} className={`${btn} bg-blue-600 hover:bg-blue-700`}>
            Print
          </button>
          <button type="button" onClick={() => downloadInvoicePdf(sheet)} className={`${btn} bg-red-600 hover:bg-red-700`}>
            Download PDF
          </button>
          <button type="button" onClick={shareWhatsApp} disabled={sending} className={`${btn} bg-green-600 hover:bg-green-700`}>
            {sending ? "Preparing..." : "Send WhatsApp"}
          </button>
        </div>
      }
    />
  );
}
