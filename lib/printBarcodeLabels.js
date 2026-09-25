"use client";

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const money = (value) => Number(value || 0).toLocaleString("en-BD");

/**
 * Prints one barcode sticker per variant of the given products, in a new
 * window. labels: [{ name, variant, barcode, price, mrp }].
 *
 * Returns false when the pop-up was blocked and "empty" when none of the
 * rows has a barcode, so the caller can say why nothing printed.
 */
export function printBarcodeLabels(labels) {
  const printable = labels.filter((label) => label.barcode);

  if (!printable.length) return "empty";

  const win = window.open("", "_blank");

  if (!win) return false;

  const cells = printable
    .map(
      (label, i) => `<div class="label">
        <div class="name">${escapeHtml(label.name)}</div>
        ${label.variant ? `<div class="variant">${escapeHtml(label.variant)}</div>` : ""}
        <svg id="bc-${i}"></svg>
        <div class="price">${
          label.mrp > label.price ? `<s>৳${money(label.mrp)}</s> ` : ""
        }৳${money(label.price)}</div>
      </div>`,
    )
    .join("");

  const draw = printable
    .map(
      (label, i) =>
        `try { JsBarcode("#bc-${i}", ${JSON.stringify(String(label.barcode)).replace(/</g, "\\u003c")}, { format: "CODE128", width: 1.3, height: 34, fontSize: 11, margin: 0 }); } catch (e) {}`,
    )
    .join("\n");

  win.document.write(`<!doctype html><html><head><title>Barcode Labels</title>
<style>
  body { font-family: Arial, sans-serif; margin: 8px; }
  .sheet { display: flex; flex-wrap: wrap; gap: 6px; }
  .label { width: 50mm; border: 1px dashed #bbb; padding: 4px; text-align: center; break-inside: avoid; }
  .name { font-size: 11px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .variant { font-size: 10px; color: #444; }
  .price { font-size: 12px; font-weight: bold; }
  .price s { font-weight: normal; color: #777; }
  svg { max-width: 100%; }
  @media print { .label { border: 0; } }
</style>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
</head><body>
  <div class="sheet">${cells}</div>
  <script>
    window.onload = function () {
      ${draw}
      setTimeout(function () { window.print(); }, 200);
    };
  </script>
</body></html>`);

  win.document.close();

  return true;
}
