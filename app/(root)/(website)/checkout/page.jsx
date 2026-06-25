"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form } from "@/components/ui/form";

import { WEBSITE_SHOP } from "@/Route/Websiteroute";
import useFetch from "@/hooks/useFetch";
import { setCart } from "@/store/reducer/cartReducer";
import { zSchema } from "@/lib/zodschema";
import { showToast } from "@/lib/showToast";

import ShippingOptions from "@/components/ui/Application/website/checkout/ShippingOptions";
import PaymentBox from "@/components/ui/Application/website/checkout/PaymentBox";
import CouponBox from "@/components/ui/Application/website/checkout/CouponBox";
import OrderSummary from "@/components/ui/Application/website/checkout/OrderSummary";
import PaymentProofUpload from "@/components/ui/Application/website/checkout/PaymentProofUpload";
import { Loader2 } from "lucide-react";

const formatCurrency = (amount) =>
  Number(amount || 0).toLocaleString("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  });

export default function CheckoutPage() {
  const dispatch = useDispatch();
  const router = useRouter();

  const cartStore = useSelector((state) => state.cartStore);
  const authStore = useSelector((state) => state.authStore);

  const userRole = authStore?.auth?.data?.user?.role;

  const canSeePaymentProof = userRole === "admin" || userRole === "moderator";

  // ================= LOCAL CHECKOUT STATE (IMPORTANT FIX) =================
  const [checkoutProducts, setCheckoutProducts] = useState([]);

  useEffect(() => {
    if (!cartStore?.products) return;

    setCheckoutProducts(
      cartStore.products.map((p) => ({
        ...p,
        quantity: p.quantity || 1,
      })),
    );
  }, [cartStore?.products]);

  const [paymentProof, setPaymentProof] = useState("");
  const [shippingMethod, setShippingMethod] = useState("inside_dhaka");
  const [payment, setPayment] = useState("cod");
  const [placingOrder, setPlacingOrder] = useState(false);

  const [coupon, setCoupon] = useState(null);
  const [discount, setDiscount] = useState(0);

  const [transactionNumber, setTransactionNumber] = useState("");

  // ================= PRICE =================
  const subtotal = useMemo(() => {
    return checkoutProducts.reduce((acc, item) => {
      return (
        acc + Number(item?.sellingPrice || 0) * Number(item?.quantity || 1)
      );
    }, 0);
  }, [checkoutProducts]);

  const shipping = shippingMethod === "inside_dhaka" ? 80 : 150;

  const totalDiscount = discount + (coupon?.discountAmount || 0);

  const total = Math.max(subtotal + shipping - totalDiscount, 0);

  // ================= HANDLERS (FIXED - NO REDUX) =================
  const handleIncrease = (id) => {
    setCheckoutProducts((prev) =>
      prev.map((item) =>
        item.productId === id
          ? { ...item, quantity: (item.quantity || 1) + 1 }
          : item,
      ),
    );
  };

  const handleDecrease = (id) => {
    setCheckoutProducts((prev) =>
      prev
        .map((item) =>
          item.productId === id
            ? { ...item, quantity: (item.quantity || 1) - 1 }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const handleRemove = (id) => {
    setCheckoutProducts((prev) => prev.filter((item) => item.productId !== id));
  };

  // ================= FORM =================
  const orderForm = useForm({
    resolver: zodResolver(
      zSchema
        .pick({
          name: true,
          phone: true,
          address: true,
          city: true,
        })
        .extend({
          note: z.string().optional(),
        }),
    ),
    defaultValues: {
      name: authStore?.auth?.name || "",
      phone: authStore?.auth?.phone || "",
      address: authStore?.auth?.address || "",
      city: authStore?.auth?.city || "",
      note: "",
    },
  });

  // ================= CART VERIFY =================
  const { data: verifyData } = useFetch(
    checkoutProducts.length ? "/api/cart-verification" : null,
    "POST",
    { products: checkoutProducts },
  );

  useEffect(() => {
    if (!verifyData) return;

    if (verifyData.success) {
      dispatch(setCart(verifyData.data || []));
    }
  }, [verifyData]);

  // ================= COUPON =================
  const applyCoupon = async (code) => {
    try {
      const { data } = await axios.post("/api/coupon/apply", {
        code: code?.trim().toUpperCase(),
        minShoppingAmount: subtotal,
      });

      const discountAmount =
        (subtotal * (data?.data?.discountPercentage || 0)) / 100;

      setCoupon(data.data);
      setDiscount(discountAmount);

      showToast("success", "Coupon applied");
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Coupon failed");
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    setDiscount(0);
  };

  // ================= ORDER =================
  const placeOrder = async (formData) => {
    setPlacingOrder(true);

    const payload = {
      method: payment,

      userId: authStore?.auth?.data?.user?.id || null,

      customer: {
        ...formData,
        cityId: shippingMethod === "inside_dhaka" ? "dhaka" : "other",
      },

      items: checkoutProducts.map((p) => ({
        productId: p.productId,
        variantId: p.variantId || p.productId,
        quantity: Number(p.quantity || 1),
        price: Number(p.sellingPrice || 0),
      })),

      coupon: coupon ? { code: coupon.code } : null,

      // ✅ GLOBAL NOTE (IMPORTANT FIX)
      note: formData.note || "",

      // ✅ PAYMENT PROOF IMAGE
      paymentProof: paymentProof || null,

      paymentDetails: {
        method: payment, // cod / bkash / nagad etc
        transactionNumber:
          payment === "bkash" ? transactionNumber || null : null,
      },
    };
    console.log("🔥 CHECKOUT PAYLOAD:", payload);

    try {
      const { data } = await axios.post("/api/checkout", payload);

      if (!data.success) throw new Error(data.message);

      dispatch(setCart([]));
      setCheckoutProducts([]);

      router.push(`/order/success?id=${data.orderId}`);
      showToast("success", "Order placed");
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setPlacingOrder(false);
    }
  };

  // ================= EMPTY CART =================
  if (!checkoutProducts.length) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <h2>Your cart is empty</h2>
          <Link href={WEBSITE_SHOP}>Go to Shop</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black uppercase mb-6">Checkout</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT */}
        <div className="w-full lg:w-[65%] space-y-5">
          <div className="bg-white border-2 border-black p-5">
            <h2 className="font-bold mb-3">Customer Info</h2>

            <Form {...orderForm}>
              <form
                id="checkout-form"
                onSubmit={orderForm.handleSubmit(placeOrder)}
                className="space-y-3"
              >
                <Input
                  {...orderForm.register("name")}
                  placeholder="Name"
                  className="rounded-none border border-gray-400"
                />
                <Input
                  {...orderForm.register("phone")}
                  placeholder="Phone"
                  className="rounded-none border border-gray-400"
                />
                <Input
                  {...orderForm.register("address")}
                  placeholder="Address"
                  className="rounded-none border border-gray-400"
                />
                <Input
                  {...orderForm.register("city")}
                  placeholder="City"
                  className="rounded-none border border-gray-400"
                />
                <Textarea
                  {...orderForm.register("note")}
                  placeholder="Note"
                  className="rounded-none border border-gray-400"
                />
              </form>
            </Form>
          </div>

          <div className="bg-white border-2 border-black p-5">
            <h2 className="font-bold mb-3">Shipping</h2>
            <ShippingOptions
              value={shippingMethod}
              onChange={setShippingMethod}
            />
          </div>

          {canSeePaymentProof && (
            <div className="bg-white border p-5">
              <h2 className="font-bold mb-3">Payment Proof</h2>
              <PaymentProofUpload
                value={paymentProof}
                onChange={setPaymentProof}
                disabled={placingOrder}
              />
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="w-full lg:w-[35%] space-y-5">
          <OrderSummary
            products={checkoutProducts}
            subtotal={subtotal}
            shipping={shipping}
            discount={discount}
            couponDiscount={coupon?.discountAmount || 0}
            formatCurrency={formatCurrency}
            onIncrease={handleIncrease}
            onDecrease={handleDecrease}
            onRemove={handleRemove}
          />

          <PaymentBox
            value={payment}
            setValue={setPayment}
            userRole={userRole}
            shippingMethod={shippingMethod}
            transactionNumber={transactionNumber}
            setTransactionNumber={setTransactionNumber}
          />

          <CouponBox
            coupon={coupon}
            onApply={applyCoupon}
            onRemove={removeCoupon}
          />

          <Button
            form="checkout-form"
            disabled={placingOrder}
            className="w-full bg-black text-white font-black uppercase rounded-none"
          >
            {placingOrder ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Placing...
              </span>
            ) : (
              "Place Order"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
