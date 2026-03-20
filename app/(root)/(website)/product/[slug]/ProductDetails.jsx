"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addIntoCart } from "@/store/reducer/cartReducer";
import { showToast } from "@/lib/showToast";
import Link from "next/link";
import { WEBSITE_CART } from "@/Route/Websiteroute";
import Breadcums from "@/components/ui/Application/Admin/Breadcums";
import { AccordionBasic } from "./Acording";
import WishlistButton from "@/components/ui/Application/website/WishlistButton";
import ProductBox from "@/components/ui/Application/website/ProductBox";

const ProductDetails = ({
  product,
  initialVariant,
  allVariants = [],
  colors = [],
  similarProducts = [],
}) => {
  const cartStore = useSelector((store) => store.cartStore);
  const dispatch = useDispatch();

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    {
      label: product?.category?.name || "Category",
      href: `/shop?category=${product?.category?.slug || ""}`,
    },
    { label: product?.name || "Product" },
  ];

  // Selected color
  const [selectedColor, setSelectedColor] = useState(
    initialVariant?.color || colors?.[0] || allVariants?.[0]?.color || ""
  );

  // Current sizes based on selected color
  const dynamicSizes = useMemo(() => {
    return allVariants
      .filter((v) => v.color === selectedColor)
      .map((v) => ({
        size: v.size,
        stock: v.stock || 0,
        id: v._id,
      }));
  }, [selectedColor, allVariants]);

  // Selected size
  const [selectedSize, setSelectedSize] = useState(
    initialVariant?.size || (dynamicSizes.length > 0 ? dynamicSizes[0].size : "")
  );

  const [activeThumb, setActiveThumb] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isAddedIntoCart, setIsAddedIntoCart] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Reset size if color changes
  useEffect(() => {
    const isSizeAvailable = dynamicSizes.some((s) => s.size === selectedSize);
    if (!isSizeAvailable) {
      setSelectedSize(dynamicSizes.length > 0 ? dynamicSizes[0].size : "");
    }
  }, [dynamicSizes, selectedSize]);

  // Determine current variant
  const currentVariant = useMemo(() => {
    if (!Array.isArray(allVariants) || allVariants.length === 0) return initialVariant || null;

    const exactMatch = allVariants.find(
      (v) => v.color === selectedColor && v.size === selectedSize
    );
    if (exactMatch) return exactMatch;

    const colorMatch = allVariants.find((v) => v.color === selectedColor);
    if (colorMatch) return colorMatch;

    return initialVariant || allVariants[0] || null;
  }, [selectedColor, selectedSize, allVariants, initialVariant]);

  const displayVariant = currentVariant || initialVariant || allVariants?.[0] || null;

  const displaySellingPrice =
    displayVariant?.sellingPrice ?? product?.sellingPrice ?? product?.price ?? 0;
  const displayMrp = displayVariant?.mrp ?? product?.mrp ?? displaySellingPrice;
  const isOutOfStock =
    displayVariant?.stock !== undefined ? displayVariant.stock <= 0 : false;

  // Gallery media
  const galleryMedia = useMemo(() => {
    const colorMatch = allVariants.find((v) => v.color === selectedColor);
    const media =
      colorMatch?.media?.length > 0
        ? colorMatch.media
        : displayVariant?.media?.length > 0
        ? displayVariant.media
        : product?.media || [];
    return Array.isArray(media) ? media.slice(0, 6) : [];
  }, [selectedColor, allVariants, product, displayVariant]);

  useEffect(() => {
    setActiveThumb(galleryMedia[0]?.secure_url || "");
  }, [galleryMedia]);

  // Check if already in cart
  useEffect(() => {
    const pid = product?._id;
    const vid = currentVariant?._id;

    if (!pid) {
      setIsAddedIntoCart(false);
      return;
    }

    const exists = cartStore?.products?.some((p) =>
      vid ? p.productId === pid && p.variantId === vid : p.productId === pid
    );

    setIsAddedIntoCart(!!exists);
  }, [cartStore?.products, product?._id, currentVariant?._id]);

  // Handle Add to Cart
  const handleAddtoCart = () => {
    if (isOutOfStock) {
      showToast("error", "This product is out of stock.");
      return false;
    }
    if (!product?._id) {
      showToast("error", "Product not available.");
      return false;
    }

    const cartProduct = {
      productId: product._id,
      variantId: displayVariant?._id || null,
      name: product.name,
      slug: product.slug,
      size: displayVariant?.size || selectedSize || null,
      color: displayVariant?.color || selectedColor || null,
      mrp: displayMrp,
      sellingPrice: displaySellingPrice,
      media: displayVariant?.media?.[0]?.secure_url || product?.media?.[0]?.secure_url || "",
      quantity: Number(quantity ?? 1),
      discount: displayVariant?.discountPercentage || 0,
      stock: displayVariant?.stock ?? null,
    };

    dispatch(addIntoCart(cartProduct));
    showToast("success", "Product added into cart", { position: "bottom-center" });

    return true;
  };

  // Quantity check
  useEffect(() => {
    if (quantity > displayVariant?.stock) {
      setToastMessage(`Stock limit crossed! Only ${displayVariant?.stock} left`);
      setQuantity(displayVariant?.stock || 1);
    }
  }, [quantity, displayVariant?.stock]);

  useEffect(() => {
    if (toastMessage) {
      showToast("error", toastMessage);
      setToastMessage("");
    }
  }, [toastMessage]);

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">
      <div className="max-w-7xl mx-auto px-6 py-8 flex items-center gap-2 text-[9px] uppercase text-gray-400">
        <Breadcums items={breadcrumbItems} />
      </div>

      <main className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 pb-20">
        {/* LEFT GALLERY */}
        <div className="lg:col-span-7 flex flex-col md:flex-row gap-3 h-auto md:h-[600px]">
          <div className="flex md:flex-col gap-2 order-2 md:order-1 overflow-x-auto no-scrollbar md:w-24">
            {galleryMedia.map((m, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveThumb(m?.secure_url)}
                className={`relative w-16 h-20 md:w-full md:h-[94px] flex-shrink-0 border transition-all duration-300 ${
                  activeThumb === m?.secure_url
                    ? "border-black"
                    : "border-gray-100 bg-gray-50 opacity-70 hover:opacity-100"
                }`}
              >
                <img
                  src={m?.secure_url}
                  alt={`thumb-${idx}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>

          <div className="flex-1 order-1 md:order-2 bg-gray-50 border border-gray-100 overflow-hidden h-[450px] md:h-[600px] relative">
            <img
              src={activeThumb || galleryMedia?.[0]?.secure_url || ""}
              alt={product?.name || "Product"}
              className="w-full h-full object-cover transition-opacity duration-500"
            />
            {isOutOfStock && (
              <div className="absolute top-4 left-4 bg-white/90 px-3 py-1 text-[10px] font-bold tracking-tighter uppercase border border-gray-100">
                Out of Stock
              </div>
            )}
          </div>
        </div>

        {/* RIGHT INFO */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="max-w-md w-full">
            <div className="flex justify-between">
              <h1 className="text-2xl md:text-3xl font-medium tracking-tighter mb-4 uppercase leading-none text-gray-900">
                {product?.name}
              </h1>
              <WishlistButton productId={product._id} />
            </div>

            {/* PRICE */}
            <div className="flex items-center gap-4 mb-8">
              <span className="text-2xl font-light text-gray-900">
                ৳{Number(displaySellingPrice).toLocaleString("en-BD")}
              </span>
              {Number(displayMrp) > Number(displaySellingPrice) && (
                <span className="text-base text-gray-400 line-through font-light">
                  ৳{Number(displayMrp).toLocaleString("en-BD")}
                </span>
              )}
            </div>

            <div className="space-y-10 mb-12">
              {/* COLOR */}
              {colors?.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-black">
                    Select Color
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {colors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={`px-6 py-2.5 border text-[11px] font-bold uppercase transition-all tracking-[0.15em] ${
                          selectedColor === color
                            ? "bg-black text-white border-black"
                            : "bg-white text-black border-gray-200 hover:border-black"
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SIZE */}
              {dynamicSizes.length > 0 && (
                <div>
                  <div className="flex justify-between mb-4">
                    <span className="text-[5px] font-bold uppercase text-black">
                      Select Size
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {dynamicSizes.map((item) => (
                      <button
                        key={item.size}
                        type="button"
                        disabled={item.stock === 0}
                        onClick={() => setSelectedSize(item.size)}
                        className={`py-2 text-[11px] font-bold border transition-all ${
                          selectedSize === item.size
                            ? "bg-black text-white border-black"
                            : item.stock === 0
                            ? "bg-gray-50 text-gray-200 border-gray-50 cursor-not-allowed line-through"
                            : "bg-white text-gray-900 border-gray-100 hover:border-black"
                        }`}
                      >
                        {item.size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col gap-3 mb-12">
              <div className="flex items-stretch gap-2">
                <div className="flex items-center border border-gray-200 bg-gray-50">
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) => {
                        if (q - 1 < 1) {
                          setToastMessage("Quantity can't be less than 1");
                          return 1;
                        }
                        return q - 1;
                      })
                    }
                    className="px-5 py-2 text-gray-500 hover:text-black"
                  >
                    -
                  </button>

                  <span className="px-2 font-bold text-xs">{quantity}</span>

                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) => {
                        if (q + 1 > displayVariant?.stock) {
                          setToastMessage(
                            `Stock limit crossed! Only ${displayVariant?.stock} left`
                          );
                          return displayVariant?.stock || q;
                        }
                        return q + 1;
                      })
                    }
                    className="px-5 py-2 text-gray-500 hover:text-black"
                  >
                    +
                  </button>
                </div>

                {!isAddedIntoCart ? (
                  <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={handleAddtoCart}
                    className={`flex-1 font-semibold uppercase text-[15px] py-2 ${
                      isOutOfStock
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-black text-white hover:bg-gray-800"
                    }`}
                  >
                    {isOutOfStock ? "Out of Stock" : "Add to Bag"}
                  </button>
                ) : (
                  <Link href={WEBSITE_CART} className="flex-1">
                    <button className="w-full h-full bg-blue-600 text-white font-bold uppercase text-[12px] py-4">
                      Go to Cart
                    </button>
                  </Link>
                )}

                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => {
                    const added = handleAddtoCart();
                    if (added) window.location.href = WEBSITE_CART;
                  }}
                  className={`flex-1 font-semibold uppercase text-[13px] py-2 ${
                    isOutOfStock
                      ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                >
                  Buy Now
                </button>
              </div>
            </div>

            <div className="mt-auto flex flex-col gap-2">
              <AccordionBasic product={product} initialVariant={initialVariant} />
            </div>
          </div>
        </div>
      </main>

      {/* SIMILAR PRODUCTS */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <h2 className="text-xl font-semibold uppercase mb-8">You May Also Like</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {similarProducts?.length > 0 ? (
            similarProducts.map((p) => (
              <ProductBox key={p._id} product={p} allVariants={p.allVariants || []} />
            ))
          ) : (
            <p className="col-span-full text-center text-gray-400">
              No similar products found.
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default ProductDetails;