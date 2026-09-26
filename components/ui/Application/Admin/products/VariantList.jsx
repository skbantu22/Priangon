"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Plus, Trash2 } from "lucide-react";

import { ListCard, btn, filterInput as inputClass, tdClass, thClass, theadClass } from "@/components/ui/Application/Admin/listKit";
import VariantImage from "@/components/ui/Application/Admin/products/VariantImage";
import { ratesFor } from "@/lib/priceTiers";
import { showToast } from "@/lib/showToast";

const money = (n) => Number(n || 0).toLocaleString("en-BD");
const split = (text) => [...new Set(String(text || "").split(",").map((s) => s.trim()).filter(Boolean))];

const cell = `${inputClass} !h-[32px] !px-2 !text-[13px]`;

const EDITABLE = ["color", "size", "barcode", "purchasePrice", "mrp", "sellingPrice"];

let tempId = 0;

/**
 * Variants of one product as a plain table, like the 360 variant screen:
 * color and storage / size, barcode, cost and prices per line. The dealer,
 * sub dealer and wholesaler rates the POS will charge are shown beside each
 * line (they follow the product's price list, scaled for a dearer variant).
 */
export default function VariantList({ product }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gen, setGen] = useState({ colors: "", sizes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/product-variant/find?productId=${product._id}`);
      if (data?.success) {
        setRows(
          data.data.map((v) => ({
            _id: v._id,
            image: v.media?.[0]?._id ? { _id: v.media[0]._id, url: v.media[0].secure_url } : null,
            color: v.color || "",
            size: v.size || "",
            barcode: v.barcode || "",
            purchasePrice: v.purchasePrice ? String(v.purchasePrice) : "",
            mrp: v.mrp ? String(v.mrp) : "",
            sellingPrice: v.sellingPrice ? String(v.sellingPrice) : "",
            stock: v.liveStock ?? 0,
            dirty: false,
          })),
        );
      }
    } catch {
      showToast("error", "Could not load variants");
    } finally {
      setLoading(false);
    }
  }, [product._id]);

  useEffect(() => {
    load();
  }, [load]);

  const newRow = (color = "", size = "") => ({
    _id: `new-${++tempId}`,
    isNew: true,
    image: null,
    color,
    size,
    barcode: "",
    purchasePrice: product.purchasePrice ? String(product.purchasePrice) : "",
    mrp: product.mrp ? String(product.mrp) : "",
    sellingPrice: product.sellingPrice ? String(product.sellingPrice) : "",
    stock: "",
    dirty: true,
  });

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
          added.push(newRow(color, size));
        }
      }
    }
    if (!added.length) return showToast("error", "Those variants already exist");
    setRows([...rows, ...added]);
    setGen({ colors: "", sizes: "" });
  };

  const edit = (id, key, value) => setRows(rows.map((r) => (r._id === id ? { ...r, [key]: value, dirty: true } : r)));

  const remove = async (row) => {
    if (row.isNew) return setRows(rows.filter((r) => r._id !== row._id));
    if (!confirm(`Delete ${row.color} ${row.size}? Its stock records are removed too.`)) return;
    try {
      const { data } = await axios.delete(`/api/product-variant/delete/${row._id}`);
      showToast(data?.success ? "success" : "error", data?.message);
      if (data?.success) setRows(rows.filter((r) => r._id !== row._id));
    } catch (error) {
      showToast("error", error?.response?.data?.message || "Could not delete");
    }
  };

  const saveAll = async () => {
    const fresh = rows.filter((r) => r.isNew);
    const changed = rows.filter((r) => !r.isNew && r.dirty);
    if (!fresh.length && !changed.length) return showToast("error", "Nothing to save");
    if ([...fresh, ...changed].some((r) => !r.color.trim() || !r.size.trim())) {
      return showToast("error", "Every variant needs a color and a storage / size");
    }

    const pick = (r) => ({
      ...Object.fromEntries(EDITABLE.map((k) => [k, r[k]])),
      media: r.image?._id ? [r.image._id] : [],
    });
    setSaving(true);
    try {
      if (fresh.length) {
        await axios.post("/api/product-variant/create", {
          productId: product._id,
          variants: fresh.map((r) => ({ ...pick(r), stock: Number(r.stock) || 0 })),
        });
      }
      if (changed.length) {
        await axios.put("/api/product-variant/update", { variants: changed.map((r) => ({ _id: r._id, ...pick(r) })) });
      }
      showToast("success", "Variants saved");
      load();
    } catch (error) {
      showToast("error", error?.response?.data?.message || "Could not save variants");
    } finally {
      setSaving(false);
    }
  };

  const unsaved = rows.some((r) => r.dirty);

  return (
    <ListCard
      title="Variants (color / storage)"
      actions={
        <>
          <button type="button" className={btn.primary} onClick={() => setRows([...rows, newRow()])}>
            <Plus size={14} /> Add Row
          </button>
          <button type="button" className={btn.success} disabled={saving || !unsaved} onClick={saveAll}>
            {saving ? "Saving..." : "Save Variants"}
          </button>
        </>
      }
    >
      {/* quick generator: every color x every storage */}
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[200px] flex-1">
          <span className="mb-1 block text-[13px] font-medium">Colors</span>
          <input value={gen.colors} onChange={(e) => setGen({ ...gen, colors: e.target.value })} placeholder="Black, Blue, Green" className={inputClass} />
        </label>
        <label className="min-w-[200px] flex-1">
          <span className="mb-1 block text-[13px] font-medium">Storage / Size</span>
          <input value={gen.sizes} onChange={(e) => setGen({ ...gen, sizes: e.target.value })} placeholder="8/128, 8/256" className={inputClass} />
        </label>
        <button type="button" className={btn.info} onClick={generate}>
          Generate
        </button>
      </div>
      <p className="m-0 mt-1 text-[12px] text-muted-foreground">
        Comma separated. Every color × storage becomes one line with its own barcode. Stock after this comes in through Purchase.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[1210px] border-collapse text-sm">
          <thead>
            <tr className={theadClass}>
              {["SL", "Photo", "Color", "Storage / Size", "Barcode", "Cost", "MRP", "Buyer", "Dealer", "Sub Dealer", "Wholesaler", "Stock", ""].map((h) => (
                <th key={h} className={thClass}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={13} className={tdClass}>
                  <div className="h-4 animate-pulse rounded bg-slate-100 dark:bg-muted" />
                </td>
              </tr>
            )}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={13} className={`${tdClass} py-8 text-center text-muted-foreground`}>
                  No variants yet. Type colors and storage above and press Generate, or Add Row.
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((r, i) => {
                const rates = ratesFor(product, { sellingPrice: Number(r.sellingPrice) || 0 });
                const cost = Number(r.purchasePrice) || 0;
                const tier = (field) => {
                  const rate = rates[field];
                  if (!Number(product[field])) return <span className="text-[12px] text-amber-600">= Buyer</span>;
                  const loss = cost > 0 && rate <= cost;
                  return <span className={loss ? "font-semibold text-red-600" : ""}>{money(rate)}</span>;
                };

                return (
                  <tr key={r._id} className={r.dirty ? "bg-amber-50/60 dark:bg-amber-500/5" : ""}>
                    <td className={tdClass}>{i + 1}</td>
                    <td className={tdClass}>
                      <VariantImage value={r.image} onChange={(image) => edit(r._id, "image", image)} />
                    </td>
                    <td className={tdClass}>
                      <input value={r.color} onChange={(e) => edit(r._id, "color", e.target.value)} className={`${cell} min-w-[90px]`} />
                    </td>
                    <td className={tdClass}>
                      <input value={r.size} onChange={(e) => edit(r._id, "size", e.target.value)} className={`${cell} min-w-[80px]`} />
                    </td>
                    <td className={tdClass}>
                      <input
                        value={r.barcode}
                        onChange={(e) => edit(r._id, "barcode", e.target.value)}
                        placeholder={r.isNew ? "Auto" : ""}
                        className={`${cell} min-w-[110px] font-mono`}
                      />
                    </td>
                    {["purchasePrice", "mrp", "sellingPrice"].map((f) => (
                      <td key={f} className={tdClass}>
                        <input
                          type="number"
                          min="0"
                          value={r[f]}
                          onChange={(e) => edit(r._id, f, e.target.value)}
                          className={`${cell} w-[90px] text-right ${f === "sellingPrice" ? "font-semibold" : ""}`}
                        />
                      </td>
                    ))}
                    <td className={tdClass}>{tier("dealerPrice")}</td>
                    <td className={tdClass}>{tier("subDealerPrice")}</td>
                    <td className={tdClass}>{tier("wholesalerPrice")}</td>
                    <td className={tdClass}>
                      {r.isNew ? (
                        <input
                          type="number"
                          min="0"
                          value={r.stock}
                          onChange={(e) => edit(r._id, "stock", e.target.value)}
                          placeholder="Opening"
                          className={`${cell} w-[80px] text-right`}
                        />
                      ) : (
                        r.stock
                      )}
                    </td>
                    <td className={tdClass}>
                      <button type="button" onClick={() => remove(r)} className="text-red-500 hover:text-red-700" aria-label="Delete variant">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      <p className="m-0 mt-2 text-[12px] text-muted-foreground">
        Dealer / Sub Dealer / Wholesaler come from the product&apos;s price list and scale with a dearer variant.{" "}
        <span className="text-amber-600">= Buyer</span> means that rate is not set. Red = at or below cost.
      </p>
    </ListCard>
  );
}
