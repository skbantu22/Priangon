'use client'

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import imagePlaceholder from "@/public/assets/img-placeholder.webp";
import { WEBSITE_PRODUCT_DETAILS } from "@/Route/Websiteroute";
import axios from "axios";
import { useState } from "react";
import WishlistButton from "./WishlistButton";

const ProductBox = ({ product, userId, refreshWishlist }) => {
  const [imgLoaded, setImgLoaded] = useState(false); // track image loading

  const formatTk = (amount = 0) =>
    `৳${new Intl.NumberFormat("en-BD").format(Number(amount) || 0)}`;

  const href = WEBSITE_PRODUCT_DETAILS(product.slug || product._id);

  // TanStack Query v5 - fetch wishlist status
  const { data: isWishlisted, isLoading: wishlistLoading } = useQuery({
    queryKey: ["wishlistStatus", userId, product._id],
    queryFn: async () => {
      if (!userId) return false;
      const res = await axios.get(`/api/wishlist/get?userId=${userId}`);
      const wishlistProducts = res.data.data.map((item) => item.productId._id);
      return wishlistProducts.includes(product._id);
    },
    enabled: !!userId, // only fetch if user is logged in
  });

  // Skeleton while product is missing
  if (!product) {
    return (
      <div className="border rounded-sm p-5 animate-pulse flex flex-col gap-2 h-[360px]">
        <div className="w-full h-60 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mt-auto" />
        <div className="h-10 bg-gray-300 rounded mt-2" />
      </div>
    );
  }

  return (
    <div className="group relative border border-gray-100 bg-white flex flex-col rounded-sm overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      
      {/* Image Area */}
      <Link href={href} className="relative w-full h-[260px] sm:h-[320px] block overflow-hidden">
        
        {/* Image Skeleton */}
        {!imgLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
        )}

        <Image
          src={product?.media?.[0]?.secure_url || imagePlaceholder.src}
          alt={product?.name || "Product"}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className={`object-contain w-full h-full pt-2 transition-transform duration-700 ease-out group-hover:scale-110 transition-opacity duration-500 ease-in-out ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          onLoadingComplete={() => setImgLoaded(true)}
        />

        {/* Wishlist Button */}
        <div className="absolute top-3 right-3 z-10">
          {wishlistLoading ? (
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
          ) : (
            <WishlistButton
              productId={product._id}
              userId={userId}
              refreshWishlist={refreshWishlist}
              isWishlisted={isWishlisted}
            >
              <Heart
                className={`w-4 h-4 transition-colors duration-300 ${
                  isWishlisted ? "text-red-500" : "text-gray-400"
                }`}
              />
            </WishlistButton>
          )}
        </div>

        {/* Discount Badge */}
        {product?.discountPercentage > 0 && (
          <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm z-10">
            {Math.round(product.discountPercentage)}% Off
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
      </Link>

      {/* Info Area */}
      <div className="p-5 flex flex-col flex-1">
        {product?.categoryName && (
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
            {product.categoryName}
          </span>
        )}

        <Link href={href} className="mb-2">
          <h4 className="font-bold text-gray-800 text-sm sm:text-[15px] leading-tight line-clamp-2 group-hover:text-yellow-600 transition-colors">
            {product?.name}
          </h4>
        </Link>

        <div className="mt-auto mb-4 flex items-baseline gap-2">
          <span className="text-xl font-extrabold text-gray-900">
            {formatTk(product?.sellingPrice || product?.mrp)}
          </span>
          {product?.discountPercentage > 0 && (
            <span className="text-gray-400 text-xs line-through decoration-red-400/50">
              {formatTk(product?.mrp)}
            </span>
          )}
        </div>

        <Link
          href={href}
          className="w-full bg-gray-900 text-white group-hover:bg-yellow-500 group-hover:text-black font-bold py-3 px-4 transition-all duration-300 text-center text-sm flex items-center justify-center gap-2"
        >
          <span>Buy Now</span>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" 
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </div>
    </div>
  );
};

export default ProductBox;