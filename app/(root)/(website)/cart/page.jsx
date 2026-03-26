"use client";

import React, { useMemo, useEffect, useRef } from "react"; // Added useEffect, useRef
import Link from "next/link";
import Image from "next/image";
import { useSelector, useDispatch } from "react-redux";
import { Trash2, Minus, Plus, ArrowLeft } from "lucide-react";

import { WEBSITE_PRODUCT_DETAILS, WEBSITE_SHOP } from "@/Route/Websiteroute";
import imgPlaceholder from "@/public/assets/img-placeholder.webp";
import { trackMetaEvent } from "@/lib/meta/metaTrack"; // Import your tracker

import {
  increaseQuantity,
  decreaseQuantity,
  removeFromCart,
} from "@/store/reducer/cartReducer";

const formatCurrency = (amount) =>
  `৳${Number(amount || 0).toLocaleString("en-BD")}`;

export default function Page() {
  const cart = useSelector((store) => store.cartStore);
  const dispatch = useDispatch();
  const hasTrackedView = useRef(false); // To prevent double firing in Strict Mode

  const products = Array.isArray(cart?.products) ? cart.products : [];

  const subtotal = useMemo(() => {
    return products.reduce((acc, item) => {
      const price = Number(item?.sellingPrice || 0);
      const qty = Number(item?.quantity || 1);
      return acc + price * qty;
    }, 0);
  }, [products]);

  const MEMBER_DISCOUNT_RATE = 0.1;
  const memberDiscount = useMemo(() => {
    return subtotal > 0 ? subtotal * MEMBER_DISCOUNT_RATE : 0;
  }, [subtotal]);

  const shipping = 0;
  const total = subtotal - memberDiscount + shipping;

  // --- TRACKING LOGIC ---

  // 1. ViewCart: Fire once when page loads
  useEffect(() => {
    if (products.length > 0 && !hasTrackedView.current) {
      trackMetaEvent("ViewCart", {
        content_ids: products.map((p) => String(p.productId)),
        content_type: "product",
        value: Number(subtotal),
        currency: "BDT",
        num_items: products.length,
      });
      hasTrackedView.current = true;
    }
  }, [products.length, subtotal]);

  const onDec = (p) => {
    dispatch(
      decreaseQuantity({ productId: p.productId, variantId: p.variantId }),
    );
    // Track quantity decrease
    trackMetaEvent("RemoveFromCart", {
      content_ids: [String(p.productId)],
      content_type: "product",
      value: Number(p.sellingPrice),
      currency: "BDT",
      content_name: p.name,
    });
  };

  const onInc = (p) => {
    dispatch(
      increaseQuantity({ productId: p.productId, variantId: p.variantId }),
    );
    // Track quantity increase as AddToCart
    trackMetaEvent("AddToCart", {
      content_ids: [String(p.productId)],
      content_type: "product",
      value: Number(p.sellingPrice),
      currency: "BDT",
      content_name: p.name,
    });
  };

  const onRemove = (p) => {
    dispatch(
      removeFromCart({ productId: p.productId, variantId: p.variantId }),
    );
    trackMetaEvent("RemoveFromCart", {
      content_ids: [String(p.productId)],
      content_type: "product",
      value: Number(p.sellingPrice * (p.quantity || 1)),
      currency: "BDT",
      content_name: p.name,
    });
  };

  const handleCheckoutClick = () => {
    trackMetaEvent("InitiateCheckout", {
      content_ids: products.map((p) => String(p.productId)),
      content_type: "product",
      value: Number(total), // Use the final estimated total here
      currency: "BDT",
      num_items: products.length,
    });
  };

  // --- RENDER LOGIC ---

  if (!products.length) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col justify-center items-center px-4">
        <h4 className="text-2xl font-bold uppercase tracking-widest mb-6">
          Your Bag is Empty
        </h4>
        <Link
          href={WEBSITE_SHOP}
          className="bg-black text-white px-10 py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all"
        >
          Explore Collection
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full bg-white antialiased min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-6 py-16">
        <div className="border-b border-neutral-100 pb-8 mb-12">
          <h1 className="text-3xl font-bold uppercase tracking-tighter text-black">
            Shopping Bag
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400 mt-2">
            {products.length} {products.length > 1 ? "Items" : "Item"} Selected
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-8">
            <div className="divide-y divide-neutral-100">
              {products.map((p) => {
                const qty = Number(p?.quantity || 1);
                const price = Number(p?.sellingPrice || 0);
                const lineTotal = price * qty;
                const img = p?.media || imgPlaceholder.src;

                return (
                  <div
                    key={`${p.productId}-${p.variantId}`}
                    className="py-8 first:pt-0 group"
                  >
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="relative h-40 w-32 bg-neutral-50 overflow-hidden shrink-0 border border-neutral-100">
                        <Image
                          src={img}
                          alt={p?.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          unoptimized
                        />
                      </div>

                      <div className="flex flex-1 flex-col justify-between py-1">
                        <div>
                          <div className="flex justify-between items-start">
                            <Link
                              href={WEBSITE_PRODUCT_DETAILS(p?.slug)}
                              className="text-lg font-bold uppercase tracking-tight text-black hover:text-neutral-600 transition-colors"
                            >
                              {p?.name}
                            </Link>
                            <button
                              onClick={() => onRemove(p)}
                              className="text-neutral-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={18} strokeWidth={1.5} />
                            </button>
                          </div>

                          <div className="flex gap-4 mt-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                            {p?.color && <span>Color: {p.color}</span>}
                            {p?.size && <span>Size: {p.size}</span>}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-end justify-between mt-6 gap-4">
                          <div className="flex items-center border border-gray-200">
                            <button
                              onClick={() => onDec(p)}
                              className="h-7 w-7 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30"
                              disabled={qty <= 1}
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-8 text-center text-[12px] font-bold border-x border-gray-200">
                              {qty}
                            </span>
                            <button
                              onClick={() => onInc(p)}
                              className={`h-7 w-7 flex items-center justify-center hover:bg-gray-50 ${p.stock !== undefined && qty >= p.stock ? "opacity-30 cursor-not-allowed" : ""}`}
                              disabled={p.stock !== undefined && qty >= p.stock}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">
                              Total
                            </p>
                            <p className="text-lg font-light text-black">
                              {formatCurrency(lineTotal)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Link
              href={WEBSITE_SHOP}
              className="inline-flex items-center gap-2 mt-12 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 hover:text-black transition-all"
            >
              <ArrowLeft size={14} /> Continue Shopping
            </Link>
          </div>

          <div className="lg:col-span-4">
            <div className="bg-neutral-50 p-8 sticky top-24 border border-neutral-100">
              <h3 className="text-xs font-bold uppercase tracking-[0.3em] mb-8 border-b border-neutral-200 pb-4">
                Order Summary
              </h3>

              <div className="space-y-4 text-[11px] font-bold uppercase tracking-widest">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Subtotal</span>
                  <span className="text-black">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">
                    Member Discount (10%)
                  </span>
                  <span className="text-emerald-600">
                    -{formatCurrency(memberDiscount)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-neutral-200 pb-4">
                  <span className="text-neutral-400">Shipping</span>
                  <span className="text-black">
                    {shipping === 0
                      ? "Complimentary"
                      : formatCurrency(shipping)}
                  </span>
                </div>
                <div className="flex justify-between text-base pt-4">
                  <span className="text-black tracking-tighter">
                    Estimated Total
                  </span>
                  <span className="text-black text-xl">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              <Link
                href="/checkout"
                onClick={handleCheckoutClick}
                className="w-full mt-10 bg-black text-white py-5 text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-neutral-800 transition-all active:scale-[0.98] flex items-center justify-center"
              >
                Proceed to Checkout
              </Link>

              <p className="text-[9px] text-neutral-400 uppercase tracking-widest mt-6 text-center leading-relaxed">
                Taxes and duties calculated at checkout.
                <br />
                Secure encrypted payment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
