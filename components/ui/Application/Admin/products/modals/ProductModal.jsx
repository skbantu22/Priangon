"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import Image from "next/image";
import { X, ImageIcon, Ruler, LayoutGrid, UploadCloud } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

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
import UploadMedia from "@/components/ui/Application/Admin/uploadmedia";

import { zSchema } from "@/lib/zodschema";
import { z } from "zod";
import { showToast } from "@/lib/showToast";
import useFetch from "@/hooks/useFetch";

export default function ProductModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [sizeChartMedia, setSizeChartMedia] = useState(null);

  const formSchema = zSchema
    .pick({
      name: true,
      slug: true,
      category: true,
      mrp: true,
      sellingPrice: true,
      discountPercentage: true,
      description: true,
      media: true,
      freeDelivery: true,
    })
    .extend({
      subcategory: z.string().optional().or(z.literal("")),
      sizeChart: z.string().optional().or(z.literal("")),
    });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      category: "",
      subcategory: "",
      mrp: "",
      sellingPrice: "",
      discountPercentage: "0",
      description: "",
      media: [],
      sizeChart: "",
      freeDelivery: false,
    },
  });

  const mrp = form.watch("mrp");
  const sellingPrice = form.watch("sellingPrice");
  const watchedCategory = form.watch("category");

  // Live Discount Calculation
  useEffect(() => {
    if (mrp && sellingPrice && Number(mrp) > 0) {
      const disc = ((Number(mrp) - Number(sellingPrice)) / Number(mrp)) * 100;
      form.setValue("discountPercentage", Math.max(0, disc).toFixed(0));
    }
  }, [mrp, sellingPrice, form]);

  // Sync state with form
  useEffect(() => {
    form.setValue("sizeChart", sizeChartMedia?._id || "");
    form.setValue(
      "media",
      selectedMedia.map((m) => m._id),
    );
  }, [sizeChartMedia, selectedMedia, form]);

  const { data: getCategory } = useFetch(
    "/api/category?deleteType=SD&size=10000",
  );
  const { data: getSubCategory } = useFetch(
    watchedCategory
      ? `/api/subcategory?category=${watchedCategory}&deleteType=SD`
      : null,
  );

  const onSubmit = async (values) => {
    console.log("Submitting values:", values);
    setLoading(true);

    try {
      const { data } = await axios.post("/api/product/create", values);
      if (data?.success) {
        showToast("success", "Product Created!");
        queryClient.invalidateQueries(["products"]);
        onClose();
      } else {
        console.error("API Error:", data);
        showToast("error", "API Error: " + (data?.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Submission error:", err);
      // Log the full error response from the server if it exists
      if (err.response) {
        console.error("Server responded with:", err.response.data);
      }
      showToast("error", "Check console for details");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-[#f1f1f1] w-full h-full sm:h-auto sm:max-w-5xl sm:max-h-[90vh] overflow-y-auto relative shadow-2xl">
        <div className="sticky top-0 bg-[#f1f1f1] p-4 flex justify-between items-center z-20 border-b border-black/10">
          <h2 className="text-xl font-black uppercase tracking-tighter">
            New Product
          </h2>
          <button
            onClick={onClose}
            className="bg-black text-white p-2 hover:opacity-80"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <Form {...form}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="text-2xl font-black text-black tracking-tight uppercase">
                    New Product
                  </h1>
                </div>
                <ButtonLoading
                  type="submit"
                  loading={loading}
                  text="PUBLISH PRODUCT"
                  className="bg-black text-white px-10 rounded-none h-12 shadow-xl tracking-widest"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* LEFT COLUMN */}
                <div className="lg:col-span-8 space-y-6">
                  <Card className="border-2 border-black rounded-none shadow-none bg-white">
                    <CardHeader className="bg-black py-3 rounded-none">
                      <CardTitle className="text-xs font-bold text-white uppercase tracking-[0.2em]">
                        Product Details
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
                                placeholder="Ex: Classic Fit Sweatshirt"
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
                              <div className="border-2 border-black overflow-hidden bg-white">
                                <Editor
                                  key={resetKey}
                                  initialData={field.value}
                                  onChange={(event, editor) =>
                                    field.onChange(editor.getData())
                                  }
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-black rounded-none shadow-none bg-white">
                    <CardHeader className="bg-black py-3 rounded-none">
                      <CardTitle className="text-xs font-bold text-white uppercase flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" /> Gallery
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                        {selectedMedia.map((m) => (
                          <div
                            key={m._id}
                            className="relative aspect-[3/4] border-2 border-black bg-zinc-50"
                          >
                            <Image
                              src={m.url || m.secure_url}
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
                          className="aspect-[3/4] border-2 border-dashed border-black flex flex-col items-center justify-center gap-2"
                        >
                          <LayoutGrid className="w-6 h-6" />
                          <span className="text-[10px] font-black uppercase">
                            + ADD
                          </span>
                        </button>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-black/10">
                        <p className="text-[10px] font-black uppercase opacity-50">
                          Cloud Upload:
                        </p>
                        <UploadMedia
                          isMultiple={true}
                          queryClient={queryClient}
                        />
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

                  {/* FIXED SIZE CHART FIELD */}
                  <Card className="border-2 border-black rounded-none shadow-none bg-white">
                    <CardHeader className="bg-black py-3 rounded-none">
                      <CardTitle className="text-xs font-bold text-white uppercase flex items-center gap-2">
                        <Ruler className="w-4 h-4" /> Size Chart
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                      <FormField
                        control={form.control}
                        name="sizeChart" // NOW EXPLICITLY DEFINED
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              {sizeChartMedia ? (
                                <div className="relative aspect-square border-2 border-black bg-zinc-50">
                                  <Image
                                    src={
                                      sizeChartMedia.url ||
                                      sizeChartMedia.secure_url
                                    }
                                    fill
                                    alt="Size Chart"
                                    className="object-contain"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSizeChartMedia(null);
                                      field.onChange(""); // Clears value in form state
                                    }}
                                    className="absolute top-1 right-1 bg-black text-white p-1"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div
                                  onClick={() => setSizeChartOpen(true)}
                                  className="w-full h-32 border-2 border-dashed border-black flex flex-col items-center justify-center cursor-pointer gap-2 hover:bg-zinc-50 transition-colors"
                                >
                                  <LayoutGrid className="w-5 h-5 opacity-40" />
                                  <span className="text-[10px] font-black uppercase">
                                    Select Size Chart
                                  </span>
                                </div>
                              )}
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Quick Upload Option */}
                      <div className="pt-4 border-t border-black/10">
                        <p className="text-[9px] font-black uppercase opacity-40 mb-2 flex items-center gap-1">
                          <UploadCloud className="w-3 h-3" /> Quick Upload New
                          Chart
                        </p>
                        <UploadMedia
                          isMultiple={false}
                          queryClient={queryClient}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </form>
          </Form>
        </Form>
      </div>

      <MediaModal
        open={open}
        setOpen={setOpen}
        selectedMedia={selectedMedia}
        setSelectedMedia={setSelectedMedia}
        isMultiple={true}
      />
      <MediaModal
        open={sizeChartOpen}
        setOpen={setSizeChartOpen}
        selectedMedia={sizeChartMedia ? [sizeChartMedia] : []}
        setSelectedMedia={(items) => setSizeChartMedia(items[0])}
        isMultiple={false}
      />
    </div>
  );
}
