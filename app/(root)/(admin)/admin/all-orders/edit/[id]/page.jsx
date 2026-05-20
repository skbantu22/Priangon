"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";

// UI
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

// ROUTES
import {
  ADMIN_DASHBOARD,
  ADMIN_COUPON_SHOW,
  ADMIN_COUPON_EDIT,
} from "@/Route/Adminpannelroute";

// UTILS
import { zSchema } from "@/lib/zodschema";
import { showToast } from "@/lib/showToast";
import useFetch from "@/hooks/useFetch";

const EditCoupon = ({ params }) => {
  const { id } = params;
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // =========================
  // FETCH COUPON (FIXED)
  // =========================
  const { data: getCouponData } = useFetch(`/api/coupon/get/${id}`);

  // =========================
  // FORM SCHEMA
  // =========================
  const formSchema = zSchema.pick({
    _id: true,
    code: true,
    discountPercentage: true,
    minShoppingAmount: true,
    validity: true,
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      discountPercentage: "",
      minShoppingAmount: "",
      validity: "",
    },
  });

  // =========================
  // SET FORM DATA
  // =========================
  useEffect(() => {
    if (getCouponData?.success) {
      const coupon = getCouponData.data;

      form.reset({
        _id: coupon._id || id,
        code: coupon.code || "",
        discountPercentage: coupon.discountPercentage || "",
        minShoppingAmount: coupon.minShoppingAmount || "",
        validity: coupon.validity
          ? dayjs(coupon.validity).format("YYYY-MM-DD")
          : "",
      });
    }
  }, [getCouponData, form, id]);

  // =========================
  // SUBMIT (FIXED API)
  // =========================
  const onSubmit = async (values) => {
    setLoading(true);
    try {
      const { data: response } = await axios.put("/api/coupon/update", values);

      if (!response.success) {
        throw new Error(response.message);
      }

      showToast("success", response.message);
      router.push(ADMIN_COUPON_SHOW);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // INVALID FORM
  // =========================
  const onInvalid = (errors) => {
    console.log(errors);
    showToast("error", "Please check required fields.");
  };

  // =========================
  // BREADCRUMB (FIXED)
  // =========================
  const breadcrumbData = [
    { href: ADMIN_DASHBOARD, label: "Home" },
    { href: ADMIN_COUPON_SHOW, label: "Coupon" },
    { href: ADMIN_COUPON_EDIT(id), label: "Edit Coupon" },
  ];

  return (
    <div className="space-y-6">
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card className="shadow-sm border-none">
        <CardHeader className="border-b bg-gray-50/30">
          <h1 className="text-2xl font-bold text-center">Edit Coupon</h1>
        </CardHeader>

        <CardContent className="pt-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit, onInvalid)}
              className="grid md:grid-cols-2 grid-cols-1 gap-6"
            >
              {/* CODE */}
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter Code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* DISCOUNT */}
              <FormField
                control={form.control}
                name="discountPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount %</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* MIN AMOUNT */}
              <FormField
                control={form.control}
                name="minShoppingAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Shopping Amount</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* VALIDITY */}
              <FormField
                control={form.control}
                name="validity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validity</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* SUBMIT */}
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

export default EditCoupon;
