"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, ImageIcon, LayoutGrid, Layers } from "lucide-react";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { ADMIN_CATEGORY_SHOW, ADMIN_DASHBOARD } from "@/Route/Adminpannelroute";

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
import MediaModal from "@/components/ui/Application/Admin/MediaModel";

import { zSchema } from "@/lib/zodschema";
import { showToast } from "@/lib/showToast";
import useFetch from "@/hooks/useFetch";
import { sizes } from "@/lib/utils";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_CATEGORY_SHOW, label: "Products" },
  { href: "#", label: "Add Variant" },
];

const AddProductVariant = () => {
  const [loading, setLoading] = useState(false);
  const [productOption, setProductOption] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);

  const { data: getProduct } = useFetch(
    "/api/product?deleteType=SD&&size=10000",
  );

  const formSchema = zSchema.pick({
    product: true,
    sku: true,
    color: true,
    size: true,
    mrp: true,
    sellingPrice: true,
    stock: true,
    description: true,
    media: true,
    isActive: true,
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product: "",
      sku: "",
      color: "",
      size: "",
      mrp: 0,
      sellingPrice: 0,
      stock: 0,
      isActive: true,
      description: "",
      media: [],
    },
  });

  useEffect(() => {
    const mediaIds = selectedMedia.map((m) => m._id);
    form.setValue("media", mediaIds, { shouldValidate: true });
  }, [selectedMedia, form]);

  useEffect(() => {
    if (getProduct?.success) {
      setProductOption(
        getProduct.data.map((p) => ({ label: p.name, value: p._id })),
      );
    }
  }, [getProduct]);

  const mrp = Number(form.watch("mrp")) || 0;
  const selling = Number(form.watch("sellingPrice")) || 0;

  const discountPreview = useMemo(() => {
    if (mrp > 0 && selling >= 0) {
      const pct = ((mrp - selling) / mrp) * 100;
      return Math.max(0, Math.min(100, Math.round(pct)));
    }
    return 0;
  }, [mrp, selling]);

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        mrp: Number(values.mrp),
        sellingPrice: Number(values.sellingPrice),
        stock: Number(values.stock),
      };
      const { data } = await axios.post("/api/product-variant/create", payload);
      if (!data.success) throw new Error(data.message);
      showToast("success", "Variant Added!");
      form.reset();
      setSelectedMedia([]);
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message);
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
                  Add Product Variant
                </h1>
              </div>
              <ButtonLoading
                type="submit"
                loading={loading}
                text="SAVE VARIANT"
                className="bg-black hover:bg-zinc-800 text-white font-black px-10 rounded-none h-12 shadow-xl tracking-widest uppercase text-xs"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN: Main Info */}
              <div className="lg:col-span-8 space-y-6">
                <Card className="border-2 border-black rounded-none shadow-none bg-white">
                  <CardHeader className="bg-black py-3 rounded-none">
                    <CardTitle className="text-xs font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2">
                      <Layers className="w-4 h-4" /> Variant Configuration
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
                              className="h-11 border-black rounded-none"
                              {...field}
                              placeholder="EX: TSHIRT-RED-L"
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
                              Inventory Stock
                            </FormLabel>
                            <Input
                              type="number"
                              className="h-11 border-black rounded-none"
                              {...field}
                            />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase">
                            Variant Description
                          </FormLabel>
                          <div className="border-2 border-black overflow-hidden bg-white">
                            <Editor
                              onChange={(e, ed) => field.onChange(ed.getData())}
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Media Section */}
                <Card className="border-2 border-black rounded-none shadow-none bg-white">
                  <CardHeader className="bg-black py-3 rounded-none">
                    <CardTitle className="text-xs font-bold text-white uppercase flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" /> Variant Images
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
                            src={m.secure_url || m.url}
                            fill
                            alt="preview"
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

              {/* RIGHT COLUMN: Attributes & Pricing */}
              <div className="lg:col-span-4 space-y-6">
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
                            className="h-10 border-black rounded-none"
                            {...field}
                            placeholder="Red, Blue, etc."
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
                            <span className="text-xs font-black uppercase group-hover:underline">
                              Active Variant
                            </span>
                          </label>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-black rounded-none shadow-none bg-white">
                  <CardHeader className="bg-black py-3 rounded-none">
                    <CardTitle className="text-xs font-bold text-white uppercase tracking-widest">
                      Pricing
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-5">
                    <FormField
                      control={form.control}
                      name="mrp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase">
                            MRP
                          </FormLabel>
                          <Input
                            type="number"
                            className="h-10 border-black rounded-none"
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
                            Selling Price
                          </FormLabel>
                          <Input
                            type="number"
                            className="h-10 border-black rounded-none font-bold text-blue-600"
                            {...field}
                          />
                        </FormItem>
                      )}
                    />

                    <div className="bg-zinc-100 border-2 border-black p-3 text-center uppercase font-black text-xs italic">
                      Discount: {discountPreview}% OFF
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

export default AddProductVariant;
