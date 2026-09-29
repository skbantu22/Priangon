"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function numberToWords(num) {
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  if ((num = num.toString()).length > 9) return "Overflow";
  const n = ("000000000" + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return "";
  let str = "";
  str += n[1] != 0 ? (a[Number(n[1])] || b[n[1][0]] + " " + a[n[1][1]]) + " Crore " : "";
  str += n[2] != 0 ? (a[Number(n[2])] || b[n[2][0]] + " " + a[n[2][1]]) + " Lakh " : "";
  str += n[3] != 0 ? (a[Number(n[3])] || b[n[3][0]] + " " + a[n[3][1]]) + " Thousand " : "";
  str += n[4] != 0 ? (a[Number(n[4])] || b[n[4][0]] + " " + a[n[4][1]]) + " Hundred " : "";
  str += n[5] != 0 ? (str != "" ? "and " : "") + (a[Number(n[5])] || b[n[5][0]] + " " + a[n[5][1]]) : "";
  return str.trim();
}

export const money = (value) =>
  Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const amountInWords = (value) => `${numberToWords(Math.round(Number(value) || 0)) || "Zero"} Taka Only`;

const cell = "border border-black px-2 py-1.5 align-top text-[#111]";
const labelCell = `${cell} bg-[#f4f4f5] font-semibold align-middle`;

const alignClass = {
  left: "text-left",
  right: "text-right tabular-nums",
  center: "text-center tabular-nums",
};

/**
 * One AmarSolution-style paper bill. Screen and print use this same sheet.
 * meta: [[{ label, value }, { label, value }]]  — one pair spans the row.
 * columns: [{ key, label, align, width }]
 * lines: [{ key, cells, notes }]  notes sit under the product cell.
 */
