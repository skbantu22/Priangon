'use client'

import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { useSelector, useDispatch } from "react-redux";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/showToast";
import { addIntoCart } from "@/store/reducer/cartReducer";

const Wishlist = () => {
  const user = useSelector((store) => store.authStore.auth);
  const userId = user?._id;
  const dispatch = useDispatch();
  const router = useRouter();

  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);

  // Fetch wishlist
  const fetchWishlist = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const res = await axios.get(`/api/wishlist/get?userId=${userId}`);
      if (res?.data?.success) {
        setWishlist(res.data.data || []);
      }
    } catch (err) {
      console.error("Fetch Wishlist Error:", err);
      setWishlist([]);
    } finally {
      setLoading(false);
    }
  };

  // Remove wishlist item
  const removeWishlist = async (productId) => {
    if (!userId) return;
    try {
      setRemovingId(productId);
      const res = await axios.post("/api/wishlist", { userId, productId });
      setWishlist((prev) =>
        prev.filter((item) => item.productId?._id !== productId)
      );
      showToast(
        "success",
        res?.data?.removed ? "Removed from wishlist" : "Added to wishlist"
      );
    } catch (err) {
      console.error("Remove Wishlist Error:", err);
      showToast("error", "Action failed");
    } finally {
      setRemovingId(null);
    }
  };

  // Add to Cart
  const handleAddToCart = (product) => {
    const cartProduct = {
      productId: product?._id,
      variantId: null,
      name: product?.name,
      slug: product?.slug,
      size: null,
      color: null,
      mrp: product?.mrp || product?.sellingPrice,
      sellingPrice: product?.sellingPrice,
      media: product?.media?.[0]?.secure_url || "",
      quantity: 1,
      discount: product?.discountPercentage || 0,
      stock: product?.stock ?? null,
    };
    dispatch(addIntoCart(cartProduct));
    showToast("success", "Product added to cart");
  };

  useEffect(() => {
    if (userId) fetchWishlist();
    else setLoading(false);
  }, [userId]);

  // Loading State
  if (loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-black rounded-full animate-spin"></div>
        <p className="text-gray-600 text-sm">Loading your wishlist...</p>
      </div>
    );

  // Not logged in
  if (!userId)
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-500">
        Please login to see your wishlist
      </div>
    );

  // Empty state
  if (!wishlist?.length)
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-500">
        Your wishlist is empty
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-6">My Wishlist</h2>

      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-100">
            <tr className="text-sm text-gray-600">
              <th className="p-4">Product</th>
              <th className="p-4">Price</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>

          <tbody>
            {wishlist.map((item) => {
              const product = item.productId;
              const imageUrl = product?.media?.[0]?.secure_url || "/placeholder.png";

              return (
                <tr
                  key={item._id}
                  className="border-t hover:bg-gray-50 transition"
                >
                  {/* Product Info */}
                  <td
                    onClick={() =>
                      router.push(`/product/${product?.slug || product?._id}`)
                    }
                    className="p-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <Image
                        src={imageUrl}
                        alt={product?.name}
                        width={60}
                        height={60}
                        className="rounded object-cover"
                      />
                      <span className="font-medium text-gray-800 hover:underline">
                        {product?.name}
                      </span>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="p-4 font-semibold text-green-600">
                    ৳{product?.sellingPrice?.toLocaleString("en-BD")}
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right flex justify-end gap-2">
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="bg-black text-white px-3 py-1 text-xs rounded hover:bg-gray-800"
                    >
                      Add to Cart
                    </button>

                    <button
                      onClick={() => removeWishlist(product?._id)}
                      disabled={removingId === product?._id}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Wishlist;