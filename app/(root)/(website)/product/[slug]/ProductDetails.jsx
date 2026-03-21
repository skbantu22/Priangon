"use client";

import React, { useState, useMemo, useEffect,useCallback  } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addIntoCart } from "@/store/reducer/cartReducer";
import { showToast } from "@/lib/showToast";
import Link from "next/link";
import { WEBSITE_CART } from "@/Route/Websiteroute";
import Breadcums from "@/components/ui/Application/Admin/Breadcums";
import { AccordionBasic } from "./Acording";
import WishlistButton from "@/components/ui/Application/website/WishlistButton";



import DetailsSlider from "@/components/ui/Application/website/detailsslider";

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
      <div className="max-w-7xl mx-auto px-6 py-3 md:py-6 flex items-center gap-2 text-[9px] uppercase text-gray-400">
        <Breadcums items={breadcrumbItems} />
      </div> 

      <main className="max-w-7xl mx-auto px-2 md:px-6 grid grid-cols-1 lg:grid-cols-12 gap-2 md:gap-10 pb-20">
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
          
          <div className="w-full max-w-md mx-auto lg:mx-0 flex flex-col h-full">

    {/* Header */}
    <div className="flex items-start justify-between gap-3 ">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-medium tracking-tight leading-snug text-gray-900 break-words">
        {product?.name}
      </h1>

      <div className="shrink-0 ">
        <WishlistButton productId={product._id} />
      </div>
      
    </div>




            {/* PRICE */}
            <div className="flex items-center gap-4 mb-4 md:mb-8">
              <span className="text-2xl font-light text-gray-900">
                ৳{Number(displaySellingPrice).toLocaleString("en-BD")}
              </span>
              {Number(displayMrp) > Number(displaySellingPrice) && (
                <span className="text-base text-gray-400 line-through font-light">
                  ৳{Number(displayMrp).toLocaleString("en-BD")}
                </span>
              )}
            </div>

            <div className="space-y-4 md:space-y-5 mb-3 md:mb-4">
              {/* COLOR */}
              {colors?.length > 0 && (
  <div className=" select-none">
    
    <h3 className="text-[10px] md:text-lg font-medium mb-2 lg:mb-3 text-gray-900">COLOR</h3>

    {/* Compact Mobile-First Container */}
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
              /* Smaller height and padding for mobile */
              h-8 px-3 md:h-11 md:px-5 
              rounded-full border transition-all duration-300
              
              ${isSelected 
                ? "border-black bg-white text-black shadow-sm scale-105" 
                : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400"
              }
              
              active:scale-90
            `}
          >
            

            {/* Compact Text */}
            <span className={`text-[9px] md:text-[12px] uppercase tracking-wider ${isSelected ? 'font-bold' : 'font-medium'}`}>
              {color}
            </span>
          </button>
        );
      })}
    </div>
  </div>
)}

              {/* SIZE */}
     

<div className="mt-4">
  <h3 className="text-xs md:text-lg font-medium mb-2 text-gray-900">Size</h3>

  <div className="flex flex-wrap items-center  gap-2 md:gap-3">
    
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
            
            ${selectedSize === item.size 
              ? "border border-black rounded-full text-black shadow-[0_4px_12px_rgba(0,0,0,0.1)] scale-105"
              : "border border-gray-500 text-gray-500 rounded-full hover:text-black"
            }
            
            ${item.stock === 0 ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
          `}
        >
          <span className={selectedSize === item.size ? "font-semibold" : "font-normal"}>
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
      // 👇 Empty placeholder boxes
      <div className="flex flex-wrap items-center gap-6">
  <button
    type="button"
    disabled
    className="
    relative flex items-center justify-center 
            min-w-[30px] h-[25px] px-1
            text-sm transition-all duration-200  border border-gray-500 text-gray-500 rounded-full hover:text-black opacity-60
    "
  >
    {/* Invisible text to keep size */}
    <span className="opacity-0">-</span>

    {/* Strike line */}
    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <span className="w-3 h-[1px]  bg-gray-400"></span>
    </span>
  </button>
</div>

      
    )}

  </div>
</div>




            </div>

            {/* ACTION BUTTONS */}
<div className="flex flex-col gap-3 mb-4 md:mb-12 mt-2">

  {/* Quantity + Buttons Wrapper */}
  <div className="flex flex-col gap-2 items-stretch">

    <div className="flex gap-1 md:gap-2 items-stretch">
      {/* Quantity Selector */}
      <div className="flex items-center justify-between md:justify-start border border-gray-200 bg-gray-50  w-auto">
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
          className="px-3 py-2 text-gray-500 text-sm hover:text-black"
        >
          -
        </button>

        <span className="px-3 font-bold text-sm">{quantity}</span>

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
          className="px-3 py-2 text-gray-500 text-sm hover:text-black"
        >
          +
        </button>
      </div>

      {/* Add to Cart / Go to Cart */}
      {!isAddedIntoCart ? (
        <button
          type="button"
          disabled={isOutOfStock}
          onClick={handleAddtoCart}
          className={`w-full md:flex-1 font-semibold uppercase text-sm py-3 transition-colors duration-200 ${
            isOutOfStock
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-black text-white hover:bg-white hover:text-black border border-black"
          }`}
        >
          {isOutOfStock ? "Out of Stock" : "Add to Bag"}
        </button>
      ) : (
        <Link href={WEBSITE_CART} className="w-full md:flex-1">
          <button className="w-full bg-blue-600 text-white font-bold uppercase text-sm py-3 hover:bg-blue-700 transition-colors duration-200">
            Go to Cart
          </button>
        </Link>
      )}
    </div>

    {/* Buy Now */}
    <button
      type="button"
      disabled={isOutOfStock}
      onClick={() => {
        const added = handleAddtoCart();
        if (added) window.location.href = WEBSITE_CART;
      }}
      className={`w-full md:flex-1 font-semibold uppercase text-sm py-3 transition-colors duration-200 ${
        isOutOfStock
          ? "bg-gray-50 text-gray-300 cursor-not-allowed"
          : "bg-emerald-600 text-white hover:bg-black"
      }`}
    >
      Buy Now
    </button>
  </div>
</div>

            <div className="mt-auto flex flex-col gap-2 ">
              <AccordionBasic product={product} initialVariant={initialVariant} />
            </div>
          </div>
        </div>
      </main>

{similarProducts && similarProducts.length > 0 && (
  <section className="px-1 md:px-30 lg:px-40 pb-4">
    <h2 className="text-md lg:text-xl font-semibold uppercase mb-2 lg:mb-4 px-1">
      You May Also Like
    </h2>

    <DetailsSlider products={similarProducts} />
  </section>
)}
    </div>
  );
};

export default ProductDetails;