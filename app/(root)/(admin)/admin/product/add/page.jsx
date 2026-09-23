"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import slugify from "slugify";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  ImageIcon,
  Plus,
  ScanBarcode,
  Tag,
  X,
} from "lucide-react";

// UI Components
import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ButtonLoading from "@/components/ui/Application/ButtonLoading";
import Select from "@/components/ui/Select";
import Editor from "@/components/ui/Application/Admin/Editor";
import UploadMedia from "@/components/ui/Application/Admin/uploadmedia";
import MobileSpecsCard from "@/components/ui/Application/Admin/products/MobileSpecsCard";
import PriceListCard from "@/components/ui/Application/Admin/products/PriceListCard";
import ProductStockCard from "@/components/ui/Application/Admin/products/ProductStockCard";

// Utilities & Config
import { ADMIN_DASHBOARD, ADMIN_PRODUCT_SHOW } from "@/Route/Adminpannelroute";
import { productFormSchema } from "@/lib/productFormSchema";
import { tierPricesFromProduct } from "@/lib/priceTiers";
import {
  PRODUCT_TYPES,
  PRODUCT_UNITS,
  extraFieldsFromProduct,
} from "@/lib/productExtraFields";
import { posBrandsQueryOptions } from "@/lib/posProducts";
import { showToast } from "@/lib/showToast";
import useFetch from "@/hooks/useFetch";
import { useRouter } from "next/navigation";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_PRODUCT_SHOW, label: "Products" },
  { href: "#", label: "New Product" },
];

// categories whose items are serialised (IMEI) and carry a warranty by default
const SERIAL_CATEGORY = /phone|mobile|watch|tablet|tab\b|earbud|airpod/i;

// fields asked on step 1; "Next" only checks these
const STEP1_FIELDS = ["name", "category", "subcategory", "brand", "unit", "productType"];

const STEPS = ["Basic Info", "Details & Price"];

const selectClass =
  "h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:border-primary dark:bg-input/30";

const defaultValues = {
  name: "",
  slug: "",
  category: "",
  subcategory: "",
  brand: "",
  mrp: "",
  sellingPrice: "",
  discountPercentage: "",
  description: "",
  media: [],
  freeDelivery: false,
  warrantyType: "none",
  warrantyMonths: 0,
  trackSerial: false,
  ...tierPricesFromProduct(null),
  ...extraFieldsFromProduct(null),
};

// A select with a "+" that adds a new entry in place (category, sub category)
function SelectWithAdd({ options, value, onChange, placeholder, onAdd, disabled, addLabel }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (name.trim().length < 2) return;
    setSaving(true);
    const ok = await onAdd(name.trim());
    setSaving(false);
    if (ok) {
      setName("");
      setAdding(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className={`min-w-0 flex-1 ${disabled ? "pointer-events-none opacity-50" : ""}`}>
          <Select
            options={options}
            selected={value}
            placeholder={placeholder}
            setSelected={(val) => onChange(typeof val === "string" ? val : val?.value || "")}
          />
        </div>
        <Button
          type="button"
          size="icon"
          variant={adding ? "outline" : "default"}
          disabled={disabled}
          onClick={() => setAdding((a) => !a)}
          title={addLabel}
          className="shrink-0"
        >
          {adding ? <X className="size-4" /> : <Plus className="size-4" />}
        </Button>
      </div>
      {adding && (
        <div className="flex gap-2">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              }
            }}
            placeholder={addLabel}
            className="h-9"
          />
          <Button type="button" size="sm" className="h-9" disabled={saving} onClick={save}>
            {saving ? "Adding..." : "Add"}
          </Button>
        </div>
      )}
    </div>
  );
}

