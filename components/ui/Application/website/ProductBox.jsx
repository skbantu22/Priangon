"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState, useMemo } from "react";
import WishlistButton from "./WishlistButton";
import { WEBSITE_PRODUCT_DETAILS } from "@/Route/Websiteroute";
import { useDispatch } from "react-redux";
import { addIntoCart } from "@/store/reducer/cartReducer";
import { showToast } from "@/lib/showToast";
import { useRouter } from "next/navigation";

const ProductBox = ({ product, userId, refreshWishlist, allVariants = [] }) => {
  const dispatch = useDispatch();
  const router = useRouter();

  // Prefer allVariants if product.variants is empty
  const variants = product?.variants?.length > 0 ? product.variants : allVariants;

  // Smart initial image: variant → product → null
  const [activeImage, setActiveImage] = useState(() => {
    const img =
      variants?.[0]?.media?.[0]?.secure_url ||
      product?.media?.[0]?.secure_url ||
      null;
    console.log("Initial activeImage:", img);
    return img;
  });

  // Selected variant
  const selectedVariant = useMemo(() => variants?.[0] || null, [variants]);

  const handleAddToCart = () => {
    if (!product) return;

    const cartProduct = {
      productId: product._id,
      variantId: selectedVariant?._id || null,
      name: product.name,
      slug: product.slug,
     media:
  selectedVariant?.media?.[0]?.secure_url ||
  product?.media?.[0]?.secure_url ||
  "/placeholder.png",
      mrp: selectedVariant?.mrp || product?.mrp,
      sellingPrice: selectedVariant?.sellingPrice || product?.sellingPrice,
      quantity: 1,
    };

    console.log("Adding to cart:", cartProduct);
    dispatch(addIntoCart(cartProduct));
    showToast("Added to cart 🛒");
    router.push("/cart"); 
  };

  const formatTk = (amount = 0) =>
    `Tk ${new Intl.NumberFormat("en-BD").format(Number(amount) || 0)}`;

  const href = WEBSITE_PRODUCT_DETAILS(product.slug || product._id);

  // Wishlist check
  const { data: isWishlisted, isLoading: wishlistLoading } = useQuery({
    queryKey: ["wishlistStatus", userId, product._id],
    queryFn: async () => {
      if (!userId) return false;
      const res = await axios.get(`/api/wishlist/get?userId=${userId}`);
      const wishlistProducts = res.data.data.map((item) => item.productId._id);
      return wishlistProducts.includes(product._id);
    },
    enabled: !!userId,
  });

  if (!product) return null;

  return (
    <div className="group bg-white w-full py-2 ">
      {/* IMAGE */}
      <div className="relative overflow-hidden">
        <Link href={href} className="block relative  aspect-[3/4] w-full">
          {activeImage ? (
            <Image
              src={activeImage}
              alt={product?.name || "Product"}
              fill
              className="object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-xs text-gray-400">
              No Image
            </div>
          )}
        </Link>

        {/* Wishlist */}
        <div className="absolute top-3 right-3 z-10">
          {wishlistLoading ? (
            <div className="w-4 h-4 md:w-8 md:h-8 bg-gray-200 rounded-full animate-pulse" />
          ) : (
            <WishlistButton
              productId={product._id}
              userId={userId}
              refreshWishlist={refreshWishlist}
              isWishlisted={isWishlisted}
            >
              <div className="bg-white p-2 rounded-full shadow hover:scale-110 transition">
                <Heart
                  className={`w-2 h-2 ${
                    isWishlisted ? "text-red-500" : "text-gray-600"
                  }`}
                />
              </div>
            </WishlistButton>
          )}
        </div>

        {/* ADD TO CART (Desktop Hover) */}
        <div
          onClick={handleAddToCart}
          className="hidden md:block absolute bottom-0 left-0 w-full bg-black text-white text-center py-3 text-sm opacity-0 group-hover:opacity-100 transition duration-300 cursor-pointer"
        >
          Add to cart
        </div>
      </div>

      {/* ADD TO CART (Mobile) */}
      <div
        onClick={handleAddToCart}
        className="block md:hidden w-full bg-black text-white text-center py-2 mt-2 text-sm cursor-pointer font-bold"
      >
        Add to cart
      </div>

      {/* INFO */}
      <div className="pt-3 text-center">
        <Link href={href}>
          <h3 className="text-sm md:text-md text-black hover:underline">
            {product?.name}
          </h3>
        </Link>

        <p className="text-sm mt-1 font-medium">
          {formatTk(selectedVariant?.sellingPrice || product?.sellingPrice || product?.mrp)}
        </p>

        {/* VARIANT THUMBNAILS */}
        <div className="flex justify-center gap-2 mt-4">
          {variants?.map((variant, i) => {
            const img = variant?.media?.[0]?.secure_url || product?.media?.[0]?.secure_url;
            if (!img) return null;
            console.log("Thumbnail image:", i, img);

            return (
              <button
                key={variant._id || i}
                onClick={() => setActiveImage(img)}
                onMouseEnter={() => setActiveImage(img)}
                className={`h-6 w-6 flex items-center justify-center border overflow-hidden transition-transform hover:scale-105 ${
                  activeImage === img
                    ? "opacity-100 border-2 border-black"
                    : "opacity-60 hover:opacity-100 border border-gray-300"
                }`}
              >
                <Image
                  src={img}
                  alt={variant?.name || "variant"}
                  width={24}
                  height={24}
                  className="h-full w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProductBox;