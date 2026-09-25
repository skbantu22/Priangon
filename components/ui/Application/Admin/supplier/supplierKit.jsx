"use client";

import { useEffect, useState } from "react";
import axios from "axios";

import { formatNumberBD } from "@/lib/bdFormat";

export const money = (value) => formatNumberBD(value);

export const fmtDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-GB") : "";

export const PAYMENT_METHODS = [
  ["cash", "Cash"],
  ["bkash", "bKash"],
  ["nagad", "Nagad"],
  ["card", "Card"],
  ["bank", "Bank Account"],
  ["cheque", "Bank Cheque"],
  ["other", "Other"],
];

export const methodLabel = (value) =>
  PAYMENT_METHODS.find(([key]) => key === value)?.[1] || value || "";

export const PAYMENT_TITLES = {
  pay: "Suppliers Due Pay",
  receive: "Suppliers Due Received",
  dismiss: "Suppliers Due Dismiss",
  advance: "Suppliers Pay Advance",
};

// The list look comes from the shared kit; these names are what the
// supplier pages already use
export {
  ActionMenu,
  DateRange,
  EmptyRow,
  ExportButtons,
  ListCard,
  Pagination,
  btn,
  tdClass,
  thClass,
  theadClass as theadRow,
  totalRowClass as totalRow,
  filterInput as inputClass,
} from "@/components/ui/Application/Admin/listKit";

/** Active suppliers for the pickers */
export function useSupplierOptions() {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    let cancelled = false;

    axios
      .get("/api/supplier")
      .then(({ data }) => {
        if (!cancelled && data.success) setOptions(data.data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return options;
}

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

export async function exportExcel(fileName, head, rows, foot) {
  const XLSX = await import("xlsx");

  const sheet = XLSX.utils.aoa_to_sheet([head, ...rows, ...(foot ? [foot] : [])]);
  const book = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(book, sheet, "Sheet1");
  XLSX.writeFile(book, fileName);
}

export async function exportPdf(title, head, rows, foot) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: head.length > 8 ? "landscape" : "portrait" });

  doc.text(title, 14, 15);

  autoTable(doc, {
    head: [head],
    body: rows,
    ...(foot && { foot: [foot] }),
    startY: 22,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [21, 128, 61] },
    footStyles: { fillColor: [203, 213, 225], textColor: 20 },
  });

  doc.save(`${title}.pdf`);
}

export function printTable(title, head, rows, foot) {
  const win = window.open("", "_blank");

  if (!win) return false;

  const cells = (values, tag) =>
    values.map((value) => `<${tag}>${escapeHtml(value)}</${tag}>`).join("");

  win.document.write(`<!doctype html>
<html><head><title>${escapeHtml(title)}</title>
<style>
  body { font-family: sans-serif; font-size: 11px; margin: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
  thead th { background: #15803d; color: #fff; }
  tfoot td { background: #cbd5e1; font-weight: bold; }
</style></head>
<body>
  <h2>${escapeHtml(title)}</h2>
  <table>
    <thead><tr>${cells(head, "th")}</tr></thead>
    <tbody>${rows.map((row) => `<tr>${cells(row, "td")}</tr>`).join("")}</tbody>
    ${foot ? `<tfoot><tr>${cells(foot, "td")}</tr></tfoot>` : ""}
  </table>
</body></html>`);

  win.document.close();
  win.focus();
  win.print();

  return true;
}

