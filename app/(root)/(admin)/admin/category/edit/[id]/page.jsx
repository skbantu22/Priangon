"use client";

import React, { use as usePromise, useEffect, useState } from "react";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import {
  ADMIN_CATEGORY_EDIT,
  ADMIN_CATEGORY_SHOW,
  ADMIN_DASHBOARD,
} from "@/Route/Adminpannelroute";

import { Form } from "@/components/ui/form";
import { useForm, useWatch } from "react-hook-form";
import {
  FormField,
  FormLabel,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import ButtonLoading from "@/components/ui/Application/ButtonLoading";
import { zSchema } from "@/lib/zodschema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { showToast } from "@/lib/showToast";
import slugify from "slugify";
import axios from "axios";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_CATEGORY_SHOW, label: "category" },
  { href: ADMIN_CATEGORY_EDIT, label: "Edit category" },
];

export default function EditCategory({ params }) {
  // ✅ Next.js 16: params is Promise -> unwrap with React.use()
  const { id } = usePromise(params);

  const formSchema = zSchema.pick({
    _id: true,
    name: true,
    slug: true,
  });

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      _id: id || "",
      name: "",
      slug: "",
    },
  });

  // ✅ watch name properly
  const nameValue = useWatch({ control: form.control, name: "name" });

  // ✅ auto slug
  useEffect(() => {
    if (nameValue) {
      form.setValue("slug", slugify(nameValue, { lower: true, strict: true }));
    } else {
      form.setValue("slug", "");
    }
  }, [nameValue, form]);

  // ✅ fetch category by id
  useEffect(() => {
    if (!id) return;

    const fetchCategory = async () => {
      setPageLoading(true);
      try {
      const { data: res } = await axios.get(`/api/category/get/${id}`);
        if (!res?.success) throw new Error(res?.message || "Failed to load");

        const data = res.data;

        form.reset({
          _id: data?._id || id,
          name: data?.name || "",
          slug: data?.slug || "",
        });
      } catch (error) {
        showToast("error", error?.message || "Something went wrong");
      } finally {
        setPageLoading(false);
      }
    };

    fetchCategory();
  }, [id, form]);

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      const { data: res } = await axios.put("/api/category/update", values);
      if (!res?.success) throw new Error(res?.message || "Update failed");
      showToast("success", res.message || "Updated");
    } catch (error) {
      showToast("error", error?.message || "Something went wrong");
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
            <h1 className="text-3xl font-bold">Edit Category</h1>
          </div>
        </CardHeader>

        <CardContent className="pb-5">
          {pageLoading ? (
            <div className="py-10 text-center text-sm text-gray-500">
              Loading...
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* ✅ keep _id in form data */}
                <input type="hidden" {...form.register("_id")} />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Enter Category Name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input placeholder="category-slug" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <ButtonLoading type="submit" loading={loading} text="Update" />
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
