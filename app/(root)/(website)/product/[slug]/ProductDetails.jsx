"use client";

// ১. React থেকে useRef ইমপোর্ট করা হয়েছে
import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { addIntoCart } from "@/store/reducer/cartReducer";
import { showToast } from "@/lib/showToast";
import Link from "next/link";
import { WEBSITE_CART } from "@/Route/Websiteroute";
import Breadcums from "@/components/ui/Application/Admin/Breadcums";
import { AccordionBasic } from "./Acording";
import WishlistButton from "@/components/ui/Application/website/WishlistButton";

import DetailsSlider from "@/components/ui/Application/website/detailsslider";
import { ShoppingCart } from "lucide-react";
import ProductGallery from "@/components/ui/Application/website/productgalary";

// ২. মেটা ট্র্যাকিং ফাংশন ইমপোর্ট
import { trackMetaEvent } from "@/lib/meta/metaTrack";

const ProductDetails = ({
  product,
  initialVariant,
  allVariants = [],
  colors = [],
  similarProducts = [],
}) => {
  const cartStore = useSelector((store) => store.cartStore);
  const dispatch = useDispatch();

  // ট্র্যাকিং রেফারেন্স (যাতে ডুপ্লিকেট ইভেন্ট ফায়ার না হয়)
  const hasTrackedView = useRef(false);

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
    initialVariant?.color || colors?.[0] || allVariants?.[0]?.color || "",
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
    initialVariant?.size ||
      (dynamicSizes.length > 0 ? dynamicSizes[0].size : ""),
  );

  const [activeThumb, setActiveThumb] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isAddedIntoCart, setIsAddedIntoCart] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Determine current variant
  const currentVariant = useMemo(() => {
    if (!Array.isArray(allVariants) || allVariants.length === 0)
      return initialVariant || null;

    const exactMatch = allVariants.find(
      (v) => v.color === selectedColor && v.size === selectedSize,
    );
    if (exactMatch) return exactMatch;

    const colorMatch = allVariants.find((v) => v.color === selectedColor);
    if (colorMatch) return colorMatch;

    return initialVariant || allVariants[0] || null;
  }, [selectedColor, selectedSize, allVariants, initialVariant]);

  const displayVariant =
    currentVariant || initialVariant || allVariants?.[0] || null;

  // ৩. এখানে প্রাইস ক্যালকুলেশন (ViewContent এর আগে থাকতে হবে)
  const displaySellingPrice =
    displayVariant?.sellingPrice ??
    product?.sellingPrice ??
    product?.price ??
    0;
  const displayMrp = displayVariant?.mrp ?? product?.mrp ?? displaySellingPrice;
  const isOutOfStock =
    displayVariant?.stock !== undefined ? displayVariant.stock <= 0 : false;

  // --- META VIEW CONTENT TRACKING ---
  useEffect(() => {
    if (product?._id && !hasTrackedView.current) {
      trackMetaEvent("ViewContent", {
        content_name: product.name,
        content_ids: [product._id],
        content_type: "product",
        value: displaySellingPrice,
        currency: "BDT",
      });
      hasTrackedView.current = true;
    }
  }, [product, displaySellingPrice]);

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

  // Reset size if color changes
  useEffect(() => {
    const isSizeAvailable = dynamicSizes.some((s) => s.size === selectedSize);
    if (!isSizeAvailable) {
      setSelectedSize(dynamicSizes.length > 0 ? dynamicSizes[0].size : "");
    }
  }, [dynamicSizes, selectedSize]);

  // Check if already in cart
  useEffect(() => {
    const pid = product?._id;
    const vid = currentVariant?._id;

    if (!pid) {
      setIsAddedIntoCart(false);
      return;
    }

    const exists = cartStore?.products?.some((p) =>
      vid ? p.productId === pid && p.variantId === vid : p.productId === pid,
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
      media:
        displayVariant?.media?.[0]?.secure_url ||
        product?.media?.[0]?.secure_url ||
        "",
      quantity: Number(quantity ?? 1),
      discount: displayVariant?.discountPercentage || 0,
      stock: displayVariant?.stock ?? null,
    };

    // --- META ADD TO CART TRACKING ---
    trackMetaEvent("AddToCart", {
      content_name: product.name,
      content_ids: [product._id],
      content_type: "product",
      value: displaySellingPrice * (quantity ?? 1),
      currency: "BDT",
    });

    dispatch(addIntoCart(cartProduct));
    showToast("success", "Product added into cart", {
      position: "bottom-center",
    });

    return true;
  };

  // Quantity check
  useEffect(() => {
    if (quantity > displayVariant?.stock) {
      setToastMessage(
        `Stock limit crossed! Only ${displayVariant?.stock} left`,
      );
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
      {/* ... UI কোড যা আগে ছিল (বাকি অংশ একই থাকবে) ... */}
      <div className="max-w-7xl mx-auto px-2 md:px-6 py-2 md:py-6 flex items-center gap-2 text-[9px] uppercase text-gray-400">
        <Breadcums items={breadcrumbItems} />
      </div>

      <main className="max-w-7xl mx-auto px-2 md:px-6 grid grid-cols-1 lg:grid-cols-12 gap-2 md:gap-10 pb-20">
        <div className="lg:col-span-7">
          <div className="relative">
            <ProductGallery
              galleryMedia={galleryMedia}
              productName={product?.name}
            />
            {isOutOfStock && (
              <div className="absolute top-4 left-[110px] z-30 bg-black text-white px-3 py-1 text-[10px] font-bold tracking-tighter uppercase pointer-events-none">
                Out of Stock
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col">
          <div className="w-full max-w-md mx-auto lg:mx-0 flex flex-col h-full">
            <div className="flex items-start justify-between gap-3 ">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-medium tracking-tight leading-snug text-gray-900 break-words">
                {product?.name}
              </h1>
              <div className="shrink-0 ">
                <WishlistButton
                  productId={product?._id}
                  variantId={displayVariant?._id}
                />
              </div>
            </div>

            <div className="text-[12px] md:text-sm tracking-wide text-gray-400">
              <span className="uppercase font-medium text-gray-400">SKU: </span>
              <span className="uppercase font-semibold">
                {initialVariant?.sku || "N/A"}
              </span>
            </div>

            <div className="flex items-center gap-4 mb-4 md:mb-8 mt-2">
              <span className="text-2xl font-light text-gray-900">
                ৳{Number(displaySellingPrice).toLocaleString("en-BD")}
              </span>
              {Number(displayMrp) > Number(displaySellingPrice) && (
                <span className="text-base text-gray-400 line-through font-light">
                  ৳{Number(displayMrp).toLocaleString("en-BD")}
                </span>
              )}
            </div>

            <div className="space-y-4 md:space-y-5 mb-3 md:mb-4 ">
              {colors?.length > 0 && (
                <div className=" select-none">
                  <h3 className="text-xs md:text-lg font-medium mb-2 text-gray-900 ">
                    Color:
                    <span className="font-normal text-gray-600 ml-1">
                      {selectedColor || "Select"}
                    </span>
                  </h3>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {colors.map((color) => {
                      const isSelected = selectedColor === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSelectedColor(color)}
                          className={`
                            relative flex items-center gap-2
                            min-w-[30px] h-[25px] md:h-[40px] px-4
                            text-xs transition-all duration-200 
                            rounded-full border transition-all duration-300
                            ${
                              isSelected
                                ? "border-black bg-white text-black shadow-sm scale-105"
                                : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400"
                            }
                            active:scale-90
                          `}
                        >
                          <span
                            className={`text-[9px] md:text-[12px] tracking-wider ${isSelected ? "font-bold" : "font-medium"}`}
                          >
                            {color}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-4">
                <h3 className="text-xs md:text-lg font-medium mb-2 text-gray-900 ">
                  Size:
                  <span className="font-normal text-gray-600 ml-1">
                    {selectedSize || "Select"}
                  </span>
                </h3>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 ">
                  {dynamicSizes.length > 0 ? (
                    dynamicSizes.map((item) => (
                      <button
                        key={item.size}
                        type="button"
                        disabled={item.stock === 0}
                        onClick={() => setSelectedSize(item.size)}
                        className={`
                          relative flex items-center justify-center 
                          min-w-[30px] h-[25px] md:h-[40px] px-4
                          text-sm transition-all duration-200 
                          ${
                            selectedSize === item.size
                              ? "border border-black rounded-full text-black shadow-[0_4px_12px_rgba(0,0,0,0.1)] scale-105"
                              : "border border-gray-500 text-gray-500 rounded-full hover:text-black"
                          }
                          ${item.stock === 0 ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
                        `}
                      >
                        <span
                          className={
                            selectedSize === item.size
                              ? "font-semibold"
                              : "font-normal"
                          }
                        >
                          {item.size}
                        </span>
                        {item.stock === 0 && (
                          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="w-full h-[1px] bg-gray-400"></span>
                          </span>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="flex flex-wrap items-center gap-6">
                      <button
                        type="button"
                        disabled
                        className="relative flex items-center justify-center min-w-[30px] h-[25px] px-1 text-sm transition-all duration-200 border border-gray-500 text-gray-500 rounded-full opacity-60"
                      >
                        <span className="opacity-0">-</span>
                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="w-3 h-[1px] bg-gray-400"></span>
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 mb-4 md:mb-12 mt-2">
              <div className="flex flex-col gap-2 items-stretch">
                <div className="flex gap-1 md:gap-2 items-stretch">
                  <div className="flex items-center border border-black bg-white w-[110px] md:w-[130px] h-[40px] md:h-[42px] select-none">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-10 h-full flex items-center justify-center text-black hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-xl font-light leading-none">-</span>
                    </button>
                    <div className="flex-1 h-full flex items-center justify-center">
                      <span className="text-sm md:text-base font-bold text-gray-900">
                        {quantity}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((q) =>
                          q + 1 > displayVariant?.stock ? q : q + 1,
                        )
                      }
                      className="w-10 h-full flex items-center justify-center text-black hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-lg font-light leading-none">+</span>
                    </button>
                  </div>

                  {!isAddedIntoCart ? (
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={handleAddtoCart}
                      className={`w-full flex items-center justify-center gap-2 font-bold uppercase text-[13px] tracking-widest py-2.5 transition-all duration-300 border ${
                        isOutOfStock
                          ? "bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed"
                          : "bg-[#222222] text-white border-[#222222] hover:bg-white hover:text-black"
                      }`}
                    >
                      {!isOutOfStock && (
                        <ShoppingCart size={18} strokeWidth={2.5} />
                      )}
                      {isOutOfStock ? "Out of Stock" : "Add To Cart"}
                    </button>
                  ) : (
                    <Link href={WEBSITE_CART} className="w-full">
                      <button className="w-full flex items-center justify-center gap-2 bg-white text-black border-2 border-black font-bold uppercase text-[13px] tracking-widest py-3 hover:bg-black hover:text-white transition-all duration-300">
                        <ShoppingCart size={18} strokeWidth={2.5} />
                        View In Bag
                      </button>
                    </Link>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => {
                    const added = handleAddtoCart();
                    if (added) window.location.href = WEBSITE_CART;
                  }}
                  className={`w-full flex items-center justify-center font-bold uppercase text-[13px] tracking-widest py-3 transition-all duration-300 border ${
                    isOutOfStock
                      ? "bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed"
                      : "bg-[#222222] text-white border-[#222222] hover:bg-white hover:text-black shadow-sm"
                  }`}
                >
                  {isOutOfStock ? "Out of Stock" : "Buy It Now"}
                </button>
              </div>
            </div>

            <div className="mt-auto flex flex-col gap-2 ">
              <AccordionBasic
                product={product}
                initialVariant={initialVariant}
              />
            </div>
          </div>
        </div>
      </main>

      {similarProducts && similarProducts.length > 0 && (
        <section className="px-1 md:px-30 lg:px-40 pb-4">
          <div className="flex justify-center items-center px-2 text-center mb-2 lg:mb-4">
            <h1 className="text-xl md:text-2xl font-semibold">
              You May Also Like
            </h1>
          </div>
          <DetailsSlider products={similarProducts} />
        </section>
      )}
    </div>
  );
};

export default ProductDetails;
