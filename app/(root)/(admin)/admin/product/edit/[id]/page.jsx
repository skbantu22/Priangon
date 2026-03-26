"use client";

import React, { use, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import slugify from "slugify";
import Image from "next/image";
import { X, ImageIcon, LayoutGrid } from "lucide-react";

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
import { ADMIN_CATEGORY_SHOW, ADMIN_DASHBOARD } from "@/Route/Adminpannelroute";
import { zSchema } from "@/lib/zodschema";
import { showToast } from "@/lib/showToast";
import useFetch from "@/hooks/useFetch";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_CATEGORY_SHOW, label: "Products" },
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

  const formSchema = zSchema.pick({
    _id: true,
    name: true,
    slug: true,
    category: true,
    subcategory: true,
    mrp: true,
    sellingPrice: true,
    discountPercentage: true,
    description: true,
    media: true,
    freeDelivery: true,
  });

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
      });

      if (product?.media?.length) {
        setSelectedMedia(
          product.media.map((m) => ({ _id: m._id, url: m.secure_url })),
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
        showToast("success", "Listing Updated!");
      }
    } catch (error) {
      showToast("error", error.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f1f1f1] min-h-screen pb-20 lg:pb-10 font-sans">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-4 space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <BreadCrumb breadcrumbData={breadcrumbData} />
                <h1 className="text-2xl font-black text-black tracking-tight uppercase">
                  Edit Product
                </h1>
              </div>
              <ButtonLoading
                type="submit"
                loading={loading}
                text="UPDATE PRODUCT"
                className="bg-black hover:bg-zinc-800 text-white font-black px-10 rounded-none h-12 shadow-xl tracking-widest"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN */}
              <div className="lg:col-span-8 space-y-6">
                <Card className="border-2 border-black rounded-none shadow-none bg-white">
                  <CardHeader className="bg-black py-3 rounded-none">
                    <CardTitle className="text-xs font-bold text-white uppercase tracking-[0.2em]">
                      Core Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase">
                            Product Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              className="h-11 border-black rounded-none"
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
                          <FormLabel className="text-[10px] font-black uppercase">
                            Description *
                          </FormLabel>
                          <FormControl>
                            <div className="border-2 border-black overflow-hidden bg-white min-h-[300px]">
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
                <Card className="border-2 border-black rounded-none shadow-none bg-white">
                  <CardHeader className="bg-black py-3 rounded-none">
                    <CardTitle className="text-xs font-bold text-white uppercase flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" /> Gallery
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {selectedMedia.map((m) => (
                        <div
                          key={m._id}
                          className="relative aspect-[3/4] border-2 border-black"
                        >
                          <Image
                            src={m.url}
                            fill
                            alt="Gallery"
                            className="object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedMedia((p) =>
                                p.filter((x) => x._id !== m._id),
                              )
                            }
                            className="absolute top-1 right-1 bg-black text-white p-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="aspect-[3/4] border-2 border-dashed border-black flex flex-col items-center justify-center gap-2 hover:bg-zinc-50"
                      >
                        <LayoutGrid className="w-6 h-6" />
                        <span className="text-[10px] font-black uppercase">
                          + EDIT
                        </span>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* RIGHT COLUMN */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="border-2 border-black rounded-none shadow-none bg-white">
                  <CardHeader className="bg-black py-3 rounded-none">
                    <CardTitle className="text-xs font-bold text-white uppercase">
                      Pricing & Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="mrp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase">
                              MRP
                            </FormLabel>
                            <Input
                              className="h-10 border-black rounded-none"
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
                            <FormLabel className="text-[10px] font-black uppercase">
                              Sale Price
                            </FormLabel>
                            <Input
                              className="h-10 border-black rounded-none font-bold text-blue-600"
                              type="number"
                              {...field}
                            />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="bg-zinc-100 border-2 border-black p-3 text-center uppercase font-black text-xs italic">
                      Discount: {form.watch("discountPercentage") || 0}% OFF
                    </div>

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase">
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
                          <FormLabel className="text-[10px] font-black uppercase">
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
    </div>
  );
};

export default EditProduct;
