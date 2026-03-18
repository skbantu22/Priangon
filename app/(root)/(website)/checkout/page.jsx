"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { Truck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

import imgPlaceholder from "@/public/assets/img-placeholder.webp";
import { WEBSITE_SHOP } from "@/Route/Websiteroute";
import useFetch from "@/hooks/useFetch";
import { setCart } from "@/store/reducer/cartReducer";
import { zSchema } from "@/lib/zodschema";
import ButtonLoading from "@/components/ui/Application/ButtonLoading";
import { showToast } from "@/lib/showToast";

const formatCurrency = (amount) =>
  Number(amount || 0).toLocaleString("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  });

export default function CheckoutPage() {
  const dispatch = useDispatch();
  const router = useRouter();

  const cartStore = useSelector((store) => store.cartStore);
const authStore = useSelector(store => store.authStore)

  const products = Array.isArray(cartStore?.products) ? cartStore.products : [];
  const liveProducts = Array.isArray(cartStore?.products)
    ? cartStore.products
    : [];

  const [verifiedOnce, setVerifiedOnce] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isCouponApplied, setIsCouponApplied] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponDiscountAmount, setCouponDiscountAmount] = useState(0);

  const [shippingMethod, setShippingMethod] = useState("inside_dhaka");
  const [payment, setPayment] = useState("cod");
  const [placingOrder, setPlacingOrder] = useState(false);

  const subtotal = useMemo(() => {
    return liveProducts.reduce((acc, item) => {
      const price = Number(item?.sellingPrice || 0);
      const qty = Number(item?.quantity || 1);
      return acc + price * qty;
    }, 0);
  }, [liveProducts]);

  const shipping = useMemo(() => {
    if (shippingMethod === "inside_dhaka") return 70;
    if (shippingMethod === "outside_dhaka") return 120;
    return 0;
  }, [shippingMethod]);

  const total = useMemo(() => {
    return Math.max(subtotal - couponDiscountAmount + shipping, 0);
  }, [subtotal, couponDiscountAmount, shipping]);

  const couponFormSchema = zSchema.pick({
    code: true,
    minShoppingAmount: true,
  });

  const couponForm = useForm({
    resolver: zodResolver(couponFormSchema),
    defaultValues: {
      code: "",
      minShoppingAmount: subtotal,
    },
  });

  const orderFormSchema = zSchema
    .pick({
      name: true,
      phone: true,
      address: true,
      city: true,
    })
    .extend({
      userId: z.string().optional(),
    });

  const orderForm = useForm({
  resolver: zodResolver(orderFormSchema),
  defaultValues: {
    name: authStore?.auth?.name || "",
    phone: authStore?.auth?.phone || "",
    address: authStore?.auth?.address || "",
        city: authStore?.auth?.city || "", // <-- Add default value here

    userId: authStore?.auth?._id || "",
  },
});



