"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { ShoppingBag, Truck, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

import imgPlaceholder from "@/public/assets/img-placeholder.webp";
import { WEBSITE_SHOP } from "@/Route/Websiteroute";

import useFetch from "@/hooks/useFetch";
import { clearCart, addIntoCart } from "@/store/reducer/cartReducer";





const formatCurrency = (amount) =>
  Number(amount || 0).toLocaleString("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  });

const CITIES = [
  { id: "dhaka", name: "Dhaka", shipping: 60 },
  { id: "chattogram", name: "Chattogram", shipping: 100 },
  { id: "sylhet", name: "Sylhet", shipping: 120 },
  { id: "other", name: "Other", shipping: 150 },
];

export default function CheckoutPage() {
    const [payLoading, setPayLoading] = useState(false);

  const dispatch = useDispatch();
  const cartStore = useSelector((s) => s.cartStore);
  const products = Array.isArray(cartStore?.products) ? cartStore.products : [];

  // ✅ verify status
  const [verifiedOnce, setVerifiedOnce] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  // ✅ IMPORTANT: body memo না করলে stringify এর জন্য বারবার call হতে পারে
  const verifyBody = useMemo(() => {
    return { products }; // ✅ backend expects "products"
  }, [products]);

  // ✅ POST verify (your useFetch supports POST now)
  const { data: getVerifiedCartData, error: verifyErr } = useFetch(
    products.length ? "/api/cart-verification" : null,
    "POST",
    verifyBody
  );

  // ✅ sync verified cart to redux (ONLY ONCE)
  useEffect(() => {
    if (verifiedOnce) return;

    if (getVerifiedCartData?.success) {
      const cartData = Array.isArray(getVerifiedCartData?.data)
        ? getVerifiedCartData.data
        : [];

      dispatch(clearCart());
      cartData.forEach((cartItem) => dispatch(addIntoCart(cartItem)));

      setVerifiedOnce(true);
      setVerifyError("");
    } else if (getVerifiedCartData && getVerifiedCartData?.success === false) {
      setVerifyError(getVerifiedCartData?.message || "Cart verification failed");
      setVerifiedOnce(true);
    }
  }, [getVerifiedCartData, verifiedOnce, dispatch]);

  useEffect(() => {
    if (verifyErr) {
      setVerifyError(verifyErr?.response?.data?.message || "Server error verifying cart");
    }
  }, [verifyErr]);

  // ---- FORM STATE ----
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [address, setAddress] = useState("");
  const [cityId, setCityId] = useState("dhaka");
  const [altPhone, setAltPhone] = useState("");
  const [note, setNote] = useState("");

  // ---- Coupon + Payment ----
  const [coupon, setCoupon] = useState("");
  const [payment, setPayment] = useState("cod");
  const [agree, setAgree] = useState(true);

  // ✅ after sync, take products from redux again
  const liveProducts = Array.isArray(cartStore?.products) ? cartStore.products : [];

  // ---- CALC ----
  const subtotal = useMemo(() => {
    return liveProducts.reduce((acc, item) => {
      const price = Number(item?.sellingPrice || 0);
      const qty = Number(item?.quantity || 1);
      return acc + price * qty;
    }, 0);
  }, [liveProducts]);

  const MEMBER_DISCOUNT_RATE = 0.1;
  const memberDiscount = useMemo(() => {
    return subtotal > 0 ? subtotal * MEMBER_DISCOUNT_RATE : 0;
  }, [subtotal]);

  const shipping = useMemo(() => {
    const found = CITIES.find((c) => c.id === cityId);
    return found ? found.shipping : 0;
  }, [cityId]);

  const total = Math.max(subtotal - memberDiscount + shipping, 0);

  const onApplyCoupon = () => alert(`Coupon applied (demo): ${coupon || "(empty)"}`);

//   const onProceed = () => {
//     if (!liveProducts.length) return;

//     if (!fullName || !phone || !address || !cityId) {
//       alert("Please fill required fields (Name, Phone, Address, City).");
//       return;
//     }
//     if (!agree) {
//       alert("Please agree to Terms & Conditions.");
//       return;
//     }

//     alert(`Proceeding (demo)\nPayment: ${payment}\nTotal: ${total}`);
//   };


// const onProceed = async () => {
//     console.log("Selected payment:", payment);

//   if (!liveProducts.length) return;

//   if (!fullName || !phone || !address || !cityId) {
//     alert("Please fill required fields (Name, Phone, Address, City).");
//     return;
//   }
//   if (!agree) {
//     alert("Please agree to Terms & Conditions.");
//     return;
//   }

//   // ✅ COD: just place order normally (your existing flow)
//   if (payment === "cod") {
//     alert(`COD Order placed (demo)\nTotal: ${total}`);
//     return;
//   }

//   // ✅ SSLCommerz: redirect flow
//   try {
//     setPayLoading(true);

//     const res = await fetch("/api/payment/sslcommerz/init", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         customer: {
//           name: fullName,
//           email,
//           phone,
//           address,
//           cityId,
//           altPhone,
//           note,
//         },
//         // ✅ send only what server needs (variantId + qty)
//         products: liveProducts.map((p) => ({
//           variantId: p.variantId,
//           quantity: Number(p.quantity || 1),
//         })),
//       }),
//     });

//     const data = await res.json();

//     if (!data?.success || !data?.gatewayUrl) {
//       alert(data?.message || "Payment init failed");
//       setPayLoading(false);
//       return;
//     }

//     // ✅ Redirect to SSLCommerz
//     window.location.href = data.gatewayUrl;
//   } catch (e) {
//     console.error(e);
//     alert("Server error starting payment");
//     setPayLoading(false);
//   }
// };

const onProceed = async () => {
  if (!liveProducts.length) return;

  if (!fullName || !phone || !address || !cityId) {
    alert("Please fill required fields (Name, Phone, Address, City).");
    return;
  }
  if (!agree) {
    alert("Please agree to Terms & Conditions.");
    return;
  }

  try {
    setPayLoading(true);

    const customer = {
      name: fullName,
      email,
      phone,
      address,
      cityId,
      altPhone,
      note,
    };

    const items = liveProducts.map((p) => ({
      variantId: p.variantId,
      quantity: Number(p.quantity || 1),
    }));

    // ✅ Unified checkout
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: payment, // "cod" | "bkash" | "sslcommerz"
        customer,
        items,
      }),
    });

    const data = await res.json();

    if (!data?.success) {
      alert(data?.message || "Checkout failed");
      setPayLoading(false);
      return;
    }

    // ✅ COD: order placed (stay on site)
    if (data.method === "cod") {
      // optional: clear cart
      dispatch(clearCart());
      alert(`Order placed! Order: ${data.orderNumber || ""}`);
      // or router.push(`/order/${data.orderId}`)
      setPayLoading(false);
      return;
    }

    // ✅ bKash redirect
    if (data.method === "bkash") {
      if (!data?.bkashURL) {
        alert("bKash URL missing");
        setPayLoading(false);
        return;
      }
      window.location.href = data.bkashURL;
      return;
    }

    // ✅ SSLCommerz redirect
    if (data.method === "sslcommerz") {
      if (!data?.gatewayUrl) {
        alert("Gateway URL missing");
        setPayLoading(false);
        return;
      }
      window.location.href = data.gatewayUrl;
      return;
    }

    alert("Unknown checkout method response");
    setPayLoading(false);
  } catch (e) {
    console.error(e);
    alert("Server error starting checkout");
    setPayLoading(false);
  }
};



  if (!liveProducts.length) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-3xl font-semibold">Your cart is empty</h2>
          <p className="text-neutral-500 mt-2">Add some products to checkout.</p>
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
        {/* ✅ verify status UI */}
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
          {/* LEFT */}
          <div className="lg:col-span-8 space-y-6">
            {/* Contact */}
            <div className="rounded-lg border bg-white">
              <div className="px-5 py-4 border-b flex items-center gap-2">
                <div className="h-8 w-8 rounded-md bg-neutral-100 grid place-items-center">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <p className="font-semibold">Contact Information</p>
                  <p className="text-xs text-neutral-500">
                    We’ll use this to update you about your order.
                  </p>
                </div>
              </div>

              <div className="p-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label>
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>

                <div>
                  <Label>Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                <div>
                  <Label>
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Shipping */}
            <div className="rounded-lg border bg-white">
              <div className="px-5 py-4 border-b flex items-center gap-2">
                <div className="h-8 w-8 rounded-md bg-neutral-100 grid place-items-center">
                  <Truck size={16} />
                </div>
                <div>
                  <p className="font-semibold">Shipping Address</p>
                  <p className="text-xs text-neutral-500">
                    Delivery within 2–3 days after confirmation.
                  </p>
                </div>
              </div>

              <div className="p-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label>
                    Detailed Address <span className="text-red-500">*</span>
                  </Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>

                <div>
                  <Label>
                    City / District <span className="text-red-500">*</span>
                  </Label>
                  <select
                    value={cityId}
                    onChange={(e) => setCityId(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {CITIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Alt. Phone</Label>
                  <Input value={altPhone} onChange={(e) => setAltPhone(e.target.value)} />
                </div>

                <div className="md:col-span-2">
                  <Label>Note for Delivery</Label>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-4">
            <div className="rounded-lg border bg-white lg:sticky lg:top-6">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <p className="font-semibold">Order Summary</p>
                <Link href="/cart" className="text-sm text-blue-600 hover:underline">
                  Modify
                </Link>
              </div>

              <div className="p-5 space-y-4">
                {liveProducts.map((p) => {
                  const qty = Number(p?.quantity || 1);
                  const price = Number(p?.sellingPrice || 0);
                  const lineTotal = price * qty;

                  const img =
                    typeof p?.media === "string" && p.media.trim()
                      ? p.media
                      : imgPlaceholder.src;

                  return (
                    <div key={`${p.productId}-${p.variantId}`} className="flex gap-3">
                      <div className="relative h-12 w-12 rounded-md overflow-hidden border bg-white">
                        <Image
                          src={img}
                          alt={p?.name || "product"}
                          fill
                          className="object-cover"
                          sizes="48px"
                          unoptimized
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium line-clamp-1">{p?.name}</p>
                        <p className="text-xs text-neutral-500">
                          {p?.size ? `Size: ${p.size}` : ""}
                          {p?.color ? ` • ${p.color}` : ""}
                          {` • Qty: ${qty}`}
                        </p>
                      </div>

                      <div className="text-sm font-semibold">{formatCurrency(lineTotal)}</div>
                    </div>
                  );
                })}

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-neutral-600">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>

                  <div className="flex justify-between text-emerald-700">
                    <span>Member Discount</span>
                    <span>- {formatCurrency(memberDiscount)}</span>
                  </div>

                  <div className="flex justify-between text-neutral-600">
                    <span>
                      Shipping ({CITIES.find((c) => c.id === cityId)?.name || "City"})
                    </span>
                    <span>{formatCurrency(shipping)}</span>
                  </div>

                  <div className="pt-2 border-t flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-lg">{formatCurrency(total)}</span>
                  </div>
                </div>

                {/* coupon */}
                <div className="pt-3">
                  <p className="text-xs font-semibold mb-2">Coupon</p>
                  <div className="flex gap-2">
                    <Input value={coupon} onChange={(e) => setCoupon(e.target.value)} />
                    <Button variant="secondary" onClick={onApplyCoupon}>
                      Apply
                    </Button>
                  </div>
                </div>

                {/* payment */}
                <div className="pt-4">
                  <p className="text-xs font-semibold mb-3">Payment Method</p>
                  <RadioGroup value={payment} onValueChange={setPayment} className="space-y-2">
                    <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
                      <RadioGroupItem value="cod" className="mt-1" />
                      <div className="flex-1">
                        <span className="text-sm font-semibold">Cash on Delivery</span>
                        <p className="text-xs text-neutral-500">Pay when you receive.</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
                      <RadioGroupItem value="card" className="mt-1" />
                      <div className="flex-1">
                        <span className="text-sm font-semibold">Card Payment</span>
                        <p className="text-xs text-neutral-500">via SSLCommerz</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
                      <RadioGroupItem value="bkash" className="mt-1" />
                      <div className="flex-1">
                        <span className="text-sm font-semibold">bKash</span>
                        <p className="text-xs text-neutral-500">Mobile wallet</p>
                      </div>
                    </label>
                  </RadioGroup>
                </div>

                {/* terms */}
                <div className="pt-2 flex items-start gap-2">
                  <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} />
                  <p className="text-xs text-neutral-600">
                    I agree to the{" "}
                    <Link href="/terms" className="underline">
                      Terms & Conditions
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="underline">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </div>

                <Button className="w-full h-12" onClick={onProceed} disabled={!verifiedOnce}>
                  Proceed to Payment • {formatCurrency(total)}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE BAR */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t bg-white p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Total: {formatCurrency(total)}</p>
            <Button onClick={onProceed} className="h-10" disabled={!verifiedOnce}>
              Confirm Order
            </Button>
          </div>
        </div>

        <div className="lg:hidden h-16" />
      </div>
    </div>
  );
}
