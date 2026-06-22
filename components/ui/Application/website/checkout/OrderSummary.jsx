import Image from "next/image";
import { Plus, Minus, X } from "lucide-react";
import imgPlaceholder from "@/public/assets/img-placeholder.webp";
import { Separator } from "@/components/ui/separator";

export default function OrderSummary({
  products = [],
  subtotal = 0,
  shipping = 0,
  discount = 0,
  couponDiscount = 0,
  formatCurrency = (v) => `Tk.${v.toLocaleString()}`,
  onIncrease,
  onDecrease,
  onRemove,
}) {
  const discountedTotal = subtotal - discount - couponDiscount;
  const grandTotal = discountedTotal + shipping;

  return (
    <div className="border-2 border-black bg-white p-4 md:p-5">
      <h2 className="mb-4 border-b-2 border-black pb-2 text-lg font-black uppercase">
        Order Summary
      </h2>

      {/* PRODUCTS */}
      <div className="space-y-4">
        {products?.map((p) => (
          <div
            key={p.productId}
            className="border-b border-black pb-4 last:border-b-0"
          >
            <div className="flex gap-3">
              <Image
                src={p.media || imgPlaceholder}
                width={80}
                height={100}
                alt={p.name}
                className="h-[100px] w-[80px] border border-black object-cover"
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 text-sm font-bold">{p.name}</h3>

                  <button
                    onClick={() => onRemove?.(p.productId)}
                    className="flex h-7 w-7 items-center justify-center border border-black hover:bg-black hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </div>

                <p className="mt-1 text-xs opacity-70">
                  {formatCurrency(p.sellingPrice)}
                </p>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center border border-black">
                    <button
                      onClick={() => onDecrease?.(p.productId)}
                      className="h-8 w-8 border-r border-black hover:bg-black hover:text-white"
                    >
                      <Minus size={14} />
                    </button>

                    <span className="flex h-8 min-w-[40px] items-center justify-center font-bold">
                      {p.quantity}
                    </span>

                    <button
                      onClick={() => onIncrease?.(p.productId)}
                      className="h-8 w-8 border-l border-black hover:bg-black hover:text-white"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <span className="font-black">
                    {formatCurrency(p.sellingPrice * p.quantity)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Separator className="my-4 bg-black" />

      {/* SUMMARY */}
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="font-medium">Subtotal</span>
          <span className="font-bold">{formatCurrency(subtotal)}</span>
        </div>

        {/* ALWAYS SHOW PRODUCT DISCOUNT */}
        <div className="flex justify-between">
          <span className="font-medium">Product Discount</span>
          <span className="font-bold text-red-600">
            -{formatCurrency(discount)}
          </span>
        </div>

        {/* ALWAYS SHOW COUPON DISCOUNT */}
        <div className="flex justify-between">
          <span className="font-medium">Coupon Discount</span>
          <span className="font-bold text-red-600">
            -{formatCurrency(couponDiscount)}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="font-medium">Delivery Charge</span>
          <span className="font-bold">{formatCurrency(shipping)}</span>
        </div>

        <div className="border-t-2 border-black pt-3">
          <div className="flex justify-between text-base md:text-lg">
            <span className="font-black uppercase">Grand Total</span>
            <span className="font-black">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
