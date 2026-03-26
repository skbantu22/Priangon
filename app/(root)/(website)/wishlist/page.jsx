"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { useSelector, useDispatch } from "react-redux";
import { Trash2, ShoppingCart, Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/showToast";
import { addIntoCart } from "@/store/reducer/cartReducer";

const Wishlist = () => {
  const user = useSelector((store) => store.authStore.auth);
  const userId =
    user?.id || user?._id || user?.data?.user?.id || user?.data?.user?._id;
  const dispatch = useDispatch();
  const router = useRouter();

  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);

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

  const removeWishlist = async (productId) => {
    if (!userId) return;
    try {
      setRemovingId(productId);
      const res = await axios.post("/api/wishlist", { userId, productId });
      setWishlist((prev) =>
        prev.filter((item) => item.productId?._id !== productId),
      );
      showToast(
        "success",
        res?.data?.removed ? "Removed from wishlist" : "Added to wishlist",
      );
    } catch (err) {
      showToast("error", "Action failed");
    } finally {
      setRemovingId(null);
    }
  };

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

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Loading wishlist...</p>
      </div>
    );

  if (!userId)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <Heart className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-600 mb-4">Please login to see your wishlist</p>
        <button
          onClick={() => router.push("/auth/login")}
          className="bg-black text-white px-6 py-2 rounded-full"
        >
          Login Now
        </button>
      </div>
    );

  if (!wishlist?.length)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <Heart className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500">Your wishlist is empty</p>
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-semibold mb-6">My Wishlist</h2>

      {/* ✅ Desktop Table */}
      <div className="hidden md:block overflow-x-auto border rounded-lg shadow-sm">
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
              const imageUrl =
                product?.media?.[0]?.secure_url || "/placeholder.png";

              return (
                <tr key={item._id} className="border-t hover:bg-gray-50">
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
                      <span className="font-medium hover:underline">
                        {product?.name}
                      </span>
                    </div>
                  </td>

                  <td className="p-4 font-semibold text-green-600">
                    ৳{product?.sellingPrice?.toLocaleString("en-BD")}
                  </td>

                  <td className="p-4 text-right flex justify-end gap-2">
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="bg-black text-white px-3 py-1 text-xs rounded"
                    >
                      Add to Cart
                    </button>

                    <button
                      onClick={() => removeWishlist(product?._id)}
                      className="text-red-500"
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

      {/* ✅ Mobile Cards */}
      <div className="md:hidden flex flex-col gap-4">
        {wishlist.map((item) => {
          const product = item.productId;
          const imageUrl =
            product?.media?.[0]?.secure_url || "/placeholder.png";

          return (
            <div
              key={item._id}
              className="border rounded-lg p-3 flex gap-3 shadow-sm"
            >
              <Image
                src={imageUrl}
                alt={product?.name}
                width={80}
                height={80}
                className="rounded object-cover"
              />

              <div className="flex-1 flex flex-col justify-between">
                <div
                  onClick={() =>
                    router.push(`/product/${product?.slug || product?._id}`)
                  }
                  className="cursor-pointer"
                >
                  <p className="font-medium text-sm line-clamp-2">
                    {product?.name}
                  </p>
                  <p className="text-green-600 font-semibold mt-1">
                    ৳{product?.sellingPrice?.toLocaleString("en-BD")}
                  </p>
                </div>

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="flex-1 bg-black text-white py-1 text-xs rounded"
                  >
                    Add to Cart
                  </button>

                  <button
                    onClick={() => removeWishlist(product?._id)}
                    className="text-red-500 px-2"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Wishlist;
