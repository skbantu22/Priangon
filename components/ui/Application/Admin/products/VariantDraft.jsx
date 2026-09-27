"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { Plus, Trash2, Wand2 } from "lucide-react";

import { btn, filterInput as inputClass, tdClass, thClass, theadClass } from "@/components/ui/Application/Admin/listKit";
import { ratesFor } from "@/lib/priceTiers";
import { showToast } from "@/lib/showToast";

const money = (n) => Number(n || 0).toLocaleString("en-BD");
const cell = `${inputClass} !h-[34px] !px-2 !text-[13px]`;

// the prices and stock that "Apply to All" copies onto every line
const BULK = [
  ["purchasePrice", "Purchase Price"],
  ["mrp", "MRP"],
  ["sellingPrice", "Buyer Price"],
  ["dealerPrice", "Dealer"],
  ["subDealerPrice", "Sub Dealer"],
  ["wholesalerPrice", "Wholesaler"],
  ["stock", "Opening Stock"],
];
const EMPTY_BULK = {
  purchasePrice: "",
  mrp: "",
  sellingPrice: "",
  dealerPrice: "",
  subDealerPrice: "",
  wholesalerPrice: "",
  stock: "",
};

  const onEnter = (action) => (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      action();
    }
  };
/** One value selector with a link to its attribute list. */
function SelectBox({ label, value, onChange, options, placeholder, manageHref, disabled = false }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium">
          {label} <span className="text-red-500">*</span>
        </span>
        <Link href={manageHref} target="_blank" className="text-[12px] text-[#188ae2] hover:underline">
          Manage list
        </Link>
      </div>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} disabled={disabled}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// A key no other line can share, even across a hot reload or a second
// render of the form (a module counter handed out "v1" twice).
const newKey = () =>
  globalThis.crypto?.randomUUID?.() ?? `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// an 8 digit barcode, the same kind the server makes
export const makeBarcode = () => String(Math.floor(10000000 + Math.random() * 90000000));

export const emptyVariant = (color = "", size = "") => ({
  key: newKey(),
  color,
  size,
  barcode: makeBarcode(),
  purchasePrice: "",
  mrp: "",
  sellingPrice: "",
  dealerPrice: "",
  subDealerPrice: "",
  wholesalerPrice: "",
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
    dealerPrice: Number(r.dealerPrice) || 0,
    subDealerPrice: Number(r.subDealerPrice) || 0,
    wholesalerPrice: Number(r.wholesalerPrice) || 0,
    stock: Number(r.stock) || 0,
  }));

/** What is wrong with the rows, or "" when they can be saved */
export const variantProblem = (rows) => {
  if (!rows.length) return "Add at least one variant (attribute / color)";
  if (rows.some((r) => !r.color.trim() || !r.size.trim())) return "Every variant needs an attribute and a color";
  const seen = new Set();
  for (const r of rows) {
    const key = `${r.color.trim()}|${r.size.trim()}`.toLowerCase();
    if (seen.has(key)) return `${r.size} / ${r.color} is listed twice`;
    seen.add(key);
  }
  return "";
};

/**
 * The variants of a product being added, on the same screen, laid out like
 * the Amar Solution variant form: generate storage × color, set prices and
 * stock once with Apply to All, then adjust any line. Each line has an
 * optional photo, its own barcode, and shows the dealer, sub dealer and
 * wholesaler rates it will sell at.
 *
 * `product` is the form's current price list (buyer and tier rates).
 */
export default function VariantDraft({ rows, setRows, product }) {
  const [gen, setGen] = useState({ category: "", attribute: "", color: "" });
  const [saved, setSaved] = useState({ attributes: [], colors: [] });

  useEffect(() => {
    let cancelled = false;
    axios
      .get("/api/attribute?active=true")
      .then(({ data }) => {
        if (cancelled || !data?.success) return;
        const groups = (slot) =>
          data.data
            .filter((a) => a.slot === slot && a.values?.length)
            .map((a) => ({
              id: String(a._id),
              name: a.name,
              slot: a.slot,
              values: [...a.values]
                .sort((x, y) => x.sortOrder - y.sortOrder)
                .map((v) => ({ label: v.label, value: v.value })),
            }));
        const attributes = [...groups("size"), ...groups("spec")].sort(
          (x, y) => Number(/storage|size/i.test(y.name)) - Number(/storage|size/i.test(x.name)) || x.name.localeCompare(y.name),
        );
        const colors = groups("color");
        setSaved({ attributes, colors });
        setGen((current) => {
          const category = attributes.find((item) => item.id === current.category) || attributes[0];
          return {
            category: category?.id || "",
            attribute: category?.values.some((item) => item.value === current.attribute)
              ? current.attribute
              : category?.values[0]?.value || "",
            color: colors.some((group) => group.values.some((item) => item.value === current.color))
              ? current.color
              : colors[0]?.values[0]?.value || "",
          };
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const [bulk, setBulk] = useState(EMPTY_BULK);
  const selectedCategory = saved.attributes.find((item) => item.id === gen.category);
  const colorOptions = [...new Map(saved.colors.flatMap((group) => group.values).map((item) => [item.value, item])).values()];

  const generate = () => {
    const attribute = selectedCategory?.values.find((item) => item.value === gen.attribute);
    if (!selectedCategory) return showToast("error", "Choose an attribute category");
    if (!attribute) return showToast("error", "Choose an attribute");
    if (!gen.color) return showToast("error", "Choose a color");

    const size = selectedCategory.slot === "size" ? attribute.value : `${selectedCategory.name}: ${attribute.value}`;
    const key = `${gen.color}|${size}`.toLowerCase();
    if (rows.some((row) => `${row.color}|${row.size}`.toLowerCase() === key)) {
      return showToast("error", "That variant is already listed");
    }
    // a blank row added by hand gives way to the generated ones
    const kept = rows.filter((r) => r.color || r.size || r.barcode || r.stock);
    setRows([...kept, emptyVariant(gen.color, size)]);
  };

  const applyToAll = () => {
    const filled = Object.fromEntries(Object.entries(bulk).filter(([, v]) => v !== ""));
    if (!Object.keys(filled).length) return showToast("error", "Type a price or stock to apply");
    if (!rows.length) return showToast("error", "Generate the variants first");
    setRows(rows.map((r) => ({ ...r, ...filled })));
    showToast("success", `Applied to ${rows.length} variant${rows.length === 1 ? "" : "s"}`);
  };

  const edit = (key, patch) => setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-4">
      {/* Select an attribute category, value, and color for each variant. */}
      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
        <SelectBox
          label="Attribute Category"
          value={gen.category}
          onChange={(category) => {
            const selected = saved.attributes.find((item) => item.id === category);
            setGen((current) => ({ ...current, category, attribute: selected?.values[0]?.value || "" }));
          }}
          options={saved.attributes.map((item) => ({ value: item.id, label: item.name }))}
          placeholder="Select category"
          manageHref="/admin/attributes?slot=size"
        />
        <SelectBox
          label="Attribute"
          value={gen.attribute}
          onChange={(attribute) => setGen((current) => ({ ...current, attribute }))}
          options={(selectedCategory?.values || []).map((item) => ({ value: item.value, label: item.label }))}
          placeholder="Select attribute"
          manageHref={selectedCategory ? `/admin/attributes?slot=${selectedCategory.slot}` : "/admin/attributes?slot=size"}
          disabled={!selectedCategory?.values.length}
        />
        <SelectBox
          label="Color"
          value={gen.color}
          onChange={(color) => setGen((current) => ({ ...current, color }))}
          options={colorOptions.map((item) => ({ value: item.value, label: item.label }))}
          placeholder="Select color"
          manageHref="/admin/attributes?slot=color"
          disabled={!colorOptions.length}
        />
        <button type="button" className={`${btn.success} h-[38px] justify-center md:mt-[22px] md:min-w-[190px]`} onClick={generate}>
          <Wand2 size={14} /> Generate Variant
        </button>
      </div>

      {/* 2. set prices and stock for every line at once */}
      <div>
        <p className="mb-1.5 text-[13px] font-medium">
          Price and Stock <span className="text-red-500">*</span>
        </p>
        <div className="grid grid-cols-2 gap-2 border border-[#ebeff2] bg-[#fafbfc] p-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-[repeat(7,minmax(0,1fr))_auto] dark:border-border dark:bg-white/5">
          {BULK.map(([key, label]) => (
            <input
              key={key}
              type="number"
              min="0"
              value={bulk[key]}
              onChange={(e) => setBulk({ ...bulk, [key]: e.target.value })}
              onKeyDown={onEnter(applyToAll)}
              placeholder={label}
              aria-label={`${label} for all variants`}
              className={cell}
            />
          ))}
          <button type="button" onClick={applyToAll} className={`${btn.warning} h-[34px] justify-center lg:min-w-[150px]`}>
            Apply to All
          </button>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Leave a tier blank to use the product&apos;s Buyer price. Bulk fields apply one value to every row.
        </p>
      </div>

      {/* 3. the lines */}
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-[13px] font-medium">
            Variants ({rows.length}) <span className="text-red-500">*</span>
          </p>
          <button type="button" className={btn.primary} onClick={() => setRows([...rows, emptyVariant()])}>
            <Plus size={14} /> Add Row
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead>
              <tr className={theadClass}>
                {[
                  "SL",
                  "Attribute - Color *",
                  "Barcode",
                  "Purchase Price",
                  "MRP",
                  "Buyer Price *",
                  "Dealer",
                  "Sub Dealer",
                  "Wholesaler",
                  "Opening Stock",
                  "Action",
                ].map((h) => (
                  <th key={h} className={thClass}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={11} className={`${tdClass} py-6 text-center text-muted-foreground`}>
                    Select an attribute category, attribute, and color above, then press Generate Variant or Add Row.
                  </td>
                </tr>
              )}
              {rows.map((r, i) => {
                const rates = ratesFor(product, { sellingPrice: Number(r.sellingPrice) || Number(product.sellingPrice) || 0 });
                const cost = Number(r.purchasePrice) || Number(product.purchasePrice) || 0;
                return (
                  <tr key={r.key}>
                    <td className={tdClass}>{i + 1}</td>
                    <td className={tdClass}>
                      <div className="flex gap-1">
                        <input
                          value={r.size}
                          onChange={(e) => edit(r.key, { size: e.target.value })}
                          placeholder="Category: value"
                          aria-label={`Attribute of variant ${i + 1}`}
                          className={`${cell} w-[92px]`}
                        />
                        <input
                          value={r.color}
                          onChange={(e) => edit(r.key, { color: e.target.value })}
                          placeholder="Black"
                          aria-label={`Color of variant ${i + 1}`}
                          className={`${cell} w-[112px]`}
                        />
                      </div>
                    </td>
                    <td className={tdClass}>
                      <input
                        value={r.barcode}
                        onChange={(e) => edit(r.key, { barcode: e.target.value })}
                        placeholder="Scan or auto"
                        className={`${cell} w-[96px] font-mono`}
                      />
                    </td>
                    {["purchasePrice", "mrp", "sellingPrice"].map((f) => (
                      <td key={f} className={tdClass}>
                        <input
                          type="number"
                          min="0.01"
                          required
                          value={r[f]}
                          onChange={(e) => edit(r.key, { [f]: e.target.value })}
                          placeholder={Number(product[f]) ? String(product[f]) : "0"}
                          className={`${cell} w-[84px] text-right ${f === "sellingPrice" ? "font-semibold" : ""}`}
                        />
                      </td>
                    ))}
                    {["dealerPrice", "subDealerPrice", "wholesalerPrice"].map((field) => (
                      <td key={field} className={tdClass}>
                        <input
                          type="number"
                          min="0"
                          value={r[field]}
                          onChange={(e) => edit(r.key, { [field]: e.target.value })}
                          placeholder={rates[field] ? String(rates[field]) : "Buyer price"}
                          aria-label={`${field} for variant ${i + 1}`}
                          className={`${cell} w-[84px] text-right`}
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
                        className={`${cell} w-[64px] text-right`}
                      />
                    </td>
                    <td className={tdClass}>
                      <button
                        type="button"
                        onClick={() => setRows(rows.filter((x) => x.key !== r.key))}
                        className="flex size-[30px] items-center justify-center bg-[#ff5b5b] text-white hover:bg-[#e04848]"
                        aria-label={`Remove variant ${i + 1}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="m-0 mt-1.5 text-[12px] text-muted-foreground">
          A blank price uses the product&apos;s price; each line gets an 8 digit barcode you can scan over. Dealer, Sub
          Dealer and Wholesaler follow the Price List above and scale with a dearer variant.{" "}
          <span className="text-amber-600">= Buyer</span> means that rate is not set. Red = at or below cost.
        </p>
      </div>
    </div>
  );
}
