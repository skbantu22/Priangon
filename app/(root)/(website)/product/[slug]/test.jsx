"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import {
  ShoppingBag,
  ChevronRight,
  Star,
  Truck,
  ShieldCheck,
  RefreshCw,
  Heart,
  Share2,
  Info,
} from "lucide-react";

// Mock Product Data (later pass as props)
const PRODUCT_DATA = {
  id: "pro-123",
  name: "Signature Cloud Runner",
  basePrice: 120,
  description:
    "Experience the ultimate in comfort with our patented Cloud-Tech sole. Designed for daily performance and casual style, these runners feature a breathable mesh upper and responsive cushioning.",
  rating: 4.8,
  reviewCount: 1240,
  variants: [
    {
      color: "Midnight Blue",
      colorCode: "#1e293b",
      images: [
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=1200",
      ],
      sizes: [
        { size: "7", stock: 5 },
        { size: "8", stock: 12 },
        { size: "9", stock: 0 },
        { size: "10", stock: 8 },
        { size: "11", stock: 2 },
      ],
    },
    {
      color: "Sunset Orange",
      colorCode: "#f97316",
      images: [
        "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=1200",
      ],
      sizes: [
        { size: "8", stock: 3 },
        { size: "9", stock: 15 },
        { size: "10", stock: 20 },
      ],
    },
    {
      color: "Cloud White",
      colorCode: "#f8fafc",
      images: [
        "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=1200",
      ],
      sizes: [
        { size: "7", stock: 0 },
        { size: "8", stock: 4 },
        { size: "9", stock: 2 },
        { size: "10", stock: 0 },
      ],
    },
  ],
};

