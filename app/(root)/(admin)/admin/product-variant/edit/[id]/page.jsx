"use client";

import React, { use, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import Image from "next/image";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import {
  Form,
  FormField,
  FormLabel,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  { href: ADMIN_CATEGORY_SHOW, label: "Category" },
  { href: ADMIN_CATEGORY_EDIT, label: "Edit Product Variant" },
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

  const { data: getProduct, loading: getProductLoading } =
    useFetch(`/api/product-variant/get/${id}`);

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
          }))
        );
      }

      const productData = product.product || product;
      setProductOption([
        { label: productData.name, value: productData._id },
      ]);
    }
  }, [getProduct, form, id]);

  // Auto Discount
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
      { shouldValidate: true }
    );
  }, [selectedMedia, form]);

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      const { data } = await axios.put(
        "/api/product-variant/update",
        values
      );

      if (data?.success) {
        showToast("success", data.message || "Variant updated!");
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
    <div className="w-full p-3 sm:p-6 lg:p-8">
      <div className="w-full rounded-lg shadow-sm  ">
        <BreadCrumb breadcrumbData={breadcrumbData} />

        <Card className="rounded-lg shadow-sm border bg-white">
          <CardHeader className="pb-4">
            <div className="text-center space-y-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
                Edit Product Variant
              </h1>
            </div>
          </CardHeader>

          <CardContent className="px-4 sm:px-8 pb-8">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6"
              >
                {/* Product */}
                <FormField
                  control={form.control}
                  name="product"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product</FormLabel>
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

                {/* SKU */}
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <Input {...field} className="h-11" />
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
                      <Input {...field} className="h-11" />
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
                      <Select
                        options={sizes}
                        selected={field.value}
                        setSelected={field.onChange}
                        isMulti={false}
                      />
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
                      <Input
                        type="number"
                        min={0}
                        className="h-11"
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value))
                        }
                      />
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
                      <Input
                        type="number"
                        min={0}
                        className="h-11"
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value))
                        }
                      />
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
                      <Input
                        type="number"
                        min={0}
                        className="h-11"
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value))
                        }
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Active */}
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 mt-8">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) =>
                          field.onChange(e.target.checked)
                        }
                        className="h-4 w-4"
                      />
                      <FormLabel className="mb-0">
                        Active Variant
                      </FormLabel>
                    </FormItem>
                  )}
                />

                {/* Discount */}
                <FormField
                  control={form.control}
                  name="discountPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount %</FormLabel>
                      <Input
                        disabled
                        className="h-11 bg-muted"
                        {...field}
                      />
                    </FormItem>
                  )}
                />

               {/* Description */}
                            <div className="md:col-span-2">
                              <FormLabel className="mb-2 block">Description *</FormLabel>
              
                              {!getProductLoading && getProduct?.success && (
                                <Editor
                                  initialData={getProduct.data.description || ""}
                                  onChange={(event, editorInstance) => {
                                    const data = editorInstance.getData();
                                    form.setValue("description", data, {
                                      shouldValidate: true,
                                    });
                                  }}
                                />
                              )}
              
                              {form.formState.errors.description && (
                                <p className="text-red-500 text-sm mt-1">
                                  {form.formState.errors.description.message}
                                </p>
                              )}
                            </div>

                {/* Media */}
                <div className="md:col-span-2 border border-dashed rounded p-5">
                  <MediaModal
                    open={open}
                    setOpen={setOpen}
                    selectedMedia={selectedMedia}
                    setSelectedMedia={setSelectedMedia}
                    isMultiple
                  />

                  {selectedMedia.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-4">
                      {selectedMedia.map((media) => (
                        <div
                          key={media._id}
                          className="aspect-square border relative rounded overflow-hidden"
                        >
                          <Image
                            src={media.url}
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
                    className="bg-primary/10 border-primary border border-dashed w-full sm:w-[220px] mx-auto p-4 text-center rounded cursor-pointer"
                  >
                    Select Media
                  </div>
                </div>

                <div className="md:col-span-2">
                  <ButtonLoading
                    type="submit"
                    loading={loading}
                    text="Update Variant"
                    className="w-full md:w-auto"
                  />
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditProductVarient;