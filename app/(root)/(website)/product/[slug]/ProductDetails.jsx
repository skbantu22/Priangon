"use client";

import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { Phone, MessageCircle } from "lucide-react";
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

// মেটা ট্র্যাকিং ফাংশন ইমপোর্ট
import { trackMetaEvent } from "@/lib/meta/metaTrack";

const ProductDetails = ({
  product,
  initialVariant,
  allVariants = [],
  colors = [],
  similarProducts = [],
  sizes = { sizes },
}) => {
  const cartStore = useSelector((store) => store.cartStore);
  const dispatch = useDispatch();

  // ট্র্যাকিং রেফারেন্স (যাতে ডুপ্লিকেট ইভেন্ট ফায়ার না হয়)
  const hasTrackedView = useRef(false);

  // স্লাইডারের একটিভ ইনডেক্স স্টেট (STEP 3)
  const [activeIndex, setActiveIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAddedIntoCart, setIsAddedIntoCart] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    {
      label: product?.category?.name || "Category",
      href: `/shop?category=${product?.category?.slug || ""}`,
    },
    { label: product?.name || "Product" },
  ];
  const WHATSAPP_NUMBER = "8801XXXXXXXXX";
  const CALL_NUMBER = "8801XXXXXXXXX";

  const handleWhatsAppOrder = () => {
    const message = `
🛍️ Order Request

Product: ${product?.name}
Color: ${selectedColor || "N/A"}
Size: ${selectedSize || "N/A"}
Quantity: ${quantity}

Price: ৳${displaySellingPrice}

Product Link:
${window.location.href}
  `;

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank");
  };

  const handleCallOrder = () => {
    window.location.href = `tel:+${CALL_NUMBER}`;
  };
  // ==========================================
  // STEP 1: Create Flat Gallery List
  // ==========================================
  const flatGallery = useMemo(() => {
    if (!allVariants?.length) return [];

    return allVariants.flatMap((v) =>
      (v.media || []).map((m) => ({
        image: m?.secure_url,
        color: v.color,
        size: v.size,
        sku: v.sku,
        variantId: v._id,
        sellingPrice: v.sellingPrice,
        mrp: v.mrp,
        stock: v.stock || 0,
      })),
    );
  }, [allVariants]);

  // ==========================================
  // STEP 4: Current Slide Data
  // ==========================================
  const currentSlide = flatGallery[activeIndex] || {};

  // Selected Color & Size States (Synced with current slide)
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");

  // স্লাইড চেঞ্জ হলে কালার এবং সাইজ অটোমেটিক সিঙ্ক করার জন্য ইফেক্ট
  useEffect(() => {
    if (currentSlide.color) setSelectedColor(currentSlide.color);
    if (currentSlide.size) setSelectedSize(currentSlide.size);
  }, [activeIndex, currentSlide.color, currentSlide.size]);

  // কালার বা সাইজ বাটন ক্লিক করলে স্লাইডারের পজিশন চেঞ্জ করার লজিক
  const handleVariantSelection = (color, size) => {
    const targetColor = color || selectedColor;
    const targetSize = size || selectedSize;

    const targetIndex = flatGallery.findIndex(
      (item) => item.color === targetColor && item.size === targetSize,
    );

    if (targetIndex !== -1) {
      setActiveIndex(targetIndex);
    } else if (color) {
      // যদি নির্দিষ্ট সাইজ ম্যাচ না করে, তবে ওই কালারের প্রথম স্লাইডে নিয়ে যাবে
      const colorIndex = flatGallery.findIndex((item) => item.color === color);
      if (colorIndex !== -1) setActiveIndex(colorIndex);
    }
  };
  const sizeMap = useMemo(() => {
    const map = {};
    (sizes || []).forEach((s) => {
      map[s.value] = s.label;
    });
    return map;
  }, [sizes]);
  // কালার ওয়াইজ ডাইনামিক সাইজ লিস্ট (স্টক চেক করার জন্য)
  const dynamicSizes = useMemo(() => {
    return allVariants
      .filter((v) => v.color === selectedColor)
      .map((v) => ({
        size: v.size,
        label: sizeMap[v.size] || v.size,
        stock: v.stock || 0,
        id: v._id,
      }));
  }, [selectedColor, allVariants, sizeMap]);

  // ==========================================
  // STEP 5: Dynamic Price, SKU, Stock
  // ==========================================
  const displaySellingPrice =
    currentSlide.sellingPrice ?? product?.sellingPrice ?? product?.price ?? 0;

  const displayMrp = currentSlide.mrp ?? product?.mrp ?? displaySellingPrice;

  const displaySku = currentSlide.sku || initialVariant?.sku || "N/A";

  const isOutOfStock =
    currentSlide.stock !== undefined ? currentSlide.stock <= 0 : false;

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

  // ==========================================
  // STEP 6: Arrow Navigation Logic
  // ==========================================
  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1 >= flatGallery.length ? 0 : prev + 1));
  };

  const handlePrev = () => {
    setActiveIndex((prev) =>
      prev - 1 < 0 ? flatGallery.length - 1 : prev - 1,
    );
  };

  // Check if already in cart
  useEffect(() => {
    const pid = product?._id;
    const vid = currentSlide?.variantId;

    if (!pid) {
      setIsAddedIntoCart(false);
      return;
    }

    const exists = cartStore?.products?.some((p) =>
      vid ? p.productId === pid && p.variantId === vid : p.productId === pid,
    );

    setIsAddedIntoCart(!!exists);
  }, [cartStore?.products, product?._id, currentSlide?.variantId]);

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
      variantId: currentSlide?.variantId || null,
      name: product.name,
      slug: product.slug,
      size: selectedSize || null,
      color: selectedColor || null,
      mrp: displayMrp,
      sellingPrice: displaySellingPrice,
      media: currentSlide?.image || product?.media?.[0]?.secure_url || "",
      quantity: Number(quantity ?? 1),
      discount: product?.discountPercentage || 0,
      stock: currentSlide?.stock ?? null,
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
    if (currentSlide?.stock && quantity > currentSlide.stock) {
      setToastMessage(`Stock limit crossed! Only ${currentSlide.stock} left`);
      setQuantity(currentSlide.stock || 1);
    }
  }, [quantity, currentSlide?.stock]);

  useEffect(() => {
    if (toastMessage) {
      showToast("error", toastMessage);
      setToastMessage("");
    }
  }, [toastMessage]);

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">
      <div className="max-w-7xl mx-auto px-2 md:px-6 py-2 md:py-6 flex items-center gap-2 text-[9px] uppercase text-gray-400">
        <Breadcums items={breadcrumbItems} />
      </div>

      <main className="max-w-7xl mx-auto px-2 md:px-6 grid grid-cols-1 lg:grid-cols-12 gap-2 md:gap-10 pb-20">
        <div className="lg:col-span-7">
          <div className="relative">
            {/* STEP 7: Connect ProductGallery */}
            <ProductGallery
              galleryMedia={flatGallery.map((i) => i.image)}
              productName={product.name}
              activeIndex={activeIndex}
              setActiveIndex={setActiveIndex}
              onNext={handleNext}
              onPrev={handlePrev}
            />
            {isOutOfStock && (
              <div className="absolute top-4 left-[110px] z-30 bg-black text-white px-3 py-1 text-[10px] font-bold tracking-tighter uppercase pointer-events-none">
                Out of Stock
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col">
          <div className="w-full max-w-md mx-auto lg:mx-0 flex flex-col ">
            <div className="flex items-start justify-between gap-3 ">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-medium tracking-tight leading-snug text-gray-900 break-words">
                {product?.name}
              </h1>
              <div className="shrink-0 ">
                <WishlistButton
                  productId={product?._id}
                  variantId={currentSlide?.variantId}
                />
              </div>
            </div>

            <div className="text-[12px] md:text-sm tracking-wide text-gray-400">
              <span className="uppercase font-medium text-gray-400">SKU: </span>
              <span className="uppercase font-semibold">{displaySku}</span>
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
              {/* PREMIUM COLOR SELECTOR */}
              {colors?.length > 0 && (
                <div className="select-none">
                  {/* Heading */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm md:text-lg font-semibold text-gray-900 tracking-wide">
                      Select Color
                    </h3>

                    <span className="text-xs md:text-sm text-gray-500 font-medium">
                      {selectedColor}
                    </span>
                  </div>

                  {/* Color Grid */}
                  <div className="flex flex-wrap gap-3">
                    {colors.map((color) => {
                      const isSelected = selectedColor === color;

                      // Variant image
                      const colorVariant = allVariants.find(
                        (v) => v.color === color,
                      );

                      const image =
                        colorVariant?.media?.[0]?.secure_url ||
                        product?.media?.[0]?.secure_url;

                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => {
                            const colorIndex = flatGallery.findIndex(
                              (item) => item.color === color,
                            );

                            if (colorIndex !== -1) {
                              setActiveIndex(colorIndex);
                            }
                          }}
                          className={`
              group relative
              w-[90px] md:w-[100px]
              rounded-2xl overflow-hidden
              transition-all duration-300
              ${
                isSelected
                  ? "ring-2 ring-black shadow-xl scale-[1.03]"
                  : "border border-gray-200 hover:border-gray-400 hover:shadow-md"
              }
            `}
                        >
                          {/* Image Area */}
                          <div className="bg-[#f8f8f8] h-[110px] md:h-[125px] flex items-center justify-center overflow-hidden">
                            <img
                              src={image}
                              alt={color}
                              className="
                  h-[90px] md:h-[105px]
                  object-contain
                  transition-transform duration-300
                  group-hover:scale-105
                "
                            />
                          </div>

                          {/* Bottom Label */}
                          <div
                            className={`
                px-2 py-2 text-center text-[11px] md:text-xs font-medium tracking-wide uppercase
                transition-all duration-300
                ${isSelected ? "bg-black text-white" : "bg-white text-gray-700"}
              `}
                          >
                            {color}
                          </div>

                          {/* Active Badge */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black text-white flex items-center justify-center shadow-md">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-3 h-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-4">
                <h3 className="text-xs md:text-lg font-medium mb-2 text-gray-900 ">
                  Size:
                </h3>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 ">
                  {dynamicSizes.length > 0 ? (
                    dynamicSizes.map((item) => {
                      const isSelected = selectedSize === item.size;
                      return (
                        <button
                          key={item.size}
                          type="button"
                          disabled={item.stock === 0}
                          onClick={() =>
                            handleVariantSelection(null, item.size)
                          }
                          className={`
                            relative flex items-center justify-center 
                            min-w-[30px] h-[25px] md:h-[40px] px-4
                            text-sm transition-all duration-200 
                            ${
                              isSelected
                                ? "border border-black rounded-full text-black shadow-[0_4px_12px_rgba(0,0,0,0.1)] scale-105"
                                : "border border-gray-500 text-gray-500 rounded-full hover:text-black"
                            }
                            ${item.stock === 0 ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
                          `}
                        >
                          <span
                            className={
                              isSelected ? "font-semibold" : "font-normal"
                            }
                          >
                            {item.label}
                          </span>
                          {item.stock === 0 && (
                            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className="w-full h-[1px] bg-gray-400"></span>
                            </span>
                          )}
                        </button>
                      );
                    })
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
                          currentSlide?.stock && q + 1 > currentSlide.stock
                            ? q
                            : q + 1,
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

                <div className="grid grid-cols-2 gap-2">
                  {/* CALL BUTTON */}
                  <button
                    type="button"
                    onClick={handleCallOrder}
                    className="w-full flex items-center justify-center gap-2 bg-white text-black border border-black font-bold uppercase text-[12px] tracking-widest py-3 hover:bg-black hover:text-white transition-all duration-300"
                  >
                    <Phone size={18} strokeWidth={2.2} />
                    Call For Order
                  </button>

                  {/* WHATSAPP BUTTON */}
                  <button
                    type="button"
                    onClick={handleWhatsAppOrder}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 text-white border border-green-600 font-bold uppercase text-[12px] tracking-widest py-3 hover:bg-green-700 transition-all duration-300"
                  >
                    <MessageCircle size={18} strokeWidth={2.2} />
                    Order On WhatsApp
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
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
