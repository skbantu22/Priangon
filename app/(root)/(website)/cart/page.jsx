"use client";

import React, { useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSelector, useDispatch } from "react-redux";
import { Trash2, Minus, Plus, ArrowLeft } from "lucide-react";

import { WEBSITE_PRODUCT_DETAILS, WEBSITE_SHOP } from "@/Route/Websiteroute";
import imgPlaceholder from "@/public/assets/img-placeholder.webp";
import { trackMetaEvent } from "@/lib/meta/metaTrack";

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
  const hasTrackedView = useRef(false);

  const products = Array.isArray(cart?.products) ? cart.products : [];

  // Calculate Subtotal and Total Savings based on MRP
  const { subtotal, totalSavings } = useMemo(() => {
    return products.reduce(
      (acc, item) => {
        const price = Number(item?.sellingPrice || 0);
        const mrp = Number(item?.mrp || price); // Fallback to sellingPrice if MRP is missing
        const qty = Number(item?.quantity || 1);

        acc.subtotal += price * qty;
        if (mrp > price) {
          acc.totalSavings += (mrp - price) * qty;
        }
        return acc;
      },
      { subtotal: 0, totalSavings: 0 },
    );
  }, [products]);

  const total = subtotal;

  // --- TRACKING LOGIC ---
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
  };

  const onInc = (p) => {
    dispatch(
      increaseQuantity({ productId: p.productId, variantId: p.variantId }),
    );
  };

  const onRemove = (p) => {
    dispatch(
      removeFromCart({ productId: p.productId, variantId: p.variantId }),
    );
  };

  const handleCheckoutClick = () => {
    trackMetaEvent("InitiateCheckout", {
      content_ids: products.map((p) => String(p.productId)),
      content_type: "product",
      value: Number(total),
      currency: "BDT",
      num_items: products.length,
    });
  };

  if (!products.length) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col justify-center items-center px-4">
        <h4 className="text-2xl font-bold uppercase tracking-widest mb-6">
          Your Bag is Empty
        </h4>
        <Link
          href={WEBSITE_SHOP}
          className="bg-black text-white px-10 py-4 text-xs font-bold uppercase tracking-[0.2em]"
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
                const mrp = Number(p?.mrp || price);
                const lineTotal = price * qty;
                const savingsPerItem = mrp > price ? mrp - price : 0;

                return (
                  <div
                    key={`${p.productId}-${p.variantId}`}
                    className="py-8 first:pt-0 group"
                  >
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="relative h-40 w-32 bg-neutral-50 overflow-hidden shrink-0 border border-neutral-100">
                        <Image
                          src={p?.media || imgPlaceholder.src}
                          alt={p?.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>

                      <div className="flex flex-1 flex-col justify-between py-1">
                        <div>
                          <div className="flex justify-between items-start">
                            <Link
                              href={WEBSITE_PRODUCT_DETAILS(p?.slug)}
                              className="text-lg font-bold uppercase tracking-tight text-black"
                            >
                              {p?.name}
                            </Link>
                            <button
                              onClick={() => onRemove(p)}
                              className="text-neutral-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                          <div className="flex gap-4 mt-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                            {p?.color && <span>Color: {p.color}</span>}
                            {p?.size && <span>Size: {p.size}</span>}
                          </div>

                          {/* Item Level Savings Display */}
                          {savingsPerItem > 0 && (
                            <p className="text-[9px] font-bold text-emerald-600 mt-2 uppercase tracking-tighter">
                              You save {formatCurrency(savingsPerItem * qty)} on
                              this item
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-end justify-between mt-6 gap-4">
                          <div className="flex items-center border border-gray-200">
                            <button
                              onClick={() => onDec(p)}
                              className="h-7 w-7 flex items-center justify-center"
                              disabled={qty <= 1}
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-8 text-center text-[12px] font-bold border-x border-gray-200">
                              {qty}
                            </span>
                            <button
                              onClick={() => onInc(p)}
                              className="h-7 w-7 flex items-center justify-center"
                              disabled={p.stock !== undefined && qty >= p.stock}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">
                              Total
                            </p>
                            <div className="flex flex-col items-end">
                              {mrp > price && (
                                <span className="text-[10px] text-neutral-400 line-through">
                                  {formatCurrency(mrp * qty)}
                                </span>
                              )}
                              <p className="text-lg font-light text-black">
                                {formatCurrency(lineTotal)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="bg-neutral-50 p-8 sticky top-24 border border-neutral-100">
              <h3 className="text-xs font-bold uppercase tracking-[0.3em] mb-8 border-b border-neutral-200 pb-4">
                Order Summary
              </h3>

              <div className="space-y-4 text-[11px] font-bold uppercase tracking-widest">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Subtotal</span>
                  <span className="text-black">
                    {formatCurrency(subtotal + totalSavings)}
                  </span>
                </div>

                {/* The "MRP Discount" row */}
                {totalSavings > 0 && (
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Discount (MRP)</span>
                    <span className="text-emerald-600">
                      -{formatCurrency(totalSavings)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-base pt-4 border-t border-neutral-200">
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
                className="w-full mt-10 bg-black text-white py-5 text-[11px] font-bold uppercase tracking-[0.3em] flex items-center justify-center"
              >
                Proceed to Checkout
              </Link>

              {totalSavings > 0 && (
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 text-center">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">
                    You are saving {formatCurrency(totalSavings)} on this order!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
