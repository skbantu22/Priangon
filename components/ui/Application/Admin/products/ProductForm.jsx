"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import slugify from "slugify";
import { decode } from "entities";
import { z } from "zod";
import { List, Plus } from "lucide-react";

import { ListCard, btn, filterInput as inputClass } from "@/components/ui/Application/Admin/listKit";
import RichText from "@/components/ui/Application/Admin/RichText";
import VariantDraft, { emptyVariant, variantPayload, variantProblem } from "@/components/ui/Application/Admin/products/VariantDraft";
import UploadMedia from "@/components/ui/Application/Admin/uploadmedia";
import { ADMIN_PRODUCT_SHOW } from "@/Route/Adminpannelroute";
import { productFormSchema, mobileFieldsFromProduct } from "@/lib/productFormSchema";
import { tierPricesFromProduct } from "@/lib/priceTiers";
import { PRODUCT_TYPES, extraFieldsFromProduct } from "@/lib/productExtraFields";
import { WARRANTY_TYPES, formatWarrantyPeriod } from "@/lib/warranty";
import { posBrandsQueryOptions } from "@/lib/posProducts";
import { useProductLookups } from "@/hooks/useProductLookups";
import { showToast } from "@/lib/showToast";

// categories whose items are serialised (IMEI) and carry a warranty by default
const SERIAL_CATEGORY = /phone|mobile|watch|tablet|tab\b|earbud|airpod/i;

const PERIODS = [1, 3, 6, 12, 18, 24, 36];

// the price list, left to right as the POS uses it
const PRICES = [
  ["purchasePrice", "Purchase Price", "ক্রয় মূল্য"],
  ["mrp", "MRP", "গায়ের দাম"],
  ["sellingPrice", "Buyer Price *", "খুচরা"],
  ["dealerPrice", "Dealer", "ডিলার"],
  ["subDealerPrice", "Sub Dealer", "সাব ডিলার"],
  ["wholesalerPrice", "Wholesaler", "পাইকারি"],
  ["minSalePrice", "Min Sale Price", "সর্বনিম্ন"],
];
const TIER_FIELDS = ["sellingPrice", "dealerPrice", "subDealerPrice", "wholesalerPrice"];

const money = (n) => Number(n || 0).toLocaleString("en-BD");

export const productFormValues = (product) => ({
  _id: product?._id || "",
  name: product?.name || "",
  slug: product?.slug || "",
  category: (typeof product?.category === "object" ? product?.category?._id : product?.category) || "",
  subcategory: (typeof product?.subcategory === "object" ? product?.subcategory?._id : product?.subcategory) || "",
  mrp: product?.mrp ? String(product.mrp) : "",
  sellingPrice: product?.sellingPrice ? String(product.sellingPrice) : "",
  discountPercentage: product?.discountPercentage ? String(product.discountPercentage) : "",
  // stored HTML-encoded; decode so a save does not encode it twice
  description: product?.description ? decode(product.description) : "",
  media: (product?.media || []).map((m) => m._id || m),
  freeDelivery: !!product?.freeDelivery,
  ...mobileFieldsFromProduct(product),
  ...tierPricesFromProduct(product),
  ...extraFieldsFromProduct(product),
});

/**
 * Add / edit product on one screen, laid out like the 360 product form:
 * the basics, then the full price list (buyer, dealer, sub dealer,
 * wholesaler) with the margin over cost under every rate. Photos and the
 * write-up only matter for the website and sit in an optional section.
 */
