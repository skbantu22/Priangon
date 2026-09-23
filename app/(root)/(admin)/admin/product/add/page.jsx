"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import slugify from "slugify";
import { useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Tag, FileText } from "lucide-react";

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
import ButtonLoading from "@/components/ui/Application/ButtonLoading";
import Select from "@/components/ui/Select";
import Editor from "@/components/ui/Application/Admin/Editor";
import UploadMedia from "@/components/ui/Application/Admin/uploadmedia";
import MobileSpecsCard from "@/components/ui/Application/Admin/products/MobileSpecsCard";
import PriceListCard from "@/components/ui/Application/Admin/products/PriceListCard";
import { tierPricesFromProduct } from "@/lib/priceTiers";

// Utilities & Config
import { ADMIN_DASHBOARD, ADMIN_PRODUCT_SHOW } from "@/Route/Adminpannelroute";
import { productFormSchema } from "@/lib/productFormSchema";
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

const AddProduct = () => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [categoryOption, setCategoryOption] = useState([]);
  const [subCategoryOption, setSubCategoryOption] = useState([]);
  const [resetKey, setResetKey] = useState(0);
  // once the user touches the warranty card we stop applying category defaults
  const warrantyTouched = useRef(false);

  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
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
    },
  });

  const { data: getCategory } = useFetch(
    "/api/category?deleteType=SD&size=10000",
  );
  const watchedCategoryId = form.watch("category");

  const subUrl = useMemo(
    () =>
      watchedCategoryId
        ? `/api/subcategory?category=${watchedCategoryId}&deleteType=SD`
        : null,
    [watchedCategoryId],
  );
  const { data: getSubCategory } = useFetch(subUrl);

  useEffect(() => {
    if (getCategory?.success) {
      setCategoryOption(
        getCategory.data.map((cat) => ({ label: cat.name, value: cat._id })),
      );
    }
  }, [getCategory]);

  useEffect(() => {
    if (getSubCategory?.success) {
      setSubCategoryOption(
        getSubCategory.data.map((sub) => ({ label: sub.name, value: sub._id })),
      );
    } else {
      setSubCategoryOption([]);
    }
  }, [getSubCategory]);

  // phones / watches: default to 1 year official warranty + IMEI tracking
  useEffect(() => {
    if (warrantyTouched.current || !watchedCategoryId) return;
    const name =
      categoryOption.find((c) => c.value === watchedCategoryId)?.label || "";
    const serial = SERIAL_CATEGORY.test(name);
    form.setValue("trackSerial", serial);
    form.setValue("warrantyType", serial ? "official" : "none");
    form.setValue("warrantyMonths", serial ? 12 : 0);
  }, [watchedCategoryId, categoryOption, form]);

  useEffect(() => {
    // only real user edits count ("change"), not our own setValue defaults
    const sub = form.watch((_, { name, type }) => {
      if (
        type === "change" &&
        ["warrantyType", "warrantyMonths", "trackSerial"].includes(name)
      ) {
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
      form.setValue("slug", `${baseSlug}-${uniqueId}`, {
        shouldValidate: true,
      });
    }
  }, [watchedName, form]);

  const watchedMrp = form.watch("mrp");
  const watchedSellingPrice = form.watch("sellingPrice");
  useEffect(() => {
    const mrp = Number(watchedMrp);
    const selling = Number(watchedSellingPrice);
    if (mrp > 0 && selling > 0) {
      const discount = ((mrp - selling) / mrp) * 100;
      form.setValue(
        "discountPercentage",
        Math.max(0, Math.round(discount)).toString(),
      );
    }
  }, [watchedMrp, watchedSellingPrice, form]);

  const onSubmit = async (values) => {
    const cleanText = (values.description || "").replace(/<[^>]*>/g, "").trim();

    if (!cleanText) {
      showToast("error", "Product description cannot be empty!");
      return;
    }

    setLoading(true);

    try {
      const { data: response } = await axios.post(
        "/api/product/create",
        values,
      );

      if (response?.success) {
        showToast("success", "Product saved. Now add its variants (color / storage).");

        form.reset();
        setSelectedMedia([]);
        setResetKey((p) => p + 1);
        warrantyTouched.current = false;

        const createdProduct = response.data || response.product;

        if (!createdProduct?._id) {
          showToast("error", "Product created but ID missing");
          return;
        }

        router.push(`/admin/product/edit/${createdProduct._id}`);
      }
    } catch (error) {
      const message =
        error?.response?.data?.message || "Check required fields or connection";

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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="space-y-1">
                <BreadCrumb breadcrumbData={breadcrumbData} />
                <h1 className="text-2xl font-bold">New Product</h1>
                <p className="text-sm text-muted-foreground">
                  Save the product first, then add its colors / storage variants and stock.
                </p>
              </div>
              <ButtonLoading
                type="submit"
                loading={loading}
                text="Save Product"
                className="h-11 rounded-lg px-8 shadow-md shadow-primary/30"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* LEFT COLUMN */}
              <div className="space-y-6 lg:col-span-8">
                <Card className={cardClass}>
                  <CardHeader className={headClass}>
                    <CardTitle className={titleClass}>
                      <FileText className="size-4 text-primary" /> Product Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 p-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: Samsung Galaxy A55 5G"
                              className="h-11"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                                onChange={(event, editor) =>
                                  field.onChange(editor.getData())
                                }
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
                  </CardContent>
                </Card>

                <Card className={cardClass}>
                  <CardHeader className={headClass}>
                    <CardTitle className={titleClass}>
                      <ImageIcon className="size-4 text-primary" /> Photos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <UploadMedia
                      isMultiple={true}
                      queryClient={queryClient}
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
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-6 lg:col-span-4">
                <Card className={cardClass}>
                  <CardHeader className={headClass}>
                    <CardTitle className={titleClass}>
                      <Tag className="size-4 text-primary" /> Price &amp; Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5 p-5">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="mrp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>MRP (৳)</FormLabel>
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
                            <FormLabel>Sale Price (৳)</FormLabel>
                            <Input
                              type="number"
                              className="font-semibold text-primary"
                              {...field}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="rounded-lg bg-primary/10 p-2.5 text-center text-sm font-semibold text-primary">
                      Discount: {form.watch("discountPercentage") || 0}% off
                    </div>
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <Select
                            options={categoryOption}
                            selected={field.value}
                            setSelected={(val) =>
                              field.onChange(
                                typeof val === "string" ? val : val?.value,
                              )
                            }
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
                          <FormLabel>Sub-Category</FormLabel>
                          <Select
                            options={subCategoryOption}
                            selected={field.value}
                            setSelected={(val) =>
                              field.onChange(
                                typeof val === "string" ? val : val?.value,
                              )
                            }
                            disabled={!watchedCategoryId}
                          />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <PriceListCard form={form} />

                <MobileSpecsCard form={form} />
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default AddProduct;
