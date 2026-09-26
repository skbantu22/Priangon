import JsBarcode from "jsbarcode";

/**
 * Barcode sticker settings (Settings → Barcode Print Settings) and the
 * printing of stickers from them, like 360's barcode labels. Used in the
 * browser only: the barcode is drawn with JsBarcode into an SVG.
 */

export const LABEL_SIZES = {
  "38x25": { w: 38, h: 25, label: "38mm x 25mm" },
  "50x25": { w: 50, h: 25, label: "50mm x 25mm" },
  "40x30": { w: 40, h: 30, label: "40mm x 30mm" },
  "50x30": { w: 50, h: 30, label: "50mm x 30mm" },
};

// what can go on a sticker, top to bottom
export const LABEL_FIELDS = [
  ["shopName", "Shop name"],
  ["address", "Address"],
  ["productName", "Product name"],
  ["variant", "Color / storage"],
  ["barcode", "Barcode"],
  ["barcodeNumber", "Barcode number"],
  ["price", "Sale price"],
  ["mrp", "MRP (crossed out when higher)"],
];

export const DEFAULT_LABEL = {
  size: "38x25",
  barHeight: 30,
  fontScale: 100,
  shopName: "",
  address: "",
  fields: { shopName: true, address: false, productName: true, variant: true, barcode: true, barcodeNumber: true, price: true, mrp: false },
};

/** Saved settings with every field filled in */
export const mergeLabel = (saved = {}) => ({
  ...DEFAULT_LABEL,
  ...saved,
  fields: { ...DEFAULT_LABEL.fields, ...(saved?.fields || {}) },
});

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const taka = (n) => `৳${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const barcodeSvg = (value, height) => {
  if (typeof document === "undefined" || !value) return "";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  try {
    JsBarcode(svg, String(value), { format: "CODE128", height, width: 1.3, displayValue: false, margin: 0 });
  } catch {
    return "";
  }
  svg.setAttribute("preserveAspectRatio", "none");
  return svg.outerHTML;
};

/**
 * One sticker's inner HTML. `item` is { productName, variant, barcode,
 * price, mrp }; `shop` fills in a blank shop name or address.
 */
export const labelHtml = (item, cfg, shop = {}) => {
  const c = mergeLabel(cfg);
  const f = c.fields;
  const name = c.shopName || shop.name || "";
  const address = c.address || shop.address || "";
  const mrpHigher = f.mrp && Number(item.mrp) > Number(item.price);
  const lines = [];
  if (f.shopName && name) lines.push(`<div class="bl-shop">${esc(name)}</div>`);
  if (f.address && address) lines.push(`<div class="bl-address">${esc(address)}</div>`);
  if (f.productName) lines.push(`<div class="bl-name">${esc(item.productName)}</div>`);
  if (f.variant && item.variant) lines.push(`<div class="bl-variant">${esc(item.variant)}</div>`);
  if (f.barcode) lines.push(`<div class="bl-bars">${barcodeSvg(item.barcode, c.barHeight)}</div>`);
  if (f.barcodeNumber) lines.push(`<div class="bl-code">${esc(item.barcode)}</div>`);
  if (f.price || mrpHigher) {
    lines.push(
      `<div class="bl-price">${mrpHigher ? `<s>${taka(item.mrp)}</s> ` : ""}${f.price ? taka(item.price) : ""}</div>`,
    );
  }
  return `<div class="bl">${lines.join("")}</div>`;
};

/** CSS for stickers of the chosen size; `scope` prefixes it for an on-page preview */
export const labelCss = (cfg, scope = "") => {
  const c = mergeLabel(cfg);
  const size = LABEL_SIZES[c.size] || LABEL_SIZES["38x25"];
  const k = (Number(c.fontScale) || 100) / 100;
  const pt = (n) => `${(n * k).toFixed(2)}pt`;
  const s = scope ? `${scope} ` : "";
  return `
${s}.bl{width:${size.w}mm;height:${size.h}mm;box-sizing:border-box;padding:1mm 1.5mm;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;background:#fff;color:#000;font-family:Arial,Helvetica,sans-serif;text-align:center;line-height:1.1}
${s}.bl-shop{font-weight:700;font-size:${pt(7)};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
${s}.bl-address{font-size:${pt(5)};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
${s}.bl-name{font-size:${pt(6.5)};font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
${s}.bl-variant{font-size:${pt(5.5)};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
${s}.bl-bars{width:100%;display:flex;justify-content:center;margin:0.4mm 0}
${s}.bl-bars svg{width:92%;height:${Math.max(4, Math.round((Number(c.barHeight) || 30) / 4.2))}mm}
${s}.bl-code{font-size:${pt(6)};letter-spacing:0.5px}
${s}.bl-price{font-size:${pt(8)};font-weight:700}
${s}.bl-price s{font-weight:400;font-size:${pt(6)}}`;
};

/**
 * Opens a print window with `copies` stickers per item, one sticker per
 * page at the chosen label size. Returns false when pop-ups are blocked.
 */
export const printLabels = (items, cfg, shop = {}) => {
  const c = mergeLabel(cfg);
  const size = LABEL_SIZES[c.size] || LABEL_SIZES["38x25"];
  const stickers = items.flatMap((item) => Array.from({ length: Math.max(1, Number(item.copies) || 1) }, () => labelHtml(item, c, shop)));
  const win = window.open("", "_blank", "width=480,height=640");
  if (!win) return false;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Barcode labels</title><style>
@page{size:${size.w}mm ${size.h}mm;margin:0}
html,body{margin:0;padding:0}
.page{page-break-after:always;break-after:page}
.page:last-child{page-break-after:auto;break-after:auto}
${labelCss(c)}
</style></head><body>${stickers.map((s) => `<div class="page">${s}</div>`).join("")}
<script>window.onload=function(){window.focus();window.print();setTimeout(function(){window.close()},300)}</script></body></html>`);
  win.document.close();
  return true;
};
