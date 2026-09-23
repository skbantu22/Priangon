"use client";

import React, { use, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import slugify from "slugify";
import Image from "next/image";
import { ImageIcon, Tag, FileText } from "lucide-react";

// UI Components
import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import {
  Form,
  FormField,
  FormLabel,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ButtonLoading from "@/components/ui/Application/ButtonLoading";
import Select from "@/components/ui/Select";
import Editor from "@/components/ui/Application/Admin/Editor";
import MediaModal from "@/components/ui/Application/Admin/MediaModel";

// Utilities & Config
import { ADMIN_DASHBOARD, ADMIN_PRODUCT_SHOW } from "@/Route/Adminpannelroute";
import { zSchema } from "@/lib/zodschema";
import {
  mobileFieldsFromProduct,
  productFormSchema,
} from "@/lib/productFormSchema";
import { showToast } from "@/lib/showToast";
import useFetch from "@/hooks/useFetch";
import VariantManager from "@/components/ui/Application/Admin/products/modals/VariantManager";
import UploadMedia from "@/components/ui/Application/Admin/uploadmedia";
import MobileSpecsCard from "@/components/ui/Application/Admin/products/MobileSpecsCard";
import PriceListCard from "@/components/ui/Application/Admin/products/PriceListCard";
import { tierPricesFromProduct } from "@/lib/priceTiers";
import { extraFieldsFromProduct } from "@/lib/productExtraFields";
import ProductStockCard from "@/components/ui/Application/Admin/products/ProductStockCard";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_PRODUCT_SHOW, label: "Products" },
  { href: "#", label: "Edit Product" },
];

