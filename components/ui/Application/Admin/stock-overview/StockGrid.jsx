"use client";

import { useState } from "react";

export default function StockGrid({ items = [] }) {
  const [printItem, setPrintItem] = useState(null);
  const [printQty, setPrintQty] = useState(1);

  // GROUP BY PRODUCT
  const grouped = items.reduce((acc, item) => {
    // Product + Showroom
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

  // ================= PRINT BARCODE (THERMAL + MULTI) =================
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

          <div class="barcode-wrapper">
            <svg id="barcode-${i}"></svg>
            <div class="barcode-text">${barcode}</div>
          </div>

          <div class="price">MRP - ${price} TK</div>

        </div>
      `;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Print Barcode</title>

  <style>
    * { margin:0; padding:0; box-sizing:border-box; }

    @page { size: 50mm 40mm; margin:0; }

    body {
      width: 50mm;
      font-family: Arial;
      display:flex;
      flex-direction:column;
      align-items:center;
    }

    .label {
      width: 48mm;
      height: 38mm;
      margin: 2mm 0;
      padding: 2.5mm;
      border: 1px solid #e8e8e8;
      border-radius: 4mm;
      display:flex;
      flex-direction:column;
      justify-content:space-between;
      align-items:center;
      text-align:center;
    }

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
          (_, i) => `
          JsBarcode("#barcode-${i}", "${barcode}", {
            format: "CODE128",
            width: 1.2,
            height: 25,
            displayValue: false,
            margin: 0
          });
        `,
        )
        .join("")}

      setTimeout(() => window.print(), 300);
    };

    window.onafterprint = function () {
      window.close();
    };
  </script>

</body>
</html>
`;

    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-sm overflow-hidden">
      {/* HEADER */}
      <div className="hidden md:grid grid-cols-5 bg-gray-100 text-sm font-bold text-gray-700 px-4 py-3">
        <div>Product</div>
        <div>Variants</div>
        <div className="text-center">Stock</div>
        <div className="text-center">Price</div>
        <div className="text-center">Action</div>
      </div>

      {/* BODY */}
      <div className="divide-y">
        {groups.map((group, index) => (
          <div
            key={index}
            className="p-4 md:grid md:grid-cols-5 gap-4 items-start"
          >
            {/* PRODUCT */}
            <div className="flex items-center gap-3 mb-3 md:mb-0">
              {group.image && (
                <img
                  src={group.image}
                  className="w-12 h-12 rounded-lg object-cover border"
                  alt=""
                />
              )}

              <div>
                <p className="font-bold text-gray-900 text-sm md:text-base">
                  {group.productName}
                </p>
                <p className="text-xs text-gray-500">{group.zoneName}</p>
              </div>
            </div>

            {/* VARIANTS */}
            <div className="space-y-2 mb-3 md:mb-0">
              {group.variants.map((v, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg"
                >
                  <span className="text-xs font-semibold text-gray-800">
                    {v.variant}
                  </span>
                  <span className="text-[11px] text-gray-500">{v.barcode}</span>
                </div>
              ))}
            </div>

            {/* STOCK */}
            <div className="space-y-2 text-center mb-3 md:mb-0">
              {group.variants.map((v, i) => (
                <div key={i}>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                      v.stock <= 5
                        ? "bg-red-100 text-red-600"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {v.stock}
                  </span>
                </div>
              ))}
            </div>

            {/* PRICE */}
            <div className="space-y-2 text-center mb-3 md:mb-0">
              {group.variants.map((v, i) => (
                <div key={i} className="text-sm font-bold text-gray-800">
                  ৳ {v.price}
                </div>
              ))}
            </div>

            {/* ACTION */}
            <div className="space-y-2 text-center">
              {group.variants.map((v, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setPrintItem(v);
                    setPrintQty(1);
                  }}
                  className="px-3 py-1 bg-black text-white text-xs rounded hover:bg-gray-800"
                >
                  Print
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ================= PRINT MODAL ================= */}
      {printItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-lg w-80 space-y-4">
            <h2 className="font-bold text-lg">Print Barcode</h2>

            <p className="text-sm text-gray-600">{printItem.variant}</p>

            <input
              type="number"
              min={1}
              value={printQty}
              onChange={(e) => setPrintQty(Number(e.target.value))}
              className="w-full border p-2 rounded"
              placeholder="How many copies?"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setPrintItem(null)}
                className="flex-1 bg-gray-200 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  printBarcode(printItem, printQty);
                  setPrintItem(null);
                }}
                className="flex-1 bg-black text-white py-2 rounded"
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
