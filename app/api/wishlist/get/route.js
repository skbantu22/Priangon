import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";
import WishlistModel from "@/models/wishlist.model";
import ProductModel from "@/models/Product.model";

import ProductVariantModel from "@/models/ProductVariant.model ";
import MediaModel from "@/models/Media.model";

export async function GET(req) {
  try {
    await connectDB();

    // Get userId from query params
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID required" },
        { status: 400 }
      );
    }

 const wishlistItems = await WishlistModel.find({ userId }).populate({
  path: "productId",
  select: "_id name slug sellingPrice media",
  populate: { path: "media", select: "secure_url" } // assuming Media has 'url' field
});

    return NextResponse.json({ success: true, data: wishlistItems });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

