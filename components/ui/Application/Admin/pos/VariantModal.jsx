"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useSelector } from "react-redux";
import { Minus, Plus, ShieldCheck, ShoppingCart, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { skipOptimize } from "@/lib/imageSrc";
import { CUSTOMER_TYPES, normalizeCustomerType, rateForType, ratesFor } from "@/lib/priceTiers";
import { formatWarrantyPeriod } from "@/lib/warranty";

const money = (n) => `৳${Number(n || 0).toLocaleString("en-BD")}`;
const stockOf = (v) => Number(v?.showroomStock ?? v?.stock ?? 0);
// "Default" / "Standard" are placeholders of a simple product, not real options
const real = (x) => (x && !/^(default|standard|n\/a)$/i.test(x) ? x : "");

// POS: pick storage / color and quantity of one product, then add it to the sale
export default function VariantModal({ product, setOpenProduct, addToCart }) {
  const cart = useSelector((s) => s.posCart.cart);
  const customerType = normalizeCustomerType(useSelector((s) => s.posCart.customer?.type));

  const { raw, variants, mainImage } = useMemo(() => {
    const rawP =
      product?.productId && typeof product.productId === "object" && Object.keys(product.productId).length
        ? product.productId
        : product;
    return {
      raw: rawP,
      variants: product?.variants?.length ? product.variants : rawP?.variants || [],
      mainImage:
        product?.image || rawP?.image || rawP?.media?.[0]?.secure_url || "/placeholder.png",
    };
  }, [product]);

  const sizes = useMemo(() => [...new Set(variants.map((v) => real(v.size)).filter(Boolean))], [variants]);
  const colors = useMemo(() => [...new Set(variants.map((v) => real(v.color)).filter(Boolean))], [variants]);

  const first = variants.find((v) => stockOf(v) > 0) || variants[0] || null;
  const [size, setSize] = useState(real(first?.size));
  const [color, setColor] = useState(real(first?.color));
  const [qty, setQty] = useState(1);

  const variant =
    variants.find((v) => real(v.size) === size && real(v.color) === color) ||
    variants.find((v) => real(v.size) === size) ||
    null;

  const stock = stockOf(variant);
  const inCart = cart.find((i) => i.variantId === variant?._id)?.qty || 0;
  const canAdd = Math.max(0, stock - inCart);
  const rates = ratesFor(raw, variant);
  const price = rateForType(rates, customerType);
  const mrp = Number(variant?.mrp) || 0;
  const image = variant?.image || mainImage;

  // is there stock for this size with that color (and the other way round)?
  const hasStock = (s, c) =>
    variants.some(
      (v) => (s === null || real(v.size) === s) && (c === null || real(v.color) === c) && stockOf(v) > 0,
    );

  const pickSize = (s) => {
    setSize(s);
    // keep the color if it exists for this size, else take one that has stock
    if (!variants.some((v) => real(v.size) === s && real(v.color) === color)) {
      const v = variants.find((x) => real(x.size) === s && stockOf(x) > 0) || variants.find((x) => real(x.size) === s);
      setColor(real(v?.color));
    }
    setQty(1);
  };

  const close = () => setOpenProduct(null);

  const add = () => {
    if (!variant || qty < 1 || qty > canAdd) return;
    addToCart(raw, variant, qty);
    close();
  };

  // Enter adds, like the rest of the POS
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Enter" && e.target.tagName !== "BUTTON") {
        e.preventDefault();
        add();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const chip = (active, disabled) =>
    `h-9 min-w-14 rounded-lg border px-3 text-[13px] font-medium transition ${
      active
        ? "border-primary bg-primary text-white"
        : disabled
          ? "border-dashed border-gray-200 text-gray-300 line-through dark:border-white/10"
          : "border-gray-200 text-gray-700 hover:border-primary hover:text-primary dark:border-white/15 dark:text-gray-200"
    }`;

  const warranty = raw?.warranty?.type && raw.warranty.type !== "none" && raw.warranty.months;

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent showCloseButton={false} className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <div className="grid sm:grid-cols-[240px_1fr]">
          {/* picture */}
          <div className="relative hidden aspect-square bg-gray-50 sm:block dark:bg-white/5">
            <Image
              src={image}
              alt={raw?.name || ""}
              fill
              sizes="240px"
              className="object-contain p-5"
              unoptimized={skipOptimize(image)}
            />
          </div>

          <div className="flex min-w-0 flex-col p-5">
            <div className="flex items-start gap-3">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-gray-50 sm:hidden">
                <Image src={image} alt="" fill sizes="56px" className="object-contain" unoptimized={skipOptimize(image)} />
              </div>
              <div className="min-w-0 flex-1">
                {raw?.brand && <p className="text-xs font-medium text-muted-foreground">{raw.brand}</p>}
                <DialogTitle className="text-lg leading-snug">{raw?.name || "Product"}</DialogTitle>
              </div>
              <button
                type="button"
                onClick={close}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">{money(price)}</span>
              {mrp > price && <span className="text-sm text-muted-foreground line-through">{money(mrp)}</span>}
              {customerType !== "retail" && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  {CUSTOMER_TYPES[customerType].short} rate
                </span>
              )}
            </div>
            {warranty && (
              <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700">
                <ShieldCheck className="size-3.5" /> {formatWarrantyPeriod(raw.warranty.months)} warranty
              </p>
            )}

            {sizes.length > 0 && (
              <div className="mt-4">
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Storage / Size</p>
                <div className="flex flex-wrap gap-1.5">
                  {sizes.map((s) => (
                    <button key={s} type="button" onClick={() => pickSize(s)} className={chip(size === s, !hasStock(s, null))}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {colors.length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Color</p>
                <div className="flex flex-wrap gap-1.5">
                  {colors.map((c) => {
                    const exists = variants.some((v) => real(v.size) === size && real(v.color) === c);
                    return (
                      <button
                        key={c}
                        type="button"
                        disabled={!exists}
                        onClick={() => {
                          setColor(c);
                          setQty(1);
                        }}
                        className={chip(color === c, !exists || !hasStock(size, c))}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <p className={`mt-3 text-xs font-medium ${stock > 0 ? "text-emerald-600" : "text-red-600"}`}>
              {stock > 0 ? `${stock} in stock` : "Out of stock"}
              {inCart > 0 && <span className="text-muted-foreground"> · {inCart} already in cart</span>}
              {variant?.barcode && <span className="font-mono text-muted-foreground"> · {variant.barcode}</span>}
            </p>

            <div className="mt-auto flex items-center gap-3 pt-5">
              <div className="flex h-11 items-center rounded-lg border border-gray-200 dark:border-white/15">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  className="flex size-11 items-center justify-center text-gray-600 disabled:opacity-30"
                  aria-label="Less"
                >
                  <Minus className="size-4" />
                </button>
                <input
                  type="number"
                  value={qty}
                  min={1}
                  max={canAdd || 1}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setQty(Math.min(Math.max(1, Number(e.target.value) || 1), canAdd || 1))}
                  className="h-full w-12 border-x border-gray-200 bg-transparent text-center text-sm font-semibold outline-none dark:border-white/15"
                />
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(canAdd || 1, q + 1))}
                  disabled={qty >= canAdd}
                  className="flex size-11 items-center justify-center text-gray-600 disabled:opacity-30"
                  aria-label="More"
                >
                  <Plus className="size-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={add}
                disabled={!variant || canAdd < 1}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white shadow-md shadow-primary/25 hover:brightness-110 disabled:opacity-50 disabled:shadow-none"
              >
                <ShoppingCart className="size-4" />
                {canAdd < 1 ? (stock > 0 ? "All stock in cart" : "Out of stock") : `Add ${money(price * qty)}`}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