export default function InvoiceSheet({
  shopName = "SB Telecom",
  shopAddress = "",
  shopPhone = "",
  shopEmail = "",
  vatLine = "",
  title = "INVOICE",
  meta = [],
  columns = [],
  lines = [],
  totals = [],
  words = "",
  note = "",
  below = null,
  signatures = [],
  toolbar = null,
}) {
  return (
    <div className="mx-auto w-full max-w-[900px]">
      {toolbar}
      <div
        id="invoice-print"
        className="bg-white px-5 py-6 text-[13px] leading-snug text-[#111] shadow-[0_1px_8px_rgba(0,0,0,0.12)] print:p-0 print:shadow-none"
        style={{ background: "#ffffff", color: "#111111" }}
      >
        <div className="text-center">
          <img src="/assets/sbt-logo-wide.png" alt="" className="mx-auto mb-1 h-12 w-auto object-contain" />
          <h1 className="font-serif text-[22px] font-bold leading-tight">{shopName}</h1>
          {shopAddress && <p className="mt-1 whitespace-pre-line text-[12px] leading-4">{shopAddress}</p>}
          {(shopPhone || shopEmail) && (
            <p className="text-[12px] leading-4">
              {shopPhone}
              {shopPhone && shopEmail ? " · " : ""}
              {shopEmail}
            </p>
          )}
          {vatLine && <p className="text-[12px] leading-4">{vatLine}</p>}
        </div>

        <div className="my-3 border-y-2 border-black py-1.5 text-center">
          <p className="text-[15px] font-bold tracking-[0.14em]">{title}</p>
        </div>

        {meta.length > 0 && (
          <table className="w-full border-collapse text-[13px]">
            <tbody>
              {meta.map((pairs, rowIndex) => (
                <tr key={rowIndex}>
                  {pairs.length === 1 ? (
                    <>
                      <td className={labelCell}>{pairs[0].label}</td>
                      <td className={`${cell} align-middle font-medium`} colSpan={3}>
                        {pairs[0].value || "—"}
                      </td>
                    </>
                  ) : (
                    pairs.flatMap((pair) => [
                      <td key={`${rowIndex}-${pair.label}-l`} className={labelCell}>
                        {pair.label}
                      </td>,
                      <td key={`${rowIndex}-${pair.label}-v`} className={`${cell} align-middle`}>
                        {pair.value || "—"}
                      </td>,
                    ])
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="bg-[#f4f4f5] text-[12px] uppercase tracking-wide">
                {columns.map((col) => (
                  <th key={col.key} className={`${cell} font-bold align-middle ${alignClass[col.align] || "text-left"}`} style={col.width ? { width: col.width } : undefined}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.key}>
                  {columns.map((col) => (
                    <td key={col.key} className={`${cell} ${alignClass[col.align] || "text-left"} ${col.key === "amount" ? "font-semibold" : ""}`}>
                      {col.key === "product" ? (
                        <>
                          <span className="font-semibold">{line.cells.product}</span>
                          {(line.notes || []).map((noteLine) => (
                            <span key={noteLine} className="mt-0.5 block text-[11px] font-normal leading-4 text-black/70">
                              {noteLine}
                            </span>
                          ))}
                        </>
                      ) : (
                        line.cells[col.key]
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-[440px] text-[13px] font-semibold leading-5">{words ? `Amount in Words: ${words}` : ""}</p>
          <div className="w-full max-w-[280px]">
            {totals.map((row) => (
              <div
                key={row.label}
                className={`flex items-baseline justify-between gap-6 border-b border-black/25 py-1 ${row.strong ? "border-black text-[15px] font-bold" : "text-[13px]"}`}
              >
                <span>{row.label}</span>
                <span className="tabular-nums">{money(row.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {below}

        {note && (
          <p className="mt-4 text-[13px] leading-5">
            <span className="font-bold">Note: </span>
            {note}
          </p>
        )}

        {signatures.length > 0 && (
          <div className="mt-12 flex justify-between text-[12px]">
            {signatures.map((label) => (
              <span key={label} className="w-[180px] border-t border-black pt-1 text-center">
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** A4 copy of the same sheet, so PDF matches what is on screen. */
export function downloadInvoicePdf({
  fileName,
  shopName,
  shopAddress,
  shopPhone,
  shopEmail,
  vatLine,
  title,
  meta = [],
  head = [],
  body = [],
  widths = [],
  totals = [],
  words = "",
  note = "",
  extraHead,
  extraBody,
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  let y = 14;

  const ensure = (need = 12) => {
    if (y + need <= doc.internal.pageSize.getHeight() - 12) return;
    doc.addPage();
    y = 14;
  };

  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const nameLines = doc.splitTextToSize(shopName || "SB Telecom", contentWidth);
  doc.text(nameLines, pageWidth / 2, y, { align: "center" });
  y += nameLines.length * 6.2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const addressBits = String(shopAddress || "")
    .split(/\n/)
    .flatMap((line) => doc.splitTextToSize(line, contentWidth))
    .filter(Boolean);
  if (addressBits.length) {
    doc.text(addressBits, pageWidth / 2, y, { align: "center" });
    y += addressBits.length * 3.8;
  }
  const contact = [shopPhone, shopEmail].filter(Boolean).join("  ·  ");
  if (contact) {
    doc.text(contact, pageWidth / 2, y, { align: "center" });
    y += 4;
  }
  if (vatLine) {
    doc.text(String(vatLine), pageWidth / 2, y, { align: "center" });
    y += 4;
  }

  y += 1;
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title || "INVOICE", pageWidth / 2, y, { align: "center" });
  y += 2.5;
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  if (meta.length) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: "grid",
      body: meta.map((pairs) => {
        if (pairs.length === 1) {
          return [
            { content: pairs[0].label, styles: { fontStyle: "bold", fillColor: [244, 244, 245] } },
            { content: String(pairs[0].value ?? "—"), colSpan: 3 },
          ];
        }
        return [
          { content: pairs[0].label, styles: { fontStyle: "bold", fillColor: [244, 244, 245] } },
          String(pairs[0].value ?? "—"),
          { content: pairs[1].label, styles: { fontStyle: "bold", fillColor: [244, 244, 245] } },
          String(pairs[1].value ?? "—"),
        ];
      }),
      styles: { fontSize: 9, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2, cellPadding: 1.8, overflow: "linebreak" },
      columnStyles: {
        0: { cellWidth: 32 },
        1: { cellWidth: 61 },
        2: { cellWidth: 28 },
        3: { cellWidth: 65 },
      },
    });
    y = doc.lastAutoTable.finalY + 4;
  }

  const columnStyles = {};
  widths.forEach((width, index) => {
    const align = head[index] === "Qty" || head[index] === "SL" ? "center" : index >= 2 ? "right" : "left";
    columnStyles[index] = { cellWidth: width, halign: align, fontStyle: head[index] === "Amount" ? "bold" : "normal" };
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [head],
    body,
    theme: "grid",
    styles: { fontSize: 9, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2, cellPadding: 1.6, valign: "top", overflow: "linebreak" },
    headStyles: { fillColor: [244, 244, 245], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" },
    columnStyles,
  });

  y = doc.lastAutoTable.finalY + 6;
  const boxW = 78;
  const boxX = pageWidth - margin - boxW;
  ensure(totals.length * 6 + 14);
  totals.forEach((row) => {
    doc.setFont("helvetica", row.strong ? "bold" : "normal");
    doc.setFontSize(row.strong ? 11 : 9);
    doc.text(row.label, boxX, y);
    doc.text(money(row.value), pageWidth - margin, y, { align: "right" });
    y += row.strong ? 5.6 : 4.8;
    doc.setLineWidth(row.strong ? 0.35 : 0.15);
    doc.line(boxX, y - 1.6, pageWidth - margin, y - 1.6);
  });

  if (words) {
    y += 3;
    ensure(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const wordLines = doc.splitTextToSize(`Amount in Words: ${words}`, contentWidth);
    doc.text(wordLines, margin, y);
    y += wordLines.length * 4 + 3;
  }

  if (extraHead && extraBody?.length) {
    ensure(18);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [extraHead],
      body: extraBody,
      theme: "grid",
      styles: { fontSize: 9, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2, cellPadding: 1.4 },
      headStyles: { fillColor: [244, 244, 245], textColor: [0, 0, 0], fontStyle: "bold" },
    });
    y = doc.lastAutoTable.finalY + 4;
  }

  if (note) {
    ensure(10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const noteLines = doc.splitTextToSize(`Note: ${note}`, contentWidth);
    doc.text(noteLines, margin, y);
  }

  doc.save(fileName);
}