export default function ProductForm({ product, onSave, saving, footerNote }) {
  const editing = !!product?._id;

  const form = useForm({
    resolver: zodResolver(editing ? productFormSchema.extend({ _id: z.string() }) : productFormSchema),
    defaultValues: productFormValues(product),
  });
  const { register, watch, setValue, getValues, reset, formState } = form;

  const [media, setMedia] = useState(() =>
    (product?.media || []).filter((m) => m?._id).map((m) => ({ _id: m._id, url: m.secure_url || m.url, secure_url: m.secure_url })),
  );
  const [simpleItem, setSimpleItem] = useState({ barcode: "", stock: "" });
  // a variant product being added: its lines are typed in on this screen
  const [variantRows, setVariantRows] = useState(() => [emptyVariant()]);
  const [editorKey, setEditorKey] = useState(0);
  const warrantyTouched = useRef(editing);

  const { data: existingBrands = [] } = useQuery({ ...posBrandsQueryOptions(), refetchOnWindowFocus: false });
  const { brands, units } = useProductLookups({ fallbackBrands: existingBrands });

  const categoryId = watch("category");
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  useEffect(() => {
    axios
      .get("/api/category?deleteType=SD&size=10000")
      .then(({ data }) => data?.success && setCategories(data.data))
      .catch(() => {});
  }, []);

  const loadSubs = (id) => {
    if (!id) return setSubcategories([]);
    axios
      .get(`/api/subcategory?category=${id}&deleteType=SD&size=1000`)
      .then(({ data }) => setSubcategories(data?.success ? data.data : []))
      .catch(() => setSubcategories([]));
  };

  useEffect(() => {
    loadSubs(categoryId);
  }, [categoryId]);

  // phones / watches: 1 year official warranty + IMEI tracking by default
  const pickCategory = (id) => {
    setValue("category", id, { shouldValidate: true });
    setValue("subcategory", "");
    if (warrantyTouched.current) return;
    const serial = SERIAL_CATEGORY.test(categories.find((c) => c._id === id)?.name || "");
    setValue("trackSerial", serial);
    setValue("warrantyType", serial ? "official" : "none");
    setValue("warrantyMonths", serial ? 12 : 0);
    if (serial) setValue("productType", "variant");
  };

  const quickAdd = async (kind) => {
    const name = window.prompt(kind === "category" ? "New category name" : "New sub category name")?.trim();
    if (!name || name.length < 2) return;
    try {
      if (kind === "category") {
        const { data } = await axios.post("/api/category/create", { name, slug: slugify(name, { lower: true, strict: true }) });
        if (data?.data?._id) {
          setCategories((list) => [...list, data.data]);
          pickCategory(data.data._id);
        }
      } else {
        const { data } = await axios.post("/api/subcategory/create", { categoryId, name });
        if (data?.data?._id) {
          setSubcategories((list) => [...list, data.data]);
          setValue("subcategory", data.data._id);
        }
      }
      showToast("success", `"${name}" added`);
    } catch (error) {
      showToast("error", error?.response?.data?.message || "Could not add");
    }
  };

  useEffect(() => {
    setValue("media", media.map((m) => m._id));
    if (!media.length) setValue("showInWebsite", false);
  }, [media, setValue]);

  const productType = watch("productType");
  const warrantyType = watch("warrantyType");
  const purchase = Number(watch("purchasePrice")) || 0;
  const retail = Number(watch("sellingPrice")) || 0;
  const minSale = Number(watch("minSalePrice")) || 0;

  const clear = () => {
    reset(productFormValues(null));
    setMedia([]);
    setSimpleItem({ barcode: "", stock: "" });
    setVariantRows([emptyVariant()]);
    setEditorKey((k) => k + 1);
    warrantyTouched.current = false;
  };

  const submit = form.handleSubmit(
    async (values) => {
      if (!(Number(values.sellingPrice) > 0)) return showToast("error", "Enter the Buyer (sale) price");
      const addingVariants = !editing && values.productType === "variant";
      const problem = addingVariants ? variantProblem(variantRows) : "";
      if (problem) return showToast("error", problem);

      const mrp = Number(values.mrp) || Number(values.sellingPrice);
      const name = values.name.trim();
      const saved = await onSave(
        {
          ...values,
          name,
          mrp,
          slug: values.slug || `${slugify(name, { lower: true, strict: true })}-${Date.now().toString(36).slice(-4)}`,
          discountPercentage: String(Math.max(0, Math.round(((mrp - values.sellingPrice) / mrp) * 100))),
          description: values.description || "",
        },
        simpleItem,
        addingVariants ? variantPayload(variantRows) : [],
      );
      if (saved && !editing) clear();
    },
    (errors) => showToast("error", Object.values(errors)[0]?.message || "Check the required fields"),
  );

  // the margin a rate earns over the purchase price, and the rules it breaks
  const rateNote = (field) => {
    const rate = Number(watch(field)) || 0;
    if (!TIER_FIELDS.includes(field)) return null;
    if (!rate) return field === "sellingPrice" ? null : <span className="text-amber-600">Empty = Buyer price</span>;
    if (minSale && rate < minSale) return <span className="text-red-600">Below min price</span>;
    if (!purchase) return null;
    const gain = rate - purchase;
    const pct = Math.round((gain / purchase) * 100);
    return (
      <span className={gain <= 0 ? "font-semibold text-red-600" : "text-emerald-600"}>
        {gain > 0 ? "+" : ""}
        {money(gain)} ({pct}%)
      </span>
    );
  };

  // tiers normally sit dealer < sub dealer < wholesaler < buyer
  const tierOrderWarning = (() => {
    const [d, s, w] = ["dealerPrice", "subDealerPrice", "wholesalerPrice"].map((f) => Number(watch(f)) || 0);
    const set = [
      ["Dealer", d],
      ["Sub Dealer", s],
      ["Wholesaler", w],
      ["Buyer", retail],
    ].filter(([, v]) => v > 0);
    for (let i = 1; i < set.length; i++) {
      if (set[i][1] < set[i - 1][1]) return `${set[i][0]} (${money(set[i][1])}) is cheaper than ${set[i - 1][0]} (${money(set[i - 1][1])})`;
    }
    return "";
  })();

  const err = (name) =>
    formState.errors[name] && <p className="m-0 mt-1 text-[12px] text-red-600">{formState.errors[name].message}</p>;

  return (
    <form onSubmit={submit} noValidate>
      <ListCard
        title={editing ? "Update Product" : "Add New Product"}
        actions={
          <Link href={ADMIN_PRODUCT_SHOW} className={btn.primary}>
            <List size={14} /> Product List
          </Link>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
          <Field label="Product Name" required className="sm:col-span-4">
            <input {...register("name")} placeholder="Ex: Samsung Galaxy A55 5G 8/256" className={inputClass} autoFocus={!editing} />
            {err("name")}
          </Field>
          <Field label="Product Type" className="sm:col-span-2" hint={PRODUCT_TYPES[productType]?.hint}>
            <select {...register("productType")} className={inputClass}>
              {Object.entries(PRODUCT_TYPES).map(([key, t]) => (
                <option key={key} value={key}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Category" required className="sm:col-span-2">
            <div className="flex gap-1.5">
              <select value={categoryId} onChange={(e) => pickCategory(e.target.value)} className={inputClass}>
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <AddButton onClick={() => quickAdd("category")} label="Add category" />
            </div>
            {err("category")}
          </Field>
          <Field label="Sub Category" className="sm:col-span-2">
            <div className="flex gap-1.5">
              <select value={watch("subcategory")} onChange={(e) => setValue("subcategory", e.target.value)} disabled={!categoryId} className={inputClass}>
                <option value="">None</option>
                {subcategories.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <AddButton onClick={() => quickAdd("sub")} label="Add sub category" disabled={!categoryId} />
            </div>
          </Field>
          <Field label="Brand" className="sm:col-span-2">
            <input {...register("brand")} list="brand-options" placeholder="Choose or type" className={inputClass} />
            <datalist id="brand-options">
              {brands.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </Field>

          <Field label="Unit" required className="sm:col-span-2">
            <input {...register("unit")} list="unit-options" placeholder="Pcs" className={inputClass} />
            <datalist id="unit-options">
              {units.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
            {err("unit")}
          </Field>
          <Field label="Product Code" className="sm:col-span-2">
            <input {...register("code")} placeholder="Ex: SM-A55" className={inputClass} />
          </Field>
          <Field label="Rack No" className="sm:col-span-2">
            <input {...register("rackNo")} placeholder="Ex: A-12" className={inputClass} />
          </Field>

          {!editing && productType === "simple" && (
            <>
              <Field label="Barcode" className="sm:col-span-3" hint="Leave empty to auto-generate">
                <input
                  value={simpleItem.barcode}
                  onChange={(e) => setSimpleItem({ ...simpleItem, barcode: e.target.value })}
                  placeholder="Scan barcode"
                  className={inputClass}
                />
              </Field>
              <Field label="Opening Stock (warehouse)" className="sm:col-span-3">
                <input
                  type="number"
                  min="0"
                  value={simpleItem.stock}
                  onChange={(e) => setSimpleItem({ ...simpleItem, stock: e.target.value })}
                  placeholder="0"
                  className={inputClass}
                />
              </Field>
            </>
          )}
        </div>

        {/* ---------- price list ---------- */}
        <Section title="Price List (রেট)" note="The POS charges each customer the rate of their type. An empty rate charges the Buyer price.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {PRICES.map(([field, label, bn]) => (
              <label key={field} className="block">
                <span className="block text-[13px] font-medium">{label}</span>
                <span className="block text-[11px] text-muted-foreground">{bn}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  {...register(field)}
                  placeholder={["dealerPrice", "subDealerPrice", "wholesalerPrice"].includes(field) && retail ? String(retail) : "0"}
                  className={`${inputClass} mt-1 text-right ${field === "sellingPrice" ? "font-semibold" : ""}`}
                />
                <span className="mt-0.5 block min-h-[16px] text-[11px] tabular-nums">{rateNote(field)}</span>
              </label>
            ))}
          </div>
          {tierOrderWarning && (
            <p className="m-0 mt-2 rounded-[4px] bg-amber-50 px-3 py-1.5 text-[12px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
              Check the rates: {tierOrderWarning}. Usually Dealer &lt; Sub Dealer &lt; Wholesaler &lt; Buyer.
            </p>
          )}
        </Section>

        {/* ---------- stock & warranty ---------- */}
        <Section title="Stock & Warranty">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
            <Field label="Low Stock Alert" className="sm:col-span-2" hint="Flag the product when stock falls to this">
              <input type="number" min="0" {...register("alertQuantity")} placeholder="0" className={inputClass} />
            </Field>
            <Field label="Warranty" className="sm:col-span-2">
              <select
                value={warrantyType}
                onChange={(e) => {
                  warrantyTouched.current = true;
                  setValue("warrantyType", e.target.value);
                  if (e.target.value === "none") setValue("warrantyMonths", 0);
                  else if (!Number(getValues("warrantyMonths"))) setValue("warrantyMonths", 12);
                }}
                className={inputClass}
              >
                {Object.entries(WARRANTY_TYPES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Warranty Period" className="sm:col-span-2">
              <select
                value={watch("warrantyMonths")}
                disabled={warrantyType === "none"}
                onChange={(e) => {
                  warrantyTouched.current = true;
                  setValue("warrantyMonths", Number(e.target.value));
                }}
                className={inputClass}
              >
                {warrantyType === "none" && <option value={0}>—</option>}
                {PERIODS.map((m) => (
                  <option key={m} value={m}>
                    {formatWarrantyPeriod(m)}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-[13px] sm:col-span-6">
              <input
                type="checkbox"
                checked={!!watch("trackSerial")}
                onChange={(e) => {
                  warrantyTouched.current = true;
                  setValue("trackSerial", e.target.checked);
                }}
                className="size-4"
              />
              Require IMEI / Serial at sale (phones, watches, earbuds)
            </label>
          </div>
        </Section>

        {!editing && productType === "variant" && (
          <Section title="Variants (color / storage)" note="Each line sells with its own barcode, price and stock.">
            <VariantDraft
              rows={variantRows}
              setRows={setVariantRows}
              defaults={{ purchasePrice: purchase, mrp: Number(watch("mrp")) || 0, sellingPrice: retail }}
            />
          </Section>
        )}

        {/* ---------- photos and description, optional ---------- */}
        <details className="mt-5 rounded-[6px] border border-[#ebeff2] dark:border-border" open={editing && media.length > 0}>
          <summary className="cursor-pointer select-none px-4 py-2.5 text-[14px] font-semibold">
            Photos &amp; description (optional)
          </summary>
          <div className="space-y-4 border-t border-[#ebeff2] p-4 dark:border-border">
            <UploadMedia isMultiple selectedMedia={media} setSelectedMedia={setMedia} />
            <RichText
              key={editorKey}
              value={watch("description")}
              onChange={(html) => setValue("description", html)}
              placeholder="Product details, box contents, specifications…"
            />
          </div>
        </details>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          {footerNote && <span className="mr-auto text-[12px] text-muted-foreground">{footerNote}</span>}
          {!editing && (
            <button type="button" onClick={clear} className={btn.warning}>
              Clear
            </button>
          )}
          <button type="submit" disabled={saving} className={btn.success}>
            {saving ? "Saving..." : editing ? "Update" : "Save"}
          </button>
        </div>
      </ListCard>
    </form>
  );
}

function Section({ title, note, children }) {
  return (
    <section className="mt-5 border-t border-[#eef1f4] pt-4 dark:border-border">
      <h2 className="m-0 text-[15px] font-semibold">{title}</h2>
      {note && <p className="m-0 mb-3 text-[12px] text-muted-foreground">{note}</p>}
      <div className={note ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

function Field({ label, required, hint, className = "", children }) {
  return (
    <div className={className}>
      <span className="mb-1 block text-[13px] font-medium">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {hint && <p className="m-0 mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function AddButton({ onClick, label, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[6px] bg-[#188ae2] text-white disabled:opacity-50"
    >
      <Plus size={16} />
    </button>
  );
}
