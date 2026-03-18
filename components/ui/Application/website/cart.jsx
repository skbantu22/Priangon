"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

// Aarong uses "Tk" prefix with specific decimal formatting
const formatPrice = (value) => {
  return `Tk ${Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};


const Cart = () => {
  const dispatch = useDispatch();
  const { products, count } = useSelector((store) => store.cartStore);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    if (toastMessage) {
      showToast("error", toastMessage); // call your toast function
      setToastMessage(""); // reset after showing
    }
  }, [toastMessage]);
  const subtotal = useMemo(() => {
    return products.reduce((acc, item) => {
      return acc + Number(item.sellingPrice || 0) * Number(item.quantity || 0);
    }, 0);
  }, [products]);

  const [isOpen, setIsOpen] = useState(false);
const pathname = usePathname();

useEffect(() => {
  setIsOpen(false); // closes cart on route change
}, [pathname]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}  >

      <SheetTrigger asChild>
        <div className="flex flex-col items-center  hover:text-gray-500" >
          <div className="relative flex items-center justify-center p-2 group">
   <BsCart2 size={20} className="text-black" />
          {count > 0 && (
            <span className="absolute -top-0 -right-0 flex h-4 w-4 items-center justify-center rounded-full bg-[#f26522] text-[9px] font-bold text-white ring-2 ring-white">
              {count}
            </span>
          )}
                    


  </div>
                  <span>Cart</span>

        </div>
  
  
</SheetTrigger>
  

      <SheetContent
        side="right"
        className="w-full max-w-[400px] p-0 bg-white border-l shadow-xl flex flex-col rounded-none"
      >
        {/* Header - Minimalist & Centered */}
        <SheetHeader className="relative border-b border-gray-100 px-6 py-6 flex flex-row items-center justify-center">
          <SheetTitle className="text-[14px] font-bold uppercase tracking-[0.2em] text-black">
            Shopping Bag
          </SheetTitle>
          
        </SheetHeader>

        {/* Body with the Aarong Orange Scroll Accent */}
        <div className="flex-1 overflow-y-auto relative aarong-scroll-container">
          {products.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-20 text-center">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Your bag is empty</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {products.map((item, index) => (
                
                <div
                  key={`${item.productId}-${item.variantId}`}
                  className="group relative flex gap-4 px-6 py-6 transition-colors hover:bg-gray-50/50"
                >
                  
                  {/* The Aarong "Orange Bar" Accent - visible on right of active items */}
                  <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-[#f26522] opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Image Holder */}
                  <div className="relative h-[90px] w-[75px] shrink-0 overflow-hidden bg-white border border-gray-100">
                    <Image
                      src={item.media || imgPlaceholder.src}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="75px"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between items-start">
                      <h4 className="text-[13px] font-medium leading-tight text-black pr-4">
                        {item.name}
                      </h4>
                      <button 
                        onClick={() => dispatch(removeFromCart({ productId: item.productId, variantId: item.variantId }))}
                        className="text-gray-400 hover:text-black"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="mt-1 text-[11px] text-gray-500 font-medium">
                      Qty: {item.quantity}
                    </div>

                    <div className="mt-auto pt-3 flex items-center justify-between">
                      <span className="text-[14px] font-bold text-black">
                        {formatPrice(item.sellingPrice * item.quantity)}
                      </span>
                      
                      {/* Quantity Controller - Aarong Style */}
         <div className="flex items-center border border-gray-200">
  {/* Decrease */}
  <button
    onClick={() => {
      if (item.quantity <= 1) {
        setToastMessage(`Quantity can't be less than 1.`);
        return;
      }
      dispatch(decreaseQuantity({ productId: item.productId, variantId: item.variantId }));
    }}
    className="h-7 w-7 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30"
  >
    <Minus size={12} />
  </button>

  <span className="w-8 text-center text-[12px] font-bold border-x border-gray-200">
    {item.quantity}
  </span>

  {/* Increase */}
  <button
    onClick={() => {
      if (item.stock !== undefined && item.quantity >= item.stock) {
        setToastMessage(`Stock limit reached! Only ${item.stock} left.`);
        return;
      }
      dispatch(increaseQuantity({ productId: item.productId, variantId: item.variantId }));
    }}
    className={`h-7 w-7 flex items-center justify-center hover:bg-gray-50 ${
      item.stock !== undefined && item.quantity >= item.stock
        ? "opacity-30 cursor-not-allowed"
        : ""
    }`}
  >
    <Plus size={12} />
  </button>
</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Solid Block Buttons */}
        {products.length > 0 && (
          <div className="border-t border-gray-200 p-6 bg-white space-y-4">
            <div className="flex items-center justify-between text-[13px] font-bold uppercase tracking-widest text-black mb-2">
              <span>Subtotal :</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            <div className="space-y-3 pt-2">
              <Link href="/cart" className="block">
                <Button
                  variant="outline"
                  className="w-full rounded-none border-black border-[1px] h-[45px] text-[11px] font-bold uppercase tracking-[0.2em] text-black hover:bg-black hover:text-white transition-all"
                >
                  View Bag Details
                </Button>
              </Link>

              <Link href="/checkout" className="block">
                <Button className="w-full rounded-none bg-black h-[45px] text-[11px] font-bold uppercase tracking-[0.2em] text-white hover:bg-neutral-800 transition-all border-none">
                  Checkout
                </Button>
              </Link>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default Cart;