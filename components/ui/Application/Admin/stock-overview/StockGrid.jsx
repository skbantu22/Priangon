"use client";

import { useState } from "react";

export default function StockGrid({ items = [] }) {
  const [printItem, setPrintItem] = useState(null);
  const [printQty, setPrintQty] = useState(1);

  // GROUP BY PRODUCT
  const grouped = items.reduce((acc, item) => {
    const key = `${item.productId}-${item.zoneName}`;
    if (!acc[key]) {
      acc[key] = {
        productName: item.productName,
        image: item.image,
        zoneName: item.zoneName,
        variants: [],
      };
    }
    acc[key].variants.push(item);
    return acc;
  }, {});

  const groups = Object.values(grouped);

  // PRINT BARCODE FUNCTION
  const printBarcode = (product, count = 1) => {
    const shopName = "Mini Thailand";
    const name = product?.variant || "";
    const barcode = String(product?.barcode || "");
    const price = product?.price || product?.mrp || 0;

    const formattedName =
      name.match(/(\S+\s+\S+)|(\S+)/g)?.join("<br>") || name;
    const win = window.open("", "_blank", "width=600,height=400");

    if (!win) {
      alert("Please allow popups to print barcodes.");
      return;
    }

    let labels = "";
    for (let i = 0; i < count; i++) {
      labels += `
        <div class="label">
          <div class="shop-name">${shopName}</div>
          <div class="title">${formattedName}</div>
          <div class="barcode-wrapper"><svg id="barcode-${i}"></svg><div class="barcode-text">${barcode}</div></div>
          <div class="price">MRP - ${price} TK</div>
        </div>`;
    }

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Print Barcode</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        @page { size: 50mm 40mm; margin:0; }
        body { width: 50mm; font-family: Arial; display:flex; flex-direction:column; align-items:center; }
        .label { width: 48mm; height: 38mm; margin: 2mm 0; padding: 2.5mm; border: 1px solid #e8e8e8; border-radius: 4mm; display:flex; flex-direction:column; justify-content:space-between; align-items:center; text-align:center; }
        .shop-name { font-size:11px; font-weight:bold; }
        .title { font-size:14px; color:#555; }
        .barcode-text { font-size:12px; letter-spacing:1px; }
        .price { font-size:14px; font-weight:bold; }
      </style>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
    </head>
    <body>
      ${labels}
      <script>
        window.onload = function () {
          ${Array.from({ length: count })
            .map(
              (_, i) =>
                `JsBarcode("#barcode-${i}", "${barcode}", { format: "CODE128", width: 1.2, height: 25, displayValue: false, margin: 0 });`,
            )
            .join("")}
          setTimeout(() => window.print(), 300);
        };
        window.onafterprint = function () { window.close(); };
      </script>
    </body>
    </html>`;

    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-2 space-y-6">
      {groups.map((group, index) => (
        <div
          key={index}
          className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden"
        >
          {/* PRODUCT HEADER */}
          <div className="p-5 flex items-center gap-4 bg-gray-50 border-b">
            <img
              src={group.image}
              className="w-20 h-20 rounded-xl object-cover border shadow-sm"
              alt={group.productName}
            />
            <div>
              <h3 className="font-bold text-xl text-gray-900">
                {group.productName}
              </h3>
              <p className="text-xs font-bold text-gray-500 uppercase">
                {group.zoneName}
              </p>
            </div>
          </div>

          {/* VARIANTS LIST */}
          <div className="divide-y divide-gray-100">
            {group.variants.map((v, i) => (
              <div
                key={i}
                className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-16 h-16 shrink-0">
                  <img
                    src={v.variantImage || group.image}
                    className="w-full h-full rounded-lg object-cover border shadow-inner"
                    alt={v.variant}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">
                    {v.variant}
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono">
                    {v.barcode}
                  </p>
                  <div className="flex gap-3 mt-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.stock <= 5 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}
                    >
                      Stock: {v.stock}
                    </span>
                    <span className="text-[10px] font-bold text-gray-600">
                      ৳ {v.price}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setPrintItem(v);
                    setPrintQty(1);
                  }}
                  className="px-4 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-all"
                >
                  Print
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* PRINT MODAL */}
      {printItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-xl">
            <h2 className="font-bold text-lg mb-2">Print Barcode</h2>
            <p className="text-sm text-gray-600 mb-4">{printItem.variant}</p>
            <input
              type="number"
              min={1}
              value={printQty}
              onChange={(e) => setPrintQty(Number(e.target.value))}
              className="w-full border p-3 rounded-xl mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setPrintItem(null)}
                className="flex-1 bg-gray-100 py-3 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  printBarcode(printItem, printQty);
                  setPrintItem(null);
                }}
                className="flex-1 bg-black text-white py-3 rounded-xl font-bold"
              >
                🖨 Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
