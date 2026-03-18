"use client";

import React, { use, useEffect, useMemo, useRef, useState } from "react";
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
  FormMessage,
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
  ADMIN_DASHBOARD,
} from "@/Route/Adminpannelroute";
import { zSchema } from "@/lib/zodschema";
import { showToast } from "@/lib/showToast";
import useFetch from "@/hooks/useFetch";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_CATEGORY_SHOW, label: "Category" },
  { href: ADMIN_CATEGORY_EDIT, label: "Edit Product" },
];

const EditProduct = ({ params }) => {
  // ✅ keep your way (as you asked)
  const { id } = use(params);

  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [categoryOption, setCategoryOption] = useState([]);
  const [subCategoryOption, setSubCategoryOption] = useState([]);

  // ✅ track category change (only clear subcategory on real change)
  const prevCategoryRef = useRef("");
  // ✅ keep product subcategory id to restore after options load
  const productSubRef = useRef("");

  // 1️⃣ Form schema
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
    offers: true,
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
      offers: [],
      freeDelivery: false,
    },
  });

  // 2️⃣ Fetch categories & product
  const { data: getCategory } = useFetch("/api/category?deleteType=SD&size=10000");
  const { data: getProduct, loading: getProductLoading } = useFetch(
    `/api/product/get/${id}`
  );

  const watchedCategoryId = form.watch("category");
  const watchedName = form.watch("name");
  const watchedMrp = form.watch("mrp");
  const watchedSellingPrice = form.watch("sellingPrice");

  // 3️⃣ Fetch subcategories dynamically
  const subUrl = useMemo(() => {
    if (!watchedCategoryId) return null;
    return `/api/subcategory?category=${watchedCategoryId}&deleteType=SD&size=1000`;
  }, [watchedCategoryId]);

  const { data: getSubCategory } = useFetch(subUrl);

  // 4️⃣ Set options for category dropdown
  useEffect(() => {
    if (getCategory?.success) {
      setCategoryOption(
        getCategory.data.map((cat) => ({ label: cat.name, value: cat._id }))
      );
    }
  }, [getCategory]);

  // ✅ 5️⃣ Reset form with product data (IMPORTANT: normalize ids)
  useEffect(() => {
    if (getProduct?.success) {
      const product = getProduct.data;

      // ✅ normalize category/subcategory to string id (works if populated or not)
      const categoryId =
        typeof product?.category === "object"
          ? product?.category?._id || ""
          : product?.category || "";

      const subcategoryId =
        typeof product?.subcategory === "object"
          ? product?.subcategory?._id || ""
          : product?.subcategory || "";

      productSubRef.current = subcategoryId;
      prevCategoryRef.current = categoryId;

      form.reset({
         _id: product?._id || id, 
        name: product?.name || "",
        slug: product?.slug || "",
        category: categoryId,
        subcategory: subcategoryId,
        mrp: product?.mrp || "",
        sellingPrice: product?.sellingPrice || "",
        discountPercentage: product?.discountPercentage || "",
        description: product?.description || "",
      });

      // Preselect media
      if (product?.media?.length) {
        const media = product.media.map((m) => ({
          _id: m._id,
          url: m.secure_url,
        }));
        setSelectedMedia(media);
      } else {
        setSelectedMedia([]);
      }
    }
  }, [getProduct, form]);

  // ✅ 6️⃣ Subcategory options + clear only on real category change
  useEffect(() => {
    if (getSubCategory?.success) {
      const opts = getSubCategory.data.map((sub) => ({
        label: sub.name,
        value: sub._id,
      }));
      setSubCategoryOption(opts);

      // ✅ if subcategory empty but product had one, restore it (so ✓ shows)
      const current = form.getValues("subcategory");
      if (!current && productSubRef.current) {
        const exists = opts.some((o) => o.value === productSubRef.current);
        if (exists) form.setValue("subcategory", productSubRef.current);
      }
    } else {
      setSubCategoryOption([]);
    }

    // ✅ clear ONLY when user changes category (not first load)
    const prev = prevCategoryRef.current;
    if (prev && prev !== watchedCategoryId) {
      form.setValue("subcategory", "");
    }
    prevCategoryRef.current = watchedCategoryId || "";
  }, [getSubCategory, watchedCategoryId, form]);

  // 7️⃣ Current subcategory name (works for string/object)
  const currentSubId =
    typeof getProduct?.data?.subcategory === "object"
      ? getProduct?.data?.subcategory?._id
      : getProduct?.data?.subcategory;

  const currentSubName =
    getSubCategory?.data && currentSubId
      ? getSubCategory.data.find((sub) => sub._id === currentSubId)?.name || "N/A"
      : "Loading...";

  // 8️⃣ Auto slug
  useEffect(() => {
    if (watchedName) {
      form.setValue("slug", slugify(watchedName, { lower: true, strict: true }));
    }
  }, [watchedName, form]);

  // 9️⃣ Auto discount
  useEffect(() => {
    const mrp = Number(watchedMrp) || 0;
    const selling = Number(watchedSellingPrice) || 0;
    if (mrp > 0 && selling > 0) {
      const discount = ((mrp - selling) / mrp) * 100;
      form.setValue("discountPercentage", discount.toFixed(0));
    }
  }, [watchedMrp, watchedSellingPrice, form]);

  // 🔟 Sync media selection
  useEffect(() => {
    const mediaIds = selectedMedia.map((m) => m._id);
    form.setValue("media", mediaIds, { shouldValidate: true });
  }, [selectedMedia, form]);

  // 11️⃣ Submit handler
  const onSubmit = async (values) => {
    setLoading(true);
    try {

      console.log("SUBMIT VALUES:", values);

      const { data: response } = await axios.put("/api/product/update", values);
      if (response?.success) {
        showToast("success", response.message || "Product updated!");
  
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
          <h1 className="text-2xl font-bold text-center">Edit Product</h1>
          <p className="mb-2 text-sm text-gray-500">
            Current Subcategory:{" "}
            <span className="font-semibold">{currentSubName}</span>
          </p>
        </CardHeader>

        <CardContent className="pt-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit, onInvalid)}
              className="grid md:grid-cols-2  grid-cols-1 gap-6"
            >
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

              {/* Category */}
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
                          const id =
                            typeof val === "string" ? val : val?.value;
                          field.onChange(id);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Subcategory */}
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
                          const id =
                            typeof val === "string" ? val : val?.value;
                          field.onChange(id);
                        }}
                        disabled={!watchedCategoryId}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-4 md:col-span-2">
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
                      <Input
                        type="number"
                        disabled
                        className="bg-muted"
                        {...field}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
              <div className="md:col-span-2 border border-dashed rounded p-5 text-center">
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
                          className="object-cover"
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

              {/* Submit */}
              <div className="md:col-span-2 pt-4">
                <ButtonLoading
                  type="submit"
                  loading={loading}
                  text="Save Changes"
                  className="w-full h-12"
                />
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditProduct;