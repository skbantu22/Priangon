"use client";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function OrderExport({ orders = [] }) {
  const exportExcel = () => {
    const data = orders.map((order) => ({
      Order: order.orderNumber || "",

      Date: new Date(order.createdAt).toLocaleDateString(),

      Customer: order.customerName || "Walk-in",

      Amount: order.total || 0,

      Payment: order.paymentMethod || "",

      Status: order.status || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "POS Orders");

    XLSX.writeFile(workbook, "POS-Orders.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();

    doc.text("POS Orders Report", 14, 15);

    autoTable(doc, {
      head: [["Order", "Date", "Customer", "Amount", "Status"]],

      body: orders.map((order) => [
        order.orderNumber || "",

        new Date(order.createdAt).toLocaleDateString(),

        order.customerName || "Walk-in",

        order.total || 0,

        order.status || "",
      ]),

      startY: 25,
    });

    doc.save("POS-Orders.pdf");
  };

  const printOrders = () => {
    window.print();
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={exportExcel}
        className="
border 
px-4 
py-2
"
      >
        Export Excel
      </button>

      <button
        onClick={exportPDF}
        className="
border 
px-4 
py-2
"
      >
        Export PDF
      </button>

      <button
        onClick={printOrders}
        className="
border 
px-4 
py-2
"
      >
        Print
      </button>
    </div>
  );
}
