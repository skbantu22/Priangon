"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { skipOptimize } from "@/lib/imageSrc";

export default function VariantModal({ product, setOpenProduct, addToCart }) {
  // 🚀 Safe Data Parsing (Handles nested productId or flat objects)
  const productData = useMemo(() => {
    const rawP =
      product?.productId &&
      typeof product.productId === "object" &&
      Object.keys(product.productId).length > 0
        ? product.productId
        : product;

    const variants = product?.variants?.length
      ? product.variants
      : rawP?.variants || [];

    const mainImage =
      product?.image ||
      rawP?.image ||
      (Array.isArray(rawP?.media) && rawP.media[0]?.secure_url) ||
      (Array.isArray(rawP?.media) && rawP.media[0]) ||
      "/placeholder.png";

    return {
      name: rawP?.name || product?.name || "Unnamed Product",
      mainImage,
      variants,
      rawProduct: rawP,
    };
  }, [product]);

  // First available in-stock variant setup
  const defaultVariant = useMemo(() => {
    return (
      productData.variants.find((v) => (v.showroomStock ?? v.stock ?? 0) > 0) ||
      productData.variants[0] ||
      null
    );
  }, [productData.variants]);

  const [selectedVariant, setSelectedVariant] = useState(defaultVariant);
  const [qty, setQty] = useState(1);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setOpenProduct(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setOpenProduct]);

  const handleAddToCart = () => {
    if (!selectedVariant) return;

    const currentStock =
      selectedVariant.showroomStock ?? selectedVariant.stock ?? 0;

    if (qty > currentStock) {
      alert("Out of stock!");
      return;
    }

    addToCart(productData.rawProduct, selectedVariant, qty);
    setOpenProduct(null);
  };

  const handleQtyChange = (delta) => {
    const maxStock =
      selectedVariant?.showroomStock ?? selectedVariant?.stock ?? 1;
    setQty((prev) => Math.min(Math.max(1, prev + delta), maxStock));
  };

  return (
    <div
      onClick={() => setOpenProduct(null)}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 transition-opacity animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-start justify-between gap-3 bg-gray-50/50">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 line-clamp-1 leading-snug">
              {productData.name}
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Select variant & quantity
            </p>
          </div>
          <button
            onClick={() => setOpenProduct(null)}
            className="text-gray-400 hover:text-gray-600 h-6 w-6 rounded-full hover:bg-gray-200/60 flex items-center justify-center text-xs transition"
          >
            ✕
          </button>
        </div>

        {/* Variant List */}
        <div className="p-3 space-y-2 overflow-y-auto flex-1 divide-y divide-gray-50">
          {productData.variants.map((v) => {
            const stock = v.showroomStock ?? v.stock ?? 0;
            const isOutOfStock = stock <= 0;
            const isSelected = selectedVariant?._id === v._id;

            const variantImg =
              v.image || productData.mainImage || "/placeholder.png";

            return (
              <div
                key={v._id}
                onClick={() => {
                  if (isOutOfStock) return;
                  setSelectedVariant(v);
                  setQty(1);
                }}
                className={`flex items-center justify-between p-2 rounded-xl transition cursor-pointer select-none border ${
                  isSelected
                    ? "border-green-500 bg-green-50/40 shadow-2xs"
                    : "border-transparent hover:bg-gray-50"
                } ${isOutOfStock ? "opacity-50 cursor-not-allowed bg-gray-50/50" : ""}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200/60">
                    <Image
                      src={variantImg}
                      alt={v.color || "Variant"}
                      fill
                      sizes="40px"
                      className="object-cover"
                      unoptimized={skipOptimize(variantImg)}
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="font-medium text-xs text-gray-900 truncate">
                      {v.color || "N/A"} / {v.size || "N/A"}
                    </p>
                    <p className="text-[11px] text-gray-600 font-medium">
                      ৳{v.sellingPrice || productData.rawProduct.sellingPrice}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      isOutOfStock
                        ? "bg-red-50 text-red-600"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {isOutOfStock ? "Stock Out" : `${stock} left`}
                  </span>

                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${
                      isSelected
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-gray-300"
                    }`}
                  >
                    {isSelected && (
                      <span className="text-[9px] font-bold">✓</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quantity Controls & Action */}
        <div className="p-4 border-t border-gray-100 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">Quantity</span>
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              <button
                type="button"
                onClick={() => handleQtyChange(-1)}
                disabled={qty <= 1}
                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200/70 active:bg-gray-300 text-sm font-semibold disabled:opacity-30 transition"
              >
                -
              </button>
              <input
                type="number"
                value={qty}
                onChange={(e) => {
                  const val = Number(e.target.value) || 1;
                  const maxStock =
                    selectedVariant?.showroomStock ??
                    selectedVariant?.stock ??
                    1;
                  setQty(Math.min(Math.max(1, val), maxStock));
                }}
                className="w-10 h-8 text-center text-xs font-semibold bg-transparent outline-none text-gray-900 border-x border-gray-200"
              />
              <button
                type="button"
                onClick={() => handleQtyChange(1)}
                disabled={
                  qty >=
                  (selectedVariant?.showroomStock ??
                    selectedVariant?.stock ??
                    1)
                }
                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200/70 active:bg-gray-300 text-sm font-semibold disabled:opacity-30 transition"
              >
                +
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => setOpenProduct(null)}
              className="h-9 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>

            <button
              onClick={handleAddToCart}
              disabled={
                !selectedVariant ||
                (selectedVariant.showroomStock ?? selectedVariant.stock ?? 0) <=
                  0
              }
              className="h-9 rounded-lg bg-green-600 text-xs font-medium text-white hover:bg-green-700 active:bg-green-800 disabled:opacity-50 transition shadow-2xs"
            >
              Add To Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