console.log("Auth Store:", authStore);
  useEffect(() => {
  const auth = authStore?.auth;
  if (auth) {
    orderForm.setValue("userId", auth._id || "");
    orderForm.setValue("name", auth.name || "");
    orderForm.setValue("phone", auth.phone || "");
    orderForm.setValue("address", auth.address || "");
        orderForm.setValue("city", auth.city || ""); // <-- Add this line

  }
}, [authStore, orderForm]);

  useEffect(() => {
    couponForm.setValue("minShoppingAmount", subtotal);
  }, [subtotal, couponForm]);



  const verifyBody = useMemo(() => ({ products }), [products]);
  const shouldVerify = products.length > 0 && !verifiedOnce;

  const { data: getVerifiedCartData } = useFetch(
    shouldVerify ? "/api/cart-verification" : null,
    "POST",
    verifyBody
  );

  useEffect(() => {
    if (verifiedOnce) return;

    if (getVerifiedCartData?.success) {
      const cartData = Array.isArray(getVerifiedCartData?.data)
        ? getVerifiedCartData.data
        : [];

   

      // prevent overwriting cart with empty array accidentally
      if (cartData.length > 0) {
        dispatch(setCart(cartData));
      }

      setVerifiedOnce(true);
      setVerifyError("");
    } else if (getVerifiedCartData?.success === false) {
      setVerifyError(getVerifiedCartData?.message || "Cart verification failed");
      setVerifiedOnce(true);
    }
  }, [getVerifiedCartData, verifiedOnce, dispatch]);

  const applyCoupon = async (values) => {
    setCouponLoading(true);

    try {
      const code = String(values.code || "").trim().toUpperCase();

      const payload = {
        code,
        minShoppingAmount: subtotal,
      };

      console.log("Coupon apply payload:", payload);

      const { data: response } = await axios.post("/api/coupon/apply", payload);



      if (!response?.success) {
        throw new Error(response?.message || "Failed to apply coupon");
      }

      const discountPercentage = Number(
        response?.data?.discountPercentage || 0
      );
      const discountAmount = (subtotal * discountPercentage) / 100;

      setCouponDiscountAmount(discountAmount);
      setIsCouponApplied(true);

      setAppliedCoupon({
        code,
        discountPercentage,
        discountAmount,
      });

      couponForm.reset({
        code: "",
        minShoppingAmount: subtotal,
      });

      showToast("success", response?.message || "Coupon applied successfully");
    } catch (error) {
      console.log("Coupon apply error:", error?.response?.data || error);

      showToast(
        "error",
        error?.response?.data?.message ||
          error?.message ||
          "Coupon apply failed"
      );
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCouponDiscountAmount(0);
    setIsCouponApplied(false);
    setAppliedCoupon(null);

    couponForm.reset({
      code: "",
      minShoppingAmount: subtotal,
    });

    showToast("success", "Coupon removed");
  };

  const placeOrder = async (formData) => {
    setPlacingOrder(true);

    try {
      const payload = {
        method: payment,

        userId: authStore?.auth?._id || null,
        customer: {
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          cityId: shippingMethod === "inside_dhaka" ? "dhaka" : "other",
        },
        items: liveProducts.map((item) => ({
          variantId: item?.variantId,
          quantity: Number(item?.quantity || 1),
        })),
        coupon:
          isCouponApplied && appliedCoupon?.code
            ? {
                code: String(appliedCoupon.code).trim().toUpperCase(),
              }
            : null,
      };

    

      const { data: response } = await axios.post("/api/checkout", payload);

      console.log("Checkout API response:", response);

      if (!response?.success) {
        throw new Error(response?.message || "Order place failed");
      }

      showToast("success", response?.message || "Order placed successfully");

      dispatch(setCart([]));
      orderForm.reset();

      setAppliedCoupon(null);
      setIsCouponApplied(false);
      setCouponDiscountAmount(0);

      router.push(`/order/success?id=${response.orderId}`);
    } catch (error) {
      console.log("Checkout error:", error?.response?.data || error);

      showToast(
        "error",
        error?.response?.data?.message ||
          error?.message ||
          "Order place failed"
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  if (!liveProducts.length) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-3xl font-semibold">Your cart is empty</h2>
          <p className="mt-2 text-neutral-500">Add some products to checkout.</p>
          <Button asChild className="mt-6 rounded-full">
            <Link href={WEBSITE_SHOP}>Go to Shop</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 lg:px-6">
        {!verifiedOnce ? (
          <div className="mb-4 rounded-md border bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
            Verifying your cart...
          </div>
        ) : verifyError ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {verifyError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <div className="rounded-lg border bg-white">
              <div className="flex items-center gap-2 border-b px-5 py-4">
                <div className="grid h-8 w-8 place-items-center rounded-md bg-neutral-100">
                  <Truck size={16} />
                </div>
                <div>
                  <p className="font-semibold">Shipping Address</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <div className="mt-5">
                    <Form {...orderForm}>
                      <form
                        className="grid gap-5"
                        id="checkout-form"
                        onSubmit={orderForm.handleSubmit(placeOrder)}
                      >
                        <div className="mb-3">
                          <Label>
                            Full Name <span className="text-red-500">*</span>
                          </Label>

                          <div className="mt-3">
                            <FormField
                              control={orderForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      placeholder="Enter Your Name"
                                      className="rounded-none border-gray-400"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div>
                          <Label>
                            Phone Number <span className="text-red-500">*</span>
                          </Label>
                          <div className="mt-3">
                            <FormField
                              control={orderForm.control}
                              name="phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      placeholder="Enter Your Number"
                                      className="rounded-none border-gray-400"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div className="mb-3">
                          <Label>
                            Address <span className="text-red-500">*</span>
                          </Label>

                          <div className="mt-3">
                            <FormField
                              control={orderForm.control}
                              name="address"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      placeholder="Enter Your Address"
                                      className="rounded-none border-gray-400"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div className="mb-3">
                          <Label>
                            City / District{" "}
                            <span className="text-red-500">*</span>
                          </Label>

                          <div className="mt-3">
                            <FormField
                              control={orderForm.control}
                              name="city"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      placeholder="Enter your city name"
                                      className="rounded-none border-gray-400"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </form>
                    </Form>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="rounded-lg border bg-white lg:sticky lg:top-6">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <p className="font-semibold">Order Summary</p>
                <Link
                  href="/cart"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Modify
                </Link>
              </div>

              <div className="space-y-4 p-5">
                {liveProducts.map((p) => {
                  const qty = Number(p?.quantity || 1);
                  const price = Number(p?.sellingPrice || 0);
                  const lineTotal = price * qty;

                  const img =
                    typeof p?.media === "string" && p.media.trim()
                      ? p.media
                      : imgPlaceholder.src;

                  return (
                    <div
                      key={`${p.productId}-${p.variantId}`}
                      className="flex gap-3"
                    >
                      <div className="relative h-12 w-11 overflow-hidden rounded-md border bg-white">
                        <Image
                          src={img}
                          alt={p?.name || "product"}
                          fill
                          className="object-contain"
                          sizes="48px"
                          unoptimized
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium">
                          {p?.name}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {p?.size ? `Size: ${p.size}` : ""}
                          {p?.color ? ` • ${p.color}` : ""}
                          {` • Qty: ${qty}`}
                        </p>
                      </div>

                      <div className="text-sm font-semibold">
                        {formatCurrency(lineTotal)}
                      </div>
                    </div>
                  );
                })}

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-neutral-600">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>

                  {couponDiscountAmount > 0 && (
                    <div className="flex justify-between text-blue-700">
                      <span>Coupon Discount</span>
                      <span>- {formatCurrency(couponDiscountAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-neutral-600">
                    <span>
                      Shipping (
                      {shippingMethod === "inside_dhaka"
                        ? "Inside Dhaka"
                        : "Outside Dhaka"}
                      )
                    </span>

                    <span>{formatCurrency(shipping)}</span>
                  </div>

                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>Total</span>
                    <span className="text-lg">{formatCurrency(total)}</span>
                  </div>
                </div>

                <div className="pt-3">
                  {!isCouponApplied ? (
                    <Form {...couponForm}>
                      <form
                        className="flex justify-between gap-3"
                        onSubmit={couponForm.handleSubmit(applyCoupon)}
                      >
                        <div className="flex-1">
                          <FormField
                            control={couponForm.control}
                            name="code"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    placeholder="Enter coupon code"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="w-[100px]">
                          <ButtonLoading
                            type="submit"
                            text="Apply"
                            className="w-full"
                            loading={couponLoading}
                          />
                        </div>
                      </form>
                    </Form>
                  ) : (
                    <div className="flex items-center justify-between rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm">
                      <span className="font-medium text-green-700">
                        Coupon applied successfully
                      </span>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeCoupon}
                        className="text-red-500 hover:text-red-600"
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>

                <div className="pt-3">
                  <p className="mb-2 text-xs font-semibold">Shipping Method</p>

                  <RadioGroup
                    value={shippingMethod}
                    onValueChange={setShippingMethod}
                  >
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
                      <RadioGroupItem value="inside_dhaka" className="mt-1" />
                      <div className="flex-1">
                        <span className="text-sm font-semibold">
                          INSIDE DHAKA
                        </span>
                        <p className="text-xs text-neutral-500">
                          WITHIN 2–3 WORKING DAYS
                        </p>
                      </div>
                      <div className="text-sm font-semibold">
                        {formatCurrency(70)}
                      </div>
                    </label>

                    <label className="flex cursor-pointer items-start gap-2 rounded-md border p-3">
                      <RadioGroupItem value="outside_dhaka" />
                      <div className="flex-1">
                        <span className="text-sm font-semibold">
                          OUTSIDE DHAKA
                        </span>
                        <p className="text-xs text-neutral-500">
                          WITHIN 3–4 WORKING DAYS
                        </p>
                      </div>
                      <div className="text-sm font-semibold">
                        {formatCurrency(120)}
                      </div>
                    </label>
                  </RadioGroup>
                </div>

                <div className="pt-1">
                  <p className="mb-3 text-xs font-semibold">Payment Method</p>
                  <RadioGroup
                    value={payment}
                    onValueChange={setPayment}
                    className="space-y-2"
                  >
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
                      <RadioGroupItem value="cod" className="mt-1" />
                      <div className="flex-1">
                        <span className="text-sm font-semibold">
                          Cash on Delivery
                        </span>
                        <p className="text-xs text-neutral-500">
                          Pay when you receive.
                        </p>
                      </div>
                    </label>
                  </RadioGroup>
                </div>

                <Button
                  className="h-12 w-full"
                  form="checkout-form"
                  disabled={!verifiedOnce || placingOrder}
                >
                  {placingOrder
                    ? "Placing Order..."
                    : `Proceed to Payment • ${formatCurrency(total)}`}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-3 lg:hidden">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              Total: {formatCurrency(total)}
            </p>
            <Button
              form="checkout-form"
              className="h-10"
              disabled={!verifiedOnce || placingOrder}
            >
              {placingOrder ? "Placing..." : "Confirm Order"}
            </Button>
          </div>
        </div>

        <div className="h-16 lg:hidden" />
      </div>
    </div>
  );
}