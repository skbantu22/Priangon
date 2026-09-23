"use client";

import { useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { warrantyLabel } from "@/lib/warranty";

const WARRANTY_NOTES = [
  "Warranty covers manufacturing defects only.",
  "Physical, liquid or burn damage and broken seals are not covered.",
  "Keep this invoice: it is required for any warranty claim.",
  "Exchange within 3 days only if the box and accessories are intact.",
];

function numberToWords(num) {
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  if ((num = num.toString()).length > 9) return "Overflow";
  let n = ("000000000" + num)
    .substr(-9)
    .match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return "";
  let str = "";
  str +=
    n[1] != 0
      ? (a[Number(n[1])] || b[n[1][0]] + " " + a[n[1][1]]) + " Crore "
      : "";
  str +=
    n[2] != 0
      ? (a[Number(n[2])] || b[n[2][0]] + " " + a[n[2][1]]) + " Lakh "
      : "";
  str +=
    n[3] != 0
      ? (a[Number(n[3])] || b[n[3][0]] + " " + a[n[3][1]]) + " Thousand "
      : "";
  str +=
    n[4] != 0
      ? (a[Number(n[4])] || b[n[4][0]] + " " + a[n[4][1]]) + " Hundred "
      : "";
  str +=
    n[5] != 0
      ? (str != "" ? "and " : "") +
        (a[Number(n[5])] || b[n[5][0]] + " " + a[n[5][1]])
      : "";
  return str.trim();
}

export default function PrintReceipt({ order, autoPrint = true }) {
  // Auto Print popup after 0.5s so buttons are rendered first
  // (the partner portal shows the invoice first and prints on demand)
  useEffect(() => {
    if (!autoPrint) return;
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, [autoPrint]);

  if (!order) return <div className="p-4 text-center">Loading...</div>;

  const showroomName = "SB Telecom";
  const showroomAddress = order.showroom?.address || "Dhaka, Bangladesh";
  const showroomPhone = order.showroom?.phone || "01700000001";
  const showroomEmail = order.showroom?.email || "support@sbtelecom.com.bd";

  const totalAmount = order.total || 0;
  // older orders have no paidAmount: they were paid in full
  const totalPaid = order.paidAmount ?? totalAmount;
  const dueAmount = Number(order.dueAmount || 0);
  const cashReceive = order.cashReceive || totalPaid;
  const changeAmount = cashReceive - totalPaid;
  const payment = order.payments?.[0];
  const paymentMethod =
    order.paymentMethod ||
    [payment?.type, payment?.option].filter(Boolean).join(" - ") ||
    "Cash";

  // name + variant + IMEI + warranty lines for one invoice row
  const itemLines = (item) => {
    const lines = [];
    const variant = [item.size, item.color].filter(Boolean).join(" / ");
    if (variant) lines.push(variant);
    if (item.imeis?.length) lines.push(`IMEI/SN: ${item.imeis.join(", ")}`);
    const w = warrantyLabel(item);
    if (w) {
      const till = item.warrantyExpiry
        ? new Date(item.warrantyExpiry).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "";
      lines.push(till ? `${w} (till ${till})` : w);
    }
    return lines;
  };
  const totalInWords = numberToWords(Math.round(totalAmount));

  const saleDate = order.saleDate ? new Date(order.saleDate) : new Date();
  const createdTime = order.createdAt ? new Date(order.createdAt) : saleDate;

  const orderDate = saleDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const orderTime = createdTime.toLocaleTimeString("en-US", {
    timeZone: "Asia/Dhaka",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // Action Handlers
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      unit: "mm",
      format: [90, 240],
    });

    let y = 8;
    const pageWidth = 80;
    const margin = 4;
    const contentWidth = pageWidth - margin * 2;

    // Header Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(showroomName, pageWidth / 2, y, { align: "center" });
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const splitAddress = doc.splitTextToSize(showroomAddress, contentWidth);
    doc.text(splitAddress, pageWidth / 2, y, { align: "center" });
    y += splitAddress.length * 3.5 + 1;

    doc.text(`Mobile: ${showroomPhone}`, pageWidth / 2, y, { align: "center" });
    y += 3.5;
    doc.text(`Email: ${showroomEmail}`, pageWidth / 2, y, { align: "center" });
    y += 5;

    // Divider Line
    doc.setLineDash([1, 1], 0);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    // Meta Details
    doc.setFontSize(8);
    const meta = [
      ["Invoice ID:", order.orderNumber || order._id || "20261011747"],
      ["Sale Date:", `${orderDate} @ ${orderTime}`],
      ["Customer:", order.customerName || "Walk-in"],
      ["Phone:", order.customerPhone || "N/A"],
      ["Sold By:", order.soldBy || "N/A"],
    ];

    meta.forEach(([label, val]) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(val), margin + 22, y);
      y += 4;
    });

    y += 2;
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("INVOICE", pageWidth / 2, y, { align: "center" });
    y += 4;

    // Products Table (Fixed undefined and table bracket issues)
    const tableRows = (order.items || []).map((item, index) => {
      const itemName = item.name || item.title || item.productName || "Item";
      return [
        index + 1,
        [itemName, ...itemLines(item)].join("\n"),
        Number(item.price || 0).toLocaleString("en-US", {
          minimumFractionDigits: 2,
        }),
        item.qty || 1,
        ((item.price || 0) * (parseInt(item.qty) || 1)).toLocaleString(
          "en-US",
          { minimumFractionDigits: 2 },
        ),
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Sl", "Name", "Price", "Qty", "Total"]],
      body: tableRows,
      theme: "grid", // grid দিলে টেবিলের লাইন পরিষ্কার থাকবে
      styles: {
        fontSize: 7.5,
        cellPadding: 1,
        textColor: [0, 0, 0],
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        lineWidth: 0.2,
        lineColor: [0, 0, 0],
      },
      columnStyles: {
        0: { cellWidth: 6 },
        1: { cellWidth: 33 },
        2: { cellWidth: 15, halign: "right" },
        3: { cellWidth: 8, halign: "center" },
        4: { cellWidth: 18, halign: "right" },
      },
    });

    // Get final Y position after table
    y = doc.lastAutoTable.finalY + 4;
    doc.setLineDash([], 0);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    // Summary Calculations
    const summaries = [
      ["Subtotal :", Number(order.subTotal || totalAmount)],
      ["Total :", Number(totalAmount)],
      ["Paid :", Number(totalPaid)],
      ...(dueAmount > 0
        ? [["Due :", dueAmount]]
        : [
            ["Cash Receive:", Number(cashReceive)],
            ["Change :", Number(changeAmount)],
          ]),
    ];

    doc.setFontSize(8);
    summaries.forEach(([label, val]) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, 35, y);
      doc.setFont("helvetica", "normal");
      doc.text(
        val.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        pageWidth - margin,
        y,
        { align: "right" },
      );
      y += 4;
    });

    y += 2;
    doc.setFont("helvetica", "bold");
    doc.text(`In Words: ${totalInWords} TK Only`, margin, y);
    y += 6;

    // Payment Box
    doc.setLineWidth(0.2);
    doc.rect(margin, y, contentWidth, 12);
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENTS", pageWidth / 2, y + 4, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(
      `${paymentMethod} =              TK ${Number(totalPaid).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      margin + 3,
      y + 9,
    );
    y += 16;

    // Footer Notes
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "italic");
    WARRANTY_NOTES.forEach((note) => {
      doc.text(note, pageWidth / 2, y, {
        align: "center",
        maxWidth: contentWidth,
      });
      y += 3.5;
    });
    y += 1;

    doc.setFont("helvetica", "bold");
    doc.text(
      "This is a computer generated copy. No signature required.",
      pageWidth / 2,
      y,
      { align: "center", maxWidth: contentWidth },
    );

    doc.save(`Invoice-${order.orderNumber || order._id}.pdf`);
  };

  const handleWhatsApp = () => {
    const phone = (order.customerPhone || "").replace(/\D/g, "");

    if (!phone) {
      alert("Customer phone not found!");
      return;
    }

    const invoiceLink = `${window.location.origin}/invoice/${order.orderNumber}`;

    const message = `📱 Thank you for shopping with SB Telecom!\nYour invoice is ready:\n${invoiceLink}\n\nThank you ❤️`;
    window.open(
      `https://wa.me/88${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
    );
  };

  return (
    <div className="max-w-[80mm] mx-auto">
      {/* Action Buttons Panel (Hidden during print) */}
      <div className="print:hidden flex flex-wrap gap-2 justify-center mb-4 p-2 bg-gray-100 rounded shadow-sm">
        <button
          onClick={handlePrint}
          className="bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium px-3 py-1.5 rounded transition"
        >
          🖨️ Print
        </button>

        <button
          onClick={handleDownloadPDF}
          className="bg-red-600 hover:bg-red-700 text-white text-[12px] font-medium px-3 py-1.5 rounded transition"
        >
          📥 Download PDF
        </button>

        <button
          onClick={handleWhatsApp}
          className="bg-green-600 hover:bg-green-700 text-white text-[12px] font-medium px-3 py-1.5 rounded transition"
        >
          📱 Send WhatsApp
        </button>
      </div>

      {/* Main Receipt Content */}
      <div
        id="receipt"
        className="mx-auto p-4 font-sans text-[12px] leading-relaxed text-black bg-white"
        style={{ width: "80mm", color: "#000000", background: "#ffffff" }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
            @media print {
              body * { visibility: hidden; background: #fff !important; }
              #receipt, #receipt * { visibility: visible; }
              #receipt { position: absolute; left: 0; top: 0; width: 80mm !important; }
            }
          `,
          }}
        />

        {/* Header Info */}
        <div className="text-center mb-3">
          <img src="/assets/sbt-logo-wide.png" alt="SB Telecom" className="mx-auto mb-1 h-16 w-auto object-contain" />
          <h2 className="font-serif font-bold text-[22px] tracking-wide text-gray-800">
            {showroomName}
          </h2>
          <p className="whitespace-pre-line text-[11px] leading-4 text-gray-700 mt-1">
            {showroomAddress}
          </p>
          <p className="text-[11px] text-gray-700 mt-0.5">
            Mobile: {showroomPhone}
          </p>
          <p className="text-[11px] text-gray-700">Email: {showroomEmail}</p>
        </div>

        {/* Core Metadata Specifications Grid Block */}
        <div className="space-y-0.5 text-[11px] px-1 text-gray-800 border-t border-b border-gray-200 py-1.5 my-2">
          <div className="flex">
            <span className="w-32 font-medium">Invoice ID:</span>
            <span>{order.orderNumber || order._id || "20261011747"}</span>
          </div>
          <div className="flex">
            <span className="w-32 font-medium">Sale Date:</span>
            <span>
              {orderDate} @ {orderTime}
            </span>
          </div>
          <div className="flex">
            <span className="w-32 font-medium">Customer Name:</span>
            <span>{order.customerName}</span>
          </div>
          <div className="flex">
            <span className="w-32 font-medium">Phone:</span>
            <span>{order.customerPhone}</span>
          </div>
          <div className="flex font-semibold text-gray-950">
            <span className="w-32">Sold By:</span>
            <span>{order.soldBy}</span>
          </div>
        </div>

        {/* Barcode Element */}
        <div className="my-3 text-center">
          <img
            src={`https://barcode.tec-it.com/barcode.ashx?data=${order.orderNumber || "20261011747"}&code=Code128&translate-esc=true`}
            alt="barcode"
            className="mx-auto h-8 w-[85%] object-stretch block"
          />
        </div>

        <h3 className="text-center font-bold text-[13px] tracking-wider my-1 uppercase">
          INVOICE
        </h3>

        {/* Products Grid Layout Table */}
        <table className="w-full text-left border-collapse text-[11px] mt-2">
          <thead>
            <tr className="border-b border-black font-semibold text-gray-800">
              <th className="w-[8%] pb-1">Sl.</th>
              <th className="w-[47%] pb-1">Name</th>
              <th className="text-right w-[20%] pb-1">Price</th>
              <th className="text-center w-[10%] pb-1">Qty</th>
              <th className="text-right w-[15%] pb-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((item, index) => (
              <tr
                key={index}
                className="align-top border-b border-black/5 last:border-b-0"
              >
                <td className="py-1 text-gray-800">{index + 1}</td>
                <td className="py-1 pr-1 break-words">
                  <span className="block font-medium text-gray-800">
                    {item.name || item.productName}
                  </span>
                  {itemLines(item).map((line) => (
                    <span
                      key={line}
                      className="block text-[10px] leading-3.5 text-gray-600"
                    >
                      {line}
                    </span>
                  ))}
                </td>
                <td className="text-right py-1 align-bottom text-gray-800">
                  {Number(item.price).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="text-center py-1 align-bottom text-gray-800">
                  {item.qty}
                </td>
                <td className="text-right py-1 align-bottom font-medium text-gray-900">
                  {(item.price * (parseInt(item.qty) || 1)).toLocaleString(
                    "en-US",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-black my-1" />

        {/* Calculations Pricing Summary */}
        <div className="text-[11px] font-medium space-y-0.5 pr-0.5 text-gray-900">
          <div className="flex justify-end space-x-4">
            <span className="w-28 text-right font-bold">Subtotal :</span>
            <span className="w-20 text-right border-b border-dashed border-gray-400 pb-0.5">
              {Number(order.subTotal || totalAmount).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex justify-end space-x-4">
            <span className="w-28 text-right font-bold">Total :</span>
            <span className="w-20 text-right border-b border-dashed border-gray-400 pb-0.5">
              {Number(totalAmount).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex justify-end space-x-4">
            <span className="w-28 text-right font-bold">Paid :</span>
            <span className="w-20 text-right border-b border-dashed border-gray-400 pb-0.5">
              {Number(totalPaid).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          {dueAmount > 0 && (
            <div className="flex justify-end space-x-4 text-red-700">
              <span className="w-28 text-right font-bold">Due :</span>
              <span className="w-20 text-right border-b border-dashed border-gray-400 pb-0.5 font-bold">
                {dueAmount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          )}
          <div className="flex justify-end space-x-4">
            <span className="w-28 text-right font-bold">Cash Receive:</span>
            <span className="w-20 text-right border-b border-dashed border-gray-400 pb-0.5">
              {Number(cashReceive).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex justify-end space-x-4">
            <span className="w-28 text-right font-bold">Change:</span>
            <span className="w-20 text-right border-b border-dashed border-gray-400 pb-0.5">
              {Number(changeAmount).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        {/* Words Summary */}
        <div className="text-[11px] font-medium text-gray-800 mt-3 px-1">
          <strong>In Words:</strong> {totalInWords} TK Only
        </div>

        {/* Payment Block */}
        <div className="mt-3 border border-black text-[11px]">
          <div className="text-center font-bold tracking-wider py-0.5 border-b border-black bg-gray-50 uppercase">
            Payments
          </div>
          <div className="p-1 px-2 space-y-0.5">
            <div className="flex justify-between text-gray-800">
              <span>{paymentMethod}</span>
              <span>
                =&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;TK{" "}
                {Number(totalPaid).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex justify-between font-bold border-t border-dashed border-black/40 pt-0.5 text-gray-950">
              <span>Total</span>
              <span>
                =&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;TK{" "}
                {Number(totalPaid).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Notes */}
        <div className="text-center mt-5 px-1 space-y-1 text-[9px] leading-3 text-gray-600 font-sans font-medium italic opacity-90">
          <p className="border-t border-dashed border-black/20 pt-2 font-bold not-italic text-gray-800">
            Warranty Terms
          </p>
          {WARRANTY_NOTES.map((note) => (
            <p key={note}>{note}</p>
          ))}
          <p className="text-black font-semibold not-italic mt-2">
            This is a computer generated copy. No signature is required from the
            company.
          </p>
        </div>
      </div>
    </div>
  );
}