const EditProduct = ({ params }) => {
  const { id } = use(params);

  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [categoryOption, setCategoryOption] = useState([]);
  const [subCategoryOption, setSubCategoryOption] = useState([]);

  const prevCategoryRef = useRef("");
  const productSubRef = useRef("");

  const formSchema = productFormSchema.extend(zSchema.pick({ _id: true }).shape);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      _id: id || "",
      name: "",
      slug: "",
      category: "",
      subcategory: "",
      mrp: "",
      sellingPrice: "",
      discountPercentage: "",
      description: "",
      media: [],
      freeDelivery: false,
      ...mobileFieldsFromProduct(null),
      ...tierPricesFromProduct(null),
      ...extraFieldsFromProduct(null),
    },
  });

  const { data: getCategory } = useFetch(
    "/api/category?deleteType=SD&size=10000",
  );
  const { data: getProduct, loading: getProductLoading } = useFetch(
    `/api/product/get/${id}`,
  );

  const watchedCategoryId = form.watch("category");
  const watchedName = form.watch("name");
  const watchedMrp = form.watch("mrp");
  const watchedSellingPrice = form.watch("sellingPrice");

  const subUrl = useMemo(() => {
    if (!watchedCategoryId) return null;
    return `/api/subcategory?category=${watchedCategoryId}&deleteType=SD&size=1000`;
  }, [watchedCategoryId]);

  const { data: getSubCategory } = useFetch(subUrl);

  useEffect(() => {
    if (getCategory?.success) {
      setCategoryOption(
        getCategory.data.map((cat) => ({ label: cat.name, value: cat._id })),
      );
    }
  }, [getCategory]);

  useEffect(() => {
    if (getProduct?.success) {
      const product = getProduct.data;
      const categoryId =
        typeof product?.category === "object"
          ? product?.category?._id
          : product?.category;
      const subcategoryId =
        typeof product?.subcategory === "object"
          ? product?.subcategory?._id
          : product?.subcategory;

      productSubRef.current = subcategoryId;
      prevCategoryRef.current = categoryId;

      form.reset({
        _id: product?._id || id,
        name: product?.name || "",
        slug: product?.slug || "",
        category: categoryId || "",
        subcategory: subcategoryId || "",
        mrp: product?.mrp || "",
        sellingPrice: product?.sellingPrice || "",
        discountPercentage: product?.discountPercentage || "",
        description: product?.description || "",
        media: (product?.media || []).map((m) => m._id || m),
        freeDelivery: !!product?.freeDelivery,
        ...mobileFieldsFromProduct(product),
        ...tierPricesFromProduct(product),
        ...extraFieldsFromProduct(product),
      });

      if (product?.media?.length) {
        setSelectedMedia(
          product.media.map((m) => ({
            _id: m._id,
            url: m.secure_url || m.url,
            secure_url: m.secure_url,
          })),
        );
      }
    }
  }, [getProduct, form, id]);

  useEffect(() => {
    if (getSubCategory?.success) {
      const opts = getSubCategory.data.map((sub) => ({
        label: sub.name,
        value: sub._id,
      }));
      setSubCategoryOption(opts);

      const current = form.getValues("subcategory");
      if (!current && productSubRef.current) {
        if (opts.some((o) => o.value === productSubRef.current)) {
          form.setValue("subcategory", productSubRef.current);
        }
      }
    }

    if (
      prevCategoryRef.current &&
      prevCategoryRef.current !== watchedCategoryId
    ) {
      form.setValue("subcategory", "");
    }
    prevCategoryRef.current = watchedCategoryId || "";
  }, [getSubCategory, watchedCategoryId, form]);

  useEffect(() => {
    const mrp = Number(watchedMrp) || 0;
    const selling = Number(watchedSellingPrice) || 0;
    if (mrp > 0 && selling > 0) {
      const discount = ((mrp - selling) / mrp) * 100;
      form.setValue(
        "discountPercentage",
        Math.max(0, Math.round(discount)).toString(),
      );
    }
  }, [watchedMrp, watchedSellingPrice, form]);

  useEffect(() => {
    form.setValue(
      "media",
      selectedMedia.map((m) => m._id),
      { shouldValidate: true },
    );
  }, [selectedMedia, form]);

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      const { data: response } = await axios.put("/api/product/update", values);
      if (response?.success) {
        showToast("success", "Product updated!");
      }
    } catch (error) {
      showToast("error", error.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-20 lg:pb-10">
      <div className="mx-auto max-w-300 space-y-6 py-2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <BreadCrumb breadcrumbData={breadcrumbData} />
                <h1 className="text-2xl font-bold">
                  Edit Product
                </h1>
              </div>
              <ButtonLoading
                type="submit"
                loading={loading}
                text="Update Product"
                className="h-11 rounded-lg px-8 shadow-md shadow-primary/30"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN */}
              <div className="lg:col-span-8 space-y-6">
                <Card className="gap-0 rounded-xl py-0 shadow-sm">
                  <CardHeader className="border-b py-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <FileText className="size-4 text-primary" /> Product Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Product Name
                          </FormLabel>
                          <FormControl>
                            <Input
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
                          <FormLabel>
                            Description *
                          </FormLabel>
                          <FormControl>
                            <div className="min-h-75 overflow-hidden rounded-lg border bg-white text-black">
                              {!getProductLoading && getProduct?.success && (
                                <Editor
                                  initialData={field.value}
                                  onChange={(event, editor) =>
                                    field.onChange(editor.getData())
                                  }
                                />
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Media Gallery */}
                <Card className="gap-0 rounded-xl py-0 shadow-sm">
                  <CardHeader className="border-b py-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <ImageIcon className="size-4 text-primary" /> Photos
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-6">
                    <UploadMedia
                      isMultiple={true}
                      selectedMedia={selectedMedia}
                      setSelectedMedia={setSelectedMedia}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* RIGHT COLUMN */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="gap-0 rounded-xl py-0 shadow-sm">
                  <CardHeader className="border-b py-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <Tag className="size-4 text-primary" /> Price &amp; Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="mrp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              MRP (৳)
                            </FormLabel>
                            <Input
                              
                              type="number"
                              {...field}
                            />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="sellingPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Sale Price (৳)
                            </FormLabel>
                            <Input
                              className="font-semibold text-primary"
                              type="number"
                              {...field}
                            />
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
                          <FormLabel>
                            Category
                          </FormLabel>
                          <Select
                            options={categoryOption}
                            selected={field.value}
                            setSelected={(val) =>
                              field.onChange(
                                typeof val === "string" ? val : val?.value,
                              )
                            }
                          />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subcategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Sub-Category
                          </FormLabel>
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

                <ProductStockCard form={form} showUnit />

                <MobileSpecsCard form={form} />
              </div>
            </div>
          </form>
        </Form>
      </div>

      <MediaModal
        open={open}
        setOpen={setOpen}
        selectedMedia={selectedMedia}
        setSelectedMedia={setSelectedMedia}
        isMultiple={true}
      />

      <VariantManager
        productId={id}
        productMrp={watchedMrp}
        productSellingPrice={watchedSellingPrice}
      />
    </div>
  );
};

export default EditProduct;
