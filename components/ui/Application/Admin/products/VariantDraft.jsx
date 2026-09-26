"use client";

import { useState } from "react";
import { Plus, Trash2, Wand2 } from "lucide-react";

import { btn, filterInput as inputClass, tdClass, thClass, theadClass } from "@/components/ui/Application/Admin/listKit";
import VariantImage from "@/components/ui/Application/Admin/products/VariantImage";
import { showToast } from "@/lib/showToast";

const split = (text) => [...new Set(String(text || "").split(",").map((s) => s.trim()).filter(Boolean))];
const cell = `${inputClass} !h-[34px] !px-2 !text-[13px]`;

let seq = 0;
export const emptyVariant = (color = "", size = "") => ({
  key: `v${++seq}`,
  image: null,
  color,
  size,
  barcode: "",
  purchasePrice: "",
  mrp: "",
  sellingPrice: "",
  stock: "",
});

/** The rows as the variant API takes them; blank prices follow the product */
export const variantPayload = (rows) =>
  rows.map((r) => ({
    color: r.color.trim(),
    size: r.size.trim(),
    barcode: r.barcode.trim(),
    purchasePrice: Number(r.purchasePrice) || 0,
    mrp: Number(r.mrp) || 0,
    sellingPrice: Number(r.sellingPrice) || 0,
    stock: Number(r.stock) || 0,
    media: r.image?._id ? [r.image._id] : [],
  }));

/** What is wrong with the rows, or "" when they can be saved */
export const variantProblem = (rows) => {
  if (!rows.length) return "Add at least one variant (color / storage)";
  if (rows.some((r) => !r.color.trim() || !r.size.trim())) return "Every variant needs a color and a storage / size";
  const seen = new Set();
  for (const r of rows) {
    const key = `${r.color.trim()}|${r.size.trim()}`.toLowerCase();
    if (seen.has(key)) return `${r.color} ${r.size} is listed twice`;
    seen.add(key);
  }
  return "";
};

/**
 * The variants of a product being added, typed in on the same screen:
 * colors × storage are generated in one go, each line with an optional
 * photo, its own barcode, prices and opening stock.
 */
export default function VariantDraft({ rows, setRows, defaults }) {
  const [gen, setGen] = useState({ colors: "", sizes: "" });

  const generate = () => {
    const colors = split(gen.colors);
    const sizes = split(gen.sizes);
    if (!colors.length && !sizes.length) return showToast("error", "Type colors and / or storage first");

    const have = new Set(rows.map((r) => `${r.color}|${r.size}`.toLowerCase()));
    const added = [];
    for (const size of sizes.length ? sizes : ["Standard"]) {
      for (const color of colors.length ? colors : ["Default"]) {
        const key = `${color}|${size}`.toLowerCase();
        if (!have.has(key)) {
          have.add(key);
          added.push(emptyVariant(color, size));
        }
      }
    }
    if (!added.length) return showToast("error", "Those variants are already listed");
    // an untouched blank first row gives way to the generated ones
    const kept = rows.filter((r) => r.color || r.size || r.barcode || r.stock || r.image);
    setRows([...kept, ...added]);
    setGen({ colors: "", sizes: "" });
  };

  const edit = (key, patch) => setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[200px] flex-1">
          <span className="mb-1 block text-[13px] font-medium">Colors</span>
          <input
            value={gen.colors}
            onChange={(e) => setGen({ ...gen, colors: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), generate())}
            placeholder="Black, Blue, Green"
            className={inputClass}
          />
        </label>
        <label className="min-w-[200px] flex-1">
          <span className="mb-1 block text-[13px] font-medium">Storage / Size</span>
          <input
            value={gen.sizes}
            onChange={(e) => setGen({ ...gen, sizes: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), generate())}
            placeholder="8/128, 8/256"
            className={inputClass}
          />
        </label>
        <button type="button" className={btn.info} onClick={generate}>
          <Wand2 size={14} /> Generate
        </button>
        <button type="button" className={btn.primary} onClick={() => setRows([...rows, emptyVariant()])}>
          <Plus size={14} /> Add Row
        </button>
      </div>
      <p className="m-0 mt-1 text-[12px] text-muted-foreground">
        Comma separated: every color × storage becomes one line. Photo is optional. A blank price uses the product&apos;s
        price; a blank barcode is made for you.
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead>
            <tr className={theadClass}>
              {["SL", "Photo", "Color *", "Storage / Size *", "Barcode", "Cost", "MRP", "Buyer Price", "Opening Stock", ""].map((h) => (
                <th key={h} className={thClass}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className={`${tdClass} py-6 text-center text-muted-foreground`}>
                  Type colors and storage above and press Generate, or Add Row.
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={r.key}>
                <td className={tdClass}>{i + 1}</td>
                <td className={tdClass}>
                  <VariantImage value={r.image} onChange={(image) => edit(r.key, { image })} />
                </td>
                <td className={tdClass}>
                  <input value={r.color} onChange={(e) => edit(r.key, { color: e.target.value })} placeholder="Black" className={`${cell} min-w-[100px]`} />
                </td>
                <td className={tdClass}>
                  <input value={r.size} onChange={(e) => edit(r.key, { size: e.target.value })} placeholder="8/128" className={`${cell} min-w-[90px]`} />
                </td>
                <td className={tdClass}>
                  <input value={r.barcode} onChange={(e) => edit(r.key, { barcode: e.target.value })} placeholder="Auto" className={`${cell} min-w-[110px] font-mono`} />
                </td>
                {["purchasePrice", "mrp", "sellingPrice"].map((f) => (
                  <td key={f} className={tdClass}>
                    <input
                      type="number"
                      min="0"
                      value={r[f]}
                      onChange={(e) => edit(r.key, { [f]: e.target.value })}
                      placeholder={defaults[f] ? String(defaults[f]) : "0"}
                      className={`${cell} w-[96px] text-right ${f === "sellingPrice" ? "font-semibold" : ""}`}
                    />
                  </td>
                ))}
                <td className={tdClass}>
                  <input
                    type="number"
                    min="0"
                    value={r.stock}
                    onChange={(e) => edit(r.key, { stock: e.target.value })}
                    placeholder="0"
                    className={`${cell} w-[84px] text-right`}
                  />
                </td>
                <td className={tdClass}>
                  <button
                    type="button"
                    onClick={() => setRows(rows.filter((x) => x.key !== r.key))}
                    className="text-red-500 hover:text-red-700"
                    aria-label={`Remove variant ${i + 1}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
