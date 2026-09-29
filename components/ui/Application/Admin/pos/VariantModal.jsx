"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { useSelector } from "react-redux";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  cartLineTitle,
  variantDisplayName,
  variantStockAtShop,
} from "@/lib/posVariantLabel";
import { normalizeCustomerType, rateForType, ratesFor } from "@/lib/priceTiers";

const money = (n) => `৳${Number(n || 0).toLocaleString("en-BD")}`;

/** AmarSolution-style: tap a variant row to add qty 1 to the cart. */
export default function VariantModal({ product, setOpenProduct, addToCart }) {
  const cart = useSelector((s) => s.posCart.cart);
  const customerType = normalizeCustomerType(
    useSelector((s) => s.posCart.customer?.type),
  );

  const { raw, variants, inStock } = useMemo(() => {
    const rawP =
      product?.productId &&
      typeof product.productId === "object" &&
      Object.keys(product.productId).length
        ? product.productId
        : product;
    const list = product?.variants?.length
      ? product.variants
      : rawP?.variants || [];
    const stocked = list.filter((v) => variantStockAtShop(v) > 0);
    return { raw: rawP, variants: list, inStock: stocked };
  }, [product]);

  const close = () => setOpenProduct(null);

  const pick = (variant) => {
    const inCart = cart.find((i) => i.variantId === variant._id)?.qty || 0;
    const stock = variantStockAtShop(variant);
    if (stock - inCart < 1) return;
    addToCart(raw, variant, 1);
    close();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[min(85dvh,520px)] gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <div className="flex items-start justify-between gap-2 border-b border-gray-200 bg-[#1e3a5f] px-4 py-3 text-white">
          <div className="min-w-0">
            <DialogTitle className="text-base font-bold leading-snug text-white">
              {raw?.name || "Choose variant"}
            </DialogTitle>
            <p className="mt-0.5 text-xs text-white/80">Tap a line to add to cart</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white/10 hover:bg-white/20"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <ul className="max-h-[min(70dvh,420px)] overflow-y-auto overscroll-contain">
          {inStock.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-gray-500">
              No stock at this shop
            </li>
          ) : (
            inStock.map((variant) => {
              const stock = variantStockAtShop(variant);
              const inCart = cart.find((i) => i.variantId === variant._id)?.qty || 0;
              const left = Math.max(0, stock - inCart);
              const rates = ratesFor(raw, variant);
              const price = rateForType(rates, customerType);
              const label =
                variantDisplayName(variant) ||
                cartLineTitle(raw?.name, variant) ||
                "Standard";

              return (
                <li key={variant._id}>
                  <button
                    type="button"
                    disabled={left < 1}
                    onClick={() => pick(variant)}
                    className="flex w-full min-h-14 items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition hover:bg-sky-50 active:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/10 dark:hover:bg-white/5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">
                        {label}
                      </p>
                      {variant.barcode ? (
                        <p className="font-mono text-[11px] text-gray-500">
                          {variant.barcode}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-bold text-[#1e3a5f] dark:text-sky-300">
                        {money(price)}
                      </p>
                      <p
                        className={`text-xs font-semibold ${left > 0 ? "text-emerald-600" : "text-red-500"}`}
                      >
                        ({stock}){inCart > 0 ? ` · ${inCart} in cart` : ""}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
