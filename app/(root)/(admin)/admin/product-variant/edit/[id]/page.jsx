"use client";

import React, { use, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import Image from "next/image";
import { X, ImageIcon, LayoutGrid, Layers, Tag } from "lucide-react";

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

import {
  ADMIN_CATEGORY_EDIT,
  ADMIN_CATEGORY_SHOW,
  ADMIN_DASHBOARD,
} from "@/Route/Adminpannelroute";

import { zSchema } from "@/lib/zodschema";
import { showToast } from "@/lib/showToast";
import useFetch from "@/hooks/useFetch";
import { sizes } from "@/lib/utils";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_CATEGORY_SHOW, label: "Products" },
  { href: "#", label: "Edit Variant" },
];

const EditProductVarient = ({ params }) => {
  const { id } = use(params);

  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [productOption, setProductOption] = useState([]);

  const formSchema = zSchema.pick({
    _id: true,
    product: true,
    mrp: true,
    sellingPrice: true,
    discountPercentage: true,
    description: true,
    media: true,
    sku: true,
    color: true,
    size: true,
    stock: true,
    isActive: true,
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      _id: id || "",
      product: "",
      mrp: 0,
      sellingPrice: 0,
      discountPercentage: 0,
      description: "",
      media: [],
      sku: "",
      color: "",
      size: "",
      stock: 0,
      isActive: true,
    },
  });

  const { data: getProduct, loading: getProductLoading } = useFetch(
    `/api/product-variant/get/${id}`,
  );

  const watchedMrp = form.watch("mrp");
  const watchedSellingPrice = form.watch("sellingPrice");

  // Load Variant Data
  useEffect(() => {
    if (getProduct?.success) {
      const product = getProduct.data;

      form.reset({
        _id: product._id || id,
        product: product.product?._id || product.product || "",
        mrp: product.mrp || 0,
        sellingPrice: product.sellingPrice || 0,
        discountPercentage: product.discountPercentage || 0,
        description: product.description || "",
        media: product.media?.map((m) => m._id) || [],
        sku: product.sku || "",
        color: product.color || "",
        size: product.size || "",
        stock: product.stock || 0,
        isActive: !!product.isActive,
      });

      if (product?.media?.length) {
        setSelectedMedia(
          product.media.map((m) => ({
            _id: m._id,
            url: m.secure_url,
          })),
        );
      }

      const productData = product.product || product;
      setProductOption([{ label: productData.name, value: productData._id }]);
    }
  }, [getProduct, form, id]);

  // Auto Discount Calculation
  useEffect(() => {
    const mrp = Number(watchedMrp) || 0;
    const selling = Number(watchedSellingPrice) || 0;

    if (mrp > 0 && selling > 0) {
      const discount = ((mrp - selling) / mrp) * 100;
      form.setValue("discountPercentage", Number(discount.toFixed(0)));
    }
  }, [watchedMrp, watchedSellingPrice, form]);

  // Sync Media IDs
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
      const { data } = await axios.put("/api/product-variant/update", values);
      if (data?.success) {
        showToast("success", "Variant Updated Successfully");
      } else {
        throw new Error(data?.message);
      }
    } catch (error) {
      showToast("error", error?.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f1f1f1] min-h-screen pb-20 font-sans">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-4 space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <BreadCrumb breadcrumbData={breadcrumbData} />
                <h1 className="text-2xl font-black text-black tracking-tight uppercase">
                  Edit Variant{" "}
                  <span className="text-zinc-400">#{id?.slice(-6)}</span>
                </h1>
              </div>
              <ButtonLoading
                type="submit"
                loading={loading}
                text="UPDATE CHANGES"
                className="bg-black hover:bg-zinc-800 text-white font-black px-10 rounded-none h-12 shadow-xl tracking-widest uppercase text-xs"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN: 8 Columns */}
              <div className="lg:col-span-8 space-y-6">
                {/* Main Information Card */}
                <Card className="border-2 border-black rounded-none shadow-none bg-white">
                  <CardHeader className="bg-black py-3 rounded-none">
                    <CardTitle className="text-xs font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2">
                      <Layers className="w-4 h-4" /> Core Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <FormField
                      control={form.control}
                      name="product"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase">
                            Parent Product
                          </FormLabel>
                          <Select
                            options={productOption}
                            selected={field.value}
                            setSelected={field.onChange}
                            isMulti={false}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="sku"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase">
                              SKU Code
                            </FormLabel>
                            <Input
                              {...field}
                              className="h-11 border-black rounded-none focus-visible:ring-0"
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="stock"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase">
                              Current Stock
                            </FormLabel>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                              className="h-11 border-black rounded-none focus-visible:ring-0"
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <FormLabel className="text-[10px] font-black uppercase">
                        Detailed Description
                      </FormLabel>
                      <div className="border-2 border-black overflow-hidden">
                        {!getProductLoading && getProduct?.success && (
                          <Editor
                            initialData={form.getValues("description")}
                            onChange={(event, editorInstance) => {
                              form.setValue(
                                "description",
                                editorInstance.getData(),
                                { shouldValidate: true },
                              );
                            }}
                          />
                        )}
                      </div>
                      <FormMessage>
                        {form.formState.errors.description?.message}
                      </FormMessage>
                    </div>
                  </CardContent>
                </Card>

                {/* Media Management Card */}
                <Card className="border-2 border-black rounded-none shadow-none bg-white">
                  <CardHeader className="bg-black py-3 rounded-none">
                    <CardTitle className="text-xs font-bold text-white uppercase flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" /> Media Gallery
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {selectedMedia.map((m) => (
                        <div
                          key={m._id}
                          className="relative aspect-[3/4] border-2 border-black group overflow-hidden"
                        >
                          <Image
                            src={m.url}
                            fill
                            alt="preview"
                            className="object-cover transition-transform group-hover:scale-105"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedMedia((prev) =>
                                prev.filter((x) => x._id !== m._id),
                              )
                            }
                            className="absolute top-1 right-1 bg-black text-white p-1 hover:bg-red-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="aspect-[3/4] border-2 border-dashed border-black flex flex-col items-center justify-center gap-2 hover:bg-zinc-50 transition-colors"
                      >
                        <LayoutGrid className="w-6 h-6" />
                        <span className="text-[10px] font-black uppercase">
                          + ADD MEDIA
                        </span>
                      </button>
                    </div>
                    {form.formState.errors.media && (
                      <p className="text-red-600 text-[10px] font-bold mt-2 uppercase">
                        {form.formState.errors.media.message}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* RIGHT COLUMN: 4 Columns */}
              <div className="lg:col-span-4 space-y-6">
                {/* Variant Attributes */}
                <Card className="border-2 border-black rounded-none shadow-none bg-white">
                  <CardHeader className="bg-black py-3 rounded-none">
                    <CardTitle className="text-xs font-bold text-white uppercase tracking-widest">
                      Attributes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-5">
                    <FormField
                      control={form.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase">
                            Color
                          </FormLabel>
                          <Input
                            {...field}
                            className="h-10 border-black rounded-none focus-visible:ring-0"
                          />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="size"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase">
                            Size
                          </FormLabel>
                          <Select
                            options={sizes}
                            selected={field.value}
                            setSelected={field.onChange}
                            isMulti={false}
                          />
                        </FormItem>
                      )}
                    />

                    <div className="pt-2">
                      <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={(e) => field.onChange(e.target.checked)}
                              className="w-5 h-5 accent-black border-2 border-black rounded-none"
                            />
                            <span className="text-xs font-black uppercase group-hover:underline italic">
                              Variant Visibility
                            </span>
                          </label>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Pricing Structure */}
                <Card className="border-2 border-black rounded-none shadow-none bg-white">
                  <CardHeader className="bg-black py-3 rounded-none">
                    <CardTitle className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <Tag className="w-3 h-3" /> Pricing
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-5">
                    <FormField
                      control={form.control}
                      name="mrp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase">
                            MRP (Base Price)
                          </FormLabel>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                            className="h-10 border-black rounded-none focus-visible:ring-0"
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
                            Selling Price
                          </FormLabel>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                            className="h-10 border-black rounded-none focus-visible:ring-0 font-bold text-blue-600"
                          />
                        </FormItem>
                      )}
                    />

                    <div className="bg-zinc-100 border-2 border-black p-4 text-center">
                      <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">
                        Calculated Discount
                      </p>
                      <p className="text-2xl font-black uppercase italic tracking-tighter">
                        {form.watch("discountPercentage")}% OFF
                      </p>
                    </div>
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

export default EditProductVarient;
