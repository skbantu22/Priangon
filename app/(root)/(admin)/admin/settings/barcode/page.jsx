"use client";

import { useState } from "react";
import { Printer, RotateCcw, ScanBarcode } from "lucide-react";

import {
  DEFAULT_LABEL,
  LABEL_FIELDS,
  LABEL_SIZES,
  labelCss,
  labelHtml,
  mergeLabel,
  printLabels,
} from "@/lib/barcodeLabel";
import { showToast } from "@/lib/showToast";
import {
  Field,
  Section,
  SettingsPage,
  Toggle,
  control,
  useSettingsForm,
} from "@/components/ui/Application/Admin/settings/settingsKit";

// the shop's own name and address fill in a blank sticker name / address
const FIELDS = ["barcodeLabel", "companyName", "address"];
const SAMPLE = { productName: "iPhone 15", variant: "Black · 128GB", barcode: "8901000000001", price: 85000, mrp: 89999 };

// Settings → Barcode Print Settings: what goes on every barcode sticker, like 360's
export default function BarcodeSettingsPage() {
  const settings = useSettingsForm(FIELDS);
  const { form, set, save } = settings;
  const [copies, setCopies] = useState("1");

  const label = mergeLabel(form?.barcodeLabel || {});
  const shop = { name: form?.companyName || "", address: form?.address || "" };
  const setLabel = (patch) => set({ barcodeLabel: { ...label, ...patch } });
  const toggle = (key) => setLabel({ fields: { ...label.fields, [key]: !label.fields[key] } });
  const size = LABEL_SIZES[label.size] || LABEL_SIZES["38x25"];
  const zoom = Math.min(3, 300 / (size.w * 3.78));

  const submit = () => {
    if (!label.fields.barcode && !label.fields.barcodeNumber) {
      return showToast("error", "Keep at least the barcode or the barcode number on the sticker");
    }
    save();
  };

  return (
    <SettingsPage
      title="Barcode Print Settings"
      subtitle="Choose what prints on every barcode sticker. The preview shows the exact label."
      settings={settings}
      onSubmit={submit}
    >
      {form && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
          <div>
            <Section title="Fields on the sticker">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {LABEL_FIELDS.map(([key, text]) => (
                  <Toggle key={key} checked={label.fields[key]} onChange={() => toggle(key)}>
                    {text}
                  </Toggle>
                ))}
              </div>
            </Section>

            <Section title="Shop name and address" hint="Left blank, the Business Settings name and address are used.">
              <div className="grid grid-cols-1 gap-4">
                <Field id="bl-shop" label="Shop name on the sticker">
                  <input
                    id="bl-shop"
                    value={label.shopName}
                    maxLength={60}
                    onChange={(e) => setLabel({ shopName: e.target.value })}
                    placeholder={shop.name || "SB Telecom"}
                    className={control(false)}
                  />
                </Field>
                <Field id="bl-address" label="Address on the sticker" hint="Keep it short: a sticker has room for one line.">
                  <input
                    id="bl-address"
                    value={label.address}
                    maxLength={120}
                    onChange={(e) => setLabel({ address: e.target.value })}
                    placeholder={shop.address || "Shop 12, Level 3, Bashundhara City, Dhaka"}
                    className={control(false)}
                  />
                </Field>
              </div>
            </Section>

            <button
              type="button"
              onClick={() => set({ barcodeLabel: { ...DEFAULT_LABEL, shopName: label.shopName, address: label.address } })}
              className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-[#6b7785] hover:text-[#1f2933]"
            >
              <RotateCcw size={14} /> Reset fields and size to default
            </button>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-[84px] xl:self-start">
            <div className="border border-[#e3e8ee] dark:border-border">
              <div className="flex items-center justify-between gap-2 border-b border-[#eef1f4] bg-[#fafbfc] px-3 py-2 dark:border-border dark:bg-white/5">
                <span className="flex items-center gap-1.5 text-[14px] font-semibold">
                  <ScanBarcode size={16} className="text-[#00801a]" /> Live preview
                </span>
                <span className="text-[12px] text-[#6b7785]">{size.label}</span>
              </div>
              <div className="flex min-h-[200px] items-center justify-center bg-[repeating-linear-gradient(45deg,#f4f6f8,#f4f6f8_8px,#eef1f4_8px,#eef1f4_16px)] p-4">
                <style>{labelCss(label, ".bl-preview")}</style>
                <div
                  className="bl-preview shadow-[0_2px_10px_rgba(16,24,40,0.18)]"
                  style={{ zoom }}
                  dangerouslySetInnerHTML={{ __html: labelHtml(SAMPLE, label, shop) }}
                />
              </div>
            </div>

            <div className="space-y-3 border border-[#e3e8ee] p-3 dark:border-border">
              <Field id="bl-size" label="Label size">
                <select id="bl-size" value={label.size} onChange={(e) => setLabel({ size: e.target.value })} className={control(false)}>
                  {Object.entries(LABEL_SIZES).map(([value, s]) => (
                    <option key={value} value={value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <label className="block">
                <span className="mb-1 flex justify-between text-[13.5px] font-medium">
                  Barcode height <span className="tabular-nums text-[#6b7785]">{label.barHeight}</span>
                </span>
                <input
                  type="range"
                  min="16"
                  max="60"
                  value={label.barHeight}
                  onChange={(e) => setLabel({ barHeight: Number(e.target.value) })}
                  className="w-full accent-[#188ae2]"
                  aria-label="Barcode height"
                />
              </label>
              <label className="block">
                <span className="mb-1 flex justify-between text-[13.5px] font-medium">
                  Text size <span className="tabular-nums text-[#6b7785]">{label.fontScale}%</span>
                </span>
                <input
                  type="range"
                  min="70"
                  max="150"
                  step="5"
                  value={label.fontScale}
                  onChange={(e) => setLabel({ fontScale: Number(e.target.value) })}
                  className="w-full accent-[#188ae2]"
                  aria-label="Text size"
                />
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={copies}
                  onChange={(e) => setCopies(e.target.value)}
                  aria-label="Test copies"
                  className={`${control(false)} !w-[80px] text-center`}
                />
                <button
                  type="button"
                  onClick={() => printLabels([{ ...SAMPLE, copies: Number(copies) || 1 }], label, shop) || showToast("error", "Allow pop-ups to print")}
                  className="flex h-[42px] flex-1 items-center justify-center gap-2 border border-[#dfe3e8] bg-white text-[14px] hover:bg-[#f1f3f5] dark:border-border dark:bg-card"
                >
                  <Printer size={16} /> Test Print
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </SettingsPage>
  );
}
