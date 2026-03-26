"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import slugify from "slugify";
import axios from "axios";
import { Layers, Link2 } from "lucide-react";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import {
  ADMIN_CATEGORY_EDIT,
  ADMIN_CATEGORY_SHOW,
  ADMIN_DASHBOARD,
} from "@/Route/Adminpannelroute";

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
import { zSchema } from "@/lib/zodschema";
import { showToast } from "@/lib/showToast";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_CATEGORY_SHOW, label: "Categories" },
  { href: "#", label: "Add New" },
];

const AddCategory = () => {
  const [loading, setloading] = useState(false);

  const formSchema = zSchema.pick({
    name: true,
    slug: true,
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  // Watch name to auto-generate slug
  const watchedName = form.watch("name");

  useEffect(() => {
    if (watchedName) {
      form.setValue(
        "slug",
        slugify(watchedName, { lower: true, strict: true }),
      );
    }
  }, [watchedName, form]);

  const onSubmit = async (values) => {
    setloading(true);
    try {
      const { data: response } = await axios.post(
        "/api/category/create",
        values,
      );

      if (!response.success) {
        throw new Error(response.message);
      }

      showToast("success", response.message);
      form.reset();
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message);
    } finally {
      setloading(false);
    }
  };

  return (
    <div className="bg-[#f1f1f1] min-h-screen pb-20 font-sans">
      <div className="max-w-[800px] mx-auto px-4 md:px-6 py-4 space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <BreadCrumb breadcrumbData={breadcrumbData} />
                <h1 className="text-2xl font-black text-black tracking-tight uppercase">
                  Create Category
                </h1>
              </div>
              <ButtonLoading
                type="submit"
                loading={loading}
                text="SAVE CATEGORY"
                className="bg-black hover:bg-zinc-800 text-white font-black px-10 rounded-none h-12 shadow-xl tracking-widest uppercase text-xs"
              />
            </div>

            {/* Main Form Card */}
            <Card className="border-2 border-black rounded-none shadow-none bg-white">
              <CardHeader className="bg-black py-3 rounded-none">
                <CardTitle className="text-xs font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2">
                  <Layers className="w-4 h-4" /> Category Identity
                </CardTitle>
              </CardHeader>

              <CardContent className="p-8 space-y-8">
                {/* Category Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        Category Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Summer Collection"
                          {...field}
                          className="h-14 border-2 border-black rounded-none focus-visible:ring-0 text-lg font-bold placeholder:text-zinc-300"
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] uppercase font-bold" />
                    </FormItem>
                  )}
                />

                {/* Category Slug */}
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2 mb-1">
                        <Link2 className="w-3 h-3 text-zinc-400" />
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                          URL Slug (Auto-generated)
                        </FormLabel>
                      </div>
                      <FormControl>
                        <Input
                          placeholder="summer-collection"
                          {...field}
                          className="h-11 border-2 border-zinc-200 bg-zinc-50 rounded-none focus-visible:ring-0 font-mono text-sm"
                        />
                      </FormControl>
                      <p className="text-[9px] text-zinc-400 italic">
                        The slug is used for SEO-friendly URLs. It updates
                        automatically as you type the name.
                      </p>
                      <FormMessage className="text-[10px] uppercase font-bold" />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Info Tip */}
            <div className="bg-white border-l-4 border-black p-4 shadow-sm">
              <p className="text-[11px] font-medium text-zinc-600 leading-relaxed uppercase tracking-tight">
                Tip: Use broad category names for better product grouping. You
                can add specific attributes in the product variants later.
              </p>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default AddCategory;
