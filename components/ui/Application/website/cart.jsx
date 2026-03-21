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

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

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

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      
      {/* ✅ ONLY ICON (no flex-col, no text) */}
      <SheetTrigger asChild>
        <div className="relative flex items-center justify-center">
          <BsCart2 size={active ? 24 : 22} />

          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#f26522] text-[9px] font-bold text-white ring-2 ring-white">
              {count}
            </span>
          )}
        </div>
      </SheetTrigger>

      {/* 👉 Your existing SheetContent stays SAME */}
      <SheetContent
        side="right"
        className="w-full max-w-[400px] p-0 bg-white border-l shadow-xl flex flex-col"
      >
        <SheetHeader className="border-b px-6 py-6 flex justify-center">
          <SheetTitle className="text-[14px] font-bold uppercase tracking-[0.2em]">
            Shopping Bag
          </SheetTitle>
        </SheetHeader>

        {/* Your full cart body stays unchanged */}
        {/* (I didn't remove anything to keep your functionality) */}

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
                    alt=""
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
                          onClick={() =>
                            dispatch(
                              decreaseQuantity({
                                productId: item.productId,
                                variantId: item.variantId,
                              })
                            )
                          }
                          className="p-1"
                        >
                          <Minus size={12} />
                        </button>

                        <span className="px-2 text-xs">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() =>
                            dispatch(
                              increaseQuantity({
                                productId: item.productId,
                                variantId: item.variantId,
                              })
                            )
                          }
                          className="p-1"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      dispatch(
                        removeFromCart({
                          productId: item.productId,
                          variantId: item.variantId,
                        })
                      )
                    }
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {products.length > 0 && (
          <div className="p-4 border-t">
            <div className="flex justify-between font-bold text-sm mb-3">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            <Button className="w-full">Checkout</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default Cart;