"use client";

import axios from "axios";
import { Heart } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/showToast";
import { addToWishlist, removeFromWishlist } from "@/store/reducer/favReducer";
import { motion } from "framer-motion";

const WishlistButton = ({ productId, variantId = null }) => {
  const user = useSelector((store) => store.authStore.auth);
  const wishlist = useSelector((store) => store.wishlistStore?.products ?? []);
  console.log("Wishlist from store:", wishlist);
  const dispatch = useDispatch();
  const router = useRouter();

  // Compare both productId AND variantId
  const isInWishlist = wishlist.some(
    (p) =>
      p.productId?.toString() === productId?.toString() &&
      (p.variantId || null) === (variantId || null),
  );

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user?.data?.user?.id) {
      showToast("error", "Please login first");
      router.push("/auth/login");
      return;
    }

    // Prepare the item object
    const wishItem = { productId, variantId: variantId || null };

    // OPTIMISTIC UPDATE
    if (isInWishlist) {
      dispatch(removeFromWishlist(wishItem));
    } else {
      dispatch(addToWishlist(wishItem));
    }

    try {
      const res = await axios.post("/api/wishlist", {
        userId: user.data.user.id,
        productId,
        variantId: variantId || null, // Send variant to backend
      });

      showToast("success", res.data.removed ? "Removed" : "Added");
    } catch (error) {
      // Rollback
      if (isInWishlist) {
        dispatch(addToWishlist(wishItem));
      } else {
        dispatch(removeFromWishlist(wishItem));
      }
      showToast("error", "Sync failed");
    }
  };

  return (
    <button
      onClick={handleWishlist}
      className="p-1 md:p-1.5 rounded-full bg-gray-100  transition"
    >
      <motion.div
        whileHover={{ scale: 1, y: -4 }}
        whileTap={{ scale: 0.9 }}
        className={`rounded-full transition-colors ${
          isInWishlist ? "text-red-500" : "text-gray-400 hover:text-red-600 "
        }`}
      >
        <Heart
          className={`w-[13px] h-[13px] md:w-[20px] md:h-[20px] transition-colors ${
            isInWishlist ? "fill-current" : "fill-none"
          }`}
        />
      </motion.div>
    </button>
  );
};

export default WishlistButton;
