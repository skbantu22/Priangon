"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BsCart2 } from "react-icons/bs";
import { Minus, Plus, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import Image from "next/image";
import {
  removeFromCart,
  increaseQuantity,
  decreaseQuantity,
} from "@/store/reducer/cartReducer";
import { Button } from "@/components/ui/button";
import imgPlaceholder from "@/public/assets/img-placeholder.webp";
import { showToast } from "@/lib/showToast";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { trackMetaEvent } from "@/lib/meta/metaTrack"; // ✅ Import your tracker

const formatPrice = (value) => {
  return `Tk ${Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const Cart = ({ active }) => {
  const dispatch = useDispatch();
  const { products, count } = useSelector((store) => store.cartStore);
  const [toastMessage, setToastMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Toast handler
  useEffect(() => {
    if (toastMessage) {
      showToast("error", toastMessage);
      setToastMessage("");
    }
  }, [toastMessage]);

  const subtotal = useMemo(() => {
    return products.reduce((acc, item) => {
      return acc + Number(item.sellingPrice || 0) * Number(item.quantity || 0);
    }, 0);
  }, [products]);

  // 🔥 1. Track ViewCart ONLY when drawer opens
  useEffect(() => {
    if (isOpen && products.length > 0) {
      trackMetaEvent("ViewCart", {
        content_ids: products.map((p) => String(p.productId)),
        content_type: "product",
        value: Number(subtotal),
        currency: "BDT",
        num_items: products.length,
      });
      console.log("✅ Meta: ViewCart Tracked");
    }
  }, [isOpen]); // Only depends on isOpen

  // ➕ 2. Handle Increase + Tracking
  const handleIncrease = (item) => {
    dispatch(
      increaseQuantity({
        productId: item.productId,
        variantId: item.variantId,
      }),
    );

    trackMetaEvent("AddToCart", {
      content_ids: [String(item.productId)],
      content_type: "product",
      value: Number(item.sellingPrice),
      currency: "BDT",
      content_name: item.name,
    });
  };

  // ➖ 3. Handle Decrease + Tracking
  const handleDecrease = (item) => {
    dispatch(
      decreaseQuantity({
        productId: item.productId,
        variantId: item.variantId,
      }),
    );

    trackMetaEvent("RemoveFromCart", {
      content_ids: [String(item.productId)],
      content_type: "product",
      value: Number(item.sellingPrice),
      currency: "BDT",
      content_name: item.name,
    });
  };

  // ❌ 4. Handle Remove + Tracking
  const handleRemove = (item) => {
    dispatch(
      removeFromCart({ productId: item.productId, variantId: item.variantId }),
    );

    trackMetaEvent("RemoveFromCart", {
      content_ids: [String(item.productId)],
      content_type: "product",
      value: Number(item.sellingPrice * item.quantity),
      currency: "BDT",
      content_name: item.name,
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <div className="relative flex items-center justify-center cursor-pointer">
          <BsCart2 size={active ? 24 : 22} />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#f26522] text-[9px] font-bold text-white ring-2 ring-white">
              {count}
            </span>
          )}
        </div>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-72 !sm:w-60 md:w-[400px] lg:w-[400px] p-0 bg-white border-l shadow-xl flex flex-col"
      >
        <SheetHeader className="flex flex-start w-full bg-gray-100 border-b text-center py-4 px-2 mt-1">
          <SheetTitle className="text-xs font-semibold tracking-widest uppercase">
            Shopping Bag
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {products.length === 0 ? (
            <div className="flex h-full items-center justify-center text-gray-400">
              Empty Cart
            </div>
          ) : (
            <div className="divide-y">
              {products.map((item) => (
                <div key={item.productId} className="p-4 flex gap-3">
                  <Image
                    src={item.media || imgPlaceholder}
                    width={60}
                    height={60}
                    alt={item.name}
                  />
                  <div className="flex-1">
                    <h4 className="text-sm">{item.name}</h4>
                    <p className="text-xs text-gray-500">
                      Qty: {item.quantity}
                    </p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-bold text-sm">
                        {formatPrice(item.sellingPrice * item.quantity)}
                      </span>
                      <div className="flex items-center border">
                        <button
                          onClick={() => handleDecrease(item)}
                          className="p-1"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="px-2 text-xs">{item.quantity}</span>
                        <button
                          onClick={() => handleIncrease(item)}
                          className="p-1"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(item)}
                    className="text-gray-400 hover:text-black"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {products.length > 0 && (
          <div className="py-3 px-2 border-t">
            <div className="flex justify-between font-bold text-sm mb-3">
              <span className="px-2 text-xl">Subtotal</span>
              <span className="text-xl">{formatPrice(subtotal)}</span>
            </div>
            <Link href="/checkout">
              <Button
                className="w-full"
                onClick={() =>
                  trackMetaEvent("InitiateCheckout", {
                    content_ids: products.map((p) => String(p.productId)),
                    content_type: "product",
                    value: Number(subtotal),
                    currency: "BDT",
                  })
                }
              >
                Checkout
              </Button>
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default Cart;
