"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

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

import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  { href: ADMIN_CATEGORY_SHOW, label: "Category" },
  { href: "#", label: "Add product variant" },
];

const AddProductVariant = () => {
  const [loading, setLoading] = useState(false);
  const [productOption, setProductOption] = useState([]);

  // media modal state
  const [open, setOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);

  // fetch products
  const { data: getProduct } = useFetch("/api/product?deleteType=SD&&size=10000");

  // ✅ schema (NO discountPercentage)
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
    isActive: true, // 👈 Add this line
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
      isActive: true, // 👈 Add this line
      description: "",
      media: [],
    },
  });

  // ✅ Sync selectedMedia with form
  useEffect(() => {
    if (selectedMedia.length > 0) {
      const mediaIds = selectedMedia.map((m) => m._id);
      form.setValue("media", mediaIds, { shouldValidate: true });
    } else {
      form.setValue("media", [], { shouldValidate: true });
    }
  }, [selectedMedia, form]);

  // ✅ Map products to select options
  useEffect(() => {
    if (getProduct?.success) {
      const options = getProduct.data.map((product) => ({
        label: product.name,
        value: product._id,
      }));
      setProductOption(options);
    }
  }, [getProduct]);

  // ✅ Discount preview (showcase only)
  const mrp = Number(form.watch("mrp")) || 0;
  const selling = Number(form.watch("sellingPrice")) || 0;

  const discountPreview = useMemo(() => {
    if (mrp > 0 && selling >= 0) {
      const pct = ((mrp - selling) / mrp) * 100;
      return Math.max(0, Math.min(100, Math.round(pct)));
    }
    return 0;
  }, [mrp, selling]);

  // ✅ Editor Handler
  const handleEditorChange = (event, editor) => {
    const data = editor.getData();
    form.setValue("description", data, { shouldValidate: true });
  };

  // ✅ Submit Handler
  const onSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        mrp: Number(values.mrp) || 0,
        sellingPrice: Number(values.sellingPrice) || 0,
        stock: Number(values.stock) || 0,
      };

      const { data } = await axios.post("/api/product-variant/create", payload);
      if (!data.success) throw new Error(data.message);

      showToast("success", data.message);
      form.reset({
        product: "",
        sku: "",
        color: "",
        size: "",
        mrp: 0,
        sellingPrice: 0,
          isActive: true,   // ✅ add this

        stock: 0,
        description: "",
        media: [],
      });
      setSelectedMedia([]);
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card className="p-0 rounded shadow-sm">
        <CardHeader>
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Add Product Variant</h1>
          </div>
        </CardHeader>

        <CardContent className="pb-5">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit, (err) => {
                console.log("❌ Validation Failed:", err);
                showToast("error", "Please fill all required fields correctly.");
              })}
              className="grid md:grid-cols-2 grid-cols-1 gap-5"
            >
              {/* Product Select */}
              <FormField
                control={form.control}
                name="product"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product</FormLabel>
                    <FormControl>
                      <Select
                        options={productOption}
                        selected={field.value}
                        setSelected={field.onChange}
                        isMulti={false}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* SKU */}
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter SKU" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Color */}
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter color" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Size */}
              <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Size</FormLabel>
                    <FormControl>
                      <Select
                        options={sizes}
                        selected={field.value}
                        setSelected={field.onChange}
                        isMulti={false}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* MRP */}
              <FormField
                control={form.control}
                name="mrp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MRP</FormLabel>
                    <FormControl>
                      <Input
  type="number"
  min={0}
  value={field.value === 0 ? "" : field.value ?? ""}
  onChange={(e) => {
    const v = e.target.value;
    field.onChange(v === "" ? "" : Number(v));
  }}
  placeholder="Enter selling price"
/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Selling Price */}
              <FormField
                control={form.control}
                name="sellingPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selling Price</FormLabel>
                    <FormControl>
                      <Input
  type="number"
  min={0}
  value={field.value === 0 ? "" : field.value ?? ""}
  onChange={(e) => {
    const v = e.target.value;
    field.onChange(v === "" ? "" : Number(v));
  }}
  placeholder="Enter selling price"
/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Stock */}
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock</FormLabel>
                    <FormControl>
                     <Input
  type="number"
  min={0}
  value={field.value === 0 ? "" : field.value ?? ""}
  onChange={(e) => {
    const v = e.target.value;
    field.onChange(v === "" ? "" : Number(v));
  }}
  placeholder="Enter selling price"
/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
  control={form.control}
  name="isActive"
  render={({ field }) => (
    <FormItem className="flex items-center space-x-3">
      <FormControl>
        <input
          type="checkbox"
          checked={field.value ?? true}
          onChange={(e) => field.onChange(e.target.checked)}
          className="h-4 w-4"
        />
      </FormControl>
      <FormLabel className="mb-0">
        Active Variant
      </FormLabel>
    </FormItem>
  )}
/>


              {/* ✅ Discount Preview (Showcase only) */}
              <div className="md:col-span-2">
                <p className="text-sm font-medium mb-1">Discount (Preview)</p>
                <div className="bg-gray-100 border rounded px-3 py-2 text-sm">
                  {discountPreview}%
                  <span className="text-xs text-gray-500 ml-2">
                  </span>
                </div>
              </div>

              {/* Description Editor */}
              <div className="mb-5 md:col-span-2">
                <FormLabel className="mb-2 block">
                  Description <span className="text-red-500">*</span>
                </FormLabel>
                <Editor onChange={handleEditorChange} />
                <FormMessage>
                  {form.formState.errors.description?.message}
                </FormMessage>
              </div>

              {/* Media Selection */}
              <div className="md:col-span-2 border border-dashed rounded p-5">
                <MediaModal
                  open={open}
                  setOpen={setOpen}
                  selectedMedia={selectedMedia}
                  setSelectedMedia={setSelectedMedia}
                  isMultiple
                />

                {selectedMedia.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center mb-3">
                    {selectedMedia.map((media) => (
                      <div key={media._id} className="h-24 w-24 border relative">
                        <Image
                          src={media.secure_url || media.url}
                          fill
                          alt="preview"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div
                  onClick={() => setOpen(true)}
                  className="bg-primary/10 border-primary border border-dashed w-[200px] mx-auto p-4 cursor-pointer text-center rounded"
                >
                  <span className="font-semibold">Select Media</span>
                </div>

                {form.formState.errors.media && (
                  <p className="text-red-500 text-sm mt-2 text-center">
                    {form.formState.errors.media.message}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <ButtonLoading type="submit" loading={loading} text="Add Variant" />
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddProductVariant;
