"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Settings2, Trash2 } from "lucide-react";

import { printLabels } from "@/lib/barcodeLabel";
import { showToast } from "@/lib/showToast";
import { useLanguage } from "@/hooks/useLanguage";
import { oneLine } from "@/lib/labels";
import { useOpeningStockTill } from "@/lib/posProducts";
import {
  EmptyRow,
  ListCard,
  btn,
  filterInput,
  tdClass,
  thClass,
  theadClass,
} from "@/components/ui/Application/Admin/listKit";

export default function BarcodePrintPage() {
  const { language } = useLanguage();
  const t = (en, bn) => oneLine(en, bn, language);
  const till = useOpeningStockTill();

  const [variants, setVariants] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [labelSettings, setLabelSettings] = useState({ label: {}, shop: {} });

  useEffect(() => {
    axios
      .get("/api/settings")
      .then(({ data }) => {
        if (!data?.success) return;
        setLabelSettings({
          label: data.data.barcodeLabel || {},
          shop: { name: data.data.companyName || "", address: data.data.address || "" },
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setVariants([]);
    setSelectedItems([]);
    setSearch("");
    axios
      .get("/api/product/list", { params: { location: till.id || "warehouse", limit: "all", status: "active" } })
      .then(({ data }) => {
        if (cancelled || !data?.success) return;
        const lines = [];
        (data.items || []).forEach((product) => {
          (product.variants || []).forEach((variant) => {
            lines.push({
              _id: variant._id,
              productName: product.name,
              label: variant.label || "",
              barcode: variant.barcode || "",
              sellingPrice: variant.sellingPrice,
              mrp: variant.mrp,
              stock: variant.stock,
            });
          });
        });
        setVariants(lines);
      })
      .catch(() => {
        if (!cancelled) showToast("error", "Could not load products");
      });
    return () => {
      cancelled = true;
    };
  }, [till.id]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return variants;
    return variants.filter((v) =>
      `${v.productName} ${v.barcode} ${v.label}`.toLowerCase().includes(needle),
    );
  }, [search, variants]);

  const isAdded = (id) => selectedItems.some((item) => item.variant._id === id);
  const addVariant = (variant) => {
    if (isAdded(variant._id)) return;
    setSelectedItems((prev) => [...prev, { variant, qty: 1 }]);
  };
  const updateQty = (id, qty) => {
    setSelectedItems((prev) => prev.map((item) => (item.variant._id === id ? { ...item, qty: Number(qty) || 1 } : item)));
  };
  const removeItem = (id) => setSelectedItems((prev) => prev.filter((item) => item.variant._id !== id));

  const generateLabels = () => {
    if (!selectedItems.length) return showToast("error", t("Add products to print first", "আগে প্রিন্টের পণ্য যোগ করুন"));
    const items = selectedItems.map(({ variant, qty }) => ({
      productName: variant.productName,
      variant: variant.label || "",
      barcode: variant.barcode || variant.sku,
      price: variant.sellingPrice,
      mrp: variant.mrp,
      copies: qty,
    }));
    if (!printLabels(items, labelSettings.label, labelSettings.shop)) {
      showToast("error", t("Allow pop-ups to print", "প্রিন্টের জন্য পপ-আপ চালু রাখুন"));
    }
  };

  return (
    <div className="space-y-4">
      <ListCard
        title={t("Print Barcode/Label", "বারকোড প্রিন্ট")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/settings/barcode" className={btn.secondary}>
              <Settings2 size={14} /> {t("Label settings", "লেবেল সেটিংস")}
            </Link>
            <button type="button" className={btn.success} onClick={generateLabels}>
              {t("Print Labels", "লেবেল প্রিন্ট")}
            </button>
          </div>
        }
      >
        <p className="mb-3 text-[13px] text-[#868e96]">
          {t("Stock and barcodes for", "স্টক ও বারকোড")} <span className="font-semibold text-[#212529]">{till.name}</span>
        </p>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("Search name, barcode, SKU...", "নাম, বারকোড, SKU খুঁজুন...")}
          className={`${filterInput} mb-4 max-w-xl`}
        />

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className={theadClass}>
                <th className={thClass}>{t("Product", "পণ্য")}</th>
                <th className={thClass}>{t("Barcode", "বারকোড")}</th>
                <th className={thClass}>{t("Stock", "স্টক")}</th>
                <th className={thClass}>{t("Action", "অ্যাকশন")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <EmptyRow colSpan={4} title={t("No products for this branch", "এই শাখায় কোনো পণ্য নেই")} />
              )}
              {filtered.slice(0, 80).map((v) => (
                <tr key={v._id} className="hover:bg-[#f5f7f9] dark:hover:bg-muted/50">
                  <td className={tdClass}>
                    <div className="font-medium">{v.productName}</div>
                    <div className="text-[12px] text-[#868e96]">{v.label}</div>
                  </td>
                  <td className={`${tdClass} font-mono text-[12px]`}>{v.barcode}</td>
                  <td className={tdClass}>{v.stock ?? 0}</td>
                  <td className={tdClass}>
                    {isAdded(v._id) ? (
                      <span className="text-[12px] font-semibold text-[#0e8a4a]">{t("Added", "যোগ হয়েছে")}</span>
                    ) : (
                      <button type="button" className={btn.primary} onClick={() => addVariant(v)}>
                        {t("Add", "যোগ")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ListCard>

      {selectedItems.length > 0 && (
        <ListCard title={t("Selected labels", "নির্বাচিত লেবেল")}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className={theadClass}>
                  <th className={thClass}>{t("Product", "পণ্য")}</th>
                  <th className={thClass}>{t("Barcode", "বারকোড")}</th>
                  <th className={thClass}>{t("Qty", "সংখ্যা")}</th>
                  <th className={thClass}>{t("Action", "অ্যাকশন")}</th>
                </tr>
              </thead>
              <tbody>
                {selectedItems.map((item) => (
                  <tr key={item.variant._id}>
                    <td className={tdClass}>{item.variant.productName}</td>
                    <td className={`${tdClass} font-mono`}>{item.variant.barcode}</td>
                    <td className={tdClass}>
                      <input
                        type="number"
                        min={1}
                        value={item.qty}
                        onChange={(e) => updateQty(item.variant._id, e.target.value)}
                        className={`${filterInput} !w-24`}
                      />
                    </td>
                    <td className={tdClass}>
                      <button type="button" className="text-[#ff5b5b]" onClick={() => removeItem(item.variant._id)} aria-label={t("Remove", "সরান")}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ListCard>
      )}
    </div>
  );
}
