"use client";

import { useState } from "react";
import { Package, Printer, X } from "lucide-react";

export default function StockGrid({ items = [] }) {
  console.log("✅ STOCK GRID LOADED");
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
    console.log("PRINT FUNCTION CALLED");
    console.log("PRODUCT DATA =", product);

    const shopName = "Mini Thailand";
    const name = product?.productName || "";
    const barcode = String(product?.barcode || "");
    const price = product?.price || product?.mrp || 0;

    const formattedName = name;
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
        .label { width: 48mm; height: 38mm; margin: 2mm 0; padding: 2.5mm; border: 1px solid #e8e8e8; border-radius: 2mm; display:flex; flex-direction:column; justify-content:space-between; align-items:center; text-align:center; }
        .shop-name { font-size:18px; font-weight:bold; }
        .title { font-size:11px; color:#555; font-weight:bold; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; }
        .barcode-text { font-size:14px; letter-spacing:1px; margin-top: 2px; }
        .price { font-size:13px; font-weight:bold; }
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
                `JsBarcode("#barcode-${i}", "${barcode}", { format: "CODE128", width: 1.2, height: 22, displayValue: false, margin: 0 });`,
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
    <div className="w-full max-w-[1200px] mx-auto space-y-6">
      {groups.map((group, index) => (
        <div
          key={index}
          className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
        >
          {/* PRODUCT HEADER */}
          <div className="p-4 sm:p-5 flex items-center gap-4 bg-gray-50/75 border-b border-gray-100">
            <img
              src={group.image}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover border border-gray-200 shadow-sm"
              alt={group.productName}
            />
            <div>
              <h3 className="font-bold text-lg sm:text-xl text-gray-900">
                {group.productName}
              </h3>
              <p className="text-xs font-semibold tracking-wider text-emerald-600 uppercase mt-0.5">
                {group.zoneName}
              </p>
            </div>
          </div>

          {/* VARIANTS LIST */}
          <div className="divide-y divide-gray-100">
            {group.variants.map((v, i) => (
              <div
                key={i}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 shrink-0">
                    <img
                      src={v.variantImage || group.image}
                      className="w-full h-full rounded-lg object-cover border border-gray-200"
                      alt={v.variant}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800">
                      {v.variant}
                    </p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                      Barcode: {v.barcode || "N/A"}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-md ${
                          (v.stock || 0) <= 5
                            ? "bg-amber-50 text-amber-600 border border-amber-200"
                            : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        }`}
                      >
                        Stock: {v.stock}
                      </span>
                      <span className="text-xs font-bold text-gray-900">
                        ৳ {v.price}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setPrintItem(v);
                    setPrintQty(1);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition-all shadow-sm self-end sm:self-center"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Barcode
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* PRINT MODAL */}
      {printItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-gray-900">Print Barcode</h2>
              <button
                onClick={() => setPrintItem(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase">
                Selected Variant
              </p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">
                {printItem.variant}
              </p>
              <p className="text-xs text-gray-400 font-mono mt-1">
                ৳ {printItem.price} | Stock: {printItem.stock}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600">
                Print Quantity (Copies)
              </label>
              <input
                type="number"
                min={1}
                value={printQty}
                onChange={(e) =>
                  setPrintQty(Math.max(1, Number(e.target.value)))
                }
                className="w-full border border-gray-200 px-3 py-2.5 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all font-semibold"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setPrintItem(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  printBarcode(printItem, printQty);
                  setPrintItem(null);
                }}
                className="flex-1 bg-gray-900 hover:bg-black text-white py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
