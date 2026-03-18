'use client'

import axios from "axios"
import { Heart } from "lucide-react"
import { useSelector } from "react-redux"
import { useRouter } from "next/navigation"
import { showToast } from "@/lib/showToast"
import { useEffect, useState } from "react"

const WishlistButton = ({ productId }) => {
  const user = useSelector((store) => store.authStore.auth)
  const router = useRouter()

  const [isInWishlist, setIsInWishlist] = useState(false)
  const [loading, setLoading] = useState(false)

  // Fetch user's wishlist to check if this product is already added
  useEffect(() => {
    if (!user?._id) return

    const checkWishlist = async () => {
      try {
         
        const res = await axios.get(`/api/wishlist/get?userId=${user._id}`)
        const wishlistProducts = res.data.data.map(item => item.productId._id)
        
        setIsInWishlist(wishlistProducts.includes(productId))
      } catch (err) {
        console.log(err)
      }
    }

    checkWishlist()
  }, [user, productId])

  const handleWishlist = async (e) => {
    // Prevent the click from navigating parent links
e.preventDefault();
    e.stopPropagation();
    if (!user?._id) {
      router.push("/auth/login")
      return
    }

    try {
      setLoading(true)
      const res = await axios.post("/api/wishlist", {
        userId: user._id,
        productId
      })

      if (res.data.removed) {
        setIsInWishlist(false)
        showToast("success", "Removed from wishlist")
      } else {
        setIsInWishlist(true)
        showToast("success", "Added to wishlist")
      }
    } catch (error) {
      console.log(error)
      showToast("error", "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleWishlist}
      disabled={loading}
      className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${
        isInWishlist ? "text-red-500" : "text-gray-500"
      }`}
    >
      <Heart size={20} className={isInWishlist ? "text-red-500" : "text-gray-500"} />
    </button>
  )
}

export default WishlistButton