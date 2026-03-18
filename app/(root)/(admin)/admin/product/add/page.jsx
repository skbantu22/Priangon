"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import slugify from "slugify";
import Image from "next/image";

// UI Components
import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { 
  Form, 
  FormField, 
  FormLabel, 
  FormItem, 
  FormControl, 
  FormMessage 
} from "@/components/ui/form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ButtonLoading from "@/components/ui/Application/ButtonLoading";
import Select from "@/components/ui/Select";
import Editor from "@/components/ui/Application/Admin/Editor";
import MediaModal from "@/components/ui/Application/Admin/MediaModel";

// Utilities & Config
import { 
  ADMIN_CATEGORY_EDIT, 
  ADMIN_CATEGORY_SHOW, 
  ADMIN_DASHBOARD 
} from "@/Route/Adminpannelroute";
import { zSchema } from "@/lib/zodschema";
import { showToast } from "@/lib/showToast";
import useFetch from "@/hooks/useFetch";
import UploadMedia from "@/components/ui/Application/Admin/uploadmedia";
import {  useQueryClient } from "@tanstack/react-query";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_CATEGORY_SHOW, label: "category" },
  { href: ADMIN_CATEGORY_EDIT, label: "Add product" },
];

const AddProduct = () => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [categoryOption, setCategoryOption] = useState([]);
  const [subCategoryOption, setSubCategoryOption] = useState([]);

  // 1. Setup Form Schema
  const formSchema = zSchema.pick({
    name: true,
    slug: true,
    category: true,
    subcategory: true,
    mrp: true,
    sellingPrice: true,
    discountPercentage: true,
    description: true,
    media: true,
    offers: true,
    freeDelivery: true,
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
      discountPercentage: "",
      description: "",
      media: [],
      offers: [],
      freeDelivery: false,
    },
  });

  // 2. Fetch Categories
  const { data: getCategory } = useFetch("/api/category?deleteType=SD&size=10000");

// 2. Fetch Categories
  const { data: getsubCategory } = useFetch("/api/subcategory?deleteType=SD&size=10000");


  useEffect(() => {
    if (getCategory?.success) {
      setCategoryOption(
        getCategory.data.map((cat) => ({ label: cat.name, value: cat._id }))
      );
    }
  }, [getCategory]);

  // 3. Watchers
  const watchedCategoryId = form.watch("category");
  const watchedName = form.watch("name");
  const watchedMrp = form.watch("mrp");
  const watchedSellingPrice = form.watch("sellingPrice");

  // 4. Fetch Subcategories based on category selection
  const subUrl = useMemo(() => {
    if (!watchedCategoryId) return null;
    return `/api/subcategory?category=${watchedCategoryId}&deleteType=SD&size=10`;
  }, [watchedCategoryId]);

  const { data: getSubCategory } = useFetch(subUrl);
  
  console.log("Active Category ID:", watchedCategoryId);
console.log("Subcategory API Data:", getSubCategory);
  useEffect(() => {
    if (getSubCategory?.success) {
      setSubCategoryOption(
        getSubCategory.data.map((sub) => ({ label: sub.name, value: sub._id }))
      );
    } else {
      setSubCategoryOption([]);
    }
    // Clear subcategory when parent category changes
    form.setValue("subcategory", "");
  }, [getSubCategory, watchedCategoryId, form]);

  // 5. Sync Media Selection with Form State (for Zod validation)
  useEffect(() => {
    const mediaIds = selectedMedia.map((m) => m._id);
    form.setValue("media", mediaIds, { shouldValidate: true });
  }, [selectedMedia, form]);

  // 6. Auto-Slug & Auto-Discount
  useEffect(() => {
    if (watchedName) {
      form.setValue("slug", slugify(watchedName, { lower: true, strict: true }));
    }
  }, [watchedName, form]);

  useEffect(() => {
    const mrp = Number(watchedMrp) || 0;
    const selling = Number(watchedSellingPrice) || 0;
    if (mrp > 0 && selling > 0) {
      const discount = ((mrp - selling) / mrp) * 100;
      form.setValue("discountPercentage", discount.toFixed(0));
    }
  }, [watchedMrp, watchedSellingPrice, form]);

  // 7. Handlers
  // const handleEditorChange = (event, editorInstance) => {
  //   const data = editorInstance.getData();
  //   form.setValue("description", data, { shouldValidate: true });
  // };
