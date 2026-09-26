"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { Plus, Trash2, Wand2 } from "lucide-react";

import { btn, filterInput as inputClass, tdClass, thClass, theadClass } from "@/components/ui/Application/Admin/listKit";
import { ratesFor } from "@/lib/priceTiers";
import { showToast } from "@/lib/showToast";

const split = (text) => [...new Set(String(text || "").split(",").map((s) => s.trim()).filter(Boolean))];
const money = (n) => Number(n || 0).toLocaleString("en-BD");
const cell = `${inputClass} !h-[34px] !px-2 !text-[13px]`;

// the prices and stock that "Apply to All" copies onto every line
const BULK = [
  ["purchasePrice", "Purchase Price"],
  ["mrp", "MRP"],
  ["sellingPrice", "Buyer Price"],
  ["stock", "Opening Stock"],
];
const EMPTY_BULK = { purchasePrice: "", mrp: "", sellingPrice: "", stock: "" };

/**
 * Saved values to pick from (Products → Attributes / Colors), shown as
 * chips under a box. What is being typed after the last comma filters
 * the chips; a chip picks its value (replacing the half-typed word) or
 * drops it again. A value not saved yet can still be typed in full.
 */
function PickBox({ label, text, setText, groups, placeholder, onEnter, manageHref }) {
  const parts = text.split(",");
  const typing = parts[parts.length - 1].trim();
  const known = new Set(groups.flatMap((g) => g.values.map((v) => v.toLowerCase())));
  // a finished saved value is a pick, not a search
  const typedIsValue = known.has(typing.toLowerCase());
  const chosen = [...split(parts.slice(0, -1).join(",")), ...(typedIsValue ? [typing] : [])];
  const picked = new Set(chosen.map((v) => v.toLowerCase()));
  const needle = typedIsValue ? "" : typing.toLowerCase();
  const matches = (v) => !needle || v.toLowerCase().includes(needle);
  const anyMatch = groups.some((g) => g.values.some(matches));

  const toggle = (value) => {
    const next = picked.has(value.toLowerCase())
      ? chosen.filter((v) => v.toLowerCase() !== value.toLowerCase())
      : [...chosen, value];
    // the trailing comma starts the next word, so typing goes on filtering
    setText(next.length ? `${next.join(", ")}, ` : "");
  };

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
      <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onEnter} placeholder={placeholder} className={inputClass} />
      {groups.length > 0 && (
        <div className="mt-1.5 border border-[#ebeff2] p-2 dark:border-border">
          <div className="max-h-[140px] space-y-1.5 overflow-y-auto">
            {!anyMatch && (
              <p className="py-1 text-[12.5px] text-[#8a939c]">
                No saved value matches &quot;{typing}&quot;. It will be used as typed.
              </p>
            )}
            {groups.map((group) => {
              const values = group.values.filter(matches);
              if (!values.length) return null;
              return (
                <div key={group.name}>
                  {groups.length > 1 && <p className="mb-1 text-[11px] font-semibold uppercase text-[#8a939c]">{group.name}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {values.map((value) => {
                      const on = picked.has(value.toLowerCase());
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggle(value)}
                          aria-pressed={on}
                          className={`h-[26px] border px-2 text-[12.5px] transition ${
                            on
                              ? "border-[#10c469] bg-[#10c469] text-white"
                              : "border-[#dfe3e8] bg-white text-[#3b4652] hover:border-[#188ae2] dark:border-border dark:bg-card dark:text-foreground"
                          }`}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// A key no other line can share, even across a hot reload or a second
// render of the form (a module counter handed out "v1" twice).
const newKey = () =>
  globalThis.crypto?.randomUUID?.() ?? `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const emptyVariant = (color = "", size = "") => ({
  key: newKey(),
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
 * The variants of a product being added, on the same screen, laid out like
 * the Amar Solution variant form: generate storage × color, set prices and
 * stock once with Apply to All, then adjust any line. Each line has an
 * optional photo, its own barcode, and shows the dealer, sub dealer and
 * wholesaler rates it will sell at.
 *
 * `product` is the form's current price list (buyer and tier rates).
 */
export default function VariantDraft({ rows, setRows, product }) {
  const [gen, setGen] = useState({ colors: "", sizes: "" });
  // saved Storage / Size and Color lists (Products → Attributes)
  const [saved, setSaved] = useState({ size: [], color: [] });

  useEffect(() => {
    let cancelled = false;
    axios
      .get("/api/attribute?active=true")
      .then(({ data }) => {
        if (cancelled || !data?.success) return;
        const groups = (slot) =>
          data.data
            .filter((a) => a.slot === slot && a.values?.length)
            .map((a) => ({ name: a.name, values: [...a.values].sort((x, y) => x.sortOrder - y.sortOrder).map((v) => v.value) }))
            // a phone shop picks storage most, so it comes first
            .sort((x, y) => Number(/storage/i.test(y.name)) - Number(/storage/i.test(x.name)));
        setSaved({ size: groups("size"), color: groups("color") });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const [bulk, setBulk] = useState(EMPTY_BULK);

  const generate = () => {
    const colors = split(gen.colors);
    const sizes = split(gen.sizes);
    if (!colors.length && !sizes.length) return showToast("error", "Type storage / size and / or colors first");

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
    // a blank row added by hand gives way to the generated ones
    const kept = rows.filter((r) => r.color || r.size || r.barcode || r.stock);
    setRows([...kept, ...added]);
    setGen({ colors: "", sizes: "" });
  };

  const applyToAll = () => {
    const filled = Object.fromEntries(Object.entries(bulk).filter(([, v]) => v !== ""));
    if (!Object.keys(filled).length) return showToast("error", "Type a price or stock to apply");
    if (!rows.length) return showToast("error", "Generate the variants first");
    setRows(rows.map((r) => ({ ...r, ...filled })));
    showToast("success", `Applied to ${rows.length} variant${rows.length === 1 ? "" : "s"}`);
  };

  const edit = (key, patch) => setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const onEnter = (action) => (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. generate storage x color */}
      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-[1fr_1fr_auto]">
        <PickBox
          label="Storage / Size"
          text={gen.sizes}
          setText={(sizes) => setGen((g) => ({ ...g, sizes }))}
          groups={saved.size}
          placeholder="Pick below or type: 8/128GB, 8/256GB"
          onEnter={onEnter(generate)}
          manageHref="/admin/attributes?slot=size"
        />
        <PickBox
          label="Color"
          text={gen.colors}
          setText={(colors) => setGen((g) => ({ ...g, colors }))}
          groups={saved.color}
          placeholder="Pick below or type: Black, Blue"
          onEnter={onEnter(generate)}
          manageHref="/admin/attributes?slot=color"
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
        <div className="grid grid-cols-2 gap-2 border border-[#ebeff2] bg-[#fafbfc] p-2 sm:grid-cols-3 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] dark:border-border dark:bg-white/5">
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
                  "Size - Color *",
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
                    Type storage and colors above and press Generate Variant, or Add Row.
                  </td>
                </tr>
              )}
              {rows.map((r, i) => {
                const rates = ratesFor(product, { sellingPrice: Number(r.sellingPrice) || Number(product.sellingPrice) || 0 });
                const cost = Number(r.purchasePrice) || Number(product.purchasePrice) || 0;
                const tier = (field) => {
                  if (!Number(product[field])) return <span className="whitespace-nowrap text-[12px] text-amber-600">= Buyer</span>;
                  const loss = cost > 0 && rates[field] <= cost;
                  return <span className={`tabular-nums ${loss ? "font-semibold text-red-600" : ""}`}>{money(rates[field])}</span>;
                };

                return (
                  <tr key={r.key}>
                    <td className={tdClass}>{i + 1}</td>
                    <td className={tdClass}>
                      <div className="flex gap-1">
                        <input
                          value={r.size}
                          onChange={(e) => edit(r.key, { size: e.target.value })}
                          placeholder="8/128"
                          aria-label={`Storage / size of variant ${i + 1}`}
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
                        placeholder="Auto"
                        className={`${cell} w-[96px] font-mono`}
                      />
                    </td>
                    {["purchasePrice", "mrp", "sellingPrice"].map((f) => (
                      <td key={f} className={tdClass}>
                        <input
                          type="number"
                          min="0"
                          value={r[f]}
                          onChange={(e) => edit(r.key, { [f]: e.target.value })}
                          placeholder={Number(product[f]) ? String(product[f]) : "0"}
                          className={`${cell} w-[84px] text-right ${f === "sellingPrice" ? "font-semibold" : ""}`}
                        />
                      </td>
                    ))}
                    <td className={tdClass}>{tier("dealerPrice")}</td>
                    <td className={tdClass}>{tier("subDealerPrice")}</td>
                    <td className={tdClass}>{tier("wholesalerPrice")}</td>
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
          A blank price uses the product&apos;s price; a blank barcode is made for you. Dealer, Sub
          Dealer and Wholesaler follow the Price List above and scale with a dearer variant.{" "}
          <span className="text-amber-600">= Buyer</span> means that rate is not set. Red = at or below cost.
        </p>
      </div>
    </div>
  );
}