export default function test() {
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const currentVariant = PRODUCT_DATA.variants[selectedColorIndex];

  const currentSizeInfo = useMemo(() => {
    if (!selectedSize) return null;
    return currentVariant.sizes.find((s) => s.size === selectedSize) || null;
  }, [selectedSize, currentVariant]);

  const canAddToCart = !!selectedSize && (currentSizeInfo?.stock ?? 0) > 0;

  const handleColorChange = (index) => {
    setSelectedColorIndex(index);
    setActiveImageIndex(0);

    // reset size if new color doesn't have that size OR it's out of stock
    const newVariant = PRODUCT_DATA.variants[index];
    if (selectedSize) {
      const exists = newVariant.sizes.find((s) => s.size === selectedSize);
      if (!exists || exists.stock === 0) setSelectedSize(null);
    }
  };

  const handleSelectSize = (size) => {
    const info = currentVariant.sizes.find((s) => s.size === size);
    if (!info || info.stock === 0) return;
    setSelectedSize(size);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900  p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        <nav className="flex items-center space-x-2 text-sm text-slate-500 mb-8">
          <span className="hover:text-slate-900 cursor-pointer">Shop</span>
          <ChevronRight size={14} />
          <span className="hover:text-slate-900 cursor-pointer">Footwear</span>
          <ChevronRight size={14} />
          <span className="text-slate-900 font-medium">{PRODUCT_DATA.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Left Column: Image Gallery */}
          <div className="space-y-4">
            <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100 relative group">
              <Image
                src={currentVariant.images[activeImageIndex]}
                alt={PRODUCT_DATA.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />

              <button
                type="button"
                onClick={() => setIsWishlisted((v) => !v)}
                className="absolute top-4 right-4 p-3 bg-white/80 backdrop-blur-md rounded-full shadow-sm hover:bg-white transition-colors"
              >
                <Heart
                  size={20}
                  className={
                    isWishlisted
                      ? "fill-red-500 stroke-red-500"
                      : "stroke-slate-600"
                  }
                />
              </button>
            </div>

            <div className="flex space-x-4">
              {currentVariant.images.map((img, idx) => (
                <button
                  type="button"
                  key={img}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-24 h-24 rounded-xl overflow-hidden border-2 transition-all relative ${
                    activeImageIndex === idx
                      ? "border-indigo-600 ring-2 ring-indigo-100"
                      : "border-transparent"
                  }`}
                >
                  <Image
                    src={img}
                    alt="thumbnail"
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Product Info & Options */}
          <div className="flex flex-col h-full">
            <div className="mb-2">
              <span className="text-indigo-600 font-semibold text-sm tracking-wide uppercase">
                New Arrival
              </span>
              <h1 className="text-4xl font-bold mt-1 tracking-tight">
                {PRODUCT_DATA.name}
              </h1>
            </div>

            <div className="flex items-center space-x-4 mt-2 mb-6">
              <div className="flex items-center text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={18}
                    fill={i < 4 ? "currentColor" : "none"}
                    strokeWidth={i < 4 ? 0 : 2}
                  />
                ))}
              </div>
              <span className="text-slate-500 text-sm">
                {PRODUCT_DATA.reviewCount} Reviews
              </span>
            </div>

            <p className="text-3xl font-bold text-slate-900 mb-8">
              ${PRODUCT_DATA.basePrice.toFixed(2)}
            </p>

            <div className="space-y-8 flex-grow">
              {/* Color Selection */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-900">
                    Color: {currentVariant.color}
                  </h3>
                </div>

                <div className="flex space-x-3">
                  {PRODUCT_DATA.variants.map((variant, idx) => (
                    <button
                      type="button"
                      key={variant.color}
                      onClick={() => handleColorChange(idx)}
                      className={`w-10 h-10 rounded-full border-2 p-0.5 transition-all ${
                        selectedColorIndex === idx
                          ? "border-indigo-600 scale-110"
                          : "border-slate-200"
                      }`}
                      aria-label={`Select color ${variant.color}`}
                    >
                      <div
                        className="w-full h-full rounded-full shadow-inner"
                        style={{ backgroundColor: variant.colorCode }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Size Selection */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-900">Select Size</h3>
                  <button
                    type="button"
                    className="text-indigo-600 text-sm font-medium hover:underline flex items-center"
                  >
                    <Info size={14} className="mr-1" /> Size Guide
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {currentVariant.sizes.map((s) => {
                    const disabled = s.stock === 0;
                    const selected = selectedSize === s.size;

                    return (
                      <button
                        type="button"
                        key={s.size}
                        disabled={disabled}
                        onClick={() => handleSelectSize(s.size)}
                        className={`py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                          selected
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                            : disabled
                            ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed line-through"
                            : "border-slate-200 hover:border-slate-300 text-slate-700"
                        }`}
                      >
                        {s.size}
                      </button>
                    );
                  })}
                </div>

                {selectedSize && (currentSizeInfo?.stock ?? 0) === 0 && (
                  <p className="text-rose-600 text-xs mt-3 font-medium">
                    This size is out of stock.
                  </p>
                )}

                {selectedSize &&
                  (currentSizeInfo?.stock ?? 0) > 0 &&
                  (currentSizeInfo?.stock ?? 0) < 5 && (
                    <p className="text-amber-600 text-xs mt-3 font-medium">
                      Only {currentSizeInfo.stock} left in stock!
                    </p>
                  )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-10 space-y-4">
              <button
                type="button"
                disabled={!canAddToCart}
                className={`w-full py-4 rounded-xl flex items-center justify-center space-x-3 font-bold text-lg transition-all ${
                  canAddToCart
                    ? "bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-200"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
                onClick={() => {
                  if (!canAddToCart) return;
                  // TODO: your add-to-cart logic
                  console.log("Add to cart:", {
                    productId: PRODUCT_DATA.id,
                    color: currentVariant.color,
                    size: selectedSize,
                  });
                }}
              >
                <ShoppingBag size={20} />
                <span>{canAddToCart ? "Add to Cart" : "Select a Size"}</span>
              </button>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  className="flex items-center justify-center space-x-2 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors font-medium text-slate-700"
                >
                  <Share2 size={18} />
                  <span>Share</span>
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center space-x-2 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors font-medium text-slate-700"
                >
                  <RefreshCw size={18} />
                  <span>Compare</span>
                </button>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="mt-12 grid grid-cols-3 gap-4 py-8 border-y border-slate-100">
              <div className="text-center space-y-2">
                <Truck className="mx-auto text-indigo-600" size={24} />
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Free Delivery
                </p>
              </div>
              <div className="text-center space-y-2">
                <ShieldCheck className="mx-auto text-indigo-600" size={24} />
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  2 Year Warranty
                </p>
              </div>
              <div className="text-center space-y-2">
                <RefreshCw className="mx-auto text-indigo-600" size={24} />
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Easy Returns
                </p>
              </div>
            </div>

            <div className="mt-8">
              <h4 className="font-semibold text-slate-900 mb-2">Description</h4>
              <p className="text-slate-600 leading-relaxed text-sm">
                {PRODUCT_DATA.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