const editor = (event, editor) => {
  const data = editor.getData()
  form.setValue('description', data)
}
  const onSubmit = async (values) => {
    setLoading(true);
    try {
      // Final payload check
      const { data: response } = await axios.post("/api/product/create", values);

      if (response?.success) {
        showToast("success", response.message || "Product added!");
        form.reset();
        setSelectedMedia([]);
      } else {
        throw new Error(response?.message || "Submit failed");
      }
    } catch (error) {
      showToast("error", error?.response?.data?.message || error?.message);
    } finally {
      setLoading(false);
    }
  };

  const onInvalid = (errors) => {
    console.error("Validation Failed:", errors);
    showToast("error", "Please check required fields.");
  };

  return (
    <div className="space-y-6">
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card className="shadow-sm border-none">
        <CardHeader className="border-b bg-gray-50/30">
          <h1 className="text-2xl font-bold text-center">Add Product</h1>
        </CardHeader>

        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="grid md:grid-cols-2 grid-cols-1 grid-cols-1 gap-6">
              
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Product Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Slug */}
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="product-slug" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category - Fix: Extract string value */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Select
                        options={categoryOption}
                        selected={field.value}
                        setSelected={(val) => {
                          const id = typeof val === "string" ? val : val?.value;
                          field.onChange(id);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Subcategory - Fix: Extract string value */}
              <FormField
                control={form.control}
                name="subcategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sub Category</FormLabel>
                    <FormControl>
                      <Select
                        options={subCategoryOption}
                        selected={field.value}
                        setSelected={(val) => {
                          const id = typeof val === "string" ? val : val?.value;
                          field.onChange(id);
                        }}
                        disabled={!watchedCategoryId}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

       {/* Pricing Grid */}
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:col-span-2">
                <FormField
                  control={form.control}
                  name="mrp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MRP</FormLabel>
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
                      <FormLabel>Selling Price</FormLabel>
                      <Input type="number" {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="discountPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount %</FormLabel>
                      <Input type="number" disabled className="bg-muted" {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description */}
              {/* <div className="md:col-span-2">
                <FormLabel className="mb-2 block">Description *</FormLabel>

                <Editor onChange={handleEditorChange} />
                {form.formState.errors.description && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.description.message}</p>
                )}
              </div> */}


              <div className="">
  <FormField
    control={form.control}
    name="description"
    render={({ field }) => (
      <FormItem>
        <FormLabel>
          Description <span className="text-red-500">*</span>
        </FormLabel>
        <FormControl>
          <Editor onChange={editor} initialData={field.value} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</div>

   
                        {/* Media */}
              <div className="md:col-span-2 border border-dashed rounded p-5 gap-2 text-center space-y-6">

          <div   >
            <UploadMedia isMultiple={true} queryClient={queryClient} className="bg-white" /></div>
            

                <MediaModal
                  open={open}
                  setOpen={setOpen}
                  selectedMedia={selectedMedia}
                  setSelectedMedia={setSelectedMedia}
                  isMultiple={true}
                />

                {selectedMedia.length > 0 && (
                  <div className="flex justify-center items-center flex-wrap mb-3 gap-2">
                    {selectedMedia.map((media) => (
                      <div key={media._id} className="h-24 w-24 border">
                        <Image
                          src={media.url}
                          height={100}
                          width={100}
                          alt=""
                          className="size-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div
                  onClick={() => setOpen(true)}
                  className="bg-gray-50 dark:bg-card border w-[200px] mx-auto p-5 cursor-pointer"
                >
                  <span className="font-semibold">Select Media</span>
                </div>
              </div>
              
              

              {/* Submit Button */}
              <div className="md:col-span-2 pt-4 flex justify-center">
                <ButtonLoading
                  type="submit"
                  loading={loading}
                  text="Submit Product"
                  className="h-10 px-8 rounded"
                />
              </div>

            </form>
          </Form>
        </CardContent>
      </Card>

     
    </div>
  );
};

export default AddProduct;


