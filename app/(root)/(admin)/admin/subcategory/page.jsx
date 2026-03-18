"use client";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import {
  ADMIN_CATEGORY_EDIT,
  ADMIN_CATEGORY_SHOW,
  ADMIN_DASHBOARD,
} from "@/Route/Adminpannelroute";
import React, { useEffect, useState } from "react";

import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
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
import useFetch from "@/hooks/useFetch";
import Select from "@/components/ui/Select";
import { Button } from "@/components/ui/button";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_CATEGORY_SHOW, label: "Category" },
  { href: ADMIN_CATEGORY_EDIT, label: "Add Sub Category" },
];

const AddSubCategory = () => {
  // ✅ EXACT MATCH WITH ZOD + API
  const formSchema = zSchema.pick({
    categoryId: true,
    subcategory: true,
    slug: true,
  });

  const [loading, setLoading] = useState(false);
  const [categoryOption, setCategoryOption] = useState([]);

  // Fetch categories
  const { data: getCategory } = useFetch(
    "/api/category?deleteType=SD&size=10000"
  );

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryId: "",
      subcategory: "",
      slug: "",
    },
  });

  // Category dropdown options
  useEffect(() => {
    if (getCategory?.success) {
      const options = getCategory.data.map((cat) => ({
        label: cat.name,
        value: cat._id,
      }));
      setCategoryOption(options);
    }
  }, [getCategory]);

  // ✅ Auto-generate slug from subcategory
  useEffect(() => {
    const name = form.getValues("subcategory");
    if (name) {
      form.setValue("slug", slugify(name, { lower: true }));
    }
  }, [form.watch("subcategory")]); // eslint-disable-line

  const onSubmit = async (values) => {
    setLoading(true);

    try {
      const { data } = await axios.post(
        "/api/subcategory/create",
        values
      );

      if (!data.success) throw new Error(data.message);

      showToast("success", data.message);
      form.reset();
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
            <h1 className="text-3xl font-bold">Sub Category Setup</h1>
          </div>
        </CardHeader>

        

        <CardContent className="pb-5">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid gap-5 max-w-md mx-auto"
            >
              {/* Category */}
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Select
                        options={categoryOption}
                        selected={field.value}
                        setSelected={field.onChange}
                        isMulti={false}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Subcategory Name */}
              <FormField
                control={form.control}
                name="subcategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sub Category Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter sub category name"
                        {...field}
                      />
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
                      <Input
                        type="text"
                        placeholder="Auto generated slug"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <ButtonLoading
                type="submit"
                loading={loading}
                text="Add Sub Category"
              />
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddSubCategory;