const AddProduct = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [categoryOption, setCategoryOption] = useState([]);
  const [subCategoryOption, setSubCategoryOption] = useState([]);
  const [resetKey, setResetKey] = useState(0);
  // simple product: its single item's barcode + opening (warehouse) stock
  const [simpleItem, setSimpleItem] = useState({ barcode: "", stock: "" });
  // once the user touches the warranty card we stop applying category defaults
  const warrantyTouched = useRef(false);

  const form = useForm({
    resolver: zodResolver(productFormSchema),
    defaultValues,
  });

  const { data: brands = [] } = useQuery({
    ...posBrandsQueryOptions(),
    refetchOnWindowFocus: false,
  });

  const { data: getCategory } = useFetch("/api/category?deleteType=SD&size=10000");
  const watchedCategoryId = form.watch("category");

  // bumped after a quick-add so the lists reload
  const [subReload, setSubReload] = useState(0);
  const subUrl = useMemo(
    () =>
      watchedCategoryId
        ? `/api/subcategory?category=${watchedCategoryId}&deleteType=SD&r=${subReload}`
        : null,
    [watchedCategoryId, subReload],
  );
  const { data: getSubCategory } = useFetch(subUrl);

  useEffect(() => {
    if (getCategory?.success) {
      setCategoryOption(getCategory.data.map((cat) => ({ label: cat.name, value: cat._id })));
    }
  }, [getCategory]);

  useEffect(() => {
    if (getSubCategory?.success) {
      setSubCategoryOption(getSubCategory.data.map((sub) => ({ label: sub.name, value: sub._id })));
    } else {
      setSubCategoryOption([]);
    }
  }, [getSubCategory]);

  // a new category starts with no sub category
  useEffect(() => {
    form.setValue("subcategory", "");
  }, [watchedCategoryId, form]);

  // phones / watches: default to 1 year official warranty + IMEI tracking
  useEffect(() => {
    if (warrantyTouched.current || !watchedCategoryId) return;
    const name = categoryOption.find((c) => c.value === watchedCategoryId)?.label || "";
    const serial = SERIAL_CATEGORY.test(name);
    form.setValue("trackSerial", serial);
    form.setValue("warrantyType", serial ? "official" : "none");
    form.setValue("warrantyMonths", serial ? 12 : 0);
    if (serial) form.setValue("productType", "variant");
  }, [watchedCategoryId, categoryOption, form]);

  useEffect(() => {
    // only real user edits count ("change"), not our own setValue defaults
    const sub = form.watch((_, { name, type }) => {
      if (type === "change" && ["warrantyType", "warrantyMonths", "trackSerial"].includes(name)) {
        warrantyTouched.current = true;
      }
    });
    return () => sub.unsubscribe();
  }, [form]);

  // Sync Gallery media
  useEffect(() => {
    form.setValue(
      "media",
      selectedMedia.map((m) => m._id),
      { shouldValidate: selectedMedia.length > 0 },
    );
  }, [selectedMedia, form]);

  const watchedName = form.watch("name");
  useEffect(() => {
    if (watchedName) {
      const baseSlug = slugify(watchedName, { lower: true, strict: true });
      const uniqueId = Date.now().toString(36).slice(-4);
      form.setValue("slug", `${baseSlug}-${uniqueId}`, { shouldValidate: true });
    }
  }, [watchedName, form]);

  const watchedMrp = form.watch("mrp");
  const watchedSellingPrice = form.watch("sellingPrice");
  useEffect(() => {
    const mrp = Number(watchedMrp);
    const selling = Number(watchedSellingPrice);
    if (mrp > 0 && selling > 0) {
      const discount = ((mrp - selling) / mrp) * 100;
      form.setValue("discountPercentage", Math.max(0, Math.round(discount)).toString());
    }
  }, [watchedMrp, watchedSellingPrice, form]);

  const productType = form.watch("productType");
  const categoryName = categoryOption.find((c) => c.value === watchedCategoryId)?.label;
  const subCategoryName = subCategoryOption.find((c) => c.value === form.watch("subcategory"))?.label;

  // ---------- quick add ----------
  const addCategory = async (name) => {
    try {
      const { data } = await axios.post("/api/category/create", {
        name,
        slug: slugify(name, { lower: true, strict: true }),
      });
      const created = data?.data;
      if (created?._id) {
        setCategoryOption((list) => [...list, { label: created.name, value: created._id }]);
        form.setValue("category", created._id, { shouldValidate: true });
      }
      showToast("success", `Category "${name}" added`);
      return true;
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Could not add category");
      return false;
    }
  };

  const addSubCategory = async (name) => {
    try {
      const { data } = await axios.post("/api/subcategory/create", {
        categoryId: watchedCategoryId,
        name,
      });
      const created = data?.data;
      if (created?._id) {
        setSubCategoryOption((list) => [...list, { label: created.name, value: created._id }]);
        form.setValue("subcategory", created._id);
      }
      setSubReload((n) => n + 1);
      showToast("success", `Sub category "${name}" added`);
      return true;
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Could not add sub category");
      return false;
    }
  };

  // ---------- steps ----------
  const goNext = async () => {
    const ok = await form.trigger(STEP1_FIELDS);
    if (!ok) {
      showToast("error", "Fill in the required fields first");
      return;
    }
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearAll = () => {
    form.reset(defaultValues);
    setSelectedMedia([]);
    setSimpleItem({ barcode: "", stock: "" });
    setResetKey((p) => p + 1);
    warrantyTouched.current = false;
    setStep(0);
  };

  // a step-1 field failing on save (e.g. edited back) sends the user there
  const onInvalid = (errors) => {
    if (STEP1_FIELDS.some((f) => errors[f])) setStep(0);
    showToast("error", Object.values(errors)[0]?.message || "Check the required fields");
  };

  const onSubmit = async (values) => {
    const cleanText = (values.description || "").replace(/<[^>]*>/g, "").trim();

    if (!cleanText) {
      showToast("error", "Product description cannot be empty!");
      return;
    }

    setLoading(true);

    try {
      const { data: response } = await axios.post("/api/product/create", values);

      const createdProduct = response?.data || response?.product;

      if (!response?.success || !createdProduct?._id) {
        showToast("error", response?.message || "Product created but ID missing");
        return;
      }

      // a simple product sells as one "Default" item: create it right away
      if (values.productType === "simple") {
        await axios.post("/api/product-variant/create", {
          productId: createdProduct._id,
          variants: [
            {
              color: "Default",
              size: "Standard",
              barcode: simpleItem.barcode,
              stock: Number(simpleItem.stock) || 0,
            },
          ],
        });
      }

      queryClient.invalidateQueries({ queryKey: ["product-data"] });
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });

      if (values.productType === "simple") {
        showToast("success", "Product saved and ready to sell.");
        clearAll();
        router.push(ADMIN_PRODUCT_SHOW);
      } else {
        showToast("success", "Product saved. Now add its variants (color / storage).");
        router.push(`/admin/product/edit/${createdProduct._id}`);
      }
    } catch (error) {
      const message = error?.response?.data?.message || "Check required fields or connection";
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  };

  const cardClass = "gap-0 rounded-xl py-0 shadow-sm";
  const headClass = "border-b py-3";
  const titleClass = "flex items-center gap-2 text-sm font-semibold";

  return (
    <div className="pb-20 lg:pb-10">
      <div className="mx-auto max-w-[1200px] space-y-6 py-2">
        <div className="space-y-1">
          <BreadCrumb breadcrumbData={breadcrumbData} />
          <h1 className="text-2xl font-bold">Create Product</h1>
        </div>

        {/* Stepper */}
        <ol className="flex items-center gap-3">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => (i === 0 ? setStep(0) : goNext())}
                className="flex items-center gap-2"
              >
                <span
                  className={`flex size-7 items-center justify-center rounded-full text-xs font-bold ${
                    step > i
                      ? "bg-emerald-500 text-white"
                      : step === i
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step > i ? <Check className="size-4" /> : i + 1}
                </span>
                <span className={`text-sm ${step === i ? "font-semibold" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </button>
              {i < STEPS.length - 1 && <span className="h-px w-10 bg-border sm:w-20" />}
            </li>
          ))}
        </ol>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
            {/* ======================= STEP 1 ======================= */}
            {step === 0 && (
              <Card className={cardClass}>
                <CardHeader className={headClass}>
                  <CardTitle className={titleClass}>
                    <Tag className="size-4 text-primary" /> Basic Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-x-5 gap-y-5 p-6 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Product Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Samsung Galaxy A55 5G" className="h-10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="productType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Type *</FormLabel>
                        <select className={selectClass} {...field}>
                          {Object.entries(PRODUCT_TYPES).map(([key, t]) => (
                            <option key={key} value={key}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-muted-foreground">
                          {PRODUCT_TYPES[field.value]?.hint}
                        </p>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <SelectWithAdd
                          options={categoryOption}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Choose Category"
                          addLabel="New category name"
                          onAdd={addCategory}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subcategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sub Category</FormLabel>
                        <SelectWithAdd
                          options={subCategoryOption}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={watchedCategoryId ? "Choose Sub Category" : "Choose a category first"}
                          addLabel="New sub category name"
                          onAdd={addSubCategory}
                          disabled={!watchedCategoryId}
                        />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand</FormLabel>
                        <Input
                          list="brand-options"
                          placeholder="Choose or type a new brand"
                          className="h-10"
                          {...field}
                        />
                        <datalist id="brand-options">
                          {brands.map((b) => (
                            <option key={b} value={b} />
                          ))}
                        </datalist>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit *</FormLabel>
                        <Input list="unit-options" placeholder="Pcs" className="h-10" {...field} />
                        <datalist id="unit-options">
                          {PRODUCT_UNITS.map((u) => (
                            <option key={u} value={u} />
                          ))}
                        </datalist>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <div className="flex justify-end gap-2 border-t px-6 py-4">
                  <Button type="button" variant="outline" onClick={clearAll}>
                    Clear
                  </Button>
                  <Button type="button" onClick={goNext}>
                    Next <ArrowRight className="size-4" />
                  </Button>
                </div>
              </Card>
            )}

            {/* ======================= STEP 2 ======================= */}
            {step === 1 && (
              <>
                {/* summary of step 1 */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border bg-card px-4 py-3 text-sm">
                  <span className="font-semibold">{watchedName}</span>
                  <span className="text-muted-foreground">
                    {categoryName}
                    {subCategoryName && <> / {subCategoryName}</>}
                  </span>
                  {form.watch("brand") && <span className="text-muted-foreground">{form.watch("brand")}</span>}
                  <span className="text-muted-foreground">
                    {PRODUCT_TYPES[productType]?.label} · {form.watch("unit")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="ml-auto text-xs font-medium text-primary hover:underline"
                  >
                    Edit
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                  {/* LEFT COLUMN */}
                  <div className="space-y-6 lg:col-span-8">
                    <Card className={cardClass}>
                      <CardHeader className={headClass}>
                        <CardTitle className={titleClass}>
                          <ImageIcon className="size-4 text-primary" /> Photos *
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <UploadMedia
                          isMultiple={true}
                          selectedMedia={selectedMedia}
                          setSelectedMedia={setSelectedMedia}
                        />
                        <FormField
                          control={form.control}
                          name="media"
                          render={() => (
                            <FormItem>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>

                    <Card className={cardClass}>
                      <CardHeader className={headClass}>
                        <CardTitle className={titleClass}>
                          <FileText className="size-4 text-primary" /> Description
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 p-6">
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description / Specifications *</FormLabel>
                              <FormControl>
                                <div className="overflow-hidden rounded-lg border bg-white text-black">
                                  <Editor
                                    key={resetKey}
                                    initialData={field.value}
                                    onChange={(event, editor) => field.onChange(editor.getData())}
                                  />
                                </div>
                              </FormControl>
                              <p className="text-xs text-muted-foreground">
                                Tip: display, chipset, RAM/ROM, camera, battery, what&apos;s in the box.
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="slug"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Slug (website link)</FormLabel>
                              <Input className="h-9 font-mono text-xs" {...field} />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>

                    {productType === "simple" && (
                      <Card className={cardClass}>
                        <CardHeader className={headClass}>
                          <CardTitle className={titleClass}>
                            <ScanBarcode className="size-4 text-primary" /> Barcode &amp; Opening Stock
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
                          <label className="space-y-2 text-sm font-medium">
                            <span>Barcode</span>
                            <Input
                              value={simpleItem.barcode}
                              onChange={(e) => setSimpleItem((s) => ({ ...s, barcode: e.target.value }))}
                              placeholder="Scan or leave empty to auto-generate"
                            />
                          </label>
                          <label className="space-y-2 text-sm font-medium">
                            <span>Opening Stock (warehouse)</span>
                            <Input
                              type="number"
                              min="0"
                              value={simpleItem.stock}
                              onChange={(e) => setSimpleItem((s) => ({ ...s, stock: e.target.value }))}
                              placeholder="0"
                            />
                          </label>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* RIGHT COLUMN */}
                  <div className="space-y-6 lg:col-span-4">
                    <Card className={cardClass}>
                      <CardHeader className={headClass}>
                        <CardTitle className={titleClass}>
                          <Tag className="size-4 text-primary" /> Price
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 p-5">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="mrp"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>MRP (৳) *</FormLabel>
                                <Input type="number" {...field} />
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="sellingPrice"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sale Price (৳) *</FormLabel>
                                <Input type="number" className="font-semibold text-primary" {...field} />
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="rounded-lg bg-primary/10 p-2.5 text-center text-sm font-semibold text-primary">
                          Discount: {form.watch("discountPercentage") || 0}% off
                        </div>
                      </CardContent>
                    </Card>

                    <PriceListCard form={form} />

                    <ProductStockCard form={form} />

                    <MobileSpecsCard form={form} hideBrand />
                  </div>
                </div>

                <div className="sticky bottom-0 z-10 flex justify-between gap-2 rounded-xl border bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
                  <Button type="button" variant="outline" onClick={() => setStep(0)}>
                    <ArrowLeft className="size-4" /> Back
                  </Button>
                  <ButtonLoading
                    type="submit"
                    loading={loading}
                    text={productType === "simple" ? "Save Product" : "Save & Add Variants"}
                    className="rounded-lg px-8 shadow-md shadow-primary/30"
                  />
                </div>
              </>
            )}
          </form>
        </Form>
      </div>
    </div>
  );
};

export default AddProduct;
